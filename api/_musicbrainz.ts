/**
 * Shared MusicBrainz helper functions used by both releases-enrich.ts and
 * releases-enrich-single.ts.
 *
 * User-Agent policy: MusicBrainz requires a descriptive User-Agent with a
 * contact URL. We send 'ZardonicWebsite/1.0 (https://zardonic.com)' on every
 * request. Rate limit: 1 request/second max — callers must add delays.
 */
import { fetchWithRetry } from './_fetch-retry.js'

export const MB_USER_AGENT = `ZardonicWebsite/1.0 (${process.env.SITE_URL || 'https://zardonic.com'})`

// ─── MusicBrainz API types ────────────────────────────────────────────────────

export interface MbSearchRelease {
  id: string
  title: string
  date?: string
  'primary-type'?: string
  'secondary-types'?: string[]
  score?: number
}

interface MbSearchResponse {
  releases?: MbSearchRelease[]
}

export interface MbTrack {
  position: number
  title: string
  length?: number
}

export interface MbMedium {
  tracks?: MbTrack[]
}

export interface MbRelation {
  type: string
  url?: { resource: string }
}

export interface MbFullRelease {
  id: string
  title: string
  date?: string
  'primary-type'?: string
  'secondary-types'?: string[]
  media?: MbMedium[]
  relations?: MbRelation[]
}

// ─── Release-group bulk fetch types ──────────────────────────────────────────

interface MbArtistSearchResponse {
  artists?: Array<{ id: string; name: string; score?: number }>
}

interface MbReleaseGroup {
  id: string
  title: string
  'first-release-date'?: string
  'primary-type'?: string
  'secondary-types'?: string[]
}

interface MbReleaseGroupSearchResponse {
  'release-groups'?: MbReleaseGroup[]
  count?: number
  offset?: number
}

/**
 * A condensed map entry derived from MB recordings for matching against
 * iTunes release titles.
 */
export interface MbReleaseData {
  title: string
  date?: string
  primaryType?: string
  secondaryTypes?: string[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Format milliseconds to M:SS */
export function msToTime(ms: number): string {
  const s = Math.round(ms / 1000)
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`
}

/**
 * Check whether a URL's hostname exactly matches `host` or is a subdomain of it.
 * Guards against URLs like "https://evil.com/open.spotify.com" that would
 * otherwise pass a naive .includes() check.
 */
export function isTrustedHost(url: string, host: string): boolean {
  try {
    const h = new URL(url).hostname.toLowerCase()
    return h === host || h.endsWith(`.${host}`)
  } catch { return false }
}

/** Map MusicBrainz primary/secondary type to the site's release type enum. */
export function mbTypeToReleaseType(
  primary?: string,
  secondary?: string[],
): '' | 'album' | 'ep' | 'single' | 'remix' | 'compilation' {
  const sec = (secondary ?? []).map(s => s.toLowerCase())
  if (sec.includes('compilation'))       return 'compilation'
  if (sec.includes('remix'))             return 'remix'
  if (sec.includes('mixtape/street'))    return 'compilation'
  const p = (primary ?? '').toLowerCase()
  if (p === 'single') return 'single'
  if (p === 'ep')     return 'ep'
  if (p === 'album')  return 'album'
  return ''
}

/** Infer release type from title keywords (fallback when MusicBrainz has no match). */
export function inferTypeFromTitle(title: string): '' | 'album' | 'ep' | 'single' | 'remix' | 'compilation' {
  const l = title.toLowerCase()
  if (l.includes('compilation') || l.includes('best of') || l.includes('greatest hits')) return 'compilation'
  if (l.includes('remix') || l.includes('remixes') || l.includes('rmx') || l.includes(' mix')) return 'remix'
  return ''
}

/** Search MusicBrainz for a release by title + artist name "Zardonic". */
export async function searchMusicBrainz(title: string, artistName = 'Zardonic'): Promise<MbSearchRelease | null> {
  // Strip common iTunes title suffixes that MusicBrainz doesn't use
  const cleanTitle = title
    .replace(/\s*-\s*(single|ep|album|remix|remixes|deluxe edition|special edition)\s*$/i, '')
    .trim()
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
  const safeArtist = artistName
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')

  // Try with artist filter first
  const query1 = `release:"${cleanTitle}" AND artist:${safeArtist}`
  const url1 = `https://musicbrainz.org/ws/2/release/?query=${encodeURIComponent(query1)}&fmt=json&limit=5`
  const res1 = await fetchWithRetry(url1, { headers: { 'User-Agent': MB_USER_AGENT } })
  if (res1.ok) {
    const data1: MbSearchResponse = await res1.json()
    if (data1.releases && data1.releases.length > 0) return data1.releases[0]
  }

  // Fallback: search by title only (no artist filter) — catches featured/collab releases
  const query2 = `release:"${cleanTitle}"`
  const url2 = `https://musicbrainz.org/ws/2/release/?query=${encodeURIComponent(query2)}&fmt=json&limit=5`
  const res2 = await fetchWithRetry(url2, { headers: { 'User-Agent': MB_USER_AGENT } })
  if (!res2.ok) return null
  const data2: MbSearchResponse = await res2.json()
  return data2.releases?.[0] ?? null
}

/** Fetch the full MusicBrainz release (with recordings + url-rels). */
export async function fetchMusicBrainzRelease(mbid: string): Promise<MbFullRelease | null> {
  const url = `https://musicbrainz.org/ws/2/release/${mbid}?inc=recordings+url-rels&fmt=json`
  const res = await fetchWithRetry(url, { headers: { 'User-Agent': MB_USER_AGENT } })
  if (!res.ok) return null
  return res.json() as Promise<MbFullRelease>
}

// ─── Bulk recording fetch + local matching ────────────────────────────────────

/**
 * Normalize a release/recording title for fuzzy comparison:
 * lowercase, strip common suffixes like " - EP", "(feat. …)", and extra spaces.
 */
function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/\s*-\s*(ep|single|remixes?|deluxe edition|special edition)\s*$/i, '')
    .replace(/\s*\(feat\.[^)]*\)/gi, '')
    .replace(/\s*\[[^\]]*\]/g, '')
    .replace(/[\u2018\u2019`]/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Fetch all release-groups for an artist from MusicBrainz using a two-step approach:
 * 1. Find the artist MBID via the artist search endpoint.
 * 2. Fetch all release-groups for that artist via the release-group browse endpoint.
 *
 * This is the correct approach because `inc=` parameters are silently ignored on
 * search endpoints — they only work on direct lookup endpoints.
 */
export async function fetchAllMBReleasesByArtist(
  artistName: string,
  limit = 100,
): Promise<MbReleaseGroup[]> {
  // Step 1: Find artist MBID
  const artistUrl = `https://musicbrainz.org/ws/2/artist?query=artist:${encodeURIComponent(`"${artistName}"`)}&fmt=json&limit=1`
  const artistRes = await fetchWithRetry(artistUrl, { headers: { 'User-Agent': MB_USER_AGENT } })
  if (!artistRes.ok) return []
  const artistData: MbArtistSearchResponse = await artistRes.json()
  const mbid = artistData.artists?.[0]?.id
  if (!mbid) return []

  // Step 2: Fetch all release-groups for the artist MBID
  const rgUrl = `https://musicbrainz.org/ws/2/release-group?artist=${encodeURIComponent(mbid)}&fmt=json&limit=${limit}`
  const rgRes = await fetchWithRetry(rgUrl, { headers: { 'User-Agent': MB_USER_AGENT } })
  if (!rgRes.ok) return []
  const rgData: MbReleaseGroupSearchResponse = await rgRes.json()
  return rgData['release-groups'] ?? []
}

/**
 * Build a lookup map from normalised release title → MB release metadata.
 * Sources data from release-group objects returned by the browse endpoint.
 */
export function buildMBReleaseTitleMap(releaseGroups: MbReleaseGroup[]): Map<string, MbReleaseData> {
  const map = new Map<string, MbReleaseData>()
  for (const rg of releaseGroups) {
    const key = normalizeTitle(rg.title)
    if (!map.has(key)) {
      map.set(key, {
        title: rg.title,
        date: rg['first-release-date'],
        primaryType: rg['primary-type'],
        secondaryTypes: rg['secondary-types'],
      })
    }
  }
  return map
}

/**
 * Try to find MusicBrainz release data for an iTunes release title using the
 * pre-built title map.  Returns `null` when no match is found.
 */
export function matchITunesReleaseToMBData(
  itunesTitle: string,
  map: Map<string, MbReleaseData>,
): MbReleaseData | null {
  const key = normalizeTitle(itunesTitle)
  const exact = map.get(key)
  if (exact) return exact

  // Partial match: check whether any MB title starts with the normalized iTunes title
  // (handles cases like "Villain - EP" matching iTunes "Villain")
  for (const [mbKey, data] of map) {
    if (mbKey.startsWith(key) || key.startsWith(mbKey)) return data
  }

  return null
}
