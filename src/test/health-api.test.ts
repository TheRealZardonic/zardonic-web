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
    process.env.UPSTASH_REDIS_REST_URL = 'https://fake-redis.upstash.io'
    process.env.UPSTASH_REDIS_REST_TOKEN = 'fake-token'
    process.env.SPOTIFY_CLIENT_ID = 'test-client-id'
    process.env.SPOTIFY_CLIENT_SECRET = 'test-client-secret'
    process.env.BANDSINTOWN_API_KEY = 'test-api-key'
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
  })

  it('returns a valid ISO timestamp', async () => {
    mockRedisPing.mockResolvedValue('PONG')

    const res = mockRes()
    await handler(mockReq(), res as unknown as unknown as VercelResponse)

    const body = res.json.mock.calls[0][0]
    expect(() => new Date(body.timestamp)).not.toThrow()
    expect(new Date(body.timestamp).toISOString()).toBe(body.timestamp)
  })
})

// ---------------------------------------------------------------------------
describe('Health endpoint — degraded status (KV unavailable)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.UPSTASH_REDIS_REST_URL = 'https://fake-redis.upstash.io'
    process.env.UPSTASH_REDIS_REST_TOKEN = 'fake-token'
    process.env.SPOTIFY_CLIENT_ID = 'test-client-id'
    process.env.SPOTIFY_CLIENT_SECRET = 'test-client-secret'
    process.env.BANDSINTOWN_API_KEY = 'test-api-key'
  })

  it('returns 503 with status=degraded when KV ping throws', async () => {
    mockRedisPing.mockRejectedValue(new Error('Connection refused'))

    const res = mockRes()
    await handler(mockReq(), res as unknown as unknown as VercelResponse)

    expect(res.status).toHaveBeenCalledWith(503)
    const body = res.json.mock.calls[0][0]
    expect(body.status).toBe('degraded')
    expect(body.services.kv).toBe('unavailable')
  })

  it('returns 503 with status=degraded when KV env vars are missing', async () => {
    delete process.env.UPSTASH_REDIS_REST_URL
    delete process.env.UPSTASH_REDIS_REST_TOKEN

    const res = mockRes()
    await handler(mockReq(), res as unknown as unknown as VercelResponse)

    expect(res.status).toHaveBeenCalledWith(503)
    const body = res.json.mock.calls[0][0]
    expect(body.status).toBe('degraded')
    expect(body.services.kv).toBe('unavailable')
  })
})

// ---------------------------------------------------------------------------
describe('Health endpoint — unconfigured services', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.UPSTASH_REDIS_REST_URL = 'https://fake-redis.upstash.io'
    process.env.UPSTASH_REDIS_REST_TOKEN = 'fake-token'
    delete process.env.SPOTIFY_CLIENT_ID
    delete process.env.SPOTIFY_CLIENT_SECRET
    delete process.env.BANDSINTOWN_API_KEY
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
