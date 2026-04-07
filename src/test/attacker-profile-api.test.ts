import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as authMod from '../../api/auth.ts'

// ---------------------------------------------------------------------------
// Mock @upstash/redis
// ---------------------------------------------------------------------------
const mockGet = vi.fn()
const mockSet = vi.fn()
const mockDel = vi.fn()
const mockSadd = vi.fn()
const mockSrem = vi.fn()
const mockSmembers = vi.fn()

vi.mock('@upstash/redis', () => ({
  Redis: class {
    get = mockGet
    set = mockSet
    del = mockDel
    sadd = mockSadd
    srem = mockSrem
    smembers = mockSmembers
  },
}))

vi.mock('../../api/_ratelimit.ts', () => ({
  applyRateLimit: vi.fn().mockResolvedValue(true),
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

const { default: handler } = await import('../../api/attacker-profile.ts')

const HASH = 'a'.repeat(64)

const MOCK_PROFILE = {
  hashedIp: HASH,
  firstSeen: '2026-01-01T00:00:00.000Z',
  lastSeen: '2026-02-01T00:00:00.000Z',
  totalIncidents: 5,
  attackTypes: { honeytoken_access: 3, robots_violation: 2 },
  userAgents: { 'curl/7.0': 5 },
  threatScoreHistory: [],
  incidents: [],
}

// ---------------------------------------------------------------------------
describe('Attacker Profile API handler', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.UPSTASH_REDIS_REST_URL = 'https://fake.upstash.io'
    process.env.UPSTASH_REDIS_REST_TOKEN = 'token'
    vi.mocked(authMod.validateSession).mockResolvedValue(true)
    mockGet.mockResolvedValue(null)
    mockSmembers.mockResolvedValue([])
    mockDel.mockResolvedValue(1)
    mockSrem.mockResolvedValue(1)
  })

  it('OPTIONS returns 200', async () => {
    const res = mockRes()
    await handler({ method: 'OPTIONS', headers: {}, query: {} } as any, res as any)
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.end).toHaveBeenCalled()
  })

  it('returns 503 when KV not configured', async () => {
    delete process.env.UPSTASH_REDIS_REST_URL
    const res = mockRes()
    await handler({ method: 'GET', headers: {}, query: {} } as any, res as any)
    expect(res.status).toHaveBeenCalledWith(503)
  })

  it('returns 403 without valid session', async () => {
    vi.mocked(authMod.validateSession).mockResolvedValue(false)
    const res = mockRes()
    await handler({ method: 'GET', headers: {}, query: {} } as any, res as any)
    expect(res.status).toHaveBeenCalledWith(403)
  })

  describe('GET — single profile by hashedIp', () => {
    it('returns 404 when profile not found', async () => {
      mockGet.mockResolvedValue(null)
      const res = mockRes()
      await handler({ method: 'GET', headers: {}, query: { hashedIp: HASH } } as any, res as any)
      expect(res.status).toHaveBeenCalledWith(404)
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'Profile not found' }))
    })

    it('returns profile with behavioral patterns when found', async () => {
      mockGet.mockResolvedValue(MOCK_PROFILE)
      const res = mockRes()
      await handler({ method: 'GET', headers: {}, query: { hashedIp: HASH } } as any, res as any)
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        profile: expect.objectContaining({
          hashedIp: HASH,
          totalIncidents: 5,
          behavioralPatterns: expect.any(Array),
        }),
      }))
    })
  })

  describe('GET — all profiles (paginated)', () => {
    it('returns empty profiles list when none exist', async () => {
      mockSmembers.mockResolvedValue([])
      const res = mockRes()
      await handler({ method: 'GET', headers: {}, query: {} } as any, res as any)
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        profiles: [],
        total: 0,
      }))
    })

    it('returns paginated profiles', async () => {
      mockSmembers.mockResolvedValue([HASH])
      mockGet.mockResolvedValue(MOCK_PROFILE)
      const res = mockRes()
      await handler({ method: 'GET', headers: {}, query: { limit: '10', offset: '0' } } as any, res as any)
      const call = vi.mocked(res.json).mock.calls[0][0] as { profiles: unknown[]; total: number }
      expect(call.profiles).toHaveLength(1)
      expect(call.total).toBe(1)
    })

    it('returns 400 for limit > 100', async () => {
      const res = mockRes()
      await handler({ method: 'GET', headers: {}, query: { limit: '200' } } as any, res as any)
      expect(res.status).toHaveBeenCalledWith(400)
    })
  })

  describe('DELETE — delete profile', () => {
    it('returns 400 when hashedIp is missing', async () => {
      const res = mockRes()
      await handler({ method: 'DELETE', headers: {}, query: {} } as any, res as any)
      expect(res.status).toHaveBeenCalledWith(400)
    })

    it('deletes the profile successfully', async () => {
      mockDel.mockResolvedValue(1)
      mockSrem.mockResolvedValue(1)
      const res = mockRes()
      await handler({ method: 'DELETE', headers: {}, query: { hashedIp: HASH } } as any, res as any)
      expect(res.json).toHaveBeenCalledWith({ success: true })
    })

    it('returns 400 for hashedIp too short', async () => {
      const res = mockRes()
      await handler({ method: 'DELETE', headers: {}, query: { hashedIp: 'short' } } as any, res as any)
      expect(res.status).toHaveBeenCalledWith(400)
    })
  })

  it('returns 405 for unsupported methods', async () => {
    const res = mockRes()
    await handler({ method: 'PUT', headers: {}, query: {} } as any, res as any)
    expect(res.status).toHaveBeenCalledWith(405)
  })
})
