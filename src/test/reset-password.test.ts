import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { VercelRequest, VercelResponse } from '@vercel/node';

// ---------------------------------------------------------------------------
// Mock @upstash/redis — must be declared before importing the handler
// ---------------------------------------------------------------------------
const mockKvGet = vi.fn()
const mockKvSet = vi.fn()
const mockKvDel = vi.fn()
const mockPipeExec = vi.fn().mockResolvedValue([])
const mockPipeSet = vi.fn()
const mockPipeDel = vi.fn()

vi.mock('@upstash/redis', () => {
  const Redis = function () {
    return {
      get: mockKvGet,
      set: mockKvSet,
      del: mockKvDel,
      pipeline: () => ({
        set: mockPipeSet,
        del: mockPipeDel,
        exec: mockPipeExec,
      }),
    }
  }
  return { Redis }
})

// Mock @upstash/redis (transitive dep via kv.js)
// (already mocked above)

// Mock rate limiter — always allow requests in tests
vi.mock('../../api/_ratelimit.js', () => ({
  applyRateLimit: vi.fn().mockResolvedValue(true),
}))

// Mock auth.js hashPassword and invalidateAllSessions
vi.mock('../../api/auth.js', () => ({
  hashPassword: vi.fn().mockResolvedValue('scrypt:salt:hashedvalue'),
  invalidateAllSessions: vi.fn().mockResolvedValue(undefined),
}))

type Res = { status: ReturnType<typeof vi.fn>; json: ReturnType<typeof vi.fn>; end: ReturnType<typeof vi.fn> }

function mockRes() {
  const res: Res = {
    status: vi.fn(),
    json: vi.fn(),
    end: vi.fn(),
  }
  res.status.mockReturnValue(res)
  res.json.mockReturnValue(res)
  res.end.mockReturnValue(res)
  return res as unknown as unknown as VercelResponse
}

const { default: handler } = await import('../../api/reset-password.js')

describe('Reset Password API handler', () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    vi.clearAllMocks()
    process.env.UPSTASH_REDIS_REST_URL = 'https://fake-kv.upstash.test'
    process.env.UPSTASH_REDIS_REST_TOKEN = 'fake-token'
    process.env.ADMIN_RESET_EMAIL = 'admin@example.com'
  })

  afterEach(() => {
    process.env = { ...originalEnv }
  })

  it('OPTIONS returns 200', async () => {
    const res = mockRes()
    await handler({ method: 'OPTIONS', query: {}, body: {}, headers: {} } as unknown as VercelRequest, res)
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.end).toHaveBeenCalled()
  })

  it('returns 405 for GET', async () => {
    const res = mockRes()
    await handler({ method: 'GET', query: {}, body: {}, headers: {} } as unknown as VercelRequest, res)
    expect(res.status).toHaveBeenCalledWith(405)
  })

  it('returns 503 when KV is not configured', async () => {
    delete process.env.UPSTASH_REDIS_REST_URL
    const res = mockRes()
    await handler({ method: 'POST', query: {}, body: { email: 'admin@example.com' }, headers: {} } as unknown as VercelRequest, res)
    expect(res.status).toHaveBeenCalledWith(503)
  })

  it('returns 503 when ADMIN_RESET_EMAIL is not set', async () => {
    delete process.env.ADMIN_RESET_EMAIL
    const res = mockRes()
    await handler({ method: 'POST', query: {}, body: { email: 'admin@example.com' }, headers: {} } as unknown as VercelRequest, res)
    expect(res.status).toHaveBeenCalledWith(503)
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'Password reset is not configured' }))
  })

  it('returns 400 when body is missing', async () => {
    const res = mockRes()
    await handler({ method: 'POST', query: {}, body: null, headers: {} } as unknown as VercelRequest, res)
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('returns 400 when email is missing', async () => {
    const res = mockRes()
    await handler({ method: 'POST', query: {}, body: {}, headers: {} } as unknown as VercelRequest, res)
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.any(String) }))
  })

  it('resets password when email matches', async () => {
    mockKvSet.mockResolvedValue('OK')
    const res = mockRes()
    await handler({ method: 'POST', query: {}, body: { email: 'admin@example.com' }, headers: {} } as unknown as VercelRequest, res)
    expect(mockKvSet).toHaveBeenCalledWith('admin-reset-token', expect.any(String), expect.objectContaining({ ex: 600 }))
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, message: expect.stringContaining('reset link') }))
  })

  it('resets password with case-insensitive email match', async () => {
    mockKvSet.mockResolvedValue('OK')
    const res = mockRes()
    await handler({ method: 'POST', query: {}, body: { email: 'Admin@Example.COM' }, headers: {} } as unknown as VercelRequest, res)
    expect(mockKvSet).toHaveBeenCalledWith('admin-reset-token', expect.any(String), expect.objectContaining({ ex: 600 }))
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, message: expect.stringContaining('reset link') }))
  })

  it('returns same success message for non-matching email (prevents enumeration)', async () => {
    const res = mockRes()
    await handler({ method: 'POST', query: {}, body: { email: 'wrong@example.com' }, headers: {} } as unknown as VercelRequest, res)
    expect(mockKvDel).not.toHaveBeenCalled()
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
  })

  it('returns 500 when KV throws during reset', async () => {
    mockKvSet.mockRejectedValue(new Error('KV failure'))
    const res = mockRes()
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    await handler({ method: 'POST', query: {}, body: { email: 'admin@example.com' }, headers: {} } as unknown as VercelRequest, res)
    expect(res.status).toHaveBeenCalledWith(500)
    consoleSpy.mockRestore()
  })
})
