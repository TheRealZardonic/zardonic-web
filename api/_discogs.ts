/**
 * Shared Discogs API helper functions.
 *
 * Authentication: Personal Access Token passed as
 *   Authorization: Discogs token=<DISCOGS_TOKEN>
 *
 * User-Agent policy: Discogs requires a descriptive User-Agent string.
 * We send 'ZardonicWebsite/1.0 +https://zardonic.com' on every request.
 *
 * Rate limits (authenticated):
 *   60 requests/minute — callers should add courteous delays between pages.
 *
 * Exports:
 *   - DISCOGS_USER_AGENT       — shared User-Agent constant
 *   - discogsHeaders           — build authenticated request headers
 *   - extractDiscogsRateLimits — parse X-Discogs-Ratelimit-* response headers
 *   - fetchDiscogsArtistId     — Step 2: search /database/search → artist id
 *   - fetchDiscogsArtistReleases — Step 3: paginated /artists/{id}/releases
 */
import { fetchWithRetry } from './_fetch-retry.js'

export const DISCOGS_USER_AGENT = `ZardonicWebsite/1.0 +${process.env.SITE_URL || 'https://zardonic.com'}`
const DISCOGS_BASE = 'https://api.discogs.com'
/** Courteous inter-page delay so we stay well within the 60 req/min limit. */
const PAGE_DELAY_MS = 600

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DiscogsArtistSearchResult {
  id: number
  title: string
  type: string
  resource_url?: string
  thumb?: string
}

export interface DiscogsArtistSearchResponse {
  results?: DiscogsArtistSearchResult[]
  pagination?: DiscogsPagination
}

export interface DiscogsPagination {
  page: number
  pages: number
  per_page: number
  items: number
}

/** A single item in the /artists/{id}/releases response. */
export interface DiscogsReleaseItem {
  id: number
  title: string
  year?: number
  /** 'master' (canonical entry) or 'release' (pressing/format). */
  type?: string
  role?: string
  artist?: string
  thumb?: string
  resource_url?: string
  main_release?: number
  format?: string
  label?: string
  catno?: string
  status?: string
}

export interface DiscogsReleasesResponse {
  releases?: DiscogsReleaseItem[]
  pagination?: DiscogsPagination
}

export interface DiscogsRateLimitInfo {
  limit: number | null
  remaining: number | null
  used: number | null
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Build the HTTP headers required for every authenticated Discogs request. */
export function discogsHeaders(token: string): Record<string, string> {
  return {
    'User-Agent': DISCOGS_USER_AGENT,
    'Authorization': `Discogs token=${token}`,
    'Accept': 'application/json',
  }
}

/**
 * Extract Discogs rate-limit counters from the HTTP response headers.
 * Useful for health monitoring and adaptive back-off in callers.
 */
export function extractDiscogsRateLimits(headers: Headers): DiscogsRateLimitInfo {
  const parse = (key: string): number | null => {
    const raw = headers.get(key)
    if (!raw) return null
    const n = parseInt(raw, 10)
    return isNaN(n) ? null : n
  }
  return {
    limit:     parse('X-Discogs-Ratelimit'),
    remaining: parse('X-Discogs-Ratelimit-Remaining'),
    used:      parse('X-Discogs-Ratelimit-Used'),
  }
}

// ─── Step 2: Find artist ID ───────────────────────────────────────────────────

/**
 * Search the Discogs database for an artist by name.
 *
 * Sends GET /database/search?q={artistName}&type=artist and extracts the id
 * from the first result whose `type === 'artist'`.  Falls back to the first
 * result of any type if no strict artist match is found.
 *
 * Returns `null` when no results are returned or an error occurs.
 */
export async function fetchDiscogsArtistId(
  artistName: string,
  token: string,
): Promise<number | null> {
  const url = `${DISCOGS_BASE}/database/search?q=${encodeURIComponent(artistName)}&type=artist&per_page=10`
  try {
    const res = await fetchWithRetry(url, { headers: discogsHeaders(token) })
    if (!res.ok) return null
    const data: DiscogsArtistSearchResponse = await res.json()
    const results = data.results ?? []
    // Prefer an exact case-insensitive title match on type=artist
    const exact = results.find(
      r => r.type === 'artist' && r.title.toLowerCase() === artistName.toLowerCase(),
    )
    const first = results.find(r => r.type === 'artist') ?? results[0]
    return (exact ?? first)?.id ?? null
  } catch {
    return null
  }
}

// ─── Step 3: Fetch all artist releases (paginated) ───────────────────────────

/**
 * Fetch the complete release list for a Discogs artist.
 *
 * Calls GET /artists/{artistId}/releases?per_page=100&page=N and follows all
 * pagination links until the last page is reached.
 *
 * A courteous inter-page delay of 600 ms is inserted between requests to stay
 * well within the 60 req/min authenticated rate limit.
 *
 * Returns an empty array on error so the caller can gracefully fall through.
 */
export async function fetchDiscogsArtistReleases(
  artistId: number,
  token: string,
): Promise<DiscogsReleaseItem[]> {
  const all: DiscogsReleaseItem[] = []
  let page = 1
  let totalPages = 1

  do {
    const url = `${DISCOGS_BASE}/artists/${artistId}/releases?per_page=100&page=${page}&sort=year&sort_order=desc`
    try {
      const res = await fetchWithRetry(url, { headers: discogsHeaders(token) })
      if (!res.ok) break
      const data: DiscogsReleasesResponse = await res.json()
      const items = data.releases ?? []
      all.push(...items)
      totalPages = data.pagination?.pages ?? 1
    } catch {
      break
    }
    page++
    if (page <= totalPages) {
      await new Promise<void>(resolve => setTimeout(resolve, PAGE_DELAY_MS))
    }
  } while (page <= totalPages)

  return all
}
