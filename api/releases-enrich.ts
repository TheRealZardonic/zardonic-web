/**
 * POST /api/releases-enrich
 *
 * Server-side cron job that:
 * 1. Fetches the latest releases from iTunes
 * 2. Merges them into the persisted band-data in Redis
 * 3. Enriches each release that lacks Odesli streaming links,
 *    waiting ODESLI_DELAY_MS between requests to stay under rate limits.
 *
 * Cron calls must supply `Authorization: Bearer <CRON_SECRET>`.
 * Admin can also trigger it manually (requires valid session).
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getRedisOrNull, isRedisConfigured } from './_redis.js'
import { fetchWithRetry } from './_fetch-retry.js'
import { validateSession } from './auth.js'
import { timingSafeEqual } from 'node:crypto'

/** Constant-time string comparison to prevent timing-based CRON_SECRET enumeration. */
function verifyCronSecret(provided: string): boolean {
  const expected = process.env.CRON_SECRET
  if (!expected) return false
  try {
    const a = Buffer.from(expected, 'utf8')
    const b = Buffer.from(provided, 'utf8')
    if (a.length !== b.length) return false
    return timingSafeEqual(a, b)
  } catch {
    return false
  }
}

const ARTIST_NAME = 'Zardonic'
const BAND_DATA_KEY = 'band-data'
const ODESLI_DELAY_MS = 3000  // 3 s between Odesli calls to avoid rate limits
const ODESLI_CACHE_TTL = 86400 // 24 h

// ─── Types ────────────────────────────────────────────────────────────────────

interface Release {
  id: string
  title: string
  artwork: string
  year: string
  releaseDate?: string
  spotify?: string
  soundcloud?: string
  youtube?: string
  bandcamp?: string
  appleMusic?: string
  deezer?: string
  tidal?: string
  amazonMusic?: string
  type?: '' | 'album' | 'ep' | 'single' | 'remix' | 'compilation'
  description?: string
  tracks?: Array<{ title: string; duration?: string }>
  trackCount?: number
}

interface SiteData {
  releases: Release[]
  [key: string]: unknown
}

interface ITunesTrack {
  collectionId?: number
  collectionName?: string
  trackName?: string
  trackNumber?: number
  trackTimeMillis?: number
  wrapperType?: string
  kind?: string
  artistName?: string
  collectionArtistName?: string
  artworkUrl100?: string
  artworkUrl60?: string
  releaseDate?: string
  collectionViewUrl?: string
  trackViewUrl?: string
  collectionExplicitness?: string
  trackExplicitness?: string
}

interface OdesliLink {
  url: string
}

interface OdesliEntity {
  id: string
  type: string
  title?: string
  artistName?: string
  thumbnailUrl?: string
  apiProvider?: string
}

interface OdesliResponse {
  entityUniqueId?: string
  entitiesByUniqueId?: Record<string, OdesliEntity>
  linksByPlatform?: {
    spotify?: OdesliLink
    appleMusic?: OdesliLink
    soundcloud?: OdesliLink
    youtube?: OdesliLink
    bandcamp?: OdesliLink
    deezer?: OdesliLink
    tidal?: OdesliLink
    amazon?: OdesliLink
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function odesliCacheKey(url: string): string {
  return `odesli:links:${url.replace(/^https?:\/\//, '').replace(/[^a-zA-Z0-9._/-]/g, '_').slice(0, 200)}`
}

/** Infer release type from the title text (for remix/compilation/mix keywords). */
function inferTypeFromTitle(title: string): '' | 'album' | 'ep' | 'single' | 'remix' | 'compilation' {
  const lower = title.toLowerCase()
  if (lower.includes('compilation') || lower.includes('best of') || lower.includes('greatest hits')) return 'compilation'
  if (lower.includes('remix') || lower.includes('remixed') || lower.includes('remixes') || lower.includes('rmx')) return 'remix'
  if (lower.includes(' mix') || lower.includes('mixed by') || lower.includes('dj mix') || lower.includes('continuous mix')) return 'remix'
  return ''
}

/** Determine release type from entity type + track count + title heuristics.
 *  Entity type 'album' from Odesli takes precedence; then we refine by track count. */
function detectReleaseType(
  title: string,
  trackCount: number,
  entityType: string | undefined,
  artistName: string,
): '' | 'album' | 'ep' | 'single' | 'remix' | 'compilation' {
  // First check title keywords
  const fromTitle = inferTypeFromTitle(title)
  if (fromTitle === 'remix' || fromTitle === 'compilation') return fromTitle

  if (entityType === 'song' || trackCount <= 2) return 'single'
  if (trackCount >= 3 && trackCount <= 6) return 'ep'
  // 7+ tracks → album or compilation
  const isMainArtist = artistName.toLowerCase().includes(ARTIST_NAME.toLowerCase())
  return isMainArtist ? 'album' : 'compilation'
}

/** Format milliseconds to MM:SS */
function msToTime(ms: number): string {
  const totalSeconds = Math.round(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

/** Fetch the tracklist for an iTunes collection. Returns empty array on failure. */
async function fetchITunesTracklist(collectionId: string): Promise<Array<{ title: string; duration?: string }>> {
  try {
    const id = collectionId.replace(/^itunes-/, '')
    const res = await fetchWithRetry(
      `https://itunes.apple.com/lookup?id=${encodeURIComponent(id)}&entity=song&sort=trackNumber`
    )
    if (!res.ok) return []
    const data = await res.json()
    const results: ITunesTrack[] = data.results || []
    return results
      .filter(t => t.wrapperType === 'track' && t.trackName)
      .sort((a, b) => (a.trackNumber ?? 0) - (b.trackNumber ?? 0))
      .map(t => ({
        title: t.trackName ?? '',
        duration: t.trackTimeMillis ? msToTime(t.trackTimeMillis) : undefined,
      }))
  } catch {
    return []
  }
}

/** Fetch track count for an iTunes collection (used for type detection without full tracklist). */
async function fetchITunesTrackCount(collectionId: string): Promise<number> {
  const tracks = await fetchITunesTracklist(collectionId)
  return tracks.length
}

async function fetchITunesReleases(): Promise<Release[]> {
  const [songsRes, albumsRes] = await Promise.all([
    fetchWithRetry(
      `https://itunes.apple.com/search?term=${encodeURIComponent(ARTIST_NAME)}&entity=song&limit=200`,
    ),
    fetchWithRetry(
      `https://itunes.apple.com/search?term=${encodeURIComponent(ARTIST_NAME)}&entity=album&limit=200`,
    ),
  ])

  if (!songsRes.ok || !albumsRes.ok) {
    throw new Error(`iTunes API error: songs=${songsRes.status} albums=${albumsRes.status}`)
  }

  const [songsData, albumsData] = await Promise.all([songsRes.json(), albumsRes.json()])
  const results: ITunesTrack[] = [
    ...(songsData.results || []),
    ...(albumsData.results || []),
  ]

  const map = new Map<string, Release>()
  for (const track of results) {
    if (!track.collectionId || !track.collectionName) continue
    const artist = (track.artistName || '').toLowerCase()
    const collArtist = (track.collectionArtistName || '').toLowerCase()
    if (!artist.includes('zardonic') && !collArtist.includes('zardonic')) continue

    const id = `itunes-${track.collectionId}`
    if (map.has(id)) continue

    // Derive artist name for type detection
    const mainArtist = track.collectionArtistName || track.artistName || ARTIST_NAME

    map.set(id, {
      id,
      title: track.collectionName,
      artwork: (track.artworkUrl100 || '').replace('100x100bb', '600x600bb') ||
               (track.artworkUrl60 || '').replace('60x60bb', '600x600bb') || '',
      year: track.releaseDate ? new Date(track.releaseDate).getFullYear().toString() : '',
      releaseDate: track.releaseDate
        ? new Date(track.releaseDate).toISOString().split('T')[0]
        : undefined,
      appleMusic: track.collectionViewUrl || track.trackViewUrl || '',
      // Store artist so handler can use it for type detection
      description: mainArtist !== ARTIST_NAME ? `ft. ${mainArtist}` : undefined,
    })
  }

  const releases = Array.from(map.values())
  releases.sort((a, b) => {
    if (!a.releaseDate && !b.releaseDate) return 0
    if (!a.releaseDate) return 1
    if (!b.releaseDate) return -1
    return new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime()
  })
  return releases
}

interface OdesliEnrichedLinks {
  links: Partial<Release>
  entityType?: string
}

async function enrichWithOdesli(
  release: Release,
  redis: NonNullable<ReturnType<typeof getRedisOrNull>>,
): Promise<OdesliEnrichedLinks> {
  if (!release.appleMusic) return { links: {} }

  const cacheKey = odesliCacheKey(release.appleMusic)

  // Try Redis cache first
  try {
    const cached = await redis.get<OdesliResponse>(cacheKey)
    if (cached) return extractLinks(cached)
  } catch (e) {
    console.warn(`[releases-enrich] Redis cache miss for ${release.title}:`, e)
  }

  // Call the external Odesli API (server-to-server, no rate limiter overhead)
  const response = await fetchWithRetry(
    `https://api.song.link/v1-alpha.1/links?url=${encodeURIComponent(release.appleMusic)}&userCountry=US`,
  )
  if (!response.ok) {
    console.warn(`[releases-enrich] Odesli ${response.status} for ${release.title}`)
    return { links: {} }
  }

  const data: OdesliResponse = await response.json()

  // Cache the result for 24 h
  try { await redis.set(cacheKey, data, { ex: ODESLI_CACHE_TTL }) } catch { /* non-fatal */ }

  return extractLinks(data)
}

function extractLinks(data: OdesliResponse): OdesliEnrichedLinks {
  const p = data.linksByPlatform
  if (!p) return { links: {} }

  // Extract entity type from Odesli response to help with type detection
  let entityType: string | undefined
  if (data.entityUniqueId && data.entitiesByUniqueId) {
    entityType = data.entitiesByUniqueId[data.entityUniqueId]?.type
  }

  return {
    links: {
      spotify: p.spotify?.url,
      appleMusic: p.appleMusic?.url,
      soundcloud: p.soundcloud?.url,
      youtube: p.youtube?.url,
      bandcamp: p.bandcamp?.url,
      deezer: p.deezer?.url,
      tidal: p.tidal?.url,
      amazonMusic: p.amazon?.url,
    },
    entityType,
  }
}

function needsEnrichment(r: Release): boolean {
  return !r.spotify && !r.soundcloud && !r.youtube
}

function needsTypeDetection(r: Release): boolean {
  return !r.type
}

function needsTracklist(r: Release): boolean {
  return (r.type === 'album' || r.type === 'compilation') && (!r.tracks || r.tracks.length === 0)
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method === 'OPTIONS') { res.status(200).end(); return }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return }

  const authHeader = req.headers.authorization ?? ''
  const isCron = authHeader.startsWith('Bearer ') && verifyCronSecret(authHeader.slice(7))

  if (!isCron) {
    const sessionValid = await validateSession(req)
    if (!sessionValid) { res.status(401).json({ error: 'Unauthorized' }); return }
  }

  if (!isRedisConfigured()) {
    res.status(503).json({ error: 'Redis not configured' }); return
  }

  const redis = getRedisOrNull()!

  try {
    // 1. Fetch fresh iTunes releases
    const iTunesReleases = await fetchITunesReleases()
    if (iTunesReleases.length === 0) {
      res.status(200).json({ ok: true, message: 'No releases found from iTunes', synced: 0, enriched: 0 })
      return
    }

    // 2. Load existing band-data from Redis
    const existing = await redis.get<SiteData>(BAND_DATA_KEY)
    const existingReleases: Release[] = existing?.releases ?? []
    const existingById = new Map(existingReleases.map(r => [r.id, r]))

    // 3. Merge: update existing + add new
    for (const fresh of iTunesReleases) {
      const current = existingById.get(fresh.id)
      if (current) {
        // Update artwork and Apple Music URL, preserve existing streaming links and type/tracks
        existingById.set(fresh.id, {
          ...current,
          artwork: fresh.artwork || current.artwork,
          appleMusic: fresh.appleMusic || current.appleMusic,
          year: fresh.year || current.year,
          releaseDate: fresh.releaseDate || current.releaseDate,
        })
      } else {
        existingById.set(fresh.id, fresh)
      }
    }

    // 4. Enrich releases that lack streaming links (with delay between each call)
    let enriched = 0
    let typeDetected = 0
    let tracklistsFetched = 0
    const releasesArray = Array.from(existingById.values())
    for (const release of releasesArray) {
      const shouldEnrich = needsEnrichment(release)
      const shouldDetectType = needsTypeDetection(release)

      if (!shouldEnrich && !shouldDetectType) continue

      try {
        let updated: Release = { ...release }
        let odesliEntityType: string | undefined

        if (shouldEnrich) {
          const { links, entityType } = await enrichWithOdesli(release, redis)
          odesliEntityType = entityType
          if (links.spotify || links.soundcloud || links.youtube) {
            if (links.spotify) updated.spotify = links.spotify
            if (links.soundcloud) updated.soundcloud = links.soundcloud
            if (links.youtube) updated.youtube = links.youtube
            if (links.bandcamp) updated.bandcamp = links.bandcamp
            if (links.deezer) updated.deezer = links.deezer
            if (links.tidal) updated.tidal = links.tidal
            if (links.amazonMusic) updated.amazonMusic = links.amazonMusic
            if (links.appleMusic) updated.appleMusic = links.appleMusic
            enriched++
          }
          // Delay between Odesli calls to avoid rate limits
          await delay(ODESLI_DELAY_MS)
        }

        // Auto-detect release type if not set
        if (shouldDetectType) {
          const trackCount = await fetchITunesTrackCount(release.id)
          updated.trackCount = trackCount
          const detectedType = detectReleaseType(
            release.title,
            trackCount,
            odesliEntityType,
            ARTIST_NAME,
          )
          if (detectedType) {
            updated.type = detectedType
            typeDetected++
          }
        }

        existingById.set(release.id, updated)
      } catch (e) {
        console.warn(`[releases-enrich] enrichment failed for "${release.title}":`, e)
      }
    }

    // 5. Fetch tracklists for albums/compilations that don't have one yet
    const releasesAfterEnrich = Array.from(existingById.values())
    for (const release of releasesAfterEnrich) {
      if (!needsTracklist(release)) continue
      try {
        const tracks = await fetchITunesTracklist(release.id)
        if (tracks.length > 0) {
          existingById.set(release.id, { ...release, tracks })
          tracklistsFetched++
        }
        await delay(500) // small delay between iTunes calls
      } catch (e) {
        console.warn(`[releases-enrich] tracklist fetch failed for "${release.title}":`, e)
      }
    }

    // 6. Persist updated releases back to band-data in Redis
    const updatedSiteData: SiteData = {
      ...(existing ?? {}),
      releases: Array.from(existingById.values()),
    }
    await redis.set(BAND_DATA_KEY, updatedSiteData)

    res.status(200).json({
      ok: true,
      synced: iTunesReleases.length,
      total: existingById.size,
      enriched,
      typeDetected,
      tracklistsFetched,
    })
  } catch (error) {
    console.error('[releases-enrich] Unexpected error:', error)
    res.status(500).json({ error: 'Failed to enrich releases' })
  }
}
