import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as authMod from '../../api/auth.ts'

// ---------------------------------------------------------------------------
// Mock @upstash/redis
// ---------------------------------------------------------------------------
const mockGet = vi.fn()
const mockSet = vi.fn()

vi.mock('@upstash/redis', () => ({
  Redis: class {
    get = mockGet
    set = mockSet
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
  const res: MockRes = {
    status: vi.fn(),
    json: vi.fn(),
    end: vi.fn(),
  }
  res.status.mockReturnValue(res)
  res.json.mockReturnValue(res)
  res.end.mockReturnValue(res)
  return res
}

const { default: handler } = await import('../../api/security-settings.ts')

const DEFAULTS = {
  honeytokensEnabled: true,
  rateLimitEnabled: true,
  robotsTrapEnabled: true,
  entropyInjectionEnabled: true,
  suspiciousUaBlockingEnabled: true,
  sessionBindingEnabled: true,
  maxAlertsStored: 500,
  tarpitMinMs: 3000,
  tarpitMaxMs: 8000,
  sessionTtlSeconds: 14400,
  threatScoringEnabled: true,
  zipBombEnabled: false,
  alertingEnabled: false,
  hardBlockEnabled: true,
  autoBlockThreshold: 12,
}

// ---------------------------------------------------------------------------
describe('Security Settings API handler', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.UPSTASH_REDIS_REST_URL = 'https://fake.upstash.io'
    process.env.UPSTASH_REDIS_REST_TOKEN = 'token'
    vi.mocked(authMod.validateSession).mockResolvedValue(true)
    mockGet.mockResolvedValue(null)
    mockSet.mockResolvedValue('OK')
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

  it('returns 403 without session', async () => {
    vi.mocked(authMod.validateSession).mockResolvedValue(false)
    const res = mockRes()
    await handler({ method: 'GET', headers: {} } as any, res as any)
    expect(res.status).toHaveBeenCalledWith(403)
  })

  describe('GET /api/security-settings', () => {
    it('returns full defaults when nothing stored', async () => {
      mockGet.mockResolvedValue(null)
      const res = mockRes()
      await handler({ method: 'GET', headers: {} } as any, res as any)
      expect(res.json).toHaveBeenCalledWith({ settings: DEFAULTS })
    })

    it('merges stored partial settings with defaults', async () => {
      mockGet.mockResolvedValue({ zipBombEnabled: true, alertingEnabled: true })
      const res = mockRes()
      await handler({ method: 'GET', headers: {} } as any, res as any)
      expect(res.json).toHaveBeenCalledWith({
        settings: { ...DEFAULTS, zipBombEnabled: true, alertingEnabled: true },
      })
    })
  })

  describe('POST /api/security-settings', () => {
    it('stores updated settings', async () => {
      mockGet.mockResolvedValue(null)
      const res = mockRes()
      await handler({
        method: 'POST',
        headers: {},
        body: { zipBombEnabled: true },
      } as any, res as any)
      expect(mockSet).toHaveBeenCalledWith(
        'zd-security-settings',
        expect.objectContaining({ zipBombEnabled: true })
      )
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
    })

    it('returns 400 for invalid payload (wrong type)', async () => {
      const res = mockRes()
      await handler({
        method: 'POST',
        headers: {},
        body: { autoBlockThreshold: 'not-a-number' },
      } as any, res as any)
      expect(res.status).toHaveBeenCalledWith(400)
    })

    it('returns 400 for invalid threshold out of range', async () => {
      const res = mockRes()
      await handler({
        method: 'POST',
        headers: {},
        body: { autoBlockThreshold: 999 },
      } as any, res as any)
      expect(res.status).toHaveBeenCalledWith(400)
    })

    it('returns 400 when body is missing', async () => {
      const res = mockRes()
      await handler({ method: 'POST', headers: {}, body: null } as any, res as any)
      expect(res.status).toHaveBeenCalledWith(400)
    })

    it('merges updated settings with existing stored values', async () => {
      mockGet.mockResolvedValue({ zipBombEnabled: true })
      const res = mockRes()
      await handler({
        method: 'POST',
        headers: {},
        body: { alertingEnabled: true },
      } as any, res as any)
      expect(mockSet).toHaveBeenCalledWith(
        'zd-security-settings',
        expect.objectContaining({ zipBombEnabled: true, alertingEnabled: true })
      )
    })
  })

  it('returns 405 for unsupported methods', async () => {
    const res = mockRes()
    await handler({ method: 'DELETE', headers: {} } as any, res as any)
    expect(res.status).toHaveBeenCalledWith(405)
  })
})
