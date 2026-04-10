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
