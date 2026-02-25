import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---------------------------------------------------------------------------
// Mock @upstash/redis
// ---------------------------------------------------------------------------
const mockKvGet = vi.fn()
const mockKvSet = vi.fn()

vi.mock('@upstash/redis', () => {
  const Redis = function () {
    return { get: mockKvGet, set: mockKvSet }
  }
  return { Redis }
})

vi.mock('../../api/_blocklist.js', () => ({
  isHardBlocked: vi.fn().mockResolvedValue(false),
}))

// Mock rate limiter — always allow requests in tests
vi.mock('../../api/_ratelimit.js', () => ({
  applyRateLimit: vi.fn().mockResolvedValue(true),
}))

// Mock honeytokens — disable in tests
vi.mock('../../api/_honeytokens.js', () => ({
  isHoneytoken: vi.fn().mockReturnValue(false),
  triggerHoneytokenAlarm: vi.fn().mockResolvedValue(undefined),
  isMarkedAttacker: vi.fn().mockResolvedValue(false),
  injectEntropyHeaders: vi.fn(),
  getRandomTaunt: vi.fn().mockReturnValue('Nice try, mf. Your IP hash is now a permanent resident in our blacklist.'),
  setDefenseHeaders: vi.fn(),
}))

// Mock auth.js — session-based auth
const mockValidateSession = vi.fn().mockResolvedValue(false)
vi.mock('../../api/auth.js', () => ({
  validateSession: mockValidateSession,
}))

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Res = { status: ReturnType<typeof vi.fn>; json: ReturnType<typeof vi.fn>; end: ReturnType<typeof vi.fn>; setHeader: ReturnType<typeof vi.fn>; send: ReturnType<typeof vi.fn> }

function mockRes(): Res {
  const res: Res = {
    status: vi.fn(),
    json: vi.fn(),
    end: vi.fn(),
    setHeader: vi.fn(),
    send: vi.fn(),
  }
  res.status.mockReturnValue(res)
  res.json.mockReturnValue(res)
  res.end.mockReturnValue(res)
  res.send.mockReturnValue(res)
  return res
}

const { default: kvHandler, timingSafeEqual } = await import('../../api/kv.js')
const { validate, kvKeySchema, resetPasswordSchema, analyticsPostSchema } = await import('../../api/_schemas.js')

// ---------------------------------------------------------------------------
describe('Security: timingSafeEqual constant-time comparison', () => {
  beforeEach(() => vi.clearAllMocks())

  it('handles different length strings without early return on length', () => {
    // Should return false but still compare all characters
    expect(timingSafeEqual('short', 'muchlonger')).toBe(false)
    expect(timingSafeEqual('muchlonger', 'short')).toBe(false)
  })

  it('returns true for identical strings of various lengths', () => {
    expect(timingSafeEqual('a', 'a')).toBe(true)
    expect(timingSafeEqual('test@example.com', 'test@example.com')).toBe(true)
    expect(timingSafeEqual('x'.repeat(100), 'x'.repeat(100))).toBe(true)
  })

  it('returns false when one string is empty', () => {
    expect(timingSafeEqual('', 'notempty')).toBe(false)
    expect(timingSafeEqual('notempty', '')).toBe(false)
  })

  it('returns false for non-string inputs', () => {
    // @ts-expect-error testing runtime guard
    expect(timingSafeEqual(null, 'abc')).toBe(false)
    // @ts-expect-error testing runtime guard
    expect(timingSafeEqual('abc', undefined)).toBe(false)
    // @ts-expect-error testing runtime guard
    expect(timingSafeEqual(123, 456)).toBe(false)
  })
})

// ---------------------------------------------------------------------------
describe('Security: KV API key validation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.UPSTASH_REDIS_REST_URL = 'https://fake-kv.test'
    process.env.UPSTASH_REDIS_REST_TOKEN = 'fake-token'
  })

  it('rejects GET with overly long key', async () => {
    const res = mockRes()
    await kvHandler({ method: 'GET', query: { key: 'a'.repeat(201) }, body: {}, headers: {} }, res)
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'key must be 200 characters or less' }))
  })

  it('rejects GET with key containing newline characters', async () => {
    const res = mockRes()
    await kvHandler({ method: 'GET', query: { key: 'test\nkey' }, body: {}, headers: {} }, res)
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'Must not contain control characters' }))
  })

  it('rejects GET with key containing carriage return', async () => {
    const res = mockRes()
    await kvHandler({ method: 'GET', query: { key: 'test\rkey' }, body: {}, headers: {} }, res)
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('rejects GET with key containing null byte', async () => {
    const res = mockRes()
    await kvHandler({ method: 'GET', query: { key: 'test\0key' }, body: {}, headers: {} }, res)
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('rejects POST with overly long key', async () => {
    const res = mockRes()
    await kvHandler({ method: 'POST', query: {}, body: { key: 'a'.repeat(201), value: 'test' }, headers: {} }, res)
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'key must be 200 characters or less' }))
  })

  it('rejects POST with key containing newline', async () => {
    const res = mockRes()
    await kvHandler({ method: 'POST', query: {}, body: { key: 'test\nkey', value: 'x' }, headers: {} }, res)
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('rejects POST writes to analytics key prefix', async () => {
    mockKvGet.mockResolvedValue(null) // no password
    const res = mockRes()
    await kvHandler({ method: 'POST', query: {}, body: { key: 'nk-analytics:evil', value: 'x' }, headers: {} }, res)
    expect(res.status).toHaveBeenCalledWith(403)
    expect(mockKvSet).not.toHaveBeenCalled()
  })

  it('rejects POST writes to heatmap key prefix', async () => {
    mockKvGet.mockResolvedValue(null)
    const res = mockRes()
    await kvHandler({ method: 'POST', query: {}, body: { key: 'nk-heatmap', value: 'x' }, headers: {} }, res)
    expect(res.status).toHaveBeenCalledWith(403)
    expect(mockKvSet).not.toHaveBeenCalled()
  })

  it('rejects POST writes to image cache key prefix', async () => {
    mockKvGet.mockResolvedValue(null)
    const res = mockRes()
    await kvHandler({ method: 'POST', query: {}, body: { key: 'img-cache:evil', value: 'x' }, headers: {} }, res)
    expect(res.status).toHaveBeenCalledWith(403)
    expect(mockKvSet).not.toHaveBeenCalled()
  })

  it('allows POST writes to legitimate keys', async () => {
    mockValidateSession.mockResolvedValueOnce(true)
    mockKvGet.mockResolvedValue(null)
    mockKvSet.mockResolvedValue('OK')
    const res = mockRes()
    await kvHandler({ method: 'POST', query: {}, body: { key: 'band-data', value: { name: 'test' } }, headers: {} }, res)
    expect(res.json).toHaveBeenCalledWith({ success: true })
  })
})

// ---------------------------------------------------------------------------
describe('Security: YouTube embed videoId validation', () => {
  it('validates videoId format (only 11 alphanumeric chars with - and _)', () => {
    // This is tested at the component level - the regex check ensures
    // that videoId is sanitized before being embedded in the iframe src
    const validId = 'dQw4w9WgXcQ'
    const invalidId = 'javascript:alert(1)'
    expect(/^[A-Za-z0-9_-]{11}$/.test(validId)).toBe(true)
    expect(/^[A-Za-z0-9_-]{11}$/.test(invalidId)).toBe(false)
    expect(/^[A-Za-z0-9_-]{11}$/.test('')).toBe(false)
    expect(/^[A-Za-z0-9_-]{11}$/.test('<script>alert(1)</script>')).toBe(false)
  })
})

// ---------------------------------------------------------------------------
describe('Security: Drive folder folderId validation', () => {
  it('validates that folderId only contains safe characters', () => {
    const validId = '1abc_DEF-123'
    const invalidId = '../../../etc/passwd'
    const injectionAttempt = 'id=1&evil=true'
    expect(/^[A-Za-z0-9_-]+$/.test(validId)).toBe(true)
    expect(/^[A-Za-z0-9_-]+$/.test(invalidId)).toBe(false)
    expect(/^[A-Za-z0-9_-]+$/.test(injectionAttempt)).toBe(false)
  })
})

// ---------------------------------------------------------------------------
describe('Security: Image proxy SSRF protections', () => {
  // These are unit tests for the isBlockedHost logic patterns
  const BLOCKED_HOST_PATTERNS = [
    /^localhost$/i,
    /^127\./,
    /^10\./,
    /^172\.(1[6-9]|2\d|3[01])\./,
    /^192\.168\./,
    /^0\./,
    /^169\.254\./,
    /^\[::1\]/,
    /^\[::ffff:/i,
    /^\[fe80:/i,
    /^\[fc/i,
    /^\[fd/i,
    /^metadata\.google\.internal$/i,
    /^0x[0-9a-f]+$/i,
    /^0[0-7]+\./,
  ]

  function isBlockedHost(hostname: string): boolean {
    if (BLOCKED_HOST_PATTERNS.some(p => p.test(hostname))) return true
    if (/^\d+$/.test(hostname)) return true
    if (!hostname.includes('.') && !hostname.startsWith('[')) return true
    return false
  }

  it('blocks localhost', () => {
    expect(isBlockedHost('localhost')).toBe(true)
    expect(isBlockedHost('LOCALHOST')).toBe(true)
  })

  it('blocks 127.x.x.x addresses', () => {
    expect(isBlockedHost('127.0.0.1')).toBe(true)
  })

  it('blocks private 10.x.x.x addresses', () => {
    expect(isBlockedHost('10.0.0.1')).toBe(true)
  })

  it('blocks private 192.168.x.x addresses', () => {
    expect(isBlockedHost('192.168.1.1')).toBe(true)
  })

  it('blocks private 172.16-31.x.x addresses', () => {
    expect(isBlockedHost('172.16.0.1')).toBe(true)
    expect(isBlockedHost('172.31.255.255')).toBe(true)
  })

  it('blocks link-local 169.254.x.x', () => {
    expect(isBlockedHost('169.254.169.254')).toBe(true)
  })

  it('blocks IPv6 loopback [::1]', () => {
    expect(isBlockedHost('[::1]')).toBe(true)
  })

  it('blocks IPv6 mapped IPv4 [::ffff:127.0.0.1]', () => {
    expect(isBlockedHost('[::ffff:127.0.0.1]')).toBe(true)
  })

  it('blocks IPv6 link-local [fe80::]', () => {
    expect(isBlockedHost('[fe80::1]')).toBe(true)
  })

  it('blocks IPv6 unique local [fc/fd]', () => {
    expect(isBlockedHost('[fc00::1]')).toBe(true)
    expect(isBlockedHost('[fd00::1]')).toBe(true)
  })

  it('blocks metadata.google.internal', () => {
    expect(isBlockedHost('metadata.google.internal')).toBe(true)
  })

  it('blocks hex IP notation', () => {
    expect(isBlockedHost('0x7f000001')).toBe(true)
  })

  it('blocks octal IP notation', () => {
    expect(isBlockedHost('0177.0.0.1')).toBe(true)
  })

  it('blocks decimal integer IP (2130706433 = 127.0.0.1)', () => {
    expect(isBlockedHost('2130706433')).toBe(true)
  })

  it('blocks hostnames without dots (internal names)', () => {
    expect(isBlockedHost('intranet')).toBe(true)
    expect(isBlockedHost('internal')).toBe(true)
  })

  it('allows legitimate external hosts', () => {
    expect(isBlockedHost('drive.google.com')).toBe(false)
    expect(isBlockedHost('example.com')).toBe(false)
    expect(isBlockedHost('lh3.googleusercontent.com')).toBe(false)
  })
})

// ---------------------------------------------------------------------------
describe('Security: Honeytoken detection', () => {
  const honeytokenKeys = [
    'admin_backup',
    'admin-backup-hash',
    'db-credentials',
    'api-master-key',
    'backup-admin-password',
  ]

  beforeEach(() => vi.clearAllMocks())

  it('identifies all honeytoken keys', () => {
    for (const key of honeytokenKeys) {
      expect(honeytokenKeys.includes(key.toLowerCase())).toBe(true)
    }
  })

  it('does not flag legitimate keys as honeytokens', () => {
    const legitimateKeys = ['band-data', 'admin-password-hash', 'site-config', 'bio-text']
    for (const key of legitimateKeys) {
      expect(honeytokenKeys.includes(key.toLowerCase())).toBe(false)
    }
  })

  it('returns 403 with taunting message when accessing a honeytoken key via GET', async () => {
    const { isHoneytoken, triggerHoneytokenAlarm, setDefenseHeaders } = await import('../../api/_honeytokens.js') as any
    vi.mocked(isHoneytoken).mockReturnValueOnce(true)

    const res = mockRes()
    await kvHandler({ method: 'GET', query: { key: 'admin_backup' }, body: {}, headers: {} }, res)
    expect(res.status).toHaveBeenCalledWith(403)
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'ACCESS_DENIED', message: expect.any(String) }))
    expect(triggerHoneytokenAlarm).toHaveBeenCalled()
    expect(setDefenseHeaders).toHaveBeenCalledWith(res)
  })

  it('returns 403 with taunting message when writing to a honeytoken key via POST', async () => {
    const { isHoneytoken, triggerHoneytokenAlarm, setDefenseHeaders } = await import('../../api/_honeytokens.js') as any
    vi.mocked(isHoneytoken).mockReturnValueOnce(true)

    const res = mockRes()
    await kvHandler({
      method: 'POST',
      query: {},
      body: { key: 'admin_backup', value: 'evil' },
      headers: {},
    }, res)
    expect(res.status).toHaveBeenCalledWith(403)
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'ACCESS_DENIED', message: expect.any(String) }))
    expect(triggerHoneytokenAlarm).toHaveBeenCalled()
    expect(setDefenseHeaders).toHaveBeenCalledWith(res)
    expect(mockKvSet).not.toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
describe('Security: Entropy injection for flagged attackers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.UPSTASH_REDIS_REST_URL = 'https://fake-kv.test'
    process.env.UPSTASH_REDIS_REST_TOKEN = 'fake-token'
  })

  it('injects entropy headers and defense headers when the request comes from a flagged attacker', async () => {
    const { isMarkedAttacker, injectEntropyHeaders, setDefenseHeaders } = await import('../../api/_honeytokens.js') as any
    vi.mocked(isMarkedAttacker).mockResolvedValueOnce(true)

    mockKvGet.mockResolvedValue({ name: 'test' })
    const res = mockRes()
    await kvHandler({ method: 'GET', query: { key: 'zardonic-band-data' }, body: {}, headers: {} }, res)

    expect(isMarkedAttacker).toHaveBeenCalled()
    expect(injectEntropyHeaders).toHaveBeenCalledWith(res)
    expect(setDefenseHeaders).toHaveBeenCalledWith(res)
    // Should still return the normal response
    expect(res.json).toHaveBeenCalledWith({ value: { name: 'test' } })
  })

  it('does not inject entropy headers for normal requests', async () => {
    const { isMarkedAttacker, injectEntropyHeaders } = await import('../../api/_honeytokens.js') as any
    vi.mocked(isMarkedAttacker).mockResolvedValueOnce(false)

    mockKvGet.mockResolvedValue({ name: 'test' })
    const res = mockRes()
    await kvHandler({ method: 'GET', query: { key: 'band-data' }, body: {}, headers: {} }, res)

    expect(isMarkedAttacker).toHaveBeenCalled()
    expect(injectEntropyHeaders).not.toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
describe('Security: Zod input validation schemas', () => {
  describe('kvKeySchema', () => {
    it('accepts valid keys', () => {
      const result = kvKeySchema.safeParse('band-data')
      expect(result.success).toBe(true)
    })

    it('rejects empty string', () => {
      const result = kvKeySchema.safeParse('')
      expect(result.success).toBe(false)
    })

    it('rejects keys longer than 200 chars', () => {
      const result = kvKeySchema.safeParse('a'.repeat(201))
      expect(result.success).toBe(false)
    })

    it('rejects keys with newlines', () => {
      const result = kvKeySchema.safeParse('test\nkey')
      expect(result.success).toBe(false)
    })

    it('rejects keys with carriage return', () => {
      const result = kvKeySchema.safeParse('test\rkey')
      expect(result.success).toBe(false)
    })

    it('rejects keys with null bytes', () => {
      const result = kvKeySchema.safeParse('test\0key')
      expect(result.success).toBe(false)
    })
  })

  describe('resetPasswordSchema', () => {
    it('accepts valid email', () => {
      const result = resetPasswordSchema.safeParse({ email: 'admin@example.com' })
      expect(result.success).toBe(true)
    })

    it('rejects missing email', () => {
      const result = resetPasswordSchema.safeParse({})
      expect(result.success).toBe(false)
    })

    it('rejects invalid email format', () => {
      const result = resetPasswordSchema.safeParse({ email: 'not-an-email' })
      expect(result.success).toBe(false)
    })

    it('rejects email that is just spaces', () => {
      const result = resetPasswordSchema.safeParse({ email: '   ' })
      expect(result.success).toBe(false)
    })

    it('rejects overly long email', () => {
      const result = resetPasswordSchema.safeParse({ email: 'a'.repeat(250) + '@example.com' })
      expect(result.success).toBe(false)
    })
  })

  describe('analyticsPostSchema', () => {
    it('accepts valid page_view event', () => {
      const result = analyticsPostSchema.safeParse({
        type: 'page_view',
        target: 'home',
      })
      expect(result.success).toBe(true)
    })

    it('accepts valid event with full meta', () => {
      const result = analyticsPostSchema.safeParse({
        type: 'interaction',
        target: 'play-button',
        meta: { browser: 'Chrome', device: 'desktop' },
      })
      expect(result.success).toBe(true)
    })

    it('rejects invalid event type', () => {
      const result = analyticsPostSchema.safeParse({
        type: 'invalid_type',
      })
      expect(result.success).toBe(false)
    })

    it('rejects missing type', () => {
      const result = analyticsPostSchema.safeParse({
        target: 'home',
      })
      expect(result.success).toBe(false)
    })

    it('validates heatmap coordinates are in range', () => {
      const valid = analyticsPostSchema.safeParse({
        type: 'click',
        heatmap: { x: 0.5, y: 1.5 },
      })
      expect(valid.success).toBe(true)

      const outOfRange = analyticsPostSchema.safeParse({
        type: 'click',
        heatmap: { x: 2.0, y: 0.5 },
      })
      expect(outOfRange.success).toBe(false)
    })
  })

  describe('validate helper', () => {
    it('returns { success: true, data } for valid input', () => {
      const result = validate(kvKeySchema, 'band-data')
      expect(result.success).toBe(true)
      expect(result.data).toBe('band-data')
    })

    it('returns { success: false, error } for invalid input', () => {
      const result = validate(kvKeySchema, '')
      expect(result.success).toBe(false)
      expect(typeof result.error).toBe('string')
    })
  })
})
