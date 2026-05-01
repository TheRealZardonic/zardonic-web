import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock @upstash/redis
const mockKvGet = vi.fn()
const mockKvSet = vi.fn()
const mockKvDel = vi.fn()

vi.mock('@upstash/redis', () => ({
  Redis: class {
    get = mockKvGet
    set = mockKvSet
    del = mockKvDel
  },
}))

// Mock rate limiter and blocklist so tests are not affected by middleware
vi.mock('../../api/_ratelimit.ts', () => ({
  applyRateLimit: vi.fn().mockResolvedValue(true),
  getClientIp: vi.fn().mockReturnValue('127.0.0.1'),
}))

vi.mock('../../api/_blocklist.ts', () => ({
  isHardBlocked: vi.fn().mockResolvedValue(false),
}))

type Res = { status: ReturnType<typeof vi.fn>; json: ReturnType<typeof vi.fn> }

function mockRes(): Res {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  }
}

const { default: handler } = await import('../../api/session.ts')

describe('Session API handler', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.UPSTASH_REDIS_REST_URL = 'https://fake-redis.upstash.io'
    process.env.UPSTASH_REDIS_REST_TOKEN = 'fake-token'
  })

  describe('POST /api/session (Login)', () => {
    it('should require password', async () => {
      const res = mockRes()
      await handler({ method: 'POST', headers: {}, body: {} } as any, res as any)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith({ error: 'Password required' })
    })

    it('should return 401 if no password configured', async () => {
      mockKvGet.mockResolvedValue(null)
      
      const res = mockRes()
      await handler({
        method: 'POST',
        headers: {},
        body: { password: 'test123' },
      } as any, res as any)

      expect(res.status).toHaveBeenCalledWith(401)
    })

    it('should return 401 for invalid password', async () => {
      // Mock stored password hash
      mockKvGet.mockResolvedValue('correct-hash')
      
      const res = mockRes()
      await handler({
        method: 'POST',
        headers: {},
        body: { password: 'wrong-password' },
      } as any, res as any)

      expect(res.status).toHaveBeenCalledWith(401)
    })

    it('should return session token for valid password', async () => {
      // We store a scrypt hash for 'password' (fixed salt for determinism in tests)
      mockKvGet.mockResolvedValue('scrypt:a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4:343362add2cb49ae3d80800b08d448a71c2815de9f188c3af84cd440ddc1d24a26b7bddfc2e596ba24b5805984901393f5195580116a726e56c5deeefb1dac71') // scrypt hash of 'password'
      
      const res = mockRes()
      await handler({
        method: 'POST',
        headers: {},
        body: { password: 'password' },
      } as any, res as any)

      expect(res.status).toHaveBeenCalledWith(200)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          token: expect.any(String),
          expiresIn: 24 * 60 * 60,
        })
      )
      expect(mockKvSet).toHaveBeenCalled()
    })
  })

  describe('GET /api/session (Validate)', () => {
    it('should require session token', async () => {
      const res = mockRes()
      await handler({
        method: 'GET',
        headers: {},
        query: {},
      } as any, res as any)

      expect(res.status).toHaveBeenCalledWith(401)
    })

    it('should return 401 for invalid token', async () => {
      mockKvGet.mockResolvedValue(null)
      
      const res = mockRes()
      await handler({
        method: 'GET',
        headers: { 'x-session-token': 'invalid-token' },
        query: {},
      } as any, res as any)

      expect(res.status).toHaveBeenCalledWith(401)
    })

    it('should validate and update session', async () => {
      const mockSession = {
        token: 'valid-token',
        createdAt: Date.now() - 1000,
        lastAccess: Date.now() - 500,
      }
      mockKvGet.mockResolvedValue(mockSession)
      
      const res = mockRes()
      await handler({
        method: 'GET',
        headers: { 'x-session-token': 'valid-token' },
        query: {},
      } as any, res as any)

      expect(res.status).toHaveBeenCalledWith(200)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          valid: true,
          createdAt: mockSession.createdAt,
        })
      )
      expect(mockKvSet).toHaveBeenCalled() // Updated lastAccess
    })
  })

  describe('DELETE /api/session (Logout)', () => {
    it('should require session token', async () => {
      const res = mockRes()
      await handler({
        method: 'DELETE',
        headers: {},
      } as any, res as any)

      expect(res.status).toHaveBeenCalledWith(400)
    })

    it('should delete session', async () => {
      const res = mockRes()
      await handler({
        method: 'DELETE',
        headers: { 'x-session-token': 'token-to-delete' },
      } as any, res as any)

      expect(mockKvDel).toHaveBeenCalledWith('session:token-to-delete')
      expect(res.status).toHaveBeenCalledWith(200)
    })
  })

  describe('PUT /api/session (Setup)', () => {
    it('should require password', async () => {
      const res = mockRes()
      await handler({
        method: 'PUT',
        headers: {},
        body: {},
      } as any, res as any)

      expect(res.status).toHaveBeenCalledWith(400)
    })

    it('should require minimum 8 characters', async () => {
      const res = mockRes()
      await handler({
        method: 'PUT',
        headers: {},
        body: { password: 'short' },
      } as any, res as any)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith({ error: 'Password must be at least 8 characters' })
    })

    it('should setup password', async () => {
      const res = mockRes()
      await handler({
        method: 'PUT',
        headers: {},
        body: { password: 'validpassword123' },
      } as any, res as any)

      expect(mockKvSet).toHaveBeenCalledWith(
        'admin-password-hash',
        expect.any(String)
      )
      expect(res.status).toHaveBeenCalledWith(200)
    })
  })

  it('should return 405 for unsupported methods', async () => {
    const res = mockRes()
    await handler({
      method: 'PATCH',
      headers: {},
    } as any, res as any)

    expect(res.status).toHaveBeenCalledWith(405)
  })

  it('should return 503 when Redis not configured', async () => {
    delete process.env.UPSTASH_REDIS_REST_URL
    
    const res = mockRes()
    await handler({
      method: 'GET',
      headers: { 'x-session-token': 'test' },
      query: {},
    } as any, res as any)

    expect(res.status).toHaveBeenCalledWith(503)
  })
})
