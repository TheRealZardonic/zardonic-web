import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { VercelRequest, VercelResponse } from '@vercel/node'

// ---------------------------------------------------------------------------
// Mock @upstash/redis
// ---------------------------------------------------------------------------
const mockRedisPing = vi.fn()

vi.mock('@upstash/redis', () => ({
  Redis: class {
    ping(...args: unknown[]) { return mockRedisPing(...args) }
  },
}))

// Mock validateSession so we can control auth state in tests
const mockValidateSession = vi.fn()
vi.mock('../../api/auth.js', () => ({
  validateSession: (...args: unknown[]) => mockValidateSession(...args),
}))

// ---------------------------------------------------------------------------
// Helper types
// ---------------------------------------------------------------------------
type MockRes = {
  status: ReturnType<typeof vi.fn>
  json: ReturnType<typeof vi.fn>
}

function mockRes(): MockRes {
  const res: any = { status: vi.fn(), json: vi.fn() }
  res.status.mockReturnValue(res)
  res.json.mockReturnValue(res)
  return res
}

function mockReq(method = 'GET'): VercelRequest {
  return { method, headers: {}, query: {} } as unknown as VercelRequest
}

// ---------------------------------------------------------------------------
const { default: handler } = await import('../../api/health.js')

// ---------------------------------------------------------------------------
describe('Health endpoint — ok status', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockValidateSession.mockResolvedValue(true) // authenticated by default
    process.env.UPSTASH_REDIS_REST_URL = 'https://fake-redis.upstash.io'
    process.env.UPSTASH_REDIS_REST_TOKEN = 'fake-token'
    process.env.SPOTIFY_CLIENT_ID = 'test-client-id'
    process.env.SPOTIFY_CLIENT_SECRET = 'test-client-secret'
    process.env.BANDSINTOWN_API_KEY = 'test-api-key'
    process.env.DISCOGS_TOKEN = 'test-discogs-token'
  })

  it('returns 200 with status=ok when KV is reachable', async () => {
    mockRedisPing.mockResolvedValue('PONG')

    const res = mockRes()
    await handler(mockReq(), res as unknown as unknown as VercelResponse)

    expect(res.status).toHaveBeenCalledWith(200)
    const body = res.json.mock.calls[0][0]
    expect(body.status).toBe('ok')
    expect(body.services.kv).toBe('ok')
    expect(body.version).toBe('1.0.0')
    expect(typeof body.timestamp).toBe('string')
  })

  it('includes configured services when env vars are set', async () => {
    mockRedisPing.mockResolvedValue('PONG')

    const res = mockRes()
    await handler(mockReq(), res as unknown as unknown as VercelResponse)

    const body = res.json.mock.calls[0][0]
    expect(body.services.spotify).toBe('configured')
    expect(body.services.bandsintown).toBe('configured')
    expect(body.services.imageProxy).toBe('ok')
    expect(body.services.discogs).toBe('configured')
  })

  it('shows discogs=configured when DISCOGS_TOKEN is set', async () => {
    mockRedisPing.mockResolvedValue('PONG')
    process.env.DISCOGS_TOKEN = 'my-personal-access-token'

    const res = mockRes()
    await handler(mockReq(), res as unknown as unknown as VercelResponse)

    const body = res.json.mock.calls[0][0]
    expect(body.services.discogs).toBe('configured')
  })

  it('returns a valid ISO timestamp', async () => {
    mockRedisPing.mockResolvedValue('PONG')

    const res = mockRes()
    await handler(mockReq(), res as unknown as unknown as VercelResponse)

    const body = res.json.mock.calls[0][0]
    expect(() => new Date(body.timestamp)).not.toThrow()
    expect(new Date(body.timestamp).toISOString()).toBe(body.timestamp)
  })

  it('omits services when unauthenticated', async () => {
    mockValidateSession.mockResolvedValue(false)
    mockRedisPing.mockResolvedValue('PONG')

    const res = mockRes()
    await handler(mockReq(), res as unknown as unknown as VercelResponse)

    const body = res.json.mock.calls[0][0]
    expect(body.status).toBe('ok')
    expect(body.services).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
describe('Health endpoint — degraded status (KV unavailable)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockValidateSession.mockResolvedValue(true)
    process.env.UPSTASH_REDIS_REST_URL = 'https://fake-redis.upstash.io'
    process.env.UPSTASH_REDIS_REST_TOKEN = 'fake-token'
    process.env.SPOTIFY_CLIENT_ID = 'test-client-id'
    process.env.SPOTIFY_CLIENT_SECRET = 'test-client-secret'
    process.env.BANDSINTOWN_API_KEY = 'test-api-key'
  })

  it('returns 200 with status=degraded when KV ping throws', async () => {
    mockRedisPing.mockRejectedValue(new Error('Connection refused'))

    const res = mockRes()
    await handler(mockReq(), res as unknown as unknown as VercelResponse)

    expect(res.status).toHaveBeenCalledWith(200)
    const body = res.json.mock.calls[0][0]
    expect(body.status).toBe('degraded')
    expect(body.services.kv).toBe('unavailable')
  })

  it('returns 200 with status=degraded when KV env vars are missing', async () => {
    delete process.env.UPSTASH_REDIS_REST_URL
    delete process.env.UPSTASH_REDIS_REST_TOKEN

    const res = mockRes()
    await handler(mockReq(), res as unknown as unknown as VercelResponse)

    expect(res.status).toHaveBeenCalledWith(200)
    const body = res.json.mock.calls[0][0]
    expect(body.status).toBe('degraded')
    expect(body.services.kv).toBe('unavailable')
  })
})

// ---------------------------------------------------------------------------
describe('Health endpoint — unconfigured services', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockValidateSession.mockResolvedValue(true)
    process.env.UPSTASH_REDIS_REST_URL = 'https://fake-redis.upstash.io'
    process.env.UPSTASH_REDIS_REST_TOKEN = 'fake-token'
    delete process.env.SPOTIFY_CLIENT_ID
    delete process.env.SPOTIFY_CLIENT_SECRET
    delete process.env.BANDSINTOWN_API_KEY
    delete process.env.DISCOGS_TOKEN
  })

  it('shows spotify=unconfigured when credentials are missing', async () => {
    mockRedisPing.mockResolvedValue('PONG')

    const res = mockRes()
    await handler(mockReq(), res as unknown as unknown as VercelResponse)

    const body = res.json.mock.calls[0][0]
    expect(body.services.spotify).toBe('unconfigured')
  })

  it('shows bandsintown=unconfigured when API key is missing', async () => {
    mockRedisPing.mockResolvedValue('PONG')

    const res = mockRes()
    await handler(mockReq(), res as unknown as unknown as VercelResponse)

    const body = res.json.mock.calls[0][0]
    expect(body.services.bandsintown).toBe('unconfigured')
  })

  it('shows discogs=unconfigured when DISCOGS_TOKEN is missing', async () => {
    mockRedisPing.mockResolvedValue('PONG')

    const res = mockRes()
    await handler(mockReq(), res as unknown as unknown as VercelResponse)

    const body = res.json.mock.calls[0][0]
    expect(body.services.discogs).toBe('unconfigured')
  })
})

// ---------------------------------------------------------------------------
describe('Health endpoint — method guard', () => {
  it('returns 405 for non-GET requests', async () => {
    const res = mockRes()
    await handler(mockReq('POST'), res as unknown as unknown as VercelResponse)

    expect(res.status).toHaveBeenCalledWith(405)
    expect(res.json).toHaveBeenCalledWith({ error: 'Method Not Allowed' })
  })
})
