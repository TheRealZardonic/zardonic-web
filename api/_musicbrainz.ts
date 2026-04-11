/**
 * Shared MusicBrainz helper functions used by both releases-enrich.ts and
 * releases-enrich-single.ts.
 *
 * User-Agent policy: MusicBrainz requires a descriptive User-Agent with a
 * contact URL. We send 'ZardonicWebsite/1.0 (https://zardonic.com)' on every
 * request. Rate limit: 1 request/second max — callers must add delays.
 */
import { fetchWithRetry } from './_fetch-retry.js'

export const MB_USER_AGENT = 'ZardonicWebsite/1.0 (https://zardonic.com)'

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

// ─── Recording-based bulk fetch types ────────────────────────────────────────

interface MbReleaseRef {
  id: string
  title: string
  date?: string
  'release-group'?: {
    id: string
    'primary-type'?: string
    'secondary-types'?: string[]
  }
}

interface MbRecording {
  id: string
  title: string
  length?: number
  'first-release-date'?: string
  releases?: MbReleaseRef[]
}

interface MbRecordingSearchResponse {
  recordings?: MbRecording[]
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
  const query = `release:"${title}" AND artist:${artistName}`
  const url = `https://musicbrainz.org/ws/2/release/?query=${encodeURIComponent(query)}&fmt=json&limit=5`
  const res = await fetchWithRetry(url, { headers: { 'User-Agent': MB_USER_AGENT } })
  if (!res.ok) return null
  const data: MbSearchResponse = await res.json()
  return data.releases?.[0] ?? null
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
 * Fetch all recordings by artist from MusicBrainz in a single request
 * (up to `limit` results, default 100).
 *
 * Uses the /ws/2/recording endpoint with `inc=releases+release-groups` so each
 * recording carries its parent release info (type, date).
 */
export async function fetchAllMBRecordingsByArtist(
  artistName: string,
  limit = 100,
): Promise<MbRecording[]> {
  const query = `artist:"${artistName}"`
  const url = `https://musicbrainz.org/ws/2/recording?query=${encodeURIComponent(query)}&fmt=json&limit=${limit}&inc=releases+release-groups`
  const res = await fetchWithRetry(url, { headers: { 'User-Agent': MB_USER_AGENT } })
  if (!res.ok) return []
  const data: MbRecordingSearchResponse = await res.json()
  return data.recordings ?? []
}

/**
 * Build a lookup map from normalised release title → MB release metadata.
 * Iterates all recordings and extracts the distinct parent releases.
 */
export function buildMBReleaseTitleMap(recordings: MbRecording[]): Map<string, MbReleaseData> {
  const map = new Map<string, MbReleaseData>()
  for (const rec of recordings) {
    for (const rel of rec.releases ?? []) {
      const key = normalizeTitle(rel.title)
      if (!map.has(key)) {
        map.set(key, {
          title: rel.title,
          date: rel.date,
          primaryType: rel['release-group']?.['primary-type'],
          secondaryTypes: rel['release-group']?.['secondary-types'],
        })
      }
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
