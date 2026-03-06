import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// ---------------------------------------------------------------------------
// Global @upstash/ratelimit mock is defined in src/test/setup.ts
// Here we locally override it with more control
// ---------------------------------------------------------------------------
const mockLimit = vi.fn().mockResolvedValue({ success: true })

vi.mock('@upstash/ratelimit', () => ({
  Ratelimit: class {
    static slidingWindow() { return {} }
    limit = mockLimit
  },
}))

vi.mock('@upstash/redis', () => ({
  Redis: class {},
}))

// Import after mocks
const { hashIp, getClientIp, applyRateLimit } = await import('../../api/_ratelimit.ts')

type MockRes = {
  status: ReturnType<typeof vi.fn>
  json: ReturnType<typeof vi.fn>
  setHeader: ReturnType<typeof vi.fn>
}

function mockRes(): MockRes {
  const res: MockRes = {
    status: vi.fn(),
    json: vi.fn(),
    setHeader: vi.fn(),
  }
  res.status.mockReturnValue(res)
  res.json.mockReturnValue(res)
  res.setHeader.mockReturnValue(res)
  return res
}

// ---------------------------------------------------------------------------
describe('hashIp()', () => {
  it('returns a 64-char hex string', () => {
    const hash = hashIp('1.2.3.4')
    expect(hash).toMatch(/^[0-9a-f]{64}$/)
  })

  it('is deterministic for the same input', () => {
    expect(hashIp('10.0.0.1')).toBe(hashIp('10.0.0.1'))
  })

  it('produces different outputs for different IPs', () => {
    expect(hashIp('1.2.3.4')).not.toBe(hashIp('1.2.3.5'))
  })

  it('does not store the raw IP in the hash', () => {
    const hash = hashIp('192.168.1.1')
    expect(hash).not.toContain('192.168.1.1')
  })
})

// ---------------------------------------------------------------------------
describe('getClientIp()', () => {
  it('extracts first IP from x-forwarded-for string', () => {
    const req = { headers: { 'x-forwarded-for': '10.0.0.1, 10.0.0.2' } } as any
    expect(getClientIp(req)).toBe('10.0.0.1')
  })

  it('trims whitespace from extracted IP', () => {
    const req = { headers: { 'x-forwarded-for': '  10.0.0.1  , 10.0.0.2' } } as any
    expect(getClientIp(req)).toBe('10.0.0.1')
  })

  it('handles single IP without comma', () => {
    const req = { headers: { 'x-forwarded-for': '203.0.113.1' } } as any
    expect(getClientIp(req)).toBe('203.0.113.1')
  })

  it('handles array x-forwarded-for (Vercel multi-value)', () => {
    const req = { headers: { 'x-forwarded-for': ['10.1.2.3, 10.2.3.4', '10.3.4.5'] } } as any
    expect(getClientIp(req)).toBe('10.1.2.3')
  })

  it('falls back to 127.0.0.1 when header is absent', () => {
    const req = { headers: {} } as any
    expect(getClientIp(req)).toBe('127.0.0.1')
  })

  it('falls back to 127.0.0.1 when header is undefined', () => {
    const req = { headers: { 'x-forwarded-for': undefined } } as any
    expect(getClientIp(req)).toBe('127.0.0.1')
  })
})

// ---------------------------------------------------------------------------
describe('applyRateLimit()', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.UPSTASH_REDIS_REST_URL = 'https://fake-redis.upstash.io'
    process.env.UPSTASH_REDIS_REST_TOKEN = 'fake-token'
    mockLimit.mockResolvedValue({ success: true })
  })

  afterEach(() => {
    delete process.env.UPSTASH_REDIS_REST_URL
    delete process.env.UPSTASH_REDIS_REST_TOKEN
  })

  it('returns true when rate limit is not exceeded', async () => {
    mockLimit.mockResolvedValue({ success: true })
    const req = { headers: { 'x-forwarded-for': '1.2.3.4' } } as any
    const res = mockRes()
    const result = await applyRateLimit(req, res)
    expect(result).toBe(true)
    expect(res.status).not.toHaveBeenCalled()
  })

  it('returns false and sends 429 when rate limit is exceeded', async () => {
    mockLimit.mockResolvedValue({ success: false })
    const req = { headers: { 'x-forwarded-for': '1.2.3.4' } } as any
    const res = mockRes()
    const result = await applyRateLimit(req, res)
    expect(result).toBe(false)
    expect(res.status).toHaveBeenCalledWith(429)
    expect(res.setHeader).toHaveBeenCalledWith('Retry-After', '10')
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'Too Many Requests' }))
  })

  it('returns false and sends 503 when rate limit service throws (fail-closed)', async () => {
    mockLimit.mockRejectedValue(new Error('Redis connection failed'))
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const req = { headers: { 'x-forwarded-for': '1.2.3.4' } } as any
    const res = mockRes()
    const result = await applyRateLimit(req, res)
    expect(result).toBe(false)
    expect(res.status).toHaveBeenCalledWith(503)
    consoleSpy.mockRestore()
  })
})
