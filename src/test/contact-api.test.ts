import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---------------------------------------------------------------------------
// Mock @upstash/redis
// ---------------------------------------------------------------------------
const mockLpush = vi.fn()
const mockLtrim = vi.fn()
const mockExpire = vi.fn()

vi.mock('@upstash/redis', () => ({
  Redis: class {
    lpush = mockLpush
    ltrim = mockLtrim
    expire = mockExpire
  },
}))

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

const { default: handler } = await import('../../api/contact.ts')

// ---------------------------------------------------------------------------
describe('Contact API handler', () => {
  const validBody = {
    name: 'Jane Doe',
    email: 'jane@example.com',
    subject: 'Hello',
    message: 'This is a test message.',
  }

  beforeEach(() => {
    vi.clearAllMocks()
    process.env.UPSTASH_REDIS_REST_URL = 'https://fake-redis.upstash.io'
    process.env.UPSTASH_REDIS_REST_TOKEN = 'fake-token'
  })

  /** Generate a unique IP for each test to avoid rate-limit interference */
  let ipCounter = 0
  function uniqueIp(): string {
    ipCounter++
    return `10.${Math.floor(ipCounter / 65536) % 256}.${Math.floor(ipCounter / 256) % 256}.${ipCounter % 256}`
  }

  it('OPTIONS returns 200', async () => {
    const res = mockRes()
    await handler({ method: 'OPTIONS', body: {}, headers: {} } as any, res as any)
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.end).toHaveBeenCalled()
  })

  it('rejects non-POST methods', async () => {
    const res = mockRes()
    await handler({ method: 'GET', body: {}, headers: {} } as any, res as any)
    expect(res.status).toHaveBeenCalledWith(405)
  })

  it('accepts valid contact form submission', async () => {
    mockLpush.mockResolvedValue(1)
    mockLtrim.mockResolvedValue('OK')
    mockExpire.mockResolvedValue(1)
    const res = mockRes()
    await handler({
      method: 'POST',
      body: validBody,
      headers: { 'x-forwarded-for': '1.2.3.4' },
    } as any, res as any)
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith({ success: true })
    expect(mockLpush).toHaveBeenCalled()
  })

  it('rejects submission with missing name', async () => {
    const res = mockRes()
    await handler({
      method: 'POST',
      body: { ...validBody, name: '' },
      headers: { 'x-forwarded-for': uniqueIp() },
    } as any, res as any)
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('rejects submission with invalid email', async () => {
    const res = mockRes()
    await handler({
      method: 'POST',
      body: { ...validBody, email: 'invalid' },
      headers: { 'x-forwarded-for': uniqueIp() },
    } as any, res as any)
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('rejects submission with empty message', async () => {
    const res = mockRes()
    await handler({
      method: 'POST',
      body: { ...validBody, message: '' },
      headers: { 'x-forwarded-for': uniqueIp() },
    } as any, res as any)
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('silently accepts honeypot-filled submissions (returns 200 without storing)', async () => {
    const res = mockRes()
    await handler({
      method: 'POST',
      body: { ...validBody, _hp: 'bot-filled' },
      headers: { 'x-forwarded-for': uniqueIp() },
    } as any, res as any)
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith({ success: true })
    expect(mockLpush).not.toHaveBeenCalled()
  })

  it('stores submission in Redis with correct key', async () => {
    mockLpush.mockResolvedValue(1)
    mockLtrim.mockResolvedValue('OK')
    mockExpire.mockResolvedValue(1)
    const ip = uniqueIp()
    const res = mockRes()
    await handler({
      method: 'POST',
      body: validBody,
      headers: { 'x-forwarded-for': ip },
    } as any, res as any)
    expect(mockLpush).toHaveBeenCalledWith('contact-submissions', expect.any(String))
    const storedData = JSON.parse(mockLpush.mock.calls[0][1])
    expect(storedData.name).toBe('Jane Doe')
    expect(storedData.email).toBe('jane@example.com')
    expect(storedData.subject).toBe('Hello')
    expect(storedData.ip).toBe(ip)
    expect(storedData.createdAt).toBeDefined()
  })

  it('trims to 100 most recent submissions', async () => {
    mockLpush.mockResolvedValue(1)
    mockLtrim.mockResolvedValue('OK')
    mockExpire.mockResolvedValue(1)
    const res = mockRes()
    await handler({
      method: 'POST',
      body: validBody,
      headers: { 'x-forwarded-for': uniqueIp() },
    } as any, res as any)
    expect(mockLtrim).toHaveBeenCalledWith('contact-submissions', 0, 99)
  })

  it('falls back gracefully when Redis is not configured', async () => {
    delete process.env.UPSTASH_REDIS_REST_URL
    delete process.env.UPSTASH_REDIS_REST_TOKEN
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const res = mockRes()
    await handler({
      method: 'POST',
      body: validBody,
      headers: { 'x-forwarded-for': uniqueIp() },
    } as any, res as any)
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith({ success: true })
    expect(mockLpush).not.toHaveBeenCalled()
    consoleSpy.mockRestore()
  })

  it('returns 500 when Redis throws', async () => {
    mockLpush.mockRejectedValue(new Error('Redis down'))
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const res = mockRes()
    await handler({
      method: 'POST',
      body: validBody,
      headers: { 'x-forwarded-for': uniqueIp() },
    } as any, res as any)
    expect(res.status).toHaveBeenCalledWith(500)
    consoleSpy.mockRestore()
  })

  it('rejects field exceeding max length', async () => {
    const res = mockRes()
    await handler({
      method: 'POST',
      body: { ...validBody, message: 'a'.repeat(5001) },
      headers: { 'x-forwarded-for': uniqueIp() },
    } as any, res as any)
    expect(res.status).toHaveBeenCalledWith(400)
  })

  describe('rate limiting', () => {
    it('allows up to 5 requests from the same IP', async () => {
      mockLpush.mockResolvedValue(1)
      mockLtrim.mockResolvedValue('OK')
      mockExpire.mockResolvedValue(1)

      // Use a unique IP per test run to avoid interference
      const ip = `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`

      for (let i = 0; i < 5; i++) {
        const res = mockRes()
        await handler({
          method: 'POST',
          body: validBody,
          headers: { 'x-forwarded-for': ip },
        } as any, res as any)
        expect(res.status).toHaveBeenCalledWith(200)
      }

      // 6th request should be rate limited
      const res = mockRes()
      await handler({
        method: 'POST',
        body: validBody,
        headers: { 'x-forwarded-for': ip },
      } as any, res as any)
      expect(res.status).toHaveBeenCalledWith(429)
    })
  })
})
