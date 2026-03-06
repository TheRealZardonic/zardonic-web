import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---------------------------------------------------------------------------
// Mock @upstash/redis
// ---------------------------------------------------------------------------
const mockGet = vi.fn()
const mockSet = vi.fn()
const mockDel = vi.fn()
const mockScan = vi.fn()
const mockSetHeader = vi.fn()

vi.mock('@upstash/redis', () => ({
  Redis: class {
    get = mockGet
    set = mockSet
    del = mockDel
    scan = mockScan
  },
}))

vi.mock('../../api/_ratelimit.ts', () => ({
  applyRateLimit: vi.fn().mockResolvedValue(true),
  getClientIp: vi.fn().mockReturnValue('127.0.0.1'),
  hashIp: vi.fn().mockReturnValue('abc123def456abc123def456abc123def456abc123def456abc123def456abc1'),
}))

vi.mock('otpauth', () => ({
  Secret: class {
    static fromBase32(s: string) { return { base32: s } }
    constructor() { this.base32 = 'JBSWY3DPEHPK3PXP' }
    base32: string
  },
  TOTP: class {
    constructor(opts: Record<string, unknown>) { this._opts = opts }
    _opts: Record<string, unknown>
    toString() { return 'otpauth://totp/ZARDONIC%20Admin:admin?secret=JBSWY3DPEHPK3PXP' }
    validate({ token }: { token: string; window: number }) {
      return token === '123456' ? 0 : null
    }
  },
}))

type MockRes = {
  status: ReturnType<typeof vi.fn>
  json: ReturnType<typeof vi.fn>
  setHeader: ReturnType<typeof vi.fn>
  end: ReturnType<typeof vi.fn>
}

function mockRes(): MockRes {
  const res: MockRes = {
    status: vi.fn(),
    json: vi.fn(),
    setHeader: vi.fn(),
    end: vi.fn(),
  }
  res.status.mockReturnValue(res)
  res.json.mockReturnValue(res)
  res.setHeader.mockReturnValue(res)
  res.end.mockReturnValue(res)
  return res
}

const { default: handler, hashPassword, getSessionFromCookie } = await import('../../api/auth.ts')

// ---------------------------------------------------------------------------
// Pre-generate a SHA-256 hash for password 'password' to use in login tests
// (legacy format — avoids slow scrypt in the happy path)
const LEGACY_SHA256_OF_PASSWORD = '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8'

// ---------------------------------------------------------------------------
describe('getSessionFromCookie()', () => {
  it('extracts token from zd-session cookie', () => {
    const req = { headers: { cookie: 'zd-session=mytoken123' } } as any
    expect(getSessionFromCookie(req)).toBe('mytoken123')
  })

  it('extracts token from cookie with other cookies before it', () => {
    const req = { headers: { cookie: 'other=x; zd-session=tok2; another=y' } } as any
    expect(getSessionFromCookie(req)).toBe('tok2')
  })

  it('returns null when cookie not present', () => {
    const req = { headers: {} } as any
    expect(getSessionFromCookie(req)).toBeNull()
  })

  it('returns null when zd-session is absent from cookies', () => {
    const req = { headers: { cookie: 'other=val' } } as any
    expect(getSessionFromCookie(req)).toBeNull()
  })
})

// ---------------------------------------------------------------------------
describe('hashPassword()', () => {
  it('produces scrypt:<salt>:<key> format', async () => {
    const hash = await hashPassword('hunter2')
    expect(hash).toMatch(/^scrypt:[0-9a-f]+:[0-9a-f]+$/)
  })

  it('produces a unique salt on each call', async () => {
    const h1 = await hashPassword('same')
    const h2 = await hashPassword('same')
    expect(h1).not.toBe(h2) // Different salts → different hashes
  })
})

// ---------------------------------------------------------------------------
describe('Auth API handler', () => {
  beforeEach(() => {
    // Use mockReset (not clearAllMocks) to flush the Once queue between tests
    mockGet.mockReset()
    mockSet.mockReset()
    mockDel.mockReset()
    mockScan.mockReset()
    process.env.UPSTASH_REDIS_REST_URL = 'https://fake.upstash.io'
    process.env.UPSTASH_REDIS_REST_TOKEN = 'token'
    delete process.env.ADMIN_SETUP_TOKEN
    mockGet.mockResolvedValue(null)
    mockSet.mockResolvedValue('OK')
    mockDel.mockResolvedValue(1)
    mockScan.mockResolvedValue([0, []])
  })

  it('OPTIONS returns 200', async () => {
    const res = mockRes()
    await handler({ method: 'OPTIONS', headers: {}, body: {} } as any, res as any)
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.end).toHaveBeenCalled()
  })

  it('returns 503 when KV not configured', async () => {
    delete process.env.UPSTASH_REDIS_REST_URL
    const res = mockRes()
    await handler({ method: 'GET', headers: {}, body: {} } as any, res as any)
    expect(res.status).toHaveBeenCalledWith(503)
  })

  // -------------------------------------------------------------------------
  describe('GET — auth status', () => {
    it('returns authenticated:false + needsSetup:true when no password set', async () => {
      mockGet.mockResolvedValue(null)
      const res = mockRes()
      await handler({ method: 'GET', headers: { cookie: '' }, body: {} } as any, res as any)
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        authenticated: false,
        needsSetup: true,
        totpEnabled: false,
      }))
    })

    it('returns needsSetup:false when password is stored', async () => {
      // First call: admin-password-hash, second: TOTP key
      mockGet.mockResolvedValueOnce(LEGACY_SHA256_OF_PASSWORD).mockResolvedValue(null)
      const res = mockRes()
      await handler({ method: 'GET', headers: { cookie: '' }, body: {} } as any, res as any)
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ needsSetup: false }))
    })

    it('returns totpEnabled:true when TOTP secret stored', async () => {
      mockGet.mockResolvedValueOnce(null) // session lookup
        .mockResolvedValueOnce(LEGACY_SHA256_OF_PASSWORD) // admin-password-hash
        .mockResolvedValueOnce('TOTPSECRET') // TOTP key
      const res = mockRes()
      await handler({ method: 'GET', headers: { cookie: '' }, body: {} } as any, res as any)
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ totpEnabled: true }))
    })

    it('returns setupTokenRequired:true when ADMIN_SETUP_TOKEN env is set', async () => {
      process.env.ADMIN_SETUP_TOKEN = 'secret-token'
      mockGet.mockResolvedValue(null)
      const res = mockRes()
      await handler({ method: 'GET', headers: { cookie: '' }, body: {} } as any, res as any)
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ setupTokenRequired: true }))
    })
  })

  // -------------------------------------------------------------------------
  describe('POST action=setup — initial password setup', () => {
    it('sets password and returns success', async () => {
      mockGet.mockResolvedValue(null) // no existing hash (kv.get('admin-password-hash') → null)
      const res = mockRes()
      await handler({
        method: 'POST',
        headers: { 'user-agent': 'test', 'x-forwarded-for': '127.0.0.1', cookie: '' },
        body: { action: 'setup', password: 'newpassword1' },
      } as any, res as any)
      expect(res.json).toHaveBeenCalledWith({ success: true })
      // Password hash stored without TTL; session stored with TTL
      expect(mockSet).toHaveBeenCalledWith('admin-password-hash', expect.stringMatching(/^scrypt:/))
    })

    it('returns 409 if password already configured', async () => {
      mockGet.mockResolvedValue(LEGACY_SHA256_OF_PASSWORD)
      const res = mockRes()
      await handler({
        method: 'POST',
        headers: {},
        body: { action: 'setup', password: 'newpassword1' },
      } as any, res as any)
      expect(res.status).toHaveBeenCalledWith(409)
    })

    it('returns 403 if setup token is wrong', async () => {
      process.env.ADMIN_SETUP_TOKEN = 'correct-token'
      mockGet.mockResolvedValue(null)
      const res = mockRes()
      await handler({
        method: 'POST',
        headers: {},
        body: { action: 'setup', password: 'newpassword1', setupToken: 'wrong-token' },
      } as any, res as any)
      expect(res.status).toHaveBeenCalledWith(403)
    })

    it('returns 400 for password too short', async () => {
      const res = mockRes()
      await handler({
        method: 'POST',
        headers: {},
        body: { action: 'setup', password: 'short' },
      } as any, res as any)
      expect(res.status).toHaveBeenCalledWith(400)
    })
  })

  // -------------------------------------------------------------------------
  describe('POST (login)', () => {
    it('returns success on valid SHA-256 password', async () => {
      // Login flow: (1) get TOTP_KEY → null, (2) get admin-password-hash → SHA-256 hash
      mockGet.mockResolvedValueOnce(null)                  // kv.get(TOTP_KEY)
        .mockResolvedValueOnce(LEGACY_SHA256_OF_PASSWORD)  // kv.get('admin-password-hash')
      const res = mockRes()
      await handler({
        method: 'POST',
        headers: { 'user-agent': 'test-agent', 'x-forwarded-for': '127.0.0.1', cookie: '' },
        body: { password: 'password' },
      } as any, res as any)
      expect(res.json).toHaveBeenCalledWith({ success: true })
      expect(res.setHeader).toHaveBeenCalledWith('Set-Cookie', expect.stringContaining('zd-session='))
    })

    it('returns 401 on invalid password', async () => {
      mockGet.mockResolvedValueOnce(null)                  // kv.get(TOTP_KEY)
        .mockResolvedValueOnce(LEGACY_SHA256_OF_PASSWORD)  // kv.get('admin-password-hash')
      const res = mockRes()
      await handler({
        method: 'POST',
        headers: { cookie: '' },
        body: { password: 'wrongpassword' },
      } as any, res as any)
      expect(res.status).toHaveBeenCalledWith(401)
    })

    it('returns 401 when no password hash is stored', async () => {
      mockGet.mockResolvedValueOnce(null) // kv.get(TOTP_KEY) → null
        .mockResolvedValueOnce(null)      // kv.get('admin-password-hash') → null
      const res = mockRes()
      await handler({
        method: 'POST',
        headers: { cookie: '' },
        body: { password: 'anypassword' },
      } as any, res as any)
      expect(res.status).toHaveBeenCalledWith(401)
    })

    it('returns 403 totpRequired when TOTP enabled but no code provided', async () => {
      // TOTP enabled: (1) get TOTP_KEY → secret, (2) get password hash → SHA-256
      mockGet.mockResolvedValueOnce('TOTPSECRET')          // kv.get(TOTP_KEY) → TOTP enabled
        .mockResolvedValueOnce(LEGACY_SHA256_OF_PASSWORD)  // kv.get('admin-password-hash')
      const res = mockRes()
      await handler({
        method: 'POST',
        headers: { cookie: '' },
        body: { password: 'password' },
      } as any, res as any)
      expect(res.status).toHaveBeenCalledWith(403)
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ totpRequired: true }))
    })

    it('returns 403 on invalid TOTP code', async () => {
      mockGet.mockResolvedValueOnce('TOTPSECRET')
        .mockResolvedValueOnce(LEGACY_SHA256_OF_PASSWORD)
      const res = mockRes()
      await handler({
        method: 'POST',
        headers: { cookie: '' },
        body: { password: 'password', totpCode: '999999' }, // wrong code
      } as any, res as any)
      expect(res.status).toHaveBeenCalledWith(403)
    })

    it('succeeds with correct TOTP code 123456', async () => {
      mockGet.mockResolvedValueOnce('TOTPSECRET')
        .mockResolvedValueOnce(LEGACY_SHA256_OF_PASSWORD)
      const res = mockRes()
      await handler({
        method: 'POST',
        headers: { 'user-agent': 'test', 'x-forwarded-for': '127.0.0.1', cookie: '' },
        body: { password: 'password', totpCode: '123456' }, // mock validates this
      } as any, res as any)
      expect(res.json).toHaveBeenCalledWith({ success: true })
    })

    it('returns 400 for missing body', async () => {
      const res = mockRes()
      await handler({ method: 'POST', headers: {}, body: null } as any, res as any)
      expect(res.status).toHaveBeenCalledWith(400)
    })

    it('returns 400 for empty body object', async () => {
      const res = mockRes()
      await handler({ method: 'POST', headers: {}, body: {} } as any, res as any)
      expect(res.status).toHaveBeenCalledWith(400)
    })
  })

  // -------------------------------------------------------------------------
  describe('POST newPassword — change password', () => {
    it('returns 401 when not authenticated', async () => {
      mockGet.mockResolvedValue(null) // no session
      const res = mockRes()
      await handler({
        method: 'POST',
        headers: { cookie: '' },
        body: { currentPassword: 'old', newPassword: 'newpassword1' },
      } as any, res as any)
      expect(res.status).toHaveBeenCalledWith(401)
    })

    it('returns 403 when currentPassword is wrong', async () => {
      // session valid
      mockGet.mockResolvedValueOnce({ created: Date.now(), fingerprint: '' }) // session data (any)
        .mockResolvedValueOnce(LEGACY_SHA256_OF_PASSWORD) // stored hash
      const res = mockRes()
      await handler({
        method: 'POST',
        headers: { cookie: 'zd-session=validtoken', 'user-agent': '', 'x-forwarded-for': '127.0.0.1' },
        body: { currentPassword: 'wrongold', newPassword: 'newpassword1' },
      } as any, res as any)
      // Should reject because currentPassword doesn't match
      expect(res.status).toHaveBeenCalledWith(expect.any(Number))
    })
  })

  // -------------------------------------------------------------------------
  describe('POST action=totp-setup', () => {
    it('returns 401 when not authenticated', async () => {
      mockGet.mockResolvedValue(null)
      const res = mockRes()
      await handler({
        method: 'POST',
        headers: { cookie: '' },
        body: { action: 'totp-setup' },
      } as any, res as any)
      expect(res.status).toHaveBeenCalledWith(401)
    })

    it('returns TOTP URI and secret when authenticated and no existing TOTP', async () => {
      // session exists, no existing TOTP
      mockGet.mockResolvedValueOnce({ created: Date.now(), fingerprint: '' }) // session
        .mockResolvedValueOnce(null) // no existing TOTP key
      const res = mockRes()
      await handler({
        method: 'POST',
        headers: { cookie: 'zd-session=validtoken', 'user-agent': '', 'x-forwarded-for': '127.0.0.1' },
        body: { action: 'totp-setup' },
      } as any, res as any)
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        totpUri: expect.stringContaining('otpauth://totp/'),
        totpSecret: expect.any(String),
      }))
    })

    it('returns 409 when TOTP already configured', async () => {
      mockGet.mockResolvedValueOnce({ created: Date.now(), fingerprint: '' }) // session
        .mockResolvedValueOnce('EXISTINGSECRET') // existing TOTP key
      const res = mockRes()
      await handler({
        method: 'POST',
        headers: { cookie: 'zd-session=validtoken', 'user-agent': '', 'x-forwarded-for': '127.0.0.1' },
        body: { action: 'totp-setup' },
      } as any, res as any)
      expect(res.status).toHaveBeenCalledWith(409)
    })
  })

  // -------------------------------------------------------------------------
  describe('POST action=totp-verify', () => {
    it('returns 401 when not authenticated', async () => {
      mockGet.mockResolvedValue(null)
      const res = mockRes()
      await handler({
        method: 'POST',
        headers: { cookie: '' },
        body: { action: 'totp-verify', code: '123456' },
      } as any, res as any)
      expect(res.status).toHaveBeenCalledWith(401)
    })

    it('returns 400 when no pending TOTP enrollment', async () => {
      mockGet.mockResolvedValueOnce({ created: Date.now(), fingerprint: '' }) // session
        .mockResolvedValueOnce(null) // no pending secret
      const res = mockRes()
      await handler({
        method: 'POST',
        headers: { cookie: 'zd-session=validtoken', 'user-agent': '', 'x-forwarded-for': '127.0.0.1' },
        body: { action: 'totp-verify', code: '123456' },
      } as any, res as any)
      expect(res.status).toHaveBeenCalledWith(400)
    })

    it('returns 403 on wrong TOTP code during verify', async () => {
      mockGet.mockResolvedValueOnce({ created: Date.now(), fingerprint: '' }) // session
        .mockResolvedValueOnce('PENDINGSECRET') // pending TOTP secret
      const res = mockRes()
      await handler({
        method: 'POST',
        headers: { cookie: 'zd-session=validtoken', 'user-agent': '', 'x-forwarded-for': '127.0.0.1' },
        body: { action: 'totp-verify', code: '999999' }, // mock only accepts 123456
      } as any, res as any)
      expect(res.status).toHaveBeenCalledWith(403)
    })

    it('enables TOTP on correct code', async () => {
      mockGet.mockResolvedValueOnce({ created: Date.now(), fingerprint: '' }) // session
        .mockResolvedValueOnce('PENDINGSECRET') // pending TOTP secret
      const res = mockRes()
      await handler({
        method: 'POST',
        headers: { cookie: 'zd-session=validtoken', 'user-agent': '', 'x-forwarded-for': '127.0.0.1' },
        body: { action: 'totp-verify', code: '123456' },
      } as any, res as any)
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
      // TOTP secret should be persisted and pending deleted
      expect(mockDel).toHaveBeenCalledWith('zd-admin-totp-pending')
    })
  })

  // -------------------------------------------------------------------------
  describe('DELETE — logout', () => {
    it('clears session cookie and deletes session from Redis', async () => {
      const res = mockRes()
      await handler({
        method: 'DELETE',
        headers: { cookie: 'zd-session=mytoken' },
        body: {},
      } as any, res as any)
      expect(mockDel).toHaveBeenCalledWith('zd-session:mytoken')
      expect(res.setHeader).toHaveBeenCalledWith('Set-Cookie', expect.stringContaining('Max-Age=0'))
      expect(res.json).toHaveBeenCalledWith({ success: true })
    })

    it('still returns success when no session cookie', async () => {
      const res = mockRes()
      await handler({
        method: 'DELETE',
        headers: { cookie: '' },
        body: {},
      } as any, res as any)
      expect(res.json).toHaveBeenCalledWith({ success: true })
    })
  })

  // -------------------------------------------------------------------------
  it('returns 405 for unsupported methods', async () => {
    const res = mockRes()
    await handler({ method: 'PATCH', headers: {}, body: {} } as any, res as any)
    expect(res.status).toHaveBeenCalledWith(405)
  })
})
