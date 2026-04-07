import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as authMod from '../../api/auth.ts'

// ---------------------------------------------------------------------------
// Mock @upstash/redis
// ---------------------------------------------------------------------------
const mockGet = vi.fn()
const mockSet = vi.fn()
const mockLrange = vi.fn()
const mockDel = vi.fn()

vi.mock('@upstash/redis', () => ({
  Redis: class {
    get = mockGet
    set = mockSet
    lrange = mockLrange
    del = mockDel
  },
}))

vi.mock('../../api/_ratelimit.ts', () => ({
  applyRateLimit: vi.fn().mockResolvedValue(true),
  getClientIp: vi.fn().mockReturnValue('127.0.0.1'),
  hashIp: vi.fn().mockReturnValue('deadbeef'),
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

const { default: handler } = await import('../../api/security-incidents.ts')

// ---------------------------------------------------------------------------
describe('Security Incidents API handler', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.UPSTASH_REDIS_REST_URL = 'https://fake.upstash.io'
    process.env.UPSTASH_REDIS_REST_TOKEN = 'token'
    vi.mocked(authMod.validateSession).mockResolvedValue(true)
    mockLrange.mockResolvedValue([])
    mockDel.mockResolvedValue(1)
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

  describe('GET /api/security-incidents', () => {
    it('returns empty incidents list when no alerts stored', async () => {
      mockLrange.mockResolvedValue([])
      const res = mockRes()
      await handler({ method: 'GET', headers: {} } as any, res as any)
      expect(res.json).toHaveBeenCalledWith({ incidents: [] })
    })

    it('returns parsed JSON incidents', async () => {
      const entry = { key: 'admin_backup', hashedIp: 'abc', timestamp: '2026-01-01' }
      mockLrange.mockResolvedValue([JSON.stringify(entry)])
      const res = mockRes()
      await handler({ method: 'GET', headers: {} } as any, res as any)
      expect(res.json).toHaveBeenCalledWith({ incidents: [entry] })
    })

    it('gracefully handles malformed JSON entries', async () => {
      mockLrange.mockResolvedValue(['not-valid-json', JSON.stringify({ valid: true })])
      const res = mockRes()
      await handler({ method: 'GET', headers: {} } as any, res as any)
      const call = vi.mocked(res.json).mock.calls[0][0] as { incidents: unknown[] }
      expect(call.incidents).toHaveLength(2)
    })
  })

  describe('DELETE /api/security-incidents', () => {
    it('clears the honeytoken alerts list', async () => {
      const res = mockRes()
      await handler({ method: 'DELETE', headers: {} } as any, res as any)
      expect(mockDel).toHaveBeenCalledWith('nk-honeytoken-alerts')
      expect(res.json).toHaveBeenCalledWith({ success: true })
    })
  })

  it('returns 405 for unsupported methods', async () => {
    const res = mockRes()
    await handler({ method: 'PATCH', headers: {} } as any, res as any)
    expect(res.status).toHaveBeenCalledWith(405)
  })
})
