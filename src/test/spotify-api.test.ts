import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { VercelRequest, VercelResponse } from '@vercel/node'

// ---------------------------------------------------------------------------
// Mock @upstash/redis
// ---------------------------------------------------------------------------
const mockRedisGet = vi.fn()
const mockRedisSet = vi.fn()
const mockRedisPing = vi.fn()

vi.mock('@upstash/redis', () => ({
  Redis: class {
    get(...args: unknown[]) { return mockRedisGet(...args) }
    set(...args: unknown[]) { return mockRedisSet(...args) }
    ping(...args: unknown[]) { return mockRedisPing(...args) }
  },
}))

// Mock rate limiter — always allow in tests
vi.mock('../../api/_ratelimit.js', () => ({
  applyRateLimit: vi.fn().mockResolvedValue(true),
}))

// Mock fetchWithRetry so we control all outbound requests
const mockFetchWithRetry = vi.fn()
vi.mock('../../api/_fetch-retry.js', () => ({
  fetchWithRetry: (...args: unknown[]) => mockFetchWithRetry(...args),
}))

// ---------------------------------------------------------------------------
// Helper types
// ---------------------------------------------------------------------------
type MockRes = {
  status: ReturnType<typeof vi.fn>
  json: ReturnType<typeof vi.fn>
  setHeader: ReturnType<typeof vi.fn>
}

function mockRes(): MockRes {
  const res: any = { status: vi.fn(), json: vi.fn(), setHeader: vi.fn() }
  res.status.mockReturnValue(res)
  res.json.mockReturnValue(res)
  res.setHeader.mockReturnValue(res)
  return res
}

function mockReq(query: Record<string, string> = {}): VercelRequest {
  return { query, headers: {}, method: 'GET' } as unknown as VercelRequest
}

function tokenResponse(token = 'test-access-token') {
  return {
    ok: true,
    status: 200,
    json: vi.fn().mockResolvedValue({ access_token: token }),
  }
}

function dataResponse(data: unknown) {
  return {
    ok: true,
    status: 200,
    json: vi.fn().mockResolvedValue(data),
  }
}

// ---------------------------------------------------------------------------
// Import handler AFTER mocks are in place
// ---------------------------------------------------------------------------
const { default: handler } = await import('../../api/spotify.js')

// ---------------------------------------------------------------------------
describe('Spotify API handler — missing credentials', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    delete process.env.SPOTIFY_CLIENT_ID
    delete process.env.SPOTIFY_CLIENT_SECRET
    delete process.env.UPSTASH_REDIS_REST_URL
    delete process.env.UPSTASH_REDIS_REST_TOKEN
  })

  it('returns 503 when SPOTIFY_CLIENT_ID is not set', async () => {
    process.env.SPOTIFY_CLIENT_SECRET = 'secret'
    const res = mockRes()
    await handler(mockReq({ action: 'artist', id: '123' }), res as unknown as unknown as VercelResponse)
    expect(res.status).toHaveBeenCalledWith(503)
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'Service unavailable' }))
  })

  it('returns 503 when SPOTIFY_CLIENT_SECRET is not set', async () => {
    process.env.SPOTIFY_CLIENT_ID = 'client-id'
    const res = mockRes()
    await handler(mockReq({ action: 'artist', id: '123' }), res as unknown as unknown as VercelResponse)
    expect(res.status).toHaveBeenCalledWith(503)
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'Service unavailable' }))
  })

  it('returns 503 when both credentials are missing', async () => {
    const res = mockRes()
    await handler(mockReq({ action: 'artist', id: '123' }), res as unknown as unknown as VercelResponse)
    expect(res.status).toHaveBeenCalledWith(503)
  })
})

// ---------------------------------------------------------------------------
describe('Spotify API handler — validation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.SPOTIFY_CLIENT_ID = 'test-client-id'
    process.env.SPOTIFY_CLIENT_SECRET = 'test-client-secret'
    delete process.env.UPSTASH_REDIS_REST_URL
    delete process.env.UPSTASH_REDIS_REST_TOKEN
  })

  it('returns 400 for invalid action', async () => {
    const res = mockRes()
    await handler(mockReq({ action: 'invalid-action' }), res as unknown as unknown as VercelResponse)
    expect(res.status).toHaveBeenCalledWith(400)
  })

  // With refine-based schema validation, these fail at schema level before any token fetch
  it('returns 400 when action=artist but id is missing', async () => {
    const res = mockRes()
    await handler(mockReq({ action: 'artist' }), res as unknown as unknown as VercelResponse)
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.stringContaining('id') }))
  })

  it('returns 400 when action=top-tracks but id is missing', async () => {
    const res = mockRes()
    await handler(mockReq({ action: 'top-tracks' }), res as unknown as unknown as VercelResponse)
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('returns 400 when action=albums but id is missing', async () => {
    const res = mockRes()
    await handler(mockReq({ action: 'albums' }), res as unknown as unknown as VercelResponse)
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('returns 400 when action=search but query is missing', async () => {
    const res = mockRes()
    await handler(mockReq({ action: 'search' }), res as unknown as unknown as VercelResponse)
    expect(res.status).toHaveBeenCalledWith(400)
  })
})

// ---------------------------------------------------------------------------
describe('Spotify API handler — action: artist', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.SPOTIFY_CLIENT_ID = 'test-client-id'
    process.env.SPOTIFY_CLIENT_SECRET = 'test-client-secret'
    delete process.env.UPSTASH_REDIS_REST_URL
    delete process.env.UPSTASH_REDIS_REST_TOKEN
    mockRedisGet.mockResolvedValue(null)
    mockRedisSet.mockResolvedValue('OK')
  })

  it('fetches artist data and returns 200 with Cache-Control header', async () => {
    const artistData = { id: 'abc123', name: 'Zardonic', followers: { total: 50000 } }
    mockFetchWithRetry
      .mockResolvedValueOnce(tokenResponse())
      .mockResolvedValueOnce(dataResponse(artistData))

    const res = mockRes()
    await handler(mockReq({ action: 'artist', id: 'abc123' }), res as unknown as unknown as VercelResponse)

    expect(mockFetchWithRetry).toHaveBeenCalledWith(
      'https://accounts.spotify.com/api/token',
      expect.objectContaining({ method: 'POST' })
    )
    expect(mockFetchWithRetry).toHaveBeenCalledWith(
      'https://api.spotify.com/v1/artists/abc123',
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer test-access-token' }) })
    )
    expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', 'public, max-age=300')
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith(artistData)
  })

  it('returns Spotify API error status on upstream failure', async () => {
    mockFetchWithRetry
      .mockResolvedValueOnce(tokenResponse())
      .mockResolvedValueOnce({ ok: false, status: 404, json: vi.fn() })

    const res = mockRes()
    await handler(mockReq({ action: 'artist', id: 'notfound' }), res as unknown as unknown as VercelResponse)

    expect(res.status).toHaveBeenCalledWith(404)
  })
})

// ---------------------------------------------------------------------------
describe('Spotify API handler — action: top-tracks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.SPOTIFY_CLIENT_ID = 'test-client-id'
    process.env.SPOTIFY_CLIENT_SECRET = 'test-client-secret'
    delete process.env.UPSTASH_REDIS_REST_URL
    delete process.env.UPSTASH_REDIS_REST_TOKEN
  })

  it('fetches top tracks with default US market', async () => {
    const tracksData = { tracks: [{ id: 't1', name: 'Track 1' }] }
    mockFetchWithRetry
      .mockResolvedValueOnce(tokenResponse())
      .mockResolvedValueOnce(dataResponse(tracksData))

    const res = mockRes()
    await handler(mockReq({ action: 'top-tracks', id: 'abc123' }), res as unknown as unknown as VercelResponse)

    expect(mockFetchWithRetry.mock.calls[1][0]).toContain('/top-tracks?market=US')
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith(tracksData)
  })

  it('uses provided market parameter', async () => {
    mockFetchWithRetry
      .mockResolvedValueOnce(tokenResponse())
      .mockResolvedValueOnce(dataResponse({ tracks: [] }))

    const res = mockRes()
    await handler(mockReq({ action: 'top-tracks', id: 'abc123', market: 'DE' }), res as unknown as unknown as VercelResponse)

    expect(mockFetchWithRetry.mock.calls[1][0]).toContain('market=DE')
  })
})

// ---------------------------------------------------------------------------
describe('Spotify API handler — action: albums', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.SPOTIFY_CLIENT_ID = 'test-client-id'
    process.env.SPOTIFY_CLIENT_SECRET = 'test-client-secret'
    delete process.env.UPSTASH_REDIS_REST_URL
    delete process.env.UPSTASH_REDIS_REST_TOKEN
  })

  it('fetches albums for an artist', async () => {
    const albumsData = { items: [{ id: 'al1', name: 'Album 1' }] }
    mockFetchWithRetry
      .mockResolvedValueOnce(tokenResponse())
      .mockResolvedValueOnce(dataResponse(albumsData))

    const res = mockRes()
    await handler(mockReq({ action: 'albums', id: 'abc123' }), res as unknown as unknown as VercelResponse)

    expect(mockFetchWithRetry.mock.calls[1][0]).toContain('/v1/artists/abc123/albums')
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith(albumsData)
  })
})

// ---------------------------------------------------------------------------
describe('Spotify API handler — action: search', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.SPOTIFY_CLIENT_ID = 'test-client-id'
    process.env.SPOTIFY_CLIENT_SECRET = 'test-client-secret'
    delete process.env.UPSTASH_REDIS_REST_URL
    delete process.env.UPSTASH_REDIS_REST_TOKEN
  })

  it('searches for an artist by name', async () => {
    const searchData = { artists: { items: [{ id: 'abc', name: 'Zardonic' }] } }
    mockFetchWithRetry
      .mockResolvedValueOnce(tokenResponse())
      .mockResolvedValueOnce(dataResponse(searchData))

    const res = mockRes()
    await handler(mockReq({ action: 'search', query: 'Zardonic' }), res as unknown as unknown as VercelResponse)

    expect(mockFetchWithRetry.mock.calls[1][0]).toContain('/v1/search')
    expect(mockFetchWithRetry.mock.calls[1][0]).toContain('type=artist')
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith(searchData)
  })
})

// ---------------------------------------------------------------------------
describe('Spotify API handler — token caching', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.SPOTIFY_CLIENT_ID = 'test-client-id'
    process.env.SPOTIFY_CLIENT_SECRET = 'test-client-secret'
    process.env.UPSTASH_REDIS_REST_URL = 'https://fake-redis.upstash.io'
    process.env.UPSTASH_REDIS_REST_TOKEN = 'fake-token'
  })

  it('uses cached token from Redis when available', async () => {
    mockRedisGet.mockResolvedValue('cached-token-from-redis')
    const artistData = { id: 'abc', name: 'Zardonic' }
    mockFetchWithRetry.mockResolvedValueOnce(dataResponse(artistData))

    const res = mockRes()
    await handler(mockReq({ action: 'artist', id: 'abc' }), res as unknown as unknown as VercelResponse)

    // Token fetch should NOT be called since we have a cached token
    expect(mockFetchWithRetry).toHaveBeenCalledTimes(1)
    expect(mockFetchWithRetry.mock.calls[0][0]).toContain('api.spotify.com')
    expect(mockFetchWithRetry.mock.calls[0][1]).toMatchObject({
      headers: expect.objectContaining({ Authorization: 'Bearer cached-token-from-redis' }),
    })
    expect(res.status).toHaveBeenCalledWith(200)
  })

  it('fetches and caches a new token when cache is empty', async () => {
    mockRedisGet.mockResolvedValue(null)
    mockRedisSet.mockResolvedValue('OK')
    const artistData = { id: 'abc', name: 'Zardonic' }
    mockFetchWithRetry
      .mockResolvedValueOnce(tokenResponse('fresh-token'))
      .mockResolvedValueOnce(dataResponse(artistData))

    const res = mockRes()
    await handler(mockReq({ action: 'artist', id: 'abc' }), res as unknown as unknown as VercelResponse)

    expect(mockFetchWithRetry.mock.calls[0][0]).toBe('https://accounts.spotify.com/api/token')
    expect(mockRedisSet).toHaveBeenCalledWith(
      'spotify:access-token',
      'fresh-token',
      expect.objectContaining({ ex: 3500 })
    )
    expect(res.status).toHaveBeenCalledWith(200)
  })

  it('still works when Redis set fails', async () => {
    mockRedisGet.mockResolvedValue(null)
    mockRedisSet.mockRejectedValue(new Error('Redis write error'))
    const artistData = { id: 'abc', name: 'Zardonic' }
    mockFetchWithRetry
      .mockResolvedValueOnce(tokenResponse('fresh-token'))
      .mockResolvedValueOnce(dataResponse(artistData))

    const res = mockRes()
    await handler(mockReq({ action: 'artist', id: 'abc' }), res as unknown as unknown as VercelResponse)

    expect(res.status).toHaveBeenCalledWith(200)
  })
})

// ---------------------------------------------------------------------------
describe('Spotify API handler — error handling', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.SPOTIFY_CLIENT_ID = 'test-client-id'
    process.env.SPOTIFY_CLIENT_SECRET = 'test-client-secret'
    delete process.env.UPSTASH_REDIS_REST_URL
    delete process.env.UPSTASH_REDIS_REST_TOKEN
  })

  it('returns 502 when token fetch throws', async () => {
    mockFetchWithRetry.mockRejectedValueOnce(new Error('Network error'))

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const res = mockRes()
    await handler(mockReq({ action: 'artist', id: 'abc' }), res as unknown as unknown as VercelResponse)

    expect(res.status).toHaveBeenCalledWith(502)
    expect(res.json).toHaveBeenCalledWith({ error: 'Failed to fetch from Spotify API' })
    consoleSpy.mockRestore()
  })

  it('returns 502 when token response is non-ok', async () => {
    mockFetchWithRetry.mockResolvedValueOnce({ ok: false, status: 401, json: vi.fn() })

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const res = mockRes()
    await handler(mockReq({ action: 'artist', id: 'abc' }), res as unknown as unknown as VercelResponse)

    expect(res.status).toHaveBeenCalledWith(502)
    consoleSpy.mockRestore()
  })
})
