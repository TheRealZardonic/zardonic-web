/**
 * Unit tests for api/_discogs.ts
 *
 * All external HTTP requests are mocked via _fetch-retry.js so no real network
 * calls are made.  The tests verify:
 *  1. discogsHeaders — correct Authorization and User-Agent headers
 *  2. extractDiscogsRateLimits — parses X-Discogs-Ratelimit-* headers
 *  3. fetchDiscogsArtistId — searches /database/search, exact match preferred
 *  4. fetchDiscogsArtistReleases — handles pagination, returns all items
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---------------------------------------------------------------------------
// Mock _fetch-retry.js
// ---------------------------------------------------------------------------
const mockFetchWithRetry = vi.fn()
vi.mock('../../api/_fetch-retry.js', () => ({
  fetchWithRetry: (...args: unknown[]) => mockFetchWithRetry(...args),
}))

// ---------------------------------------------------------------------------
// Import module under test AFTER mocks are registered
// ---------------------------------------------------------------------------
const {
  DISCOGS_USER_AGENT,
  discogsHeaders,
  extractDiscogsRateLimits,
  fetchDiscogsArtistId,
  fetchDiscogsArtistReleases,
} = await import('../../api/_discogs.js')

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeResponse(body: unknown, status = 200, extraHeaders?: Record<string, string>): Response {
  const headers = new Headers({
    'Content-Type': 'application/json',
    ...extraHeaders,
  })
  return {
    ok: status >= 200 && status < 300,
    status,
    headers,
    json: () => Promise.resolve(body),
  } as unknown as Response
}

// ---------------------------------------------------------------------------
// discogsHeaders
// ---------------------------------------------------------------------------
describe('discogsHeaders', () => {
  it('returns Authorization header with token', () => {
    const h = discogsHeaders('my-secret-token')
    expect(h['Authorization']).toBe('Discogs token=my-secret-token')
  })

  it('includes the shared DISCOGS_USER_AGENT', () => {
    const h = discogsHeaders('tok')
    expect(h['User-Agent']).toBe(DISCOGS_USER_AGENT)
    expect(h['User-Agent']).toMatch(/ZardonicWebsite\/1\.0/)
  })

  it('includes Accept: application/json', () => {
    const h = discogsHeaders('tok')
    expect(h['Accept']).toBe('application/json')
  })
})

// ---------------------------------------------------------------------------
// extractDiscogsRateLimits
// ---------------------------------------------------------------------------
describe('extractDiscogsRateLimits', () => {
  it('extracts all three rate-limit headers', () => {
    const headers = new Headers({
      'X-Discogs-Ratelimit': '60',
      'X-Discogs-Ratelimit-Remaining': '45',
      'X-Discogs-Ratelimit-Used': '15',
    })
    const info = extractDiscogsRateLimits(headers)
    expect(info.limit).toBe(60)
    expect(info.remaining).toBe(45)
    expect(info.used).toBe(15)
  })

  it('returns null for missing headers', () => {
    const headers = new Headers()
    const info = extractDiscogsRateLimits(headers)
    expect(info.limit).toBeNull()
    expect(info.remaining).toBeNull()
    expect(info.used).toBeNull()
  })

  it('returns null for non-numeric header values', () => {
    const headers = new Headers({
      'X-Discogs-Ratelimit': 'not-a-number',
    })
    const info = extractDiscogsRateLimits(headers)
    expect(info.limit).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// fetchDiscogsArtistId
// ---------------------------------------------------------------------------
describe('fetchDiscogsArtistId', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('returns the id of the exact-match artist result', async () => {
    mockFetchWithRetry.mockResolvedValueOnce(makeResponse({
      results: [
        { id: 99, title: 'Other Artist', type: 'artist' },
        { id: 42, title: 'Zardonic', type: 'artist' },
      ],
      pagination: { page: 1, pages: 1, per_page: 10, items: 2 },
    }))

    const id = await fetchDiscogsArtistId('Zardonic', 'tok')
    expect(id).toBe(42)
  })

  it('returns the first artist-type result when no exact match', async () => {
    mockFetchWithRetry.mockResolvedValueOnce(makeResponse({
      results: [
        { id: 7, title: 'Zardonic (DJ)', type: 'artist' },
      ],
      pagination: { page: 1, pages: 1, per_page: 10, items: 1 },
    }))

    const id = await fetchDiscogsArtistId('Zardonic', 'tok')
    expect(id).toBe(7)
  })

  it('returns null when results array is empty', async () => {
    mockFetchWithRetry.mockResolvedValueOnce(makeResponse({ results: [], pagination: { page: 1, pages: 1, per_page: 10, items: 0 } }))
    const id = await fetchDiscogsArtistId('Unknown Artist', 'tok')
    expect(id).toBeNull()
  })

  it('returns null on non-OK response', async () => {
    mockFetchWithRetry.mockResolvedValueOnce(makeResponse({ error: 'Not Found' }, 404))
    const id = await fetchDiscogsArtistId('Zardonic', 'tok')
    expect(id).toBeNull()
  })

  it('returns null on network error', async () => {
    mockFetchWithRetry.mockRejectedValueOnce(new Error('Network error'))
    const id = await fetchDiscogsArtistId('Zardonic', 'tok')
    expect(id).toBeNull()
  })

  it('passes the correct Authorization header', async () => {
    mockFetchWithRetry.mockResolvedValueOnce(makeResponse({ results: [], pagination: {} }))
    await fetchDiscogsArtistId('Zardonic', 'test-token-123')
    const [, options] = mockFetchWithRetry.mock.calls[0]
    expect(options.headers['Authorization']).toBe('Discogs token=test-token-123')
  })

  it('encodes the artist name in the search URL', async () => {
    mockFetchWithRetry.mockResolvedValueOnce(makeResponse({ results: [], pagination: {} }))
    await fetchDiscogsArtistId('Daft Punk', 'tok')
    const [url] = mockFetchWithRetry.mock.calls[0]
    expect(url).toContain(encodeURIComponent('Daft Punk'))
    expect(url).toContain('type=artist')
  })
})

// ---------------------------------------------------------------------------
// fetchDiscogsArtistReleases
// ---------------------------------------------------------------------------
describe('fetchDiscogsArtistReleases', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('returns all releases from a single page', async () => {
    mockFetchWithRetry.mockResolvedValueOnce(makeResponse({
      releases: [
        { id: 1, title: 'Album A', year: 2020, type: 'master' },
        { id: 2, title: 'Single B', year: 2021, type: 'master' },
      ],
      pagination: { page: 1, pages: 1, per_page: 100, items: 2 },
    }))

    const releases = await fetchDiscogsArtistReleases(42, 'tok')
    expect(releases).toHaveLength(2)
    expect(releases[0].title).toBe('Album A')
    expect(releases[1].title).toBe('Single B')
  })

  it('follows pagination and collects all pages', async () => {
    // Page 1
    mockFetchWithRetry.mockResolvedValueOnce(makeResponse({
      releases: [{ id: 1, title: 'Album A', type: 'master' }],
      pagination: { page: 1, pages: 2, per_page: 1, items: 2 },
    }))
    // Page 2
    mockFetchWithRetry.mockResolvedValueOnce(makeResponse({
      releases: [{ id: 2, title: 'Album B', type: 'master' }],
      pagination: { page: 2, pages: 2, per_page: 1, items: 2 },
    }))

    const releases = await fetchDiscogsArtistReleases(42, 'tok')
    expect(releases).toHaveLength(2)
    expect(mockFetchWithRetry).toHaveBeenCalledTimes(2)
    const [url1] = mockFetchWithRetry.mock.calls[0]
    const [url2] = mockFetchWithRetry.mock.calls[1]
    expect(url1).toContain('page=1')
    expect(url2).toContain('page=2')
  })

  it('returns empty array on non-OK response', async () => {
    mockFetchWithRetry.mockResolvedValueOnce(makeResponse({ message: 'Resource not found.' }, 404))
    const releases = await fetchDiscogsArtistReleases(999, 'tok')
    expect(releases).toHaveLength(0)
  })

  it('returns empty array on network error', async () => {
    mockFetchWithRetry.mockRejectedValueOnce(new Error('Timeout'))
    const releases = await fetchDiscogsArtistReleases(42, 'tok')
    expect(releases).toHaveLength(0)
  })

  it('uses the artist id in the URL', async () => {
    mockFetchWithRetry.mockResolvedValueOnce(makeResponse({ releases: [], pagination: { page: 1, pages: 1, per_page: 100, items: 0 } }))
    await fetchDiscogsArtistReleases(12345, 'tok')
    const [url] = mockFetchWithRetry.mock.calls[0]
    expect(url).toContain('/artists/12345/releases')
  })

  it('passes the Authorization header on every request', async () => {
    mockFetchWithRetry.mockResolvedValueOnce(makeResponse({ releases: [], pagination: { page: 1, pages: 1, per_page: 100, items: 0 } }))
    await fetchDiscogsArtistReleases(1, 'super-secret')
    const [, options] = mockFetchWithRetry.mock.calls[0]
    expect(options.headers['Authorization']).toBe('Discogs token=super-secret')
  })

  it('handles missing pagination gracefully (defaults to 1 page)', async () => {
    mockFetchWithRetry.mockResolvedValueOnce(makeResponse({
      releases: [{ id: 3, title: 'EP C', type: 'master' }],
      // no pagination field
    }))

    const releases = await fetchDiscogsArtistReleases(1, 'tok')
    expect(releases).toHaveLength(1)
    expect(mockFetchWithRetry).toHaveBeenCalledTimes(1)
  })
})
