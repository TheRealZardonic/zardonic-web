/**
 * POST /api/releases-enrich
 *
 * Full release sync & enrichment pipeline (cron + manual):
 *
 * 1. Fetch ALL releases from iTunes AND Discogs in parallel (both are primary
 *    sources). Discogs requires DISCOGS_TOKEN; iTunes is always attempted.
 * 2. Aggregate + deduplicate the two source lists using normalised title
 *    matching (normTitle). Quality rules for merged fields:
 *      - Artwork:  iTunes hi-res (600x600bb) > Discogs thumbnail
 *      - Date:     iTunes full ISO date (YYYY-MM-DD) > Discogs year-only
 *      - ID:       itunes-{collectionId} when matched, discogs-{id} otherwise
 *      - Links:    union of all platform links, iTunes links preferred
 * 3. Spotify ultra-fallback — only when both iTunes AND Discogs return 0 releases.
 * 4. Apply MusicBrainz metadata (type, date) from the pre-fetched bulk map.
 * 5. Completely OVERWRITE the releases array in KV — no merge with old data,
 *    no isEnriched flag.  Each run is a fresh, authoritative snapshot.
 * 6. Queue all releases for Odesli enrichment (streaming links) via worker.
 * 7. Per-release Spotify link backfill — handled inside enrichRelease() when
 *    Odesli returns no Spotify link.
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
import {
  cleanAppleMusicUrl,
  fetchOdesliLinks,
  type StreamingLink,
} from './_odesli.js'
import { getSpotifyAccessToken } from './_spotify-client.js'
import { inferReleaseDescription, parseTrackArtists } from './_featured-artists.js'
import { mergeWithExistingReleases } from './_release-merge.js'
import {
  fetchDiscogsArtistId,
  fetchDiscogsArtistReleases,
  type DiscogsReleaseItem,
} from './_discogs.js'

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
  tracks?: Array<{ title: string; duration?: string; artist?: string; featuredArtists?: string[] }>
  trackCount?: number
  manuallyEdited?: boolean
  customLinks?: Array<{ label: string; url: string }>
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

async function fetchITunesTracklist(collectionId: string, mainArtist: string): Promise<Array<{ title: string; duration?: string; artist?: string; featuredArtists?: string[] }>> {
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
      .map(t => {
        const iTunesArtistName = t.artistName ?? ''
        const { artist, featuredArtists } = parseTrackArtists(iTunesArtistName, mainArtist)
        // Only include artist on track if it differs from mainArtist (e.g. compilations)
        const trackArtist = artist.trim().toLowerCase() !== mainArtist.trim().toLowerCase()
          ? artist
          : undefined
        return {
          title: t.trackName ?? '',
          duration: t.trackTimeMillis ? msToTime(t.trackTimeMillis) : undefined,
          artist: trackArtist,
          featuredArtists: featuredArtists.length > 0 ? featuredArtists : undefined,
        }
      })
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
      description: inferReleaseDescription(mainArtist, artistName),
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

// ─── Step 1c: Fetch releases from Discogs (second fallback) ─────────────────
//
// Step 2: Find the artist ID via /database/search.
// Step 3: Fetch all releases (paginated) via /artists/{id}/releases.
// Step 4: Enrich each release with:
//   - iTunes Apple Music URL + hi-res cover artwork
//   - Spotify link (when Spotify credentials are available)
// Step 6: Consolidate — prefer iTunes hi-res cover over Discogs thumb,
//         prefer iTunes full release date over Discogs year-only.
//
// Steps 5 (MusicBrainz) and 7 (Odesli) are applied later by the shared
// pipeline that handles all three sources (iTunes / Spotify / Discogs).

/**
 * Normalise a title for fuzzy cross-source comparison.
 *
 * Strips edition markers, diacritics and other noise so that
 * "Antikythera (Deluxe Edition)" and "Antikythera" map to the same key.
 */
function normTitle(t: string): string {
  return t
    .toLowerCase()
    // Normalize diacritics: é → e, ü → u, ñ → n, etc.
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    // Strip [Explicit] / (Explicit)
    .replace(/\s*[[(]explicit[\])]/gi, '')
    // Strip (Remastered …) / [Remastered …] — any variant inside the brackets
    .replace(/\s*\([^)]*remaster(?:ed)?\b[^)]*\)/gi, '')
    .replace(/\s*\[[^\]]*remaster(?:ed)?\b[^\]]*\]/gi, '')
    // Strip (Bonus Track Version) / (Bonus Tracks)
    .replace(/\s*\(bonus tracks?(?: version)?\)/gi, '')
    // Strip (Deluxe Edition) / (Deluxe Version) / (Deluxe)
    .replace(/\s*\(deluxe(?: edition| version)?\)/gi, '')
    // Strip (Special Edition)
    .replace(/\s*\(special edition\)/gi, '')
    // Strip trailing " - EP" / " - Single" / " - Remixes" etc.
    .replace(/\s*-\s*(ep|single|remixes?|deluxe edition|special edition)\s*$/i, '')
    // Strip (feat. …) / (ft. …)
    .replace(/\s*\(fe?a?t\.[^)]*\)/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Aggregate releases from iTunes and Discogs into a single, deduplicated list
 * using best-of-breed quality rules:
 *
 *  - Deduplication: releases match when normTitle(a.title) === normTitle(b.title)
 *  - Artwork:  iTunes hi-res (600x600bb) > Discogs thumbnail
 *  - Date:     iTunes full ISO date (YYYY-MM-DD) > Discogs year-only
 *  - ID:       itunes-{id} preferred when matched; discogs-{id} for unmatched
 *  - Links:    union of all streaming links from both sources
 */
export function aggregateReleases(itunesReleases: Release[], discogsReleases: Release[]): Release[] {
  // Index iTunes releases by normalised title for O(1) lookup
  const itunesMap = new Map<string, Release>()
  for (const r of itunesReleases) {
    const key = normTitle(r.title)
    if (!itunesMap.has(key)) itunesMap.set(key, r)
  }

  // Track which titles are already covered (to skip Discogs duplicates)
  const coveredKeys = new Set(itunesMap.keys())

  const extra: Release[] = []
  for (const dr of discogsReleases) {
    const key = normTitle(dr.title)
    const itunesMatch = itunesMap.get(key)

    if (itunesMatch) {
      // Merge: iTunes release wins for artwork + date + id.
      // Fill streaming links: union of both (iTunes already has appleMusic link).
      const mergedLinks: StreamingLink[] = [...(itunesMatch.streamingLinks ?? [])]
      for (const dl of dr.streamingLinks ?? []) {
        if (!mergedLinks.some(l => l.platform === dl.platform)) {
          mergedLinks.push(dl)
        }
      }
      // Overwrite in-place so the already-pushed iTunes release gets updated links
      itunesMap.set(key, {
        ...itunesMatch,
        streamingLinks: mergedLinks.length > 0 ? mergedLinks : undefined,
      })
    } else if (!coveredKeys.has(key)) {
      // Discogs-only release — add it (no iTunes match)
      coveredKeys.add(key)
      extra.push(dr)
    }
  }

  // Combine: updated iTunes releases + Discogs-only additions
  return sortReleases([...itunesMap.values(), ...extra])
}

/**
 * Fetch raw releases from Discogs for the given artist.
 *
 * Returns a minimal Release[] containing only data that Discogs provides:
 * title, year-based date, thumbnail artwork, and description.
 * No iTunes or Spotify enrichment is performed here — that happens in the
 * shared aggregation + enrichment pipeline (aggregateReleases / enrichRelease).
 *
 * Only 'master' releases are included — individual pressings / format
 * variants (type='release') are skipped to avoid duplicates.
 */
async function fetchDiscogsReleases(artistName: string): Promise<Release[]> {
  const token = process.env.DISCOGS_TOKEN
  if (!token) return []

  // Find the artist ID via /database/search
  const artistId = await fetchDiscogsArtistId(artistName, token)
  if (!artistId) {
    console.log('[releases-enrich] Discogs: artist not found for', artistName)
    return []
  }
  console.log(`[releases-enrich] Discogs: artist ID = ${artistId}`)

  // Fetch the full paginated release list
  const rawItems: DiscogsReleaseItem[] = await fetchDiscogsArtistReleases(artistId, token)
  console.log(`[releases-enrich] Discogs: fetched ${rawItems.length} raw items`)

  // Keep only master releases (canonical entry per title); skip individual pressings.
  // Releases without a type field are included as well — older Discogs API responses
  // sometimes omit the type field entirely for main/canonical entries.
  const masterItems = rawItems.filter(r => r.type === 'master' || !r.type)
  console.log(`[releases-enrich] Discogs: ${masterItems.length} master/unique items`)

  if (masterItems.length === 0) return []

  // Build Release objects using only Discogs data.
  // Artwork and streaming links will be filled / overridden during aggregation
  // (iTunes hi-res artwork) and enrichment (Odesli platform links).
  const releases: Release[] = masterItems.map(item => {
    const year = item.year ? String(item.year) : ''
    const releaseDate: string | undefined = item.year ? `${item.year}-01-01` : undefined

    return {
      id: `discogs-${item.id}`,
      title: item.title,
      artwork: item.thumb || '',
      year,
      releaseDate,
      description: inferReleaseDescription(item.artist ?? artistName, artistName),
    }
  })

  // Deduplicate by id (paranoia — Discogs occasionally has duplicate masters)
  const seen = new Set<string>()
  const unique = releases.filter(r => {
    if (seen.has(r.id)) return false
    seen.add(r.id)
    return true
  })

  return sortReleases(unique)
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
 *  2. Spotify fallback — if Odesli returned no Spotify link, search the
 *     Spotify API directly and add the first matching album link.
 *  3. MusicBrainz — applies type and date from the locally-matched `mbMap`
 *     entry (no per-release API call).
 *  4. iTunes tracklist — fetched only when no tracks are present yet.
 *  5. Type fallback — inferred from track count / title if MB had no match.
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

  // ── Step 2: Spotify fallback — direct API search when Odesli has no Spotify ──
  const hasSpotify = updated.streamingLinks?.some(l => l.platform === 'spotify')
  if (!hasSpotify) {
    try {
      const token = await getSpotifyAccessToken()
      if (token) {
        const q = encodeURIComponent(`album:${updated.title} artist:${artistName}`)
        const searchUrl = `https://api.spotify.com/v1/search?q=${q}&type=album&limit=5&market=US`
        const searchRes = await fetchWithRetry(searchUrl, {
          headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' },
        })
        if (searchRes.ok) {
          const searchData = await searchRes.json() as { albums?: { items?: SpotifyAlbum[] } }
          const rawItems = searchData?.albums?.items
          const items = Array.isArray(rawItems) ? rawItems : []
          const lowerTitle = updated.title.trim().toLowerCase()
          const match = items.find(a =>
            a.name.trim().toLowerCase() === lowerTitle &&
            a.artists?.some(ar => ar.name.trim().toLowerCase() === artistName.trim().toLowerCase())
          ) ?? items.find(a => a.name.trim().toLowerCase() === lowerTitle)
          if (match?.external_urls?.spotify) {
            updated.streamingLinks = [
              ...(updated.streamingLinks ?? []),
              { platform: 'spotify', url: match.external_urls.spotify },
            ]
          }
        }
      }
    } catch {
      // Spotify fallback failure is non-fatal
    }
  }

  // ── Step 3: MusicBrainz — apply locally-matched metadata (type + date) ──
  const withMB = applyMBMetadata(updated, mbMap)
  if (withMB.type && withMB.type !== updated.type) typeDetected = true
  Object.assign(updated, withMB)

  // ── Tracklist + type detection fallback: fetch iTunes tracklist ONCE and reuse ──
  let tracks: Array<{ title: string; duration?: string; artist?: string; featuredArtists?: string[] }> = updated.tracks ?? []
  if (!tracks.length && release.id.startsWith('itunes-')) {
    tracks = await fetchITunesTracklist(release.id, artistName)
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

    // 1. Fetch releases from iTunes AND Discogs in parallel (both primary sources)
    const [itunesReleases, discogsReleases] = await Promise.all([
      fetchITunesReleases(artistName).catch((err: unknown) => {
        console.warn('[releases-enrich] iTunes fetch failed:', err)
        return [] as Release[]
      }),
      process.env.DISCOGS_TOKEN
        ? fetchDiscogsReleases(artistName).catch((err: unknown) => {
            console.warn('[releases-enrich] Discogs fetch failed:', err)
            return [] as Release[]
          })
        : Promise.resolve([] as Release[]),
    ])

    // 2. Aggregate + deduplicate using best-of-breed quality rules
    let releases = aggregateReleases(itunesReleases, discogsReleases)
    const sourceLabel = `itunes:${itunesReleases.length} discogs:${discogsReleases.length} → aggregated:${releases.length}`
    console.log(`[releases-enrich] Source counts: ${sourceLabel}`)

    // 3. Spotify ultra-fallback — only when both iTunes AND Discogs returned nothing
    if (releases.length === 0) {
      console.log('[releases-enrich] iTunes + Discogs returned 0 releases, trying Spotify fallback…')
      releases = await fetchSpotifyReleases(artistName)
    }

    if (releases.length === 0) {
      res.status(200).json({ ok: true, message: 'No releases found from iTunes, Spotify or Discogs', queued: 0, synced: 0 })
      return
    }

    // 4. Fetch ALL MusicBrainz release-groups by artist in a two-step query, then
    //    build a lookup map for local title-based matching (no per-release API calls).
    let mbMap: Map<string, MbReleaseData> = new Map()
    try {
      const mbReleaseGroups = await fetchAllMBReleasesByArtist(artistName)
      mbMap = buildMBReleaseTitleMap(mbReleaseGroups)
      console.log(`[releases-enrich] MusicBrainz: fetched ${mbReleaseGroups.length} release-groups, built map with ${mbMap.size} distinct releases`)
    } catch (mbErr) {
      console.warn('[releases-enrich] MusicBrainz bulk fetch failed — continuing without MB metadata:', mbErr)
    }

    // 5. Apply MB metadata synchronously (no per-release API calls — map already built).
    //    Write the unenriched-but-MB-enriched releases to band-data immediately so the
    //    frontend can display releases right away (streaming links come later via worker).
    const releasesWithMB = releases.map(r => applyMBMetadata(r, mbMap))

    try {
      const existingReleases = existingBandData?.releases ?? []
      const mergedReleasesWithMB = mergeWithExistingReleases(releasesWithMB, existingReleases)
      await redis.set(BAND_DATA_KEY, { ...(existingBandData ?? {}), releases: mergedReleasesWithMB })
    } catch (writeErr) {
      console.error('[releases-enrich] Failed to write releases to band-data:', writeErr)
    }

    // 6. Store releases + MB map into the queue for the worker to drain (Odesli enrichment)
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

    console.log(`[releases-enrich] Written ${releasesWithMB.length} releases to band-data and queued for Odesli enrichment (${sourceLabel})`)
    res.status(200).json({
      ok: true,
      sources: sourceLabel,
      synced: releasesWithMB.length,
      queued: releasesWithMB.length,
      message: 'Releases written to band-data. Odesli enrichment queued.',
    })
  } catch (error) {
    console.error('[releases-enrich] Unexpected error:', error)
    res.status(500).json({ error: 'Failed to enrich releases' })
  }
}