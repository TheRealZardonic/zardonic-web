import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---------------------------------------------------------------------------
// Mock @upstash/redis
// ---------------------------------------------------------------------------
const mockKvGet = vi.fn()
const mockKvSet = vi.fn()

vi.mock('@upstash/redis', () => ({
  Redis: class {
    get = mockKvGet
    set = mockKvSet
  },
}))

// Mock rate limiter
vi.mock('../../api/_ratelimit.js', () => ({
  applyRateLimit: vi.fn().mockResolvedValue(true),
  getClientIp: vi.fn().mockReturnValue('127.0.0.1'),
  hashIp: vi.fn().mockReturnValue('hashed-ip'),
}))

// Mock auth
vi.mock('../../api/auth.js', () => ({
  validateSession: vi.fn().mockResolvedValue(false),
}))

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
  res.setHeader.mockReturnValue(res)
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
    mockKvGet.mockResolvedValue([])
    mockKvSet.mockResolvedValue('OK')
  })

  it('OPTIONS returns 200', async () => {
    const res = mockRes()
    await handler({ method: 'OPTIONS', body: {}, headers: {} } as any, res as any)
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.end).toHaveBeenCalled()
  })

  it('rejects unsupported methods with 405', async () => {
    const res = mockRes()
    await handler({ method: 'PUT', body: {}, headers: {} } as any, res as any)
    expect(res.status).toHaveBeenCalledWith(405)
  })

  it('accepts valid contact form submission', async () => {
    const res = mockRes()
    await handler({
      method: 'POST',
      body: validBody,
      headers: { 'x-forwarded-for': '1.2.3.4' },
    } as any, res as any)
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith({ success: true })
    expect(mockKvSet).toHaveBeenCalled()
  })

  it('rejects submission with missing name', async () => {
    const res = mockRes()
    await handler({
      method: 'POST',
      body: { ...validBody, name: '' },
      headers: { 'x-forwarded-for': '10.0.0.1' },
    } as any, res as any)
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('rejects submission with invalid email', async () => {
    const res = mockRes()
    await handler({
      method: 'POST',
      body: { ...validBody, email: 'invalid' },
      headers: { 'x-forwarded-for': '10.0.0.2' },
    } as any, res as any)
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('rejects submission with empty message', async () => {
    const res = mockRes()
    await handler({
      method: 'POST',
      body: { ...validBody, message: '' },
      headers: { 'x-forwarded-for': '10.0.0.3' },
    } as any, res as any)
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('stores submission in Redis', async () => {
    const res = mockRes()
    await handler({
      method: 'POST',
      body: validBody,
      headers: { 'x-forwarded-for': '10.0.0.4' },
    } as any, res as any)
    expect(mockKvSet).toHaveBeenCalledWith('contact-messages', expect.any(Array))
    const storedData = mockKvSet.mock.calls[0][1] as Array<Record<string, unknown>>
    expect(storedData[0].name).toBe('Jane Doe')
    expect(storedData[0].email).toBe('jane@example.com')
    expect(storedData[0].subject).toBe('Hello')
    expect(storedData[0].date).toBeDefined()
  })

  it('falls back gracefully when Redis is not configured', async () => {
    delete process.env.UPSTASH_REDIS_REST_URL
    delete process.env.UPSTASH_REDIS_REST_TOKEN
    const res = mockRes()
    await handler({
      method: 'POST',
      body: validBody,
      headers: { 'x-forwarded-for': '10.0.0.5' },
    } as any, res as any)
    expect(res.status).toHaveBeenCalledWith(503)
    expect(mockKvSet).not.toHaveBeenCalled()
  })

  it('returns 500 when Redis throws', async () => {
    mockKvGet.mockRejectedValue(new Error('Redis down'))
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const res = mockRes()
    await handler({
      method: 'POST',
      body: validBody,
      headers: { 'x-forwarded-for': '10.0.0.6' },
    } as any, res as any)
    expect(res.status).toHaveBeenCalledWith(500)
    consoleSpy.mockRestore()
  })

  it('rejects field exceeding max length', async () => {
    const res = mockRes()
    await handler({
      method: 'POST',
      body: { ...validBody, message: 'a'.repeat(5001) },
      headers: { 'x-forwarded-for': '10.0.0.7' },
    } as any, res as any)
    expect(res.status).toHaveBeenCalledWith(400)
  })
})
