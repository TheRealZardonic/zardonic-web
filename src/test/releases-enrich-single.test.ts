/**
 * Tests for POST /api/releases-enrich-single
 *
 * Strategy:
 *  - `_fetch-retry`, `_redis`, `auth`, `_musicbrainz`, `_spotify-client` are
 *    mocked at module level.
 *  - `_odesli` is NOT mocked so that the real `fetchOdesliLinks` logic runs
 *    (TTL selection, platform loop) with mocked fetchWithRetry and Redis.
 *  - Tests for TTL behaviour (3, 4) call `fetchOdesliLinks` directly.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import type { Redis } from '@upstash/redis'

// ---------------------------------------------------------------------------
// Shared mock state for Redis
// ---------------------------------------------------------------------------
const mockRedisGet = vi.fn()
const mockRedisSet = vi.fn()
const mockRedisDel = vi.fn()

const mockRedis = {
  get: mockRedisGet,
  set: mockRedisSet,
  del: mockRedisDel,
} as unknown as Redis

// ---------------------------------------------------------------------------
// Mock @upstash/redis (used by `_odesli.ts` type system but not instantiated
// directly — we pass the mock object via `getRedisOrNull`)
// ---------------------------------------------------------------------------
vi.mock('@upstash/redis', () => ({
  Redis: class {
    get(...args: unknown[]) { return mockRedisGet(...args) }
    set(...args: unknown[]) { return mockRedisSet(...args) }
    del(...args: unknown[]) { return mockRedisDel(...args) }
  },
}))

// ---------------------------------------------------------------------------
// Mock _redis.js
// ---------------------------------------------------------------------------
vi.mock('../../api/_redis.js', () => ({
  isRedisConfigured: () => true,
  getRedisOrNull: () => mockRedis,
}))

// ---------------------------------------------------------------------------
// Mock auth.js
// ---------------------------------------------------------------------------
const mockValidateSession = vi.fn()
vi.mock('../../api/auth.js', () => ({
  validateSession: (...args: unknown[]) => mockValidateSession(...args),
}))

// ---------------------------------------------------------------------------
// Mock _fetch-retry.js
// ---------------------------------------------------------------------------
const mockFetchWithRetry = vi.fn()
vi.mock('../../api/_fetch-retry.js', () => ({
  fetchWithRetry: (...args: unknown[]) => mockFetchWithRetry(...args),
}))

// ---------------------------------------------------------------------------
// Mock _musicbrainz.js
// ---------------------------------------------------------------------------
const mockLookupArtistMbid = vi.fn()
const mockSearchMusicBrainz = vi.fn()
const mockFetchMusicBrainzRelease = vi.fn()
vi.mock('../../api/_musicbrainz.js', () => ({
  lookupArtistMbid: (...args: unknown[]) => mockLookupArtistMbid(...args),
  searchMusicBrainz: (...args: unknown[]) => mockSearchMusicBrainz(...args),
  fetchMusicBrainzRelease: (...args: unknown[]) => mockFetchMusicBrainzRelease(...args),
  msToTime: (_ms: number) => '3:30',
  mbTypeToReleaseType: () => '',
  inferTypeFromTitle: () => '',
  MB_USER_AGENT: 'ZardonicWebsite/1.0 (https://zardonic.com)',
}))

// ---------------------------------------------------------------------------
// Mock _spotify-client.js
// ---------------------------------------------------------------------------
const mockGetSpotifyAccessToken = vi.fn()
vi.mock('../../api/_spotify-client.js', () => ({
  getSpotifyAccessToken: (...args: unknown[]) => mockGetSpotifyAccessToken(...args),
}))

// ---------------------------------------------------------------------------
// Import modules AFTER mocks are registered
// ---------------------------------------------------------------------------
const { default: handler } = await import('../../api/releases-enrich-single.js')
const { fetchOdesliLinks, odesliCacheKey } = await import('../../api/_odesli.js')

// ---------------------------------------------------------------------------
// Helper types and factories
// ---------------------------------------------------------------------------
type MockRes = {
  status: ReturnType<typeof vi.fn>
  json: ReturnType<typeof vi.fn>
  end: ReturnType<typeof vi.fn>
  setHeader: ReturnType<typeof vi.fn>
}

function mockRes(): MockRes {
  const res: MockRes = {
    status: vi.fn(),
    json: vi.fn(),
    end: vi.fn(),
    setHeader: vi.fn(),
  }
  res.status.mockReturnValue(res)
  res.json.mockReturnValue(res)
  res.end.mockReturnValue(res)
  res.setHeader.mockReturnValue(res)
  return res
}

function mockReq(body: Record<string, unknown> = {}): VercelRequest {
  return {
    method: 'POST',
    headers: {},
    body,
  } as unknown as VercelRequest
}

function jsonResponse(data: unknown) {
  return {
    ok: true,
    status: 200,
    json: vi.fn().mockResolvedValue(data),
  }
}

const APPLE_URL = 'https://music.apple.com/us/album/test/123'

function makeSiteData(releaseOverrides: Record<string, unknown> = {}) {
  return {
    releases: [{
      id: 'itunes-123',
      title: 'Test Album',
      artwork: 'https://example.com/art.jpg',
      year: '2024',
      streamingLinks: [{ platform: 'appleMusic', url: APPLE_URL }],
      ...releaseOverrides,
    }],
  }
}

// ---------------------------------------------------------------------------
// beforeEach — reset all mocks to clean defaults
// ---------------------------------------------------------------------------
beforeEach(() => {
  vi.clearAllMocks()
  mockValidateSession.mockResolvedValue(true)
  mockRedisSet.mockResolvedValue('OK')
  mockRedisDel.mockResolvedValue(1)
  mockSearchMusicBrainz.mockResolvedValue(null)
  mockFetchMusicBrainzRelease.mockResolvedValue(null)
  mockLookupArtistMbid.mockResolvedValue(null)
  mockGetSpotifyAccessToken.mockResolvedValue(null)

  delete process.env.SPOTIFY_CLIENT_ID
  delete process.env.SPOTIFY_CLIENT_SECRET
})

// ===========================================================================
// 1. Odesli: alle Plattformen werden übernommen
// ===========================================================================
describe('Odesli: alle Plattformen werden übernommen', () => {
  it('pandora, yandex, appleMusic, spotify are all in streamingLinks', async () => {
    mockRedisGet
      .mockResolvedValueOnce(makeSiteData())  // BAND_DATA_KEY
      .mockResolvedValueOnce(null)            // odesli cache miss

    mockFetchWithRetry.mockResolvedValueOnce(jsonResponse({
      linksByPlatform: {
        pandora: { url: 'https://pandora.com/album/1' },
        yandex: { url: 'https://music.yandex.ru/album/1' },
        appleMusic: { url: APPLE_URL },
        spotify: { url: 'https://open.spotify.com/album/abc' },
      },
    }))

    const res = mockRes()
    await handler(mockReq({ id: 'itunes-123' }), res as unknown as VercelResponse)

    expect(res.status).toHaveBeenCalledWith(200)
    const body = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0]
    const platforms = body.release.streamingLinks.map((l: { platform: string }) => l.platform)
    expect(platforms).toContain('pandora')
    expect(platforms).toContain('yandex')
    expect(platforms).toContain('appleMusic')
    expect(platforms).toContain('spotify')
    expect(platforms).toHaveLength(4)
  })
})

// ===========================================================================
// 2. Odesli: `amazon` wird zu `amazonMusic` normalisiert
// ===========================================================================
describe('Odesli: amazon → amazonMusic', () => {
  it('normalises the amazon key to amazonMusic', async () => {
    mockRedisGet
      .mockResolvedValueOnce(makeSiteData())
      .mockResolvedValueOnce(null)

    mockFetchWithRetry.mockResolvedValueOnce(jsonResponse({
      linksByPlatform: {
        amazon: { url: 'https://music.amazon.com/albums/1' },
        spotify: { url: 'https://open.spotify.com/album/abc' },
      },
    }))

    const res = mockRes()
    await handler(mockReq({ id: 'itunes-123' }), res as unknown as VercelResponse)

    const body = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0]
    const platforms = body.release.streamingLinks.map((l: { platform: string }) => l.platform)
    expect(platforms).toContain('amazonMusic')
    expect(platforms).not.toContain('amazon')
  })
})

// ===========================================================================
// 3. Odesli: kurze TTL (7200s) bei fehlendem Spotify + YouTube
// ===========================================================================
describe('Odesli: kurze TTL bei fehlendem Spotify+YouTube', () => {
  it('caches with TTL 7200 when neither spotify nor youtube is in the response', async () => {
    const testUrl = 'https://music.apple.com/ttl-test/123'
    mockRedisGet.mockResolvedValueOnce(null) // cache miss

    mockFetchWithRetry.mockResolvedValueOnce(jsonResponse({
      linksByPlatform: {
        pandora: { url: 'https://pandora.com/album/1' },
        yandex: { url: 'https://music.yandex.ru/album/1' },
      },
    }))

    await fetchOdesliLinks(testUrl, mockRedis)

    const cacheKey = odesliCacheKey(testUrl)
    expect(mockRedisSet).toHaveBeenCalledWith(cacheKey, expect.anything(), { ex: 7200 })
  })
})

// ===========================================================================
// 4. Odesli: normale TTL (86400s) wenn Spotify vorhanden
// ===========================================================================
describe('Odesli: normale TTL wenn Spotify vorhanden', () => {
  it('caches with TTL 86400 when spotify is in the response', async () => {
    const testUrl = 'https://music.apple.com/ttl-test-2/456'
    mockRedisGet.mockResolvedValueOnce(null) // cache miss

    mockFetchWithRetry.mockResolvedValueOnce(jsonResponse({
      linksByPlatform: {
        spotify: { url: 'https://open.spotify.com/album/abc' },
        appleMusic: { url: testUrl },
      },
    }))

    await fetchOdesliLinks(testUrl, mockRedis)

    const cacheKey = odesliCacheKey(testUrl)
    expect(mockRedisSet).toHaveBeenCalledWith(cacheKey, expect.anything(), { ex: 86400 })
  })
})

// ===========================================================================
// 5. MusicBrainz Artist-ID wird geholt wenn artistName gesetzt aber artistMbid fehlt
// ===========================================================================
describe('MusicBrainz Artist-ID Lookup', () => {
  it('calls lookupArtistMbid and sets artistMbid in response when artistName is present', async () => {
    mockLookupArtistMbid.mockResolvedValue('mbid-xyz-789')

    mockRedisGet
      .mockResolvedValueOnce(makeSiteData({ artistName: 'Zardonic' })) // BAND_DATA_KEY
      .mockResolvedValueOnce(null)   // odesli cache miss
      .mockResolvedValueOnce(null)   // mb:artist:refresh:mbid-xyz-789

    mockFetchWithRetry
      .mockResolvedValueOnce(jsonResponse({
        linksByPlatform: { spotify: { url: 'https://open.spotify.com/album/abc' } },
      }))
      .mockResolvedValueOnce(jsonResponse({ id: 'mbid-xyz-789', name: 'Zardonic' })) // artist detail

    const res = mockRes()
    await handler(mockReq({ id: 'itunes-123' }), res as unknown as VercelResponse)

    expect(mockLookupArtistMbid).toHaveBeenCalledWith('Zardonic')
    const body = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(body.release.artistMbid).toBe('mbid-xyz-789')
    expect(body.steps).toContain('MusicBrainz Artist ID: mbid-xyz-789')
  })

  // =========================================================================
  // 6. MusicBrainz Artist-ID wird NICHT geholt wenn artistMbid bereits vorhanden
  // =========================================================================
  it('does NOT call lookupArtistMbid when artistMbid is already present', async () => {
    mockRedisGet
      .mockResolvedValueOnce(makeSiteData({ artistName: 'Zardonic', artistMbid: 'existing-mbid' }))
      .mockResolvedValueOnce(null)   // odesli cache miss
      .mockResolvedValueOnce(null)   // mb:artist:refresh:existing-mbid

    mockFetchWithRetry
      .mockResolvedValueOnce(jsonResponse({
        linksByPlatform: { spotify: { url: 'https://open.spotify.com/album/abc' } },
      }))
      .mockResolvedValueOnce(jsonResponse({ id: 'existing-mbid', name: 'Zardonic' })) // artist detail

    const res = mockRes()
    await handler(mockReq({ id: 'itunes-123' }), res as unknown as VercelResponse)

    expect(mockLookupArtistMbid).not.toHaveBeenCalled()
    const body = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(body.release.artistMbid).toBe('existing-mbid')
  })
})

// ===========================================================================
// 7. Artist-Refresh passiert wenn artistMbid vorhanden und Refresh-Key fehlt
// ===========================================================================
describe('Artist-Refresh', () => {
  it('fetches and caches artist data when refresh key is missing in Redis', async () => {
    mockRedisGet
      .mockResolvedValueOnce(makeSiteData({ artistMbid: 'mbid-refresh-test' }))
      .mockResolvedValueOnce(null)  // odesli cache miss
      .mockResolvedValueOnce(null)  // mb:artist:refresh:mbid-refresh-test missing → needs refresh

    const artistDetail = { id: 'mbid-refresh-test', name: 'Zardonic' }
    mockFetchWithRetry
      .mockResolvedValueOnce(jsonResponse({
        linksByPlatform: { spotify: { url: 'https://open.spotify.com/album/abc' } },
      }))
      .mockResolvedValueOnce(jsonResponse(artistDetail)) // MB artist detail

    const res = mockRes()
    await handler(mockReq({ id: 'itunes-123' }), res as unknown as VercelResponse)

    // Verify artist data was cached
    expect(mockRedisSet).toHaveBeenCalledWith(
      'mb:artist:mbid-refresh-test',
      artistDetail,
      { ex: 86400 }
    )
    // Verify refresh guard key was set
    expect(mockRedisSet).toHaveBeenCalledWith(
      'mb:artist:refresh:mbid-refresh-test',
      1,
      { ex: 86400 }
    )
    const body = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(body.steps).toContain('Artist-Daten gecacht')
  })

  // =========================================================================
  // 8. Artist-Refresh wird übersprungen wenn Refresh-Key bereits in Redis
  // =========================================================================
  it('skips artist data fetch when refresh key is already present in Redis', async () => {
    mockRedisGet
      .mockResolvedValueOnce(makeSiteData({ artistMbid: 'mbid-already-fresh' }))
      .mockResolvedValueOnce(null)  // odesli cache miss
      .mockResolvedValueOnce(1)     // mb:artist:refresh:mbid-already-fresh EXISTS → skip refresh

    mockFetchWithRetry.mockResolvedValueOnce(jsonResponse({
      linksByPlatform: { spotify: { url: 'https://open.spotify.com/album/abc' } },
    }))

    const fetchCallsBefore = mockFetchWithRetry.mock.calls.length

    const res = mockRes()
    await handler(mockReq({ id: 'itunes-123' }), res as unknown as VercelResponse)

    // Only one fetchWithRetry call (for Odesli) — no MB artist detail fetch
    expect(mockFetchWithRetry).toHaveBeenCalledTimes(fetchCallsBefore + 1)
    const body = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(body.steps).toContain('Artist-Daten frisch')
  })
})

// ===========================================================================
// 9. Spotify-Fallback: Link wird gefunden wenn Odesli keinen Spotify-Link hat
// ===========================================================================
describe('Spotify-Fallback', () => {
  it('searches Spotify and adds the link when Odesli has no Spotify entry', async () => {
    process.env.SPOTIFY_CLIENT_ID = 'test-id'
    process.env.SPOTIFY_CLIENT_SECRET = 'test-secret'
    mockGetSpotifyAccessToken.mockResolvedValue('token-abc')

    mockRedisGet
      .mockResolvedValueOnce(makeSiteData({ artistName: 'Zardonic' }))
      .mockResolvedValueOnce(null) // odesli cache miss

    // Odesli returns pandora only (no spotify)
    mockFetchWithRetry
      .mockResolvedValueOnce(jsonResponse({
        linksByPlatform: { pandora: { url: 'https://pandora.com/album/1' } },
      }))
      // Spotify search result
      .mockResolvedValueOnce(jsonResponse({
        albums: {
          items: [{ name: 'Test Album', external_urls: { spotify: 'https://open.spotify.com/album/found' } }],
        },
      }))

    const res = mockRes()
    await handler(mockReq({ id: 'itunes-123' }), res as unknown as VercelResponse)

    const body = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0]
    const platforms = body.release.streamingLinks.map((l: { platform: string }) => l.platform)
    expect(platforms).toContain('spotify')
    const spotifyLink = body.release.streamingLinks.find((l: { platform: string }) => l.platform === 'spotify')
    expect(spotifyLink.url).toBe('https://open.spotify.com/album/found')
    expect(body.steps).toContain('Spotify: gefunden via API')
  })

  // =========================================================================
  // 10. Spotify-Fallback wird übersprungen wenn Spotify-Link bereits vorhanden
  // =========================================================================
  it('skips Spotify search when a spotify link already exists in streamingLinks', async () => {
    process.env.SPOTIFY_CLIENT_ID = 'test-id'
    process.env.SPOTIFY_CLIENT_SECRET = 'test-secret'

    mockRedisGet
      .mockResolvedValueOnce(makeSiteData())
      .mockResolvedValueOnce(null) // odesli cache miss

    // Odesli returns spotify link
    mockFetchWithRetry.mockResolvedValueOnce(jsonResponse({
      linksByPlatform: {
        spotify: { url: 'https://open.spotify.com/album/already' },
        appleMusic: { url: APPLE_URL },
      },
    }))

    const res = mockRes()
    await handler(mockReq({ id: 'itunes-123' }), res as unknown as VercelResponse)

    // getSpotifyAccessToken should NOT be called
    expect(mockGetSpotifyAccessToken).not.toHaveBeenCalled()
    const body = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0]
    const platforms = body.release.streamingLinks.map((l: { platform: string }) => l.platform)
    expect(platforms).toContain('spotify')
  })
})

// ===========================================================================
// 11. force=true invalidiert den Odesli-Cache
// ===========================================================================
describe('force=true', () => {
  it('deletes the Odesli cache key before fetching when force=true', async () => {
    mockRedisGet
      .mockResolvedValueOnce(makeSiteData())
      .mockResolvedValueOnce(null) // odesli returns null after del

    mockFetchWithRetry.mockResolvedValueOnce(jsonResponse({
      linksByPlatform: {
        spotify: { url: 'https://open.spotify.com/album/fresh' },
        appleMusic: { url: APPLE_URL },
      },
    }))

    const res = mockRes()
    await handler(mockReq({ id: 'itunes-123', force: true }), res as unknown as VercelResponse)

    const expectedCacheKey = odesliCacheKey(APPLE_URL)
    expect(mockRedisDel).toHaveBeenCalledWith(expectedCacheKey)

    const body = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(body.steps).toContain('Cache invalidiert (force=true)')
  })
})

// ===========================================================================
// 12. Cache-Invalidierung bei unvollständigen Plattformen (fromCache=true, <3 wichtige)
// ===========================================================================
describe('Auto-Invalidierung bei unvollständigen Plattformen', () => {
  it('invalidates cache and re-fetches when fromCache=true and fewer than 3 important platforms', async () => {
    const incompleteOdesliResponse = {
      linksByPlatform: {
        pandora: { url: 'https://pandora.com/album/1' },
      },
    }
    const freshOdesliResponse = {
      linksByPlatform: {
        pandora: { url: 'https://pandora.com/album/1' },
        spotify: { url: 'https://open.spotify.com/album/abc' },
        appleMusic: { url: APPLE_URL },
        youtube: { url: 'https://youtube.com/watch?v=1' },
      },
    }

    mockRedisGet
      .mockResolvedValueOnce(makeSiteData())                  // BAND_DATA_KEY
      .mockResolvedValueOnce(incompleteOdesliResponse)        // odesli cache hit (from cache, incomplete)
      .mockResolvedValueOnce(null)                            // odesli cache miss after del (re-fetch)

    mockFetchWithRetry.mockResolvedValueOnce(jsonResponse(freshOdesliResponse))

    const res = mockRes()
    await handler(mockReq({ id: 'itunes-123' }), res as unknown as VercelResponse)

    const expectedCacheKey = odesliCacheKey(APPLE_URL)
    expect(mockRedisDel).toHaveBeenCalledWith(expectedCacheKey)

    const body = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(body.steps).toContain('Cache invalidiert (unvollständige Plattformen)')

    // After re-fetch, streamingLinks should have all 4 platforms
    const platforms = body.release.streamingLinks.map((l: { platform: string }) => l.platform)
    expect(platforms).toContain('spotify')
    expect(platforms).toContain('youtube')
  })
})

// ===========================================================================
// 13. Ungültige Session gibt 401
// ===========================================================================
describe('Ungültige Session', () => {
  it('returns 401 when validateSession returns false', async () => {
    mockValidateSession.mockResolvedValue(false)

    const res = mockRes()
    await handler(mockReq({ id: 'itunes-123' }), res as unknown as VercelResponse)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'Unauthorized' }))
  })
})

// ===========================================================================
// 14. Fehlende Release-ID gibt 400
// ===========================================================================
describe('Fehlende Release-ID', () => {
  it('returns 400 when id is missing from request body', async () => {
    const res = mockRes()
    await handler(mockReq({}), res as unknown as VercelResponse)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'Missing release id' }))
  })
})
