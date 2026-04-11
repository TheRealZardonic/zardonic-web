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
 * Cron calls must supply `Authorization: Bearer <CRON_SECRET>`.\n * Admin can also trigger it manually (requires valid session).
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
import {
  cleanAppleMusicUrl,
  fetchOdesliLinks,
  type StreamingLink,
} from './_odesli.js'

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

export const BAND_DATA_KEY = 'band-data'
const ODESLI_DELAY_MS = 3000
const SPOTIFY_ARTIST_ID = '2VjGthYSFI6xGKJqbR7IXm'

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

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
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
  releaseArtist: string,
  configuredArtistName: string,
): '' | 'album' | 'ep' | 'single' | 'remix' | 'compilation' {
  const fromTitle = inferTypeFromTitle(title)
  if (fromTitle === 'remix' || fromTitle === 'compilation') return fromTitle

  if (entityType === 'song' || trackCount <= 2) return 'single'
  if (trackCount >= 3 && trackCount <= 6) return 'ep'
  const isMainArtist = releaseArtist.toLowerCase().includes(configuredArtistName.toLowerCase())
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

async function fetchITunesReleases(artistName: string): Promise<Release[]> {
  const [songsRes, albumsRes] = await Promise.all([
    fetchWithRetry(
      `https://itunes.apple.com/search?term=${encodeURIComponent(artistName)}&entity=song&limit=200`,
    ),
    fetchWithRetry(
      `https://itunes.apple.com/search?term=${encodeURIComponent(artistName)}&entity=album&limit=200`,
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

  const lowerArtistName = artistName.toLowerCase()
  const map = new Map<string, Release>()
  for (const track of results) {
    if (!track.collectionId || !track.collectionName) continue
    const artist = (track.artistName || '').toLowerCase()
    const collArtist = (track.collectionArtistName || '').toLowerCase()
    if (!artist.includes(lowerArtistName) && !collArtist.includes(lowerArtistName)) continue

    const id = `itunes-${track.collectionId}`
    if (map.has(id)) continue

    const mainArtist = track.collectionArtistName || track.artistName || artistName
    // IMPORTANT: cleanAppleMusicUrl is called here at the point of first storage.
    // This guarantees that geo.music.apple.com URLs and affiliate params are NEVER
    // written to Redis — they are cleaned before the Release object is even created.
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
      description: mainArtist !== artistName ? `ft. ${mainArtist}` : undefined,
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

async function fetchSpotifyReleases(artistName: string): Promise<Release[]> {
  const token = await getSpotifyAccessToken()
  if (!token) return []

  const headers = { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
  const url = `https://api.spotify.com/v1/artists/${SPOTIFY_ARTIST_ID}/albums?include_groups=album,single,compilation&limit=50&market=US`
  const res = await fetchWithRetry(url, { headers })
  if (!res.ok) return []

  const data = await res.json() as { items?: SpotifyAlbum[] }
  const items = data.items ?? []

  const lowerArtistName = artistName.toLowerCase()
  const releases: Release[] = items
    .filter(a => a.artists?.some(ar => ar.name?.toLowerCase().includes(lowerArtistName)))
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

/**
 * Apply MusicBrainz metadata (type + date) from the pre-fetched map to a release.
 * Pure data transformation — no API calls.
 */
function applyMBMetadata(release: Release, mbMap: Map<string, MbReleaseData>): Release {
  try {
    const mbData = matchITunesReleaseToMBData(release.title, mbMap)
    if (!mbData) return release
    const updated = { ...release }
    const detectedType = mbTypeToReleaseType(mbData.primaryType, mbData.secondaryTypes)
    if (detectedType) updated.type = detectedType
    if (mbData.date) {
      updated.releaseDate = mbData.date.length === 4 ? `${mbData.date}-01-01` : mbData.date
      updated.year = mbData.date.slice(0, 4)
    }
    return updated
  } catch {
    return release
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
  artistName = 'Zardonic',
): Promise<{ release: Release; enriched: boolean; typeDetected: boolean; tracklistFetched: boolean }> {
  const updated: Release = { ...release }
  let enriched = false
  let typeDetected = false
  let tracklistFetched = false

  // ── Step 1: Odesli — use iTunes Apple Music URL as primary search term ──
  // cleanAppleMusicUrl is applied defensively here in case any dirty URL
  // survived from a previous Redis write (e.g. pre-fix data). At this point
  // the URL should already be clean (set by fetchITunesReleases), but we
  // apply it again as a safety net.
  const rawAppleUrl = (release.streamingLinks ?? []).find(l => l.platform === 'appleMusic')?.url
  const currentAppleUrl = rawAppleUrl ? cleanAppleMusicUrl(rawAppleUrl) : undefined
  const currentSpotifyUrl = (release.streamingLinks ?? []).find(l => l.platform === 'spotify')?.url
  // Prefer Apple Music URL; fall back to Spotify if unavailable
  const odesliLookupUrl = currentAppleUrl ?? currentSpotifyUrl ?? ''

  const { links: odesliLinks, entityType: odesliEntityType, fromCache } = await fetchOdesliLinks(odesliLookupUrl, redis)

  // Merge Odesli links into the existing streamingLinks — update if the
  // platform is already present, otherwise append.
  const mergedLinks: StreamingLink[] = [...(updated.streamingLinks ?? [])]
  for (const oLink of odesliLinks) {
    const idx = mergedLinks.findIndex(l => l.platform === oLink.platform)
    if (idx >= 0) mergedLinks[idx].url = oLink.url
    else mergedLinks.push(oLink)
  }
  updated.streamingLinks = mergedLinks
  enriched = odesliLinks.length > 0

  // Only delay when we actually hit the Odesli API (not a Redis cache hit)
  if (!fromCache) await delay(ODESLI_DELAY_MS)

  // ── Step 2: MusicBrainz — apply locally-matched metadata (type + date) ──
  const withMB = applyMBMetadata(updated, mbMap)
  if (withMB.type && withMB.type !== updated.type) typeDetected = true
  Object.assign(updated, withMB)

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
    // Use the release description to determine if this is a main artist release.
    // iTunes stores the release artist in description as "ft. <mainArtist>" for
    // collaborations. If no description, the release is by the configured artist.
    const releaseArtist = updated.description?.startsWith('ft.')
      ? updated.description.slice(4).trim()
      : artistName
    const detectedType = detectReleaseType(release.title, trackCount, odesliEntityType, releaseArtist, artistName)
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
  artistName: string
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
    // Read artistName from band-data (set by admin) — never hardcode it
    const existingBandData = await redis.get<SiteData>(BAND_DATA_KEY)
    const artistName = (existingBandData?.artistName as string | undefined)?.trim() || 'Zardonic'

    // 1. Fetch releases — iTunes primary, Spotify fallback
    let releases = await fetchITunesReleases(artistName)
    let source: 'itunes' | 'spotify' = 'itunes'

    if (releases.length === 0) {
      console.log('[releases-enrich] iTunes returned 0 releases, trying Spotify fallback…')
      releases = await fetchSpotifyReleases(artistName)
      source = 'spotify'
    }

    if (releases.length === 0) {
      res.status(200).json({ ok: true, message: 'No releases found from iTunes or Spotify', queued: 0, synced: 0 })
      return
    }

    // 2. Fetch ALL MusicBrainz release-groups by artist in a two-step query, then
    //    build a lookup map for local title-based matching (no per-release API calls).
    let mbMap: Map<string, MbReleaseData> = new Map()
    try {
      const mbReleaseGroups = await fetchAllMBReleasesByArtist(artistName)
      mbMap = buildMBReleaseTitleMap(mbReleaseGroups)
      console.log(`[releases-enrich] MusicBrainz: fetched ${mbReleaseGroups.length} release-groups, built map with ${mbMap.size} distinct releases`)
    } catch (mbErr) {
      console.warn('[releases-enrich] MusicBrainz bulk fetch failed — continuing without MB metadata:', mbErr)
    }

    // 3. Apply MB metadata synchronously (no per-release API calls — map already built).
    //    Write the unenriched-but-MB-enriched releases to band-data immediately so the
    //    frontend can display releases right away (streaming links come later via worker).
    const releasesWithMB = releases.map(r => applyMBMetadata(r, mbMap))

    try {
      await redis.set(BAND_DATA_KEY, { ...(existingBandData ?? {}), releases: releasesWithMB })
    } catch (writeErr) {
      console.error('[releases-enrich] Failed to write releases to band-data:', writeErr)
    }

    // 4. Store releases + MB map into the queue for the worker to drain (Odesli enrichment)
    const queuePayload: EnrichQueuePayload = {
      releases: releasesWithMB,
      mbMap: Object.fromEntries(mbMap),
      startedAt: new Date().toISOString(),
      processedCount: 0,
      artistName,
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

    console.log(`[releases-enrich] Written ${releasesWithMB.length} releases to band-data and queued for Odesli enrichment (source: ${source})`)
    res.status(200).json({
      ok: true,
      source,
      synced: releasesWithMB.length,
      queued: releasesWithMB.length,
      message: 'Releases written to band-data. Odesli enrichment queued.',
    })
  } catch (error) {
    console.error('[releases-enrich] Unexpected error:', error)
    res.status(500).json({ error: 'Failed to enrich releases' })
  }
}