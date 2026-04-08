/**
 * POST /api/releases-enrich
 *
 * Server-side cron job that:
 * 1. Fetches the latest releases from iTunes
 * 2. Merges them into the persisted band-data in Redis
 * 3. Enriches each release that lacks Odesli streaming links,
 *    waiting ODESLI_DELAY_MS between requests to stay under rate limits.
 *
 * Called daily by the Vercel cron. Admin can also trigger it manually.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getRedisOrNull, isRedisConfigured } from './_redis.js'
import { fetchWithRetry } from './_fetch-retry.js'
import { validateSession } from './auth.js'

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
}

interface SiteData {
  releases: Release[]
  [key: string]: unknown
}

interface ITunesTrack {
  collectionId?: number
  collectionName?: string
  artistName?: string
  collectionArtistName?: string
  artworkUrl100?: string
  artworkUrl60?: string
  releaseDate?: string
  collectionViewUrl?: string
  trackViewUrl?: string
}

interface OdesliLink {
  url: string
}

interface OdesliResponse {
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

async function enrichWithOdesli(
  release: Release,
  redis: NonNullable<ReturnType<typeof getRedisOrNull>>,
): Promise<Partial<Release>> {
  if (!release.appleMusic) return {}

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
    return {}
  }

  const data: OdesliResponse = await response.json()

  // Cache the result for 24 h
  try { await redis.set(cacheKey, data, { ex: ODESLI_CACHE_TTL }) } catch { /* non-fatal */ }

  return extractLinks(data)
}

function extractLinks(data: OdesliResponse): Partial<Release> {
  const p = data.linksByPlatform
  if (!p) return {}
  return {
    spotify: p.spotify?.url,
    appleMusic: p.appleMusic?.url,
    soundcloud: p.soundcloud?.url,
    youtube: p.youtube?.url,
    bandcamp: p.bandcamp?.url,
    deezer: p.deezer?.url,
    tidal: p.tidal?.url,
    amazonMusic: p.amazon?.url,
  }
}

function needsEnrichment(r: Release): boolean {
  return !r.spotify && !r.soundcloud && !r.youtube
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method === 'OPTIONS') { res.status(200).end(); return }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return }

  const isCron = req.headers['x-vercel-cron'] === '1'

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
        // Update artwork and Apple Music URL, preserve existing streaming links
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
    const releasesArray = Array.from(existingById.values())
    for (const release of releasesArray) {
      if (!needsEnrichment(release)) continue
      try {
        const links = await enrichWithOdesli(release, redis)
        if (links.spotify || links.soundcloud || links.youtube) {
          const updated: Release = { ...release }
          if (links.spotify) updated.spotify = links.spotify
          if (links.soundcloud) updated.soundcloud = links.soundcloud
          if (links.youtube) updated.youtube = links.youtube
          if (links.bandcamp) updated.bandcamp = links.bandcamp
          if (links.deezer) updated.deezer = links.deezer
          if (links.tidal) updated.tidal = links.tidal
          if (links.amazonMusic) updated.amazonMusic = links.amazonMusic
          existingById.set(release.id, updated)
          enriched++
        }
      } catch (e) {
        console.warn(`[releases-enrich] enrichment failed for "${release.title}":`, e)
      }
      // Delay between Odesli calls to avoid rate limits
      await delay(ODESLI_DELAY_MS)
    }

    // 5. Persist updated releases back to band-data in Redis
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
    })
  } catch (error) {
    console.error('[releases-enrich] Unexpected error:', error)
    res.status(500).json({ error: 'Failed to enrich releases' })
  }
}
