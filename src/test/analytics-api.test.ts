import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as authMod from '../../api/auth.ts'

// ---------------------------------------------------------------------------
// Mock @upstash/redis before importing handler
// ---------------------------------------------------------------------------
const mockHgetall = vi.fn()
const mockHincrby = vi.fn().mockResolvedValue(1)
const mockHsetnx = vi.fn().mockResolvedValue(1)
const mockHset = vi.fn().mockResolvedValue(1)
const mockHlen = vi.fn().mockResolvedValue(0)
const mockSadd = vi.fn().mockResolvedValue(1)
const mockSmembers = vi.fn().mockResolvedValue([])
const mockLpush = vi.fn().mockResolvedValue(1)
const mockLtrim = vi.fn().mockResolvedValue('OK')
const mockLrange = vi.fn().mockResolvedValue([])
const mockDel = vi.fn().mockResolvedValue(1)
const mockExpire = vi.fn().mockResolvedValue(1)
const mockPipelineExec = vi.fn().mockResolvedValue([])

vi.mock('@upstash/redis', () => ({
  Redis: class {
    hgetall = mockHgetall
    hincrby = mockHincrby
    hsetnx = mockHsetnx
    hset = mockHset
    hlen = mockHlen
    sadd = mockSadd
    smembers = mockSmembers
    lpush = mockLpush
    ltrim = mockLtrim
    lrange = mockLrange
    del = mockDel
    expire = mockExpire
    pipeline = () => ({
      hincrby: vi.fn().mockReturnThis(),
      sadd: vi.fn().mockReturnThis(),
      del: vi.fn().mockReturnThis(),
      hsetnx: vi.fn().mockReturnThis(),
      hset: vi.fn().mockReturnThis(),
      exec: mockPipelineExec,
    })
  },
}))

// Mock security helpers
vi.mock('../../api/_ratelimit.ts', () => ({
  applyRateLimit: vi.fn().mockResolvedValue(true),
  getClientIp: vi.fn().mockReturnValue('127.0.0.1'),
  hashIp: vi.fn().mockReturnValue('hashed-ip'),
}))

vi.mock('../../api/_blocklist.ts', () => ({
  isHardBlocked: vi.fn().mockResolvedValue(false),
}))

vi.mock('../../api/auth.ts', () => ({
  validateSession: vi.fn().mockResolvedValue(true),
}))

const { default: handler } = await import('../../api/analytics.ts')

type Res = {
  status: ReturnType<typeof vi.fn>
  json: ReturnType<typeof vi.fn>
  end: ReturnType<typeof vi.fn>
}

function mockRes(): Res {
  const res: Res = {
    status: vi.fn(),
    json: vi.fn(),
    end: vi.fn(),
  }
  res.status.mockReturnValue(res)
  res.json.mockReturnValue(res)
  res.end.mockReturnValue(res)
  return res
}

describe('Analytics API handler', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.UPSTASH_REDIS_REST_URL = 'https://fake-redis.upstash.io'
    process.env.UPSTASH_REDIS_REST_TOKEN = 'fake-token'
    mockHgetall.mockResolvedValue(null)
    mockSmembers.mockResolvedValue([])
    mockLrange.mockResolvedValue([])
    mockHlen.mockResolvedValue(0)
    mockPipelineExec.mockResolvedValue([])
    vi.mocked(authMod.validateSession).mockResolvedValue(true)
  })

  it('OPTIONS returns 200', async () => {
    const res = mockRes()
    await handler({ method: 'OPTIONS', query: {}, headers: {} } as any, res as any)
    expect(res.status).toHaveBeenCalledWith(200)
  })

  describe('GET /api/analytics', () => {
    it('should return 503 when Redis is not configured', async () => {
      delete process.env.UPSTASH_REDIS_REST_URL
      const res = mockRes()
      await handler({ method: 'GET', query: {}, headers: {} } as any, res as any)
      expect(res.status).toHaveBeenCalledWith(503)
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'Service unavailable' }))
    })

    it('should return empty analytics snapshot when no data', async () => {
      mockHgetall.mockResolvedValue(null)
      const res = mockRes()
      await handler({ method: 'GET', query: {}, headers: {} } as any, res as any)
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        totalPageViews: 0,
        totalSessions: 0,
      }))
    })

    it('should return snapshot when data exists', async () => {
      mockHgetall.mockResolvedValue({
        totalPageViews: '42',
        totalSessions: '10',
        firstTracked: '2026-01-01',
        lastTracked: '2026-02-20',
        'section:bio': '20',
        'device:mobile': '15',
        'hourly:14': '5',
      })
      mockSmembers.mockResolvedValue(['2026-02-20'])
      const res = mockRes()
      await handler({ method: 'GET', query: {}, headers: {} } as any, res as any)
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        totalPageViews: 42,
        totalSessions: 10,
      }))
    })

    it('should require session for GET', async () => {
      vi.mocked(authMod.validateSession).mockResolvedValue(false)
      const res = mockRes()
      await handler({ method: 'GET', query: {}, headers: {} } as any, res as any)
      expect(res.status).toHaveBeenCalledWith(403)
    })

    it('should return heatmap data for type=heatmap', async () => {
      mockLrange.mockResolvedValue([JSON.stringify({ x: 0.5, y: 0.7, el: 'button', ts: 123 })])
      const res = mockRes()
      await handler({ method: 'GET', query: { type: 'heatmap' }, headers: {} } as any, res as any)
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ heatmap: expect.any(Array) }))
    })
  })

  describe('POST /api/analytics', () => {
    it('should record a page_view event', async () => {
      const res = mockRes()
      await handler({
        method: 'POST',
        body: { type: 'page_view', meta: { sessionId: 'abc123' } },
        headers: {},
      } as any, res as any)
      expect(res.json).toHaveBeenCalledWith({ ok: true })
    })

    it('should record a section_view event', async () => {
      const res = mockRes()
      await handler({
        method: 'POST',
        body: { type: 'section_view', target: 'bio' },
        headers: {},
      } as any, res as any)
      expect(res.json).toHaveBeenCalledWith({ ok: true })
    })

    it('should reject invalid event type', async () => {
      const res = mockRes()
      await handler({
        method: 'POST',
        body: { type: 'unknown_type' },
        headers: {},
      } as any, res as any)
      expect(res.status).toHaveBeenCalledWith(400)
    })

    it('should reject missing body', async () => {
      const res = mockRes()
      await handler({
        method: 'POST',
        body: null,
        headers: {},
      } as any, res as any)
      expect(res.status).toHaveBeenCalledWith(400)
    })

    it('should reject excessively large body (>4096 bytes)', async () => {
      const res = mockRes()
      await handler({
        method: 'POST',
        body: { type: 'page_view', meta: { referrer: 'x'.repeat(5000) } },
        headers: {},
      } as any, res as any)
      expect(res.status).toHaveBeenCalledWith(413)
    })
  })

  describe('DELETE /api/analytics', () => {
    it('should require session for DELETE', async () => {
      vi.mocked(authMod.validateSession).mockResolvedValue(false)
      const res = mockRes()
      await handler({ method: 'DELETE', headers: {} } as any, res as any)
      expect(res.status).toHaveBeenCalledWith(403)
    })

    it('should delete analytics data with valid session', async () => {
      mockSmembers.mockResolvedValue(['2026-02-20'])
      const res = mockRes()
      await handler({ method: 'DELETE', headers: {} } as any, res as any)
      expect(res.json).toHaveBeenCalledWith({ ok: true })
    })
  })

  it('should return 405 for unsupported methods', async () => {
    const res = mockRes()
    await handler({ method: 'PUT', headers: {} } as any, res as any)
    expect(res.status).toHaveBeenCalledWith(405)
  })
})
