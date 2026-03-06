import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---------------------------------------------------------------------------
// Mock @upstash/redis — must be declared before importing the handler
// ---------------------------------------------------------------------------
const mockKvGet = vi.fn()
const mockKvSet = vi.fn()
const mockKvDel = vi.fn()
const mockKvScan = vi.fn()

vi.mock('@upstash/redis', () => {
  const Redis = function () {
    return { get: mockKvGet, set: mockKvSet, del: mockKvDel, scan: mockKvScan }
  }
  return { Redis }
})

// Mock rate limiter — always allow requests in tests
vi.mock('../../api/_ratelimit.js', () => ({
  applyRateLimit: vi.fn().mockResolvedValue(true),
  getClientIp: vi.fn().mockReturnValue('1.2.3.4'),
}))

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Res = { status: ReturnType<typeof vi.fn>; json: ReturnType<typeof vi.fn>; end: ReturnType<typeof vi.fn>; setHeader: ReturnType<typeof vi.fn> }

function mockRes(): Res {
  const res: Res = {
    status: vi.fn(),
    json: vi.fn(),
    end: vi.fn(),
    setHeader: vi.fn(),
  }
  res.status.mockReturnValue(res)
  res.json.mockReturnValue(res)
  res.end.mockReturnValue(res)
  return res
}

const { default: handler, hashPassword } = await import('../../api/auth.js')

// ---------------------------------------------------------------------------
describe('Auth security: password change requires currentPassword', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.UPSTASH_REDIS_REST_URL = 'https://fake-kv.test'
    process.env.UPSTASH_REDIS_REST_TOKEN = 'fake-token'
  })

  it('rejects password change without currentPassword even with valid session', async () => {
    // Compute the fingerprint that the handler will generate for this request
    const crypto = await import('node:crypto')
    const expectedFingerprint = crypto.createHash('sha256').update('TestBrowser|1.2.3').digest('hex')

    // Session is valid (fingerprint matches)
    mockKvGet.mockImplementation(async (key: string) => {
      if (key.startsWith('zd-session:')) return { created: Date.now(), fingerprint: expectedFingerprint }
      if (key === 'admin-password-hash') return 'scrypt:salt:hash'
      return null
    })

    const res = mockRes()
    await handler({
      method: 'POST',
      body: { newPassword: 'newSecurePassword123' },
      headers: { cookie: 'zd-session=valid-token', 'user-agent': 'TestBrowser' },
    }, res)

    // Should be rejected because currentPassword is now required (Zod validation)
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('rejects password change with wrong currentPassword', async () => {
    const hashed = await hashPassword('correctPassword')
    const crypto = await import('node:crypto')
    const expectedFingerprint = crypto.createHash('sha256').update('TestBrowser|1.2.3').digest('hex')

    mockKvGet.mockImplementation(async (key: string) => {
      if (key.startsWith('zd-session:')) return { created: Date.now(), fingerprint: expectedFingerprint }
      if (key === 'admin-password-hash') return hashed
      return null
    })

    const res = mockRes()
    await handler({
      method: 'POST',
      body: { currentPassword: 'wrongPassword', newPassword: 'newSecurePassword123' },
      headers: { cookie: 'zd-session=valid-token', 'user-agent': 'TestBrowser' },
    }, res)

    expect(res.status).toHaveBeenCalledWith(403)
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'Current password is incorrect' }))
  })
})

// ---------------------------------------------------------------------------
describe('Auth security: session invalidation on password change', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.UPSTASH_REDIS_REST_URL = 'https://fake-kv.test'
    process.env.UPSTASH_REDIS_REST_TOKEN = 'fake-token'
  })

  it('invalidates all sessions and creates new one after password change', async () => {
    const hashed = await hashPassword('oldPassword')
    const crypto = await import('node:crypto')
    const expectedFingerprint = crypto.createHash('sha256').update('TestBrowser|1.2.3').digest('hex')
    
    // Simulate existing sessions
    mockKvGet.mockImplementation(async (key: string) => {
      if (key.startsWith('zd-session:')) return { created: Date.now(), fingerprint: expectedFingerprint }
      if (key === 'admin-password-hash') return hashed
      return null
    })
    mockKvSet.mockResolvedValue('OK')
    mockKvDel.mockResolvedValue(1)
    // Return some session keys then end scanning
    mockKvScan.mockResolvedValueOnce([0, ['zd-session:old1', 'zd-session:old2']])

    const res = mockRes()
    await handler({
      method: 'POST',
      body: { currentPassword: 'oldPassword', newPassword: 'newSecurePassword123' },
      headers: { cookie: 'zd-session=valid-token', 'user-agent': 'TestBrowser' },
    }, res)

    expect(res.json).toHaveBeenCalledWith({ success: true })
    // Verify scan was called to find sessions
    expect(mockKvScan).toHaveBeenCalledWith(0, { match: 'zd-session:*', count: 100 })
    // Verify old sessions were deleted
    expect(mockKvDel).toHaveBeenCalledWith('zd-session:old1')
    expect(mockKvDel).toHaveBeenCalledWith('zd-session:old2')
    // Verify a new session was created (setHeader for cookie)
    expect(res.setHeader).toHaveBeenCalledWith('Set-Cookie', expect.stringContaining('zd-session='))
  })
})

// ---------------------------------------------------------------------------
describe('Auth security: session TTL is 4 hours', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.UPSTASH_REDIS_REST_URL = 'https://fake-kv.test'
    process.env.UPSTASH_REDIS_REST_TOKEN = 'fake-token'
  })

  it('sets session with 4-hour TTL on login', async () => {
    const hashed = await hashPassword('testPassword')
    mockKvGet.mockImplementation(async (key: string) => {
      if (key === 'admin-password-hash') return hashed
      return null
    })
    mockKvSet.mockResolvedValue('OK')

    const res = mockRes()
    await handler({
      method: 'POST',
      body: { password: 'testPassword' },
      headers: { 'user-agent': 'TestBrowser' },
    }, res)

    expect(res.json).toHaveBeenCalledWith({ success: true })
    // Check session is created with 4-hour TTL (14400 seconds)
    expect(mockKvSet).toHaveBeenCalledWith(
      expect.stringMatching(/^zd-session:/),
      expect.objectContaining({ created: expect.any(Number), fingerprint: expect.any(String) }),
      { ex: 14400 }
    )
    // Cookie Max-Age should be 14400
    expect(res.setHeader).toHaveBeenCalledWith('Set-Cookie', expect.stringContaining('Max-Age=14400'))
  })
})

// ---------------------------------------------------------------------------
describe('Auth security: client fingerprint binding', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.UPSTASH_REDIS_REST_URL = 'https://fake-kv.test'
    process.env.UPSTASH_REDIS_REST_TOKEN = 'fake-token'
  })

  it('stores fingerprint when creating session', async () => {
    const hashed = await hashPassword('testPassword')
    mockKvGet.mockImplementation(async (key: string) => {
      if (key === 'admin-password-hash') return hashed
      return null
    })
    mockKvSet.mockResolvedValue('OK')

    const res = mockRes()
    await handler({
      method: 'POST',
      body: { password: 'testPassword' },
      headers: { 'user-agent': 'Mozilla/5.0', 'x-forwarded-for': '1.2.3.4' },
    }, res)

    expect(res.json).toHaveBeenCalledWith({ success: true })
    // Session should include a fingerprint
    expect(mockKvSet).toHaveBeenCalledWith(
      expect.stringMatching(/^zd-session:/),
      expect.objectContaining({ fingerprint: expect.any(String) }),
      expect.any(Object)
    )
  })

  it('rejects session with mismatched fingerprint (different User-Agent)', async () => {
    // Create a session with one fingerprint
    const crypto = await import('node:crypto')
    const originalFingerprint = crypto.createHash('sha256').update('OriginalBrowser|1.2.3').digest('hex')

    mockKvGet.mockImplementation(async (key: string) => {
      if (key.startsWith('zd-session:')) return { created: Date.now(), fingerprint: originalFingerprint }
      if (key === 'admin-password-hash') return 'scrypt:salt:hash'
      return null
    })

    // Try to use session with different User-Agent
    const res = mockRes()
    await handler({
      method: 'GET',
      headers: { cookie: 'zd-session=valid-token', 'user-agent': 'DifferentBrowser' },
    }, res)

    const jsonCall = res.json.mock.calls[0][0]
    // Session should be invalid due to fingerprint mismatch
    expect(jsonCall.authenticated).toBe(false)
  })
})
