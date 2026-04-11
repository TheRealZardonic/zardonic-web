/**
 * POST /api/releases-enrich
 *
 * Full release sync pipeline (cron + manual):
 *
 * 1. Fetch ALL releases from iTunes (primary), fall back to Spotify if iTunes
 *    returns nothing.
 * 2. Enrich EVERY release with MusicBrainz metadata (type, date, tracklist).
 * 3. Enrich EVERY release with Odesli platform links (Spotify, Apple Music,
 *    YouTube, SoundCloud, Bandcamp, Deezer, Tidal, Amazon Music).
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
  fetchAllMBRecordingsByArtist,
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
const BAND_DATA_KEY = 'band-data'
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
    const appleUrl = track.collectionViewUrl || track.trackViewUrl || ''
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
}

async function enrichWithOdesli(
  url: string,
  redis: NonNullable<ReturnType<typeof getRedisOrNull>>,
): Promise<OdesliEnrichedLinks> {
  if (!url) return { links: {} }

  const cacheKey = odesliCacheKey(url)

  try {
    const cached = await redis.get<OdesliResponse>(cacheKey)
    if (cached) return extractLinks(cached)
  } catch { /* cache miss */ }

  const response = await fetchWithRetry(
    `https://api.song.link/v1-alpha.1/links?url=${encodeURIComponent(url)}&userCountry=US`,
  )
  if (!response.ok) {
    return { links: {} }
  }

  const data: OdesliResponse = await response.json()

  try { await redis.set(cacheKey, data, { ex: ODESLI_CACHE_TTL }) } catch { /* non-fatal */ }

  return extractLinks(data)
}

function extractLinks(data: OdesliResponse): OdesliEnrichedLinks {
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
 * Enrich a single release with MusicBrainz metadata (from pre-fetched map) +
 * Odesli platform links.
 *
 * MusicBrainz data is matched locally from the `mbMap` built once before the
 * loop — no per-release API call to MusicBrainz.
 *
 * Odesli receives the iTunes Apple Music URL as the primary search term, which
 * is the most reliable identifier for a release.
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
  // ── MusicBrainz: apply locally-matched metadata (type + date) ──
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

  // ── Odesli: use iTunes Apple Music URL as primary search term ──
  // The complete iTunes collection URL is the most reliable identifier for
  // Odesli to resolve all streaming platform links for a release.
  const currentAppleUrl = (release.streamingLinks ?? []).find(l => l.platform === 'appleMusic')?.url
  const currentSpotifyUrl = (release.streamingLinks ?? []).find(l => l.platform === 'spotify')?.url
  // Prefer iTunes URL; fall back to Spotify if Apple Music URL is unavailable
  const odesliLookupUrl = currentAppleUrl ?? currentSpotifyUrl ?? ''

  const { links, entityType: odesliEntityType } = await enrichWithOdesli(odesliLookupUrl, redis)

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

  await delay(ODESLI_DELAY_MS)

  // ── Type detection fallback ──
  if (!updated.type) {
    const trackCount = updated.trackCount ?? (release.id.startsWith('itunes-')
      ? (await fetchITunesTracklist(release.id)).length
      : 0)
    updated.trackCount = trackCount || updated.trackCount
    const detectedType = detectReleaseType(release.title, trackCount, odesliEntityType, ARTIST_NAME)
    if (detectedType) {
      updated.type = detectedType
      typeDetected = true
    }
  }

  // ── Tracklist fallback (iTunes only) ──
  if (!updated.tracks?.length && release.id.startsWith('itunes-')) {
    const tracks = await fetchITunesTracklist(release.id)
    if (tracks.length > 0) {
      updated.tracks = tracks
      updated.trackCount = tracks.length
      tracklistFetched = true
    }
    await delay(500)
  }

  return { release: updated, enriched, typeDetected, tracklistFetched }
}

// ─── Handler ─────────────────────────────────────────────────────────────────

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
    // 1. Fetch releases — iTunes primary, Spotify fallback
    let releases = await fetchITunesReleases()
    let source: 'itunes' | 'spotify' = 'itunes'

    if (releases.length === 0) {
      console.log('[releases-enrich] iTunes returned 0 releases, trying Spotify fallback…')
      releases = await fetchSpotifyReleases()
      source = 'spotify'
    }

    if (releases.length === 0) {
      res.status(200).json({ ok: true, message: 'No releases found from iTunes or Spotify', synced: 0, enriched: 0 })
      return
    }

    // 2. Fetch ALL MusicBrainz recordings by artist in a SINGLE query, then
    //    build a lookup map for local title-based matching (no per-release API calls).
    let mbMap: Map<string, MbReleaseData> = new Map()
    try {
      const mbRecordings = await fetchAllMBRecordingsByArtist(ARTIST_NAME)
      mbMap = buildMBReleaseTitleMap(mbRecordings)
      console.log(`[releases-enrich] MusicBrainz: fetched ${mbRecordings.length} recordings, built map with ${mbMap.size} distinct releases`)
    } catch (mbErr) {
      console.warn('[releases-enrich] MusicBrainz bulk fetch failed — continuing without MB metadata:', mbErr)
    }

    // 3. Enrich EVERY release with MusicBrainz (local match) + Odesli (no caching of enrichment state)
    let enrichedCount = 0
    let typeDetectedCount = 0
    let tracklistsFetchedCount = 0

    const enrichedReleases: Release[] = []
    for (const release of releases) {
      try {
        const result = await enrichRelease(release, redis, mbMap)
        enrichedReleases.push(result.release)
        if (result.enriched) enrichedCount++
        if (result.typeDetected) typeDetectedCount++
        if (result.tracklistFetched) tracklistsFetchedCount++
      } catch {
        // Keep the un-enriched release rather than dropping it
        enrichedReleases.push(release)
      }
    }

    // 4. Complete overwrite of releases in KV — preserve other band-data fields
    const existing = await redis.get<SiteData>(BAND_DATA_KEY)
    const updatedSiteData: SiteData = {
      ...(existing ?? {}),
      releases: enrichedReleases,
    }
    await redis.set(BAND_DATA_KEY, updatedSiteData)

    res.status(200).json({
      ok: true,
      source,
      synced: releases.length,
      total: enrichedReleases.length,
      enriched: enrichedCount,
      typeDetected: typeDetectedCount,
      tracklistsFetched: tracklistsFetchedCount,
    })
  } catch (error) {
    console.error('[releases-enrich] Unexpected error:', error)
    res.status(500).json({ error: 'Failed to enrich releases' })
  }
}
