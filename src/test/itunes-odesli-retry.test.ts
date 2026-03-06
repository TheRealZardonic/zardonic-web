import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---------------------------------------------------------------------------
// Mock @vercel/kv
// ---------------------------------------------------------------------------
vi.mock('@vercel/kv', () => ({
  kv: { get: vi.fn(), set: vi.fn() },
}))

// Mock rate limiter — always allow requests in tests
vi.mock('../../api/_ratelimit.js', () => ({
  applyRateLimit: vi.fn().mockResolvedValue(true),
}))

// ---------------------------------------------------------------------------
// Mock _fetch-retry so we can control 429 behaviour without real timers
// ---------------------------------------------------------------------------
const mockFetchWithRetry = vi.fn()

vi.mock('../../api/_fetch-retry.js', () => ({
  fetchWithRetry: (...args: unknown[]) => mockFetchWithRetry(...args),
}))

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Res = { status: ReturnType<typeof vi.fn>; json: ReturnType<typeof vi.fn>; end: ReturnType<typeof vi.fn> }

function mockRes(): Res {
  const res: Res = { status: vi.fn(), json: vi.fn(), end: vi.fn() }
  res.status.mockReturnValue(res)
  res.json.mockReturnValue(res)
  res.end.mockReturnValue(res)
  return res
}

function okResponse(data: unknown) {
  return {
    ok: true,
    status: 200,
    json: vi.fn().mockResolvedValue(data),
    headers: { get: vi.fn().mockReturnValue(null) },
  }
}

const { default: itunesHandler } = await import('../../api/itunes.js')
const { default: odesliHandler } = await import('../../api/odesli.js')

// ---------------------------------------------------------------------------
describe('iTunes handler – 429 retry via fetchWithRetry', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.KV_REST_API_URL = 'https://fake-kv.vercel.test'
    process.env.KV_REST_API_TOKEN = 'fake-token'
  })

  it('returns data when upstream iTunes API succeeds on first try', async () => {
    const itunesData = { resultCount: 1, results: [{ collectionId: 1, collectionName: 'Album 1' }] }
    mockFetchWithRetry.mockResolvedValue(okResponse(itunesData))

    const res = mockRes()
    await itunesHandler({ query: { term: 'NEUROKLAST', entity: 'album' }, headers: {} }, res)

    expect(mockFetchWithRetry).toHaveBeenCalledTimes(1)
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith(itunesData)
  })

  it('uses fetchWithRetry (not raw fetch) for single-entity requests', async () => {
    mockFetchWithRetry.mockResolvedValue(okResponse({ resultCount: 0, results: [] }))

    const res = mockRes()
    await itunesHandler({ query: { term: 'NEUROKLAST', entity: 'song' }, headers: {} }, res)

    expect(mockFetchWithRetry).toHaveBeenCalledTimes(1)
    expect(mockFetchWithRetry.mock.calls[0][0]).toContain('itunes.apple.com')
  })

  it('uses fetchWithRetry for both requests when entity=all', async () => {
    const songData = { resultCount: 1, results: [{ collectionId: 1, collectionName: 'Single 1' }] }
    const albumData = { resultCount: 1, results: [{ collectionId: 2, collectionName: 'Album 1' }] }
    mockFetchWithRetry
      .mockResolvedValueOnce(okResponse(songData))
      .mockResolvedValueOnce(okResponse(albumData))

    const res = mockRes()
    await itunesHandler({ query: { term: 'NEUROKLAST', entity: 'all' }, headers: {} }, res)

    expect(mockFetchWithRetry).toHaveBeenCalledTimes(2)
    expect(res.status).toHaveBeenCalledWith(200)
    const combined = res.json.mock.calls[0][0]
    expect(combined.resultCount).toBe(2)
    expect(combined.results).toHaveLength(2)
  })

  it('returns 500 after all retries are exhausted (fetchWithRetry returns non-ok)', async () => {
    mockFetchWithRetry.mockResolvedValue({ ok: false, status: 429, headers: { get: vi.fn() } })

    const res = mockRes()
    await itunesHandler({ query: { term: 'NEUROKLAST', entity: 'album' }, headers: {} }, res)

    expect(res.status).toHaveBeenCalledWith(500)
  })
})

// ---------------------------------------------------------------------------
describe('Odesli handler – 429 retry via fetchWithRetry', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.KV_REST_API_URL = 'https://fake-kv.vercel.test'
    process.env.KV_REST_API_TOKEN = 'fake-token'
  })

  it('returns data when upstream Odesli API succeeds on first try', async () => {
    const odesliData = {
      entityUniqueId: 'SPOTIFY_TRACK::123',
      linksByPlatform: { spotify: { url: 'https://open.spotify.com/track/123', entityUniqueId: 'SPOTIFY_TRACK::123' } },
      entitiesByUniqueId: {},
    }
    mockFetchWithRetry.mockResolvedValue(okResponse(odesliData))

    const res = mockRes()
    await odesliHandler({ query: { url: 'https://open.spotify.com/track/123' }, headers: {} }, res)

    expect(mockFetchWithRetry).toHaveBeenCalledTimes(1)
    expect(mockFetchWithRetry.mock.calls[0][0]).toContain('api.song.link')
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith(odesliData)
  })

  it('returns 500 after all retries are exhausted (fetchWithRetry returns non-ok)', async () => {
    mockFetchWithRetry.mockResolvedValue({ ok: false, status: 429, headers: { get: vi.fn() } })

    const res = mockRes()
    await odesliHandler({ query: { url: 'https://open.spotify.com/track/123' }, headers: {} }, res)

    expect(res.status).toHaveBeenCalledWith(500)
  })
})

// ---------------------------------------------------------------------------
describe('fetchWithRetry utility', () => {
  it('returns response immediately when status is not 429', async () => {
    const { fetchWithRetry: realFetchWithRetry } = await vi.importActual<typeof import('../../api/_fetch-retry.js')>('../../api/_fetch-retry.js')

    const mockResponse = { ok: true, status: 200, headers: { get: vi.fn().mockReturnValue(null) } }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockResponse))

    const result = await realFetchWithRetry('https://example.com')
    expect(result).toBe(mockResponse)
    expect(fetch).toHaveBeenCalledTimes(1)

    vi.unstubAllGlobals()
  })

  it('retries on 429 and returns successful response', async () => {
    const { fetchWithRetry: realFetchWithRetry } = await vi.importActual<typeof import('../../api/_fetch-retry.js')>('../../api/_fetch-retry.js')

    const failResponse = { ok: false, status: 429, headers: { get: vi.fn().mockReturnValue('0') } }
    const successResponse = { ok: true, status: 200, headers: { get: vi.fn().mockReturnValue(null) } }
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(failResponse)
      .mockResolvedValueOnce(successResponse)
    )

    const result = await realFetchWithRetry('https://example.com')
    expect(result).toBe(successResponse)
    expect(fetch).toHaveBeenCalledTimes(2)

    vi.unstubAllGlobals()
  })

  it('stops retrying after MAX_RETRIES and returns last 429 response', async () => {
    const { fetchWithRetry: realFetchWithRetry } = await vi.importActual<typeof import('../../api/_fetch-retry.js')>('../../api/_fetch-retry.js')

    const failResponse = { ok: false, status: 429, headers: { get: vi.fn().mockReturnValue('0') } }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(failResponse))

    const result = await realFetchWithRetry('https://example.com')
    // MAX_RETRIES = 3, so 4 total calls (initial + 3 retries)
    expect(fetch).toHaveBeenCalledTimes(4)
    expect(result.status).toBe(429)

    vi.unstubAllGlobals()
  })

  it('uses Retry-After header delay when present', async () => {
    const { fetchWithRetry: realFetchWithRetry } = await vi.importActual<typeof import('../../api/_fetch-retry.js')>('../../api/_fetch-retry.js')

    const failResponse = { ok: false, status: 429, headers: { get: vi.fn().mockReturnValue('0') } }
    const successResponse = { ok: true, status: 200, headers: { get: vi.fn().mockReturnValue(null) } }
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(failResponse)
      .mockResolvedValueOnce(successResponse)
    )

    const result = await realFetchWithRetry('https://example.com')
    expect(result).toBe(successResponse)
    // Retry-After was '0' so delay is effectively 0 ms — test completes quickly

    vi.unstubAllGlobals()
  })
})
