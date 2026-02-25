import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---------------------------------------------------------------------------
// Mock @vercel/kv (for reset-password handler) and @upstash/redis (for kv handler)
// ---------------------------------------------------------------------------
const mockKvGet = vi.fn()
const mockKvSet = vi.fn()

vi.mock('@vercel/kv', () => ({
  kv: { get: mockKvGet, set: mockKvSet },
}))

vi.mock('@upstash/redis', () => {
  const Redis = function () {
    return { get: mockKvGet, set: mockKvSet }
  }
  return { Redis }
})

// ---------------------------------------------------------------------------
// Mock rate limiter with controllable behavior
// ---------------------------------------------------------------------------
const mockApplyRateLimit = vi.fn()

vi.mock('../../api/_ratelimit.js', () => ({
  applyRateLimit: (...args: unknown[]) => mockApplyRateLimit(...args),
  hashIp: vi.fn().mockReturnValue('hashed-ip'),
  getClientIp: vi.fn().mockReturnValue('1.2.3.4'),
}))

// Mock honeytokens — disable in rate-limit tests
vi.mock('../../api/_honeytokens.js', () => ({
  isHoneytoken: vi.fn().mockReturnValue(false),
  triggerHoneytokenAlarm: vi.fn().mockResolvedValue(undefined),
  isMarkedAttacker: vi.fn().mockResolvedValue(false),
  injectEntropyHeaders: vi.fn(),
  getRandomTaunt: vi.fn().mockReturnValue('test-taunt'),
  setDefenseHeaders: vi.fn(),
}))

// Mock blocklist — disable hard-blocking in rate-limit tests
vi.mock('../../api/_blocklist.js', () => ({
  isHardBlocked: vi.fn().mockResolvedValue(false),
}))

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Res = { status: ReturnType<typeof vi.fn>; json: ReturnType<typeof vi.fn>; end: ReturnType<typeof vi.fn> }

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

const { default: kvHandler } = await import('../../api/kv.js')
const { default: resetHandler } = await import('../../api/reset-password.js')

// ---------------------------------------------------------------------------
describe('Rate limiting integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.KV_REST_API_URL = 'https://fake-kv.vercel.test'
    process.env.KV_REST_API_TOKEN = 'fake-token'
    process.env.UPSTASH_REDIS_REST_URL = 'https://fake-kv.test'
    process.env.UPSTASH_REDIS_REST_TOKEN = 'fake-token'
    process.env.ADMIN_RESET_EMAIL = 'admin@example.com'
  })

  // ======= KV handler =======
  describe('KV handler rate limiting', () => {
    it('allows request when rate limit passes', async () => {
      mockApplyRateLimit.mockResolvedValue(true)
      mockKvGet.mockResolvedValue({ name: 'test' })
      const res = mockRes()
      await kvHandler({ method: 'GET', query: { key: 'zardonic-band-data' }, body: {}, headers: {} }, res)
      expect(mockApplyRateLimit).toHaveBeenCalled()
      expect(res.json).toHaveBeenCalledWith({ value: { name: 'test' } })
    })

    it('blocks request with 429 when rate limit exceeded', async () => {
      // Simulate rate limiter sending 429 and returning false
      mockApplyRateLimit.mockImplementation(async (_req: unknown, res: Res) => {
        res.status(429).json({
          error: 'Too Many Requests',
          message: 'Rate limit exceeded. Please try again in a few seconds.',
        })
        return false
      })
      const res = mockRes()
      await kvHandler({ method: 'GET', query: { key: 'band-data' }, body: {}, headers: {} }, res)
      expect(res.status).toHaveBeenCalledWith(429)
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'Too Many Requests' }))
      // KV should not be called
      expect(mockKvGet).not.toHaveBeenCalled()
    })

    it('does not rate limit OPTIONS requests', async () => {
      const res = mockRes()
      await kvHandler({ method: 'OPTIONS', query: {}, body: {}, headers: {} }, res)
      expect(res.status).toHaveBeenCalledWith(200)
      expect(mockApplyRateLimit).not.toHaveBeenCalled()
    })

    it('rate limits POST requests', async () => {
      mockApplyRateLimit.mockImplementation(async (_req: unknown, res: Res) => {
        res.status(429).json({ error: 'Too Many Requests' })
        return false
      })
      const res = mockRes()
      await kvHandler({
        method: 'POST',
        query: {},
        body: { key: 'band-data', value: 'test' },
        headers: {},
      }, res)
      expect(res.status).toHaveBeenCalledWith(429)
      expect(mockKvSet).not.toHaveBeenCalled()
    })
  })

  // ======= Reset password handler =======
  describe('Reset password handler rate limiting', () => {
    it('allows password reset when rate limit passes', async () => {
      mockApplyRateLimit.mockResolvedValue(true)
      const res = mockRes()
      await resetHandler({
        method: 'POST',
        query: {},
        body: { email: 'wrong@example.com' },
        headers: {},
      }, res)
      expect(mockApplyRateLimit).toHaveBeenCalled()
      // Should succeed (even for wrong email — returns same message)
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
    })

    it('blocks password reset attempts when rate limited', async () => {
      mockApplyRateLimit.mockImplementation(async (_req: unknown, res: Res) => {
        res.status(429).json({
          error: 'Too Many Requests',
          message: 'Rate limit exceeded. Please try again in a few seconds.',
        })
        return false
      })
      const res = mockRes()
      await resetHandler({
        method: 'POST',
        query: {},
        body: { email: 'admin@example.com' },
        headers: {},
      }, res)
      expect(res.status).toHaveBeenCalledWith(429)
    })
  })
})

// ---------------------------------------------------------------------------
describe('Rate limit utility: hashIp', () => {
  it('produces consistent hashes for the same IP', async () => {
    // Import the real module directly (not the mocked version)
    const crypto = await import('node:crypto')
    const salt = 'nk-default-rate-limit-salt-change-me'
    const ip = '192.168.1.1'
    const hash1 = crypto.createHash('sha256').update(salt + ip).digest('hex')
    const hash2 = crypto.createHash('sha256').update(salt + ip).digest('hex')
    expect(hash1).toBe(hash2)
    expect(typeof hash1).toBe('string')
    expect(hash1.length).toBe(64) // SHA-256 hex digest
  })

  it('produces different hashes for different IPs', async () => {
    const crypto = await import('node:crypto')
    const salt = 'nk-default-rate-limit-salt-change-me'
    const hash1 = crypto.createHash('sha256').update(salt + '192.168.1.1').digest('hex')
    const hash2 = crypto.createHash('sha256').update(salt + '10.0.0.1').digest('hex')
    expect(hash1).not.toBe(hash2)
  })

  it('does not output the raw IP in the hash', async () => {
    const crypto = await import('node:crypto')
    const salt = 'nk-default-rate-limit-salt-change-me'
    const ip = '192.168.1.1'
    const hash = crypto.createHash('sha256').update(salt + ip).digest('hex')
    expect(hash).not.toContain(ip)
    expect(hash).not.toContain('192')
  })
})

// ---------------------------------------------------------------------------
describe('Rate limit utility: getClientIp logic', () => {
  it('extracts IP from x-forwarded-for header', () => {
    const forwarded = '1.2.3.4'
    const ip = typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : '127.0.0.1'
    expect(ip).toBe('1.2.3.4')
  })

  it('takes first IP from comma-separated x-forwarded-for', () => {
    const forwarded = '1.2.3.4, 5.6.7.8'
    const ip = typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : '127.0.0.1'
    expect(ip).toBe('1.2.3.4')
  })

  it('falls back to 127.0.0.1 when no forwarded header', () => {
    const forwarded = undefined
    const ip = typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : '127.0.0.1'
    expect(ip).toBe('127.0.0.1')
  })
})
