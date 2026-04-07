import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as authMod from '../../api/auth.ts'

// ---------------------------------------------------------------------------
// Mock @upstash/redis
// ---------------------------------------------------------------------------
const mockSet = vi.fn()
const mockDel = vi.fn()
const mockGet = vi.fn()
const mockSadd = vi.fn()
const mockSrem = vi.fn()
const mockSmembers = vi.fn()

vi.mock('@upstash/redis', () => ({
  Redis: class {
    set = mockSet
    del = mockDel
    get = mockGet
    sadd = mockSadd
    srem = mockSrem
    smembers = mockSmembers
  },
}))

vi.mock('../../api/_ratelimit.ts', () => ({
  applyRateLimit: vi.fn().mockResolvedValue(true),
  getClientIp: vi.fn().mockReturnValue('127.0.0.1'),
  hashIp: vi.fn().mockReturnValue('abc123def456abc123def456abc123def456abc123def456abc123def456abc1'),
}))

vi.mock('../../api/auth.ts', () => ({
  validateSession: vi.fn().mockResolvedValue(true),
}))

type MockRes = {
  status: ReturnType<typeof vi.fn>
  json: ReturnType<typeof vi.fn>
  end: ReturnType<typeof vi.fn>
}

function mockRes(): MockRes {
  const res: any = {
    status: vi.fn(),
    json: vi.fn(),
    end: vi.fn(),
  }
  res.status.mockReturnValue(res)
  res.json.mockReturnValue(res)
  res.end.mockReturnValue(res)
  return res
}

const { default: handler } = await import('../../api/blocklist.ts')

const VALID_HASH = 'a'.repeat(64)

// ---------------------------------------------------------------------------
describe('Blocklist API handler', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.UPSTASH_REDIS_REST_URL = 'https://fake.upstash.io'
    process.env.UPSTASH_REDIS_REST_TOKEN = 'token'
    vi.mocked(authMod.validateSession).mockResolvedValue(true)
    mockSmembers.mockResolvedValue([])
    mockSet.mockResolvedValue('OK')
    mockDel.mockResolvedValue(1)
    mockSadd.mockResolvedValue(1)
    mockSrem.mockResolvedValue(1)
    mockGet.mockResolvedValue(null)
  })

  it('OPTIONS returns 200', async () => {
    const res = mockRes()
    await handler({ method: 'OPTIONS', headers: {} } as any, res as any)
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.end).toHaveBeenCalled()
  })

  it('returns 503 when KV not configured', async () => {
    delete process.env.UPSTASH_REDIS_REST_URL
    const res = mockRes()
    await handler({ method: 'GET', headers: {} } as any, res as any)
    expect(res.status).toHaveBeenCalledWith(503)
  })

  it('returns 403 without valid session', async () => {
    vi.mocked(authMod.validateSession).mockResolvedValue(false)
    const res = mockRes()
    await handler({ method: 'GET', headers: {} } as any, res as any)
    expect(res.status).toHaveBeenCalledWith(403)
  })

  describe('GET /api/blocklist', () => {
    it('returns empty blocked list', async () => {
      mockSmembers.mockResolvedValue([])
      const res = mockRes()
      await handler({ method: 'GET', headers: {} } as any, res as any)
      expect(res.json).toHaveBeenCalledWith({ blocked: [] })
    })

    it('returns list of blocked entries', async () => {
      const entry = { hashedIp: VALID_HASH, reason: 'manual', blockedAt: '2026-01-01', autoBlocked: false }
      mockSmembers.mockResolvedValue([VALID_HASH])
      mockGet.mockResolvedValue(entry)
      const res = mockRes()
      await handler({ method: 'GET', headers: {} } as any, res as any)
      expect(res.json).toHaveBeenCalledWith({ blocked: [entry] })
    })
  })

  describe('POST /api/blocklist — block IP', () => {
    it('blocks a valid hashed IP', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const res = mockRes()
      await handler({
        method: 'POST',
        headers: {},
        body: { hashedIp: VALID_HASH },
      } as any, res as any)
      expect(mockSet).toHaveBeenCalledWith(
        `nk-blocked:${VALID_HASH}`,
        expect.objectContaining({ hashedIp: VALID_HASH, reason: 'manual' }),
        { ex: 604800 }
      )
      expect(res.json).toHaveBeenCalledWith({ success: true })
      consoleSpy.mockRestore()
    })

    it('accepts custom reason and TTL', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const res = mockRes()
      await handler({
        method: 'POST',
        headers: {},
        body: { hashedIp: VALID_HASH, reason: 'honeytoken_access', ttlSeconds: 3600 },
      } as any, res as any)
      expect(mockSet).toHaveBeenCalledWith(
        `nk-blocked:${VALID_HASH}`,
        expect.objectContaining({ reason: 'honeytoken_access' }),
        { ex: 3600 }
      )
      consoleSpy.mockRestore()
    })

    it('returns 400 for hashedIp too short', async () => {
      const res = mockRes()
      await handler({
        method: 'POST',
        headers: {},
        body: { hashedIp: 'short' },
      } as any, res as any)
      expect(res.status).toHaveBeenCalledWith(400)
    })

    it('returns 400 for invalid TTL (too small)', async () => {
      const res = mockRes()
      await handler({
        method: 'POST',
        headers: {},
        body: { hashedIp: VALID_HASH, ttlSeconds: 10 },
      } as any, res as any)
      expect(res.status).toHaveBeenCalledWith(400)
    })

    it('returns 400 for missing body', async () => {
      const res = mockRes()
      await handler({ method: 'POST', headers: {}, body: null } as any, res as any)
      expect(res.status).toHaveBeenCalledWith(400)
    })
  })

  describe('DELETE /api/blocklist — unblock IP', () => {
    it('unblocks a valid hashed IP', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const res = mockRes()
      await handler({
        method: 'DELETE',
        headers: {},
        body: { hashedIp: VALID_HASH },
      } as any, res as any)
      expect(mockDel).toHaveBeenCalledWith(`nk-blocked:${VALID_HASH}`)
      expect(res.json).toHaveBeenCalledWith({ success: true })
      consoleSpy.mockRestore()
    })

    it('returns 400 for missing hashedIp', async () => {
      const res = mockRes()
      await handler({
        method: 'DELETE',
        headers: {},
        body: {},
      } as any, res as any)
      expect(res.status).toHaveBeenCalledWith(400)
    })

    it('returns 400 for null body', async () => {
      const res = mockRes()
      await handler({
        method: 'DELETE',
        headers: {},
        body: null,
      } as any, res as any)
      expect(res.status).toHaveBeenCalledWith(400)
    })
  })

  it('returns 405 for unsupported methods', async () => {
    const res = mockRes()
    await handler({ method: 'PUT', headers: {} } as any, res as any)
    expect(res.status).toHaveBeenCalledWith(405)
  })
})
