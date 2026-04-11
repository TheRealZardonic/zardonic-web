/**
 * POST /api/releases-enrich
 *
 * Full release sync pipeline (cron + manual):
 *
 * 1. Fetch ALL releases from iTunes (primary), fall back to Spotify if iTunes
 *    returns nothing.
 * 2. Enrich EVERY release with Odesli platform links (Spotify, Apple Music,
 *    YouTube, SoundCloud, Bandcamp, Deezer, Tidal, Amazon Music) using the
 *    Apple Music URL that iTunes provides directly.
 * 3. Apply MusicBrainz metadata (type, date) from the pre-fetched bulk map.
 * 4. Completely OVERWRITE the releases array in KV — no merge with old data,
 *    no isEnriched flag.  Each run is a fresh, authoritative snapshot.
 *
 * Cron calls must supply `Authorization: Bearer <CRON_SECRET>`.
 * Admin can also trigger it manually (requires valid session).
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getRedisOrNull, isRedisConfigured } from './_redis.js'
import { fetchWithRetry } from './_fetch-retry.js'
import { validateSession } from './auth.js'
import { timingSafeEqual } from 'node:crypto'
import {
  msToTime,
  mbTypeToReleaseType,
  fetchAllMBReleasesByArtist,
  buildMBReleaseTitleMap,
  matchITunesReleaseToMBData,
  type MbReleaseData,
} from './_musicbrainz.js'

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
export const BAND_DATA_KEY = 'band-data'
const ODESLI_DELAY_MS = 3000
const ODESLI_CACHE_TTL = 86400
const SPOTIFY_ARTIST_ID = '2VjGthYSFI6xGKJqbR7IXm'

interface StreamingLink {
  platform: string
  url: string
}

interface Release {
  id: string
  title: string
  artwork: string
  year: string
  releaseDate?: string
  streamingLinks?: StreamingLink[]
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

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Strip all query parameters from an Apple Music / iTunes URL.
 * iTunes returns affiliate-decorated URLs like `?uo=4&at=...&ct=...` that
 * Odesli cannot reliably resolve. We only keep origin + pathname.
 */
function cleanAppleMusicUrl(url: string): string {
  if (!url) return url
  try {
    const u = new URL(url)
    return `${u.origin}${u.pathname}`
  } catch { return url }
}

function odesliCacheKey(url: string): string {
  return `odesli:links:${url.replace(/^https?:\/\//, '').replace(/[^a-zA-Z0-9._/-]/g, '_').slice(0, 200)}`
}

function inferTypeFromTitle(title: string): '' | 'album' | 'ep' | 'single' | 'remix' | 'compilation' {
  const lower = title.toLowerCase()
  if (lower.includes('compilation') || lower.includes('best of') || lower.includes('greatest hits')) return 'compilation'
  if (lower.includes('remix') || lower.includes('remixed') || lower.includes('remixes') || lower.includes('rmx')) return 'remix'
  if (lower.includes(' mix') || lower.includes('mixed by') || lower.includes('dj mix') || lower.includes('continuous mix')) return 'remix'
  return ''
}

function detectReleaseType(
  title: string,
  trackCount: number,
  entityType: string | undefined,
  artistName: string,
): '' | 'album' | 'ep' | 'single' | 'remix' | 'compilation' {
  const fromTitle = inferTypeFromTitle(title)
  if (fromTitle === 'remix' || fromTitle === 'compilation') return fromTitle

  if (entityType === 'song' || trackCount <= 2) return 'single'
  if (trackCount >= 3 && trackCount <= 6) return 'ep'
  const isMainArtist = artistName.toLowerCase().includes(ARTIST_NAME.toLowerCase())
  return isMainArtist ? 'album' : 'compilation'
}

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

// ─── Step 1: Fetch releases from iTunes (primary) ───────────────────────────

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

    const mainArtist = track.collectionArtistName || track.artistName || ARTIST_NAME
    const appleUrl = cleanAppleMusicUrl(track.collectionViewUrl || track.trackViewUrl || '')
    const streamingLinks: StreamingLink[] = appleUrl ? [{ platform: 'appleMusic', url: appleUrl }] : []

    map.set(id, {
      id,
      title: track.collectionName,
      artwork: (track.artworkUrl100 || '').replace('100x100bb', '600x600bb') ||
               (track.artworkUrl60 || '').replace('60x60bb', '600x600bb') || '',
      year: track.releaseDate ? new Date(track.releaseDate).getFullYear().toString() : '',
      releaseDate: track.releaseDate
        ? new Date(track.releaseDate).toISOString().split('T')[0]
        : undefined,
      streamingLinks,
      description: mainArtist !== ARTIST_NAME ? `ft. ${mainArtist}` : undefined,
    })
  }

  return sortReleases(Array.from(map.values()))
}

// ─── Step 1b: Fetch releases from Spotify (fallback) ────────────────────────

interface SpotifyAlbum {
  id: string
  name: string
  release_date?: string
  album_type?: string
  images?: { url: string; width?: number }[]
  artists?: { name: string }[]
  external_urls?: { spotify?: string }
  total_tracks?: number
}

async function getSpotifyAccessToken(): Promise<string | null> {
  const clientId = process.env.SPOTIFY_CLIENT_ID
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET
  if (!clientId || !clientSecret) return null

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
  const res = await fetchWithRetry('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  })

  if (!res.ok) return null
  const data = await res.json() as { access_token: string }
  return data.access_token
}

async function fetchSpotifyReleases(): Promise<Release[]> {
  const token = await getSpotifyAccessToken()
  if (!token) return []

  const headers = { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
  const url = `https://api.spotify.com/v1/artists/${SPOTIFY_ARTIST_ID}/albums?include_groups=album,single,compilation&limit=50&market=US`
  const res = await fetchWithRetry(url, { headers })
  if (!res.ok) return []

  const data = await res.json() as { items?: SpotifyAlbum[] }
  const items = data.items ?? []

  const releases: Release[] = items
    .filter(a => a.artists?.some(ar => ar.name?.toLowerCase().includes('zardonic')))
    .map(a => {
      const spotifyUrl = a.external_urls?.spotify
      const streamingLinks: StreamingLink[] = spotifyUrl ? [{ platform: 'spotify', url: spotifyUrl }] : []
      const bestImage = a.images?.sort((x, y) => (y.width ?? 0) - (x.width ?? 0))[0]?.url ?? ''
      return {
        id: `spotify-${a.id}`,
        title: a.name,
        artwork: bestImage,
        year: a.release_date ? a.release_date.slice(0, 4) : '',
        releaseDate: a.release_date ?? undefined,
        streamingLinks,
        trackCount: a.total_tracks,
      }
    })

  return sortReleases(releases)
}

function sortReleases(releases: Release[]): Release[] {
  return releases.sort((a, b) => {
    if (!a.releaseDate && !b.releaseDate) return 0
    if (!a.releaseDate) return 1
    if (!b.releaseDate) return -1
    return new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime()
  })
}

// ─── Step 2 + 3: Enrich with MusicBrainz metadata + Odesli links ────────────

interface OdesliEnrichedLinks {
  links: Record<string, string | undefined>
  entityType?: string
  fromCache: boolean
}

async function enrichWithOdesli(
  url: string,
  redis: NonNullable<ReturnType<typeof getRedisOrNull>>,
): Promise<OdesliEnrichedLinks> {
  if (!url) return { links: {}, fromCache: false }

  const cacheKey = odesliCacheKey(url)

  try {
    const cached = await redis.get<OdesliResponse>(cacheKey)
    if (cached) return { ...extractLinks(cached), fromCache: true }
  } catch { /* cache miss */ }

  const response = await fetchWithRetry(
    `https://api.song.link/v1-alpha.1/links?url=${encodeURIComponent(url)}&userCountry=US`,
  )
  if (!response.ok) {
    return { links: {}, fromCache: false }
  }

  const data: OdesliResponse = await response.json()

  // Only cache non-empty responses to avoid persisting failures for 24h
  const hasLinks = data.linksByPlatform && Object.keys(data.linksByPlatform).length > 0
  if (hasLinks) {
    try { await redis.set(cacheKey, data, { ex: ODESLI_CACHE_TTL }) } catch { /* non-fatal */ }
  }

  return { ...extractLinks(data), fromCache: false }
}

function extractLinks(data: OdesliResponse): Omit<OdesliEnrichedLinks, 'fromCache'> {
  const p = data.linksByPlatform
  if (!p) return { links: {} }

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

/**
 * Enrich a single release with Odesli platform links first, then apply
 * MusicBrainz metadata (type + date) from the pre-fetched map.
 *
 * Order:
 *  1. Odesli — uses the iTunes Apple Music URL as primary lookup (always
 *     available). Falls back to the existing Spotify link if no Apple URL.
 *  2. MusicBrainz — applies type and date from the locally-matched `mbMap`
 *     entry (no per-release API call).
 *  3. iTunes tracklist — fetched only when no tracks are present yet.
 *  4. Type fallback — inferred from track count / title if MB had no match.
 */
async function enrichRelease(
  release: Release,
  redis: NonNullable<ReturnType<typeof getRedisOrNull>>,
  mbMap: Map<string, MbReleaseData>,
): Promise<{ release: Release; enriched: boolean; typeDetected: boolean; tracklistFetched: boolean }> {
  const updated: Release = { ...release }
  let enriched = false
  let typeDetected = false
  let tracklistFetched = false

  // ── Step 1: Odesli — use iTunes Apple Music URL as primary search term ──
  // iTunes always returns a collectionViewUrl which is the most reliable
  // identifier for Odesli to resolve all streaming platform links.
  const currentAppleUrl = (release.streamingLinks ?? []).find(l => l.platform === 'appleMusic')?.url
  const currentSpotifyUrl = (release.streamingLinks ?? []).find(l => l.platform === 'spotify')?.url
  // Prefer Apple Music URL; fall back to Spotify if unavailable
  const odesliLookupUrl = currentAppleUrl ?? currentSpotifyUrl ?? ''

  const { links, entityType: odesliEntityType, fromCache } = await enrichWithOdesli(odesliLookupUrl, redis)

  const newLinks: StreamingLink[] = [...(updated.streamingLinks ?? [])]
  const updateLink = (plat: string, url: string | undefined) => {
    if (!url) return
    const idx = newLinks.findIndex(l => l.platform === plat)
    if (idx >= 0) newLinks[idx].url = url
    else newLinks.push({ platform: plat, url })
  }

  updateLink('spotify', links.spotify)
  updateLink('soundcloud', links.soundcloud)
  updateLink('youtube', links.youtube)
  updateLink('bandcamp', links.bandcamp)
  updateLink('deezer', links.deezer)
  updateLink('tidal', links.tidal)
  updateLink('amazonMusic', links.amazonMusic)
  updateLink('appleMusic', links.appleMusic)

  updated.streamingLinks = newLinks
  enriched = Object.values(links).some(Boolean)

  // Only delay when we actually hit the Odesli API (not a Redis cache hit)
  if (!fromCache) await delay(ODESLI_DELAY_MS)

  // ── Step 2: MusicBrainz — apply locally-matched metadata (type + date) ──
  try {
    const mbData = matchITunesReleaseToMBData(release.title, mbMap)
    if (mbData) {
      const detectedType = mbTypeToReleaseType(mbData.primaryType, mbData.secondaryTypes)
      if (detectedType) {
        updated.type = detectedType
        typeDetected = true
      }
      if (mbData.date) {
        updated.releaseDate = mbData.date.length === 4 ? `${mbData.date}-01-01` : mbData.date
        updated.year = mbData.date.slice(0, 4)
      }
    }
  } catch {
    // MB matching failed — continue with what we have
  }

  // ── Tracklist + type detection fallback: fetch iTunes tracklist ONCE and reuse ──
  let tracks: Array<{ title: string; duration?: string }> = updated.tracks ?? []
  if (!tracks.length && release.id.startsWith('itunes-')) {
    tracks = await fetchITunesTracklist(release.id)
    if (tracks.length > 0) {
      updated.tracks = tracks
      updated.trackCount = tracks.length
      tracklistFetched = true
    }
    await delay(500)
  }

  if (!updated.type) {
    const trackCount = updated.trackCount ?? tracks.length
    const detectedType = detectReleaseType(release.title, trackCount, odesliEntityType, ARTIST_NAME)
    if (detectedType) {
      updated.type = detectedType
      typeDetected = true
    }
  }

  return { release: updated, enriched, typeDetected, tracklistFetched }
}

// ─── Queue types (shared with worker) ────────────────────────────────────────

export interface EnrichQueuePayload {
  releases: Release[]
  mbMap: Record<string, MbReleaseData>
  startedAt: string
  processedCount: number
}

export { verifyCronSecret, enrichRelease }
export type { Release, SiteData }

// ─── Handler ─────────────────────────────────────────────────────────────────

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  res.setHeader('Access-Control-Allow-Origin', 'https://zardonic.com')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

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
    // 1. Fetch releases — iTunes primary, Spotify fallback
    let releases = await fetchITunesReleases()
    let source: 'itunes' | 'spotify' = 'itunes'

    if (releases.length === 0) {
      console.log('[releases-enrich] iTunes returned 0 releases, trying Spotify fallback…')
      releases = await fetchSpotifyReleases()
      source = 'spotify'
    }

    if (releases.length === 0) {
      res.status(200).json({ ok: true, message: 'No releases found from iTunes or Spotify', queued: 0 })
      return
    }

    // 2. Fetch ALL MusicBrainz release-groups by artist in a two-step query, then
    //    build a lookup map for local title-based matching (no per-release API calls).
    let mbMap: Map<string, MbReleaseData> = new Map()
    try {
      const mbReleaseGroups = await fetchAllMBReleasesByArtist(ARTIST_NAME)
      mbMap = buildMBReleaseTitleMap(mbReleaseGroups)
      console.log(`[releases-enrich] MusicBrainz: fetched ${mbReleaseGroups.length} release-groups, built map with ${mbMap.size} distinct releases`)
    } catch (mbErr) {
      console.warn('[releases-enrich] MusicBrainz bulk fetch failed — continuing without MB metadata:', mbErr)
    }

    // 3. Store releases + MB map into the queue for the worker to drain
    const queuePayload: EnrichQueuePayload = {
      releases,
      mbMap: Object.fromEntries(mbMap),
      startedAt: new Date().toISOString(),
      processedCount: 0,
    }
    try {
      await redis.set('releases-enrich-queue', queuePayload, { ex: 3600 })
      // Clear any leftover results from a previous run
      await redis.del('releases-enrich-results')
    } catch (queueErr) {
      console.error('[releases-enrich] Failed to write queue to Redis:', queueErr)
      res.status(500).json({ error: 'Failed to queue enrichment' })
      return
    }

    console.log(`[releases-enrich] Queued ${releases.length} releases for enrichment (source: ${source})`)
    res.status(200).json({
      ok: true,
      source,
      queued: releases.length,
      message: 'Enrichment queued. Call /api/releases-enrich-worker to process.',
    })
  } catch (error) {
    console.error('[releases-enrich] Unexpected error:', error)
    res.status(500).json({ error: 'Failed to enrich releases' })
  }
}
