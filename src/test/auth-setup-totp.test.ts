import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { VercelRequest, VercelResponse } from '@vercel/node'

// ---------------------------------------------------------------------------
// Mock @upstash/redis — must be declared before importing the handler
// ---------------------------------------------------------------------------
const mockKvGet = vi.fn()
const mockKvSet = vi.fn()
const mockKvDel = vi.fn()
const mockKvScan = vi.fn()
const mockPipeExec = vi.fn()
const mockPipeSet = vi.fn()
const mockPipeDel = vi.fn()

vi.mock('@upstash/redis', () => {
  const Redis = function () {
    return {
      get: mockKvGet,
      set: mockKvSet,
      del: mockKvDel,
      scan: mockKvScan,
      pipeline: () => ({
        set: mockPipeSet,
        del: mockPipeDel,
        exec: mockPipeExec,
      }),
    }
  }
  return { Redis }
})

// Mock rate limiter — always allow requests in tests
vi.mock('../../api/_ratelimit.js', () => ({
  applyRateLimit: vi.fn().mockResolvedValue(true),
  applyAuthRateLimit: vi.fn().mockResolvedValue(true),
  getClientIp: vi.fn().mockReturnValue('1.2.3.4'),
  hashIp: vi.fn().mockReturnValue('abc123def456abc123def456abc123def456abc123def456abc123def456abc1'),
}))

type Res = { status: ReturnType<typeof vi.fn>; json: ReturnType<typeof vi.fn>; end: ReturnType<typeof vi.fn>; setHeader: ReturnType<typeof vi.fn> }

function mockRes(): Res & VercelResponse {
  const res: Res = {
    status: vi.fn(),
    json: vi.fn(),
    end: vi.fn(),
    setHeader: vi.fn(),
  }
  res.status.mockReturnValue(res)
  res.json.mockReturnValue(res)
  res.end.mockReturnValue(res)
  return res as unknown as Res & VercelResponse
}

const { default: handler, hashPassword } = await import('../../api/auth.js')

// ---------------------------------------------------------------------------
describe('Auth security: setup token protection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.UPSTASH_REDIS_REST_URL = 'https://fake-kv.test'
    process.env.UPSTASH_REDIS_REST_TOKEN = 'fake-token'
    delete process.env.ADMIN_SETUP_TOKEN
  })

  it('allows setup without token when ADMIN_SETUP_TOKEN is not configured', async () => {
    mockKvGet.mockResolvedValue(null) // no existing password
    mockKvSet.mockResolvedValue('OK')

    const res = mockRes()
    await handler({
      method: 'POST',
      body: { password: 'securePass123', action: 'setup' },
      headers: { 'user-agent': 'TestBrowser' },
    } as unknown as VercelRequest, res)

    expect(res.json).toHaveBeenCalledWith({ success: true })
  })

  it('rejects setup without token when ADMIN_SETUP_TOKEN is configured', async () => {
    process.env.ADMIN_SETUP_TOKEN = 'my-secret-token'
    mockKvGet.mockResolvedValue(null)

    const res = mockRes()
    await handler({
      method: 'POST',
      body: { password: 'securePass123', action: 'setup' },
      headers: { 'user-agent': 'TestBrowser' },
    } as unknown as VercelRequest, res)

    expect(res.status).toHaveBeenCalledWith(403)
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'Invalid setup token' }))
  })

  it('rejects setup with wrong token when ADMIN_SETUP_TOKEN is configured', async () => {
    process.env.ADMIN_SETUP_TOKEN = 'my-secret-token'
    mockKvGet.mockResolvedValue(null)

    const res = mockRes()
    await handler({
      method: 'POST',
      body: { password: 'securePass123', action: 'setup', setupToken: 'wrong-token' },
      headers: { 'user-agent': 'TestBrowser' },
    } as unknown as VercelRequest, res)

    expect(res.status).toHaveBeenCalledWith(403)
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'Invalid setup token' }))
  })

  it('allows setup with correct token when ADMIN_SETUP_TOKEN is configured', async () => {
    process.env.ADMIN_SETUP_TOKEN = 'my-secret-token'
    mockKvGet.mockResolvedValue(null) // no existing password
    mockKvSet.mockResolvedValue('OK')

    const res = mockRes()
    await handler({
      method: 'POST',
      body: { password: 'securePass123', action: 'setup', setupToken: 'my-secret-token' },
      headers: { 'user-agent': 'TestBrowser' },
    } as unknown as VercelRequest, res)

    expect(res.json).toHaveBeenCalledWith({ success: true })
  })

  it('reports setupTokenRequired in GET response when ADMIN_SETUP_TOKEN is set', async () => {
    process.env.ADMIN_SETUP_TOKEN = 'my-secret-token'
    mockKvGet.mockResolvedValue(null)

    const res = mockRes()
    await handler({
      method: 'GET',
      headers: {},
    } as unknown as VercelRequest, res)

    const jsonData = res.json.mock.calls[0][0]
    expect(jsonData.setupTokenRequired).toBe(true)
  })

  it('reports setupTokenRequired=false in GET response when ADMIN_SETUP_TOKEN is not set', async () => {
    mockKvGet.mockResolvedValue(null)

    const res = mockRes()
    await handler({
      method: 'GET',
      headers: {},
    } as unknown as VercelRequest, res)

    const jsonData = res.json.mock.calls[0][0]
    expect(jsonData.setupTokenRequired).toBe(false)
  })
})

// ---------------------------------------------------------------------------
describe('Auth security: TOTP 2FA', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.UPSTASH_REDIS_REST_URL = 'https://fake-kv.test'
    process.env.UPSTASH_REDIS_REST_TOKEN = 'fake-token'
    delete process.env.ADMIN_SETUP_TOKEN
  })

  it('reports totpEnabled=false when no TOTP secret stored', async () => {
    mockKvGet.mockResolvedValue(null)

    const res = mockRes()
    await handler({
      method: 'GET',
      headers: {},
    } as unknown as VercelRequest, res)

    const jsonData = res.json.mock.calls[0][0]
    expect(jsonData.totpEnabled).toBe(false)
  })

  it('reports totpEnabled=true when TOTP secret is stored', async () => {
    mockKvGet.mockImplementation(async (key: string) => {
      if (key === 'admin-totp-secret') return 'JBSWY3DPEHPK3PXP'
      return null
    })

    const res = mockRes()
    await handler({
      method: 'GET',
      headers: {},
    } as unknown as VercelRequest, res)

    const jsonData = res.json.mock.calls[0][0]
    expect(jsonData.totpEnabled).toBe(true)
  })

  it('totp-setup requires authentication', async () => {
    mockKvGet.mockResolvedValue(null) // no session

    const res = mockRes()
    await handler({
      method: 'POST',
      body: { action: 'totp-setup' },
      headers: { 'user-agent': 'TestBrowser' },
    } as unknown as VercelRequest, res)

    expect(res.status).toHaveBeenCalledWith(401)
  })

  it('totp-setup returns TOTP URI and secret when authenticated', async () => {
    const crypto = await import('node:crypto')
    const expectedFingerprint = crypto.createHash('sha256').update('TestBrowser|1.2.3').digest('hex')

    mockKvGet.mockImplementation(async (key: string) => {
      if (key.startsWith('session:')) return { created: Date.now(), fingerprint: expectedFingerprint }
      if (key === 'admin-totp-secret') return null // no existing TOTP
      return null
    })
    mockKvSet.mockResolvedValue('OK')

    const res = mockRes()
    await handler({
      method: 'POST',
      body: { action: 'totp-setup' },
      headers: { cookie: 'nk-session=valid-token', 'user-agent': 'TestBrowser' },
    } as unknown as VercelRequest, res)

    const jsonData = res.json.mock.calls[0][0]
    expect(jsonData.success).toBe(true)
    expect(jsonData.totpUri).toMatch(/^otpauth:\/\/totp\//)
    expect(jsonData.totpSecret).toBeDefined()
    expect(typeof jsonData.totpSecret).toBe('string')
  })

  it('totp-setup rejects when TOTP is already configured', async () => {
    const crypto = await import('node:crypto')
    const expectedFingerprint = crypto.createHash('sha256').update('TestBrowser|1.2.3').digest('hex')

    mockKvGet.mockImplementation(async (key: string) => {
      if (key.startsWith('session:')) return { created: Date.now(), fingerprint: expectedFingerprint }
      if (key === 'admin-totp-secret') return 'EXISTING_SECRET'
      return null
    })

    const res = mockRes()
    await handler({
      method: 'POST',
      body: { action: 'totp-setup' },
      headers: { cookie: 'nk-session=valid-token', 'user-agent': 'TestBrowser' },
    } as unknown as VercelRequest, res)

    expect(res.status).toHaveBeenCalledWith(409)
  })

  it('login requires TOTP code when TOTP is enabled', async () => {
    const hashed = await hashPassword('testPassword')

    mockKvGet.mockImplementation(async (key: string) => {
      if (key === 'admin-password-hash') return hashed
      if (key === 'admin-totp-secret') return 'JBSWY3DPEHPK3PXP'
      return null
    })

    const res = mockRes()
    await handler({
      method: 'POST',
      body: { password: 'testPassword' },
      headers: { 'user-agent': 'TestBrowser' },
    } as unknown as VercelRequest, res)

    expect(res.status).toHaveBeenCalledWith(403)
    const jsonData = res.json.mock.calls[0][0]
    expect(jsonData.totpRequired).toBe(true)
  })

  it('login succeeds without TOTP code when TOTP is not enabled', async () => {
    const hashed = await hashPassword('testPassword')

    mockKvGet.mockImplementation(async (key: string) => {
      if (key === 'admin-password-hash') return hashed
      if (key === 'admin-totp-secret') return null
      return null
    })
    mockKvSet.mockResolvedValue('OK')

    const res = mockRes()
    await handler({
      method: 'POST',
      body: { password: 'testPassword' },
      headers: { 'user-agent': 'TestBrowser' },
    } as unknown as VercelRequest, res)

    expect(res.json).toHaveBeenCalledWith({ success: true })
  })

  it('totp-disable requires password and valid TOTP code', async () => {
    const crypto = await import('node:crypto')
    const expectedFingerprint = crypto.createHash('sha256').update('TestBrowser|1.2.3').digest('hex')

    mockKvGet.mockImplementation(async (key: string) => {
      if (key.startsWith('session:')) return { created: Date.now(), fingerprint: expectedFingerprint }
      if (key === 'admin-password-hash') return 'scrypt:salt:hash'
      if (key === 'admin-totp-secret') return 'JBSWY3DPEHPK3PXP'
      return null
    })

    const res = mockRes()
    await handler({
      method: 'POST',
      body: { action: 'totp-disable', password: 'wrong', code: '123456' },
      headers: { cookie: 'nk-session=valid-token', 'user-agent': 'TestBrowser' },
    } as unknown as VercelRequest, res)

    expect(res.status).toHaveBeenCalledWith(403)
  })
})
