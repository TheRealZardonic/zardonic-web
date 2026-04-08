import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { VercelRequest, VercelResponse } from '@vercel/node'

// ---------------------------------------------------------------------------
// Mock @upstash/redis — must be declared before importing the handler
// ---------------------------------------------------------------------------
const mockKvGet = vi.fn()
const mockKvSet = vi.fn()
const mockKvDel = vi.fn()
const mockKvIncr = vi.fn().mockResolvedValue(1)
const mockKvExpire = vi.fn().mockResolvedValue(1)

vi.mock('@upstash/redis', () => ({
  Redis: class {
    get = mockKvGet
    set = mockKvSet
    del = mockKvDel
    incr = mockKvIncr
    incrby = vi.fn().mockResolvedValue(1)
    expire = mockKvExpire
    sadd = vi.fn().mockResolvedValue(1)
    smembers = vi.fn().mockResolvedValue([])
    lpush = vi.fn().mockResolvedValue(1)
    ltrim = vi.fn().mockResolvedValue('OK')
  },
}))

// Mock the security modules imported by kv.ts
vi.mock('../../api/_ratelimit.ts', () => ({
  applyRateLimit: vi.fn().mockResolvedValue(true),
  getClientIp: vi.fn().mockReturnValue('127.0.0.1'),
  hashIp: vi.fn().mockReturnValue('hashed-ip'),
}))

vi.mock('../../api/_honeytokens.ts', () => ({
  isHoneytoken: vi.fn().mockReturnValue(false),
  triggerHoneytokenAlarm: vi.fn().mockResolvedValue(undefined),
  isMarkedAttacker: vi.fn().mockResolvedValue(false),
  injectEntropyHeaders: vi.fn(),
  getRandomTaunt: vi.fn().mockReturnValue('taunt'),
  setDefenseHeaders: vi.fn(),
}))

vi.mock('../../api/auth.ts', () => ({
  validateSession: vi.fn().mockResolvedValue(true),
}))

vi.mock('../../api/_blocklist.ts', () => ({
  isHardBlocked: vi.fn().mockResolvedValue(false),
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

// ---------------------------------------------------------------------------
// Import mocked modules for resetting
import * as ratelimitMod from '../../api/_ratelimit.ts'
import * as blocklistMod from '../../api/_blocklist.ts'
import * as authMod from '../../api/auth.ts'
import * as honeytokensMod from '../../api/_honeytokens.ts'

// We need a dynamic import so vi.mock is applied before the handler reads it
const { default: handler, timingSafeEqual } = await import('../../api/kv.ts')

// ---------------------------------------------------------------------------
describe('KV API handler', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.UPSTASH_REDIS_REST_URL = 'https://fake-redis.upstash.io'
    process.env.UPSTASH_REDIS_REST_TOKEN = 'fake-token'

    // Reset mocks to default safe values
    vi.mocked(ratelimitMod.applyRateLimit).mockResolvedValue(true)
    vi.mocked(blocklistMod.isHardBlocked).mockResolvedValue(false)
    vi.mocked(authMod.validateSession).mockResolvedValue(true)
    vi.mocked(honeytokensMod.isHoneytoken).mockReturnValue(false)
    vi.mocked(honeytokensMod.isMarkedAttacker).mockResolvedValue(false)
    mockKvGet.mockResolvedValue(null)
    mockKvIncr.mockResolvedValue(1)
  })

  it('OPTIONS returns 200', async () => {
    const res = mockRes()
    await handler({ method: 'OPTIONS', query: {}, body: {}, headers: {} } as unknown as VercelRequest, res as unknown as unknown as VercelResponse)
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.end).toHaveBeenCalled()
  })

  describe('GET', () => {
    it('returns 400 when key is missing', async () => {
      const res = mockRes()
      await handler({ method: 'GET', query: {}, body: {}, headers: {} } as unknown as VercelRequest, res as unknown as unknown as VercelResponse)
      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.any(String) }))
    })

    it('returns value for public key (band-data)', async () => {
      mockKvGet.mockResolvedValue({ name: 'ZARDONIC' })
      const res = mockRes()
      await handler({ method: 'GET', query: { key: 'band-data' }, body: {}, headers: {} } as unknown as VercelRequest, res as unknown as unknown as VercelResponse)
      expect(mockKvGet).toHaveBeenCalledWith('band-data')
      expect(res.json).toHaveBeenCalledWith({ value: { name: 'ZARDONIC' } })
    })

    it('returns value for public key (site-config) without session', async () => {
      vi.mocked(authMod.validateSession).mockResolvedValue(false)
      mockKvGet.mockResolvedValue({ gigs: [], releases: [] })
      const res = mockRes()
      await handler({ method: 'GET', query: { key: 'site-config' }, body: {}, headers: {} } as unknown as VercelRequest, res as unknown as unknown as VercelResponse)
      expect(mockKvGet).toHaveBeenCalledWith('site-config')
      expect(res.json).toHaveBeenCalledWith({ value: { gigs: [], releases: [] } })
    })

    it('strips terminalCommands from public band-data reads', async () => {
      vi.mocked(authMod.validateSession).mockResolvedValue(false)
      mockKvGet.mockResolvedValue({ gigs: [], terminalCommands: ['ls', 'help'] })
      const res = mockRes()
      await handler({ method: 'GET', query: { key: 'band-data' }, body: {}, headers: {} } as unknown as VercelRequest, res as unknown as unknown as VercelResponse)
      const responseValue = (vi.mocked(res.json).mock.calls[0][0] as { value: Record<string, unknown> }).value
      expect(responseValue).not.toHaveProperty('terminalCommands')
      expect(responseValue).toHaveProperty('gigs')
    })

    it('returns 403 for non-public keys without session', async () => {
      vi.mocked(authMod.validateSession).mockResolvedValue(false)
      mockKvGet.mockResolvedValue(undefined)
      const res = mockRes()
      await handler({ method: 'GET', query: { key: 'private-key' }, body: {}, headers: {} } as unknown as VercelRequest, res as unknown as unknown as VercelResponse)
      expect(res.status).toHaveBeenCalledWith(403)
    })

    it('returns value for non-public key with valid session', async () => {
      mockKvGet.mockResolvedValue({ secret: 'data' })
      const res = mockRes()
      await handler({ method: 'GET', query: { key: 'private-key' }, body: {}, headers: {} } as unknown as VercelRequest, res as unknown as unknown as VercelResponse)
      expect(res.json).toHaveBeenCalledWith({ value: { secret: 'data' } })
    })

    it('returns null when key does not exist (with session)', async () => {
      mockKvGet.mockResolvedValue(undefined)
      const res = mockRes()
      await handler({ method: 'GET', query: { key: 'nonexistent' }, body: {}, headers: {} } as unknown as VercelRequest, res as unknown as unknown as VercelResponse)
      expect(res.json).toHaveBeenCalledWith({ value: null })
    })

    it('returns 500 when KV throws', async () => {
      mockKvGet.mockRejectedValue(new Error('KV unavailable'))
      const res = mockRes()
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      await handler({ method: 'GET', query: { key: 'some-key' }, body: {}, headers: {} } as unknown as VercelRequest, res as unknown as unknown as VercelResponse)
      expect(res.status).toHaveBeenCalledWith(500)
      consoleSpy.mockRestore()
    })
  })

  describe('POST', () => {
    it('returns 400 when body is missing', async () => {
      const res = mockRes()
      await handler({ method: 'POST', query: {}, body: null, headers: {} } as unknown as VercelRequest, res as unknown as unknown as VercelResponse)
      expect(res.status).toHaveBeenCalledWith(400)
    })

    it('returns 400 when key is missing from body', async () => {
      const res = mockRes()
      await handler({ method: 'POST', query: {}, body: { value: 'x' }, headers: {} } as unknown as VercelRequest, res as unknown as unknown as VercelResponse)
      expect(res.status).toHaveBeenCalledWith(400)
    })

    it('returns 400 when value is undefined', async () => {
      const res = mockRes()
      await handler({ method: 'POST', query: {}, body: { key: 'test' }, headers: {} } as unknown as VercelRequest, res as unknown as unknown as VercelResponse)
      expect(res.status).toHaveBeenCalledWith(400)
    })

    it('saves value with valid session', async () => {
      mockKvGet.mockResolvedValue(null)
      mockKvSet.mockResolvedValue('OK')
      const res = mockRes()
      await handler({
        method: 'POST',
        query: {},
        body: { key: 'site-data', value: { name: 'test' } },
        headers: {},
      } as unknown as VercelRequest, res as unknown as unknown as VercelResponse)
      expect(mockKvSet).toHaveBeenCalledWith('site-data', { name: 'test' })
      expect(res.json).toHaveBeenCalledWith({ success: true })
    })

    it('saves band-data without TTL (persistent key)', async () => {
      mockKvGet.mockResolvedValue(null)
      mockKvSet.mockResolvedValue('OK')
      const res = mockRes()
      await handler({
        method: 'POST',
        query: {},
        body: { key: 'band-data', value: { gigs: [], releases: [] } },
        headers: {},
      } as unknown as VercelRequest, res as unknown as unknown as VercelResponse)
      expect(mockKvSet).toHaveBeenCalled()
      expect(res.json).toHaveBeenCalledWith({ success: true })
    })

    it('saves site-config without TTL (persistent key)', async () => {
      mockKvGet.mockResolvedValue(null)
      mockKvSet.mockResolvedValue('OK')
      const res = mockRes()
      await handler({
        method: 'POST',
        query: {},
        body: { key: 'site-config', value: { name: 'ZARDONIC' } },
        headers: {},
      } as unknown as VercelRequest, res as unknown as unknown as VercelResponse)
      expect(mockKvSet).toHaveBeenCalledWith('site-config', { name: 'ZARDONIC' })
      expect(res.json).toHaveBeenCalledWith({ success: true })
    })

    describe('admin:settings preservation', () => {
      it('preserves terminalCommands from existing data when not in incoming value', async () => {
        const existingSettings = { theme: { primaryColor: 'red' }, terminalCommands: [{ command: 'help', response: 'Help text' }] }
        mockKvGet.mockResolvedValue(existingSettings)
        mockKvSet.mockResolvedValue('OK')
        const res = mockRes()
        await handler({
          method: 'POST',
          query: {},
          body: { key: 'admin:settings', value: { theme: { primaryColor: 'blue' } } },
          headers: {},
        } as unknown as VercelRequest, res as unknown as unknown as VercelResponse)
        expect(mockKvSet).toHaveBeenCalledWith('admin:settings', expect.objectContaining({
          theme: { primaryColor: 'blue' },
          terminalCommands: existingSettings.terminalCommands,
        }))
        expect(res.json).toHaveBeenCalledWith({ success: true })
      })

      it('preserves configOverrides from existing data when not in incoming value', async () => {
        const existingSettings = { theme: { primaryColor: 'red' }, configOverrides: { debug: true } }
        mockKvGet.mockResolvedValue(existingSettings)
        mockKvSet.mockResolvedValue('OK')
        const res = mockRes()
        await handler({
          method: 'POST',
          query: {},
          body: { key: 'admin:settings', value: { theme: { primaryColor: 'green' } } },
          headers: {},
        } as unknown as VercelRequest, res as unknown as unknown as VercelResponse)
        expect(mockKvSet).toHaveBeenCalledWith('admin:settings', expect.objectContaining({
          configOverrides: { debug: true },
        }))
      })

      it('preserves contactInfo.emailForwardTo from existing data when missing', async () => {
        const existingSettings = { theme: {}, contactInfo: { emailForwardTo: 'admin@example.com', name: 'Admin' } }
        mockKvGet.mockResolvedValue(existingSettings)
        mockKvSet.mockResolvedValue('OK')
        const res = mockRes()
        await handler({
          method: 'POST',
          query: {},
          body: { key: 'admin:settings', value: { theme: {}, contactInfo: { name: 'Updated Admin' } } },
          headers: {},
        } as unknown as VercelRequest, res as unknown as unknown as VercelResponse)
        expect(mockKvSet).toHaveBeenCalledWith('admin:settings', expect.objectContaining({
          contactInfo: expect.objectContaining({ emailForwardTo: 'admin@example.com', name: 'Updated Admin' }),
        }))
      })

      it('does not overwrite terminalCommands when provided in incoming value', async () => {
        const existingSettings = { terminalCommands: [{ command: 'old' }] }
        mockKvGet.mockResolvedValue(existingSettings)
        mockKvSet.mockResolvedValue('OK')
        const res = mockRes()
        const newCommands = [{ command: 'new' }]
        await handler({
          method: 'POST',
          query: {},
          body: { key: 'admin:settings', value: { terminalCommands: newCommands } },
          headers: {},
        } as unknown as VercelRequest, res as unknown as unknown as VercelResponse)
        expect(mockKvSet).toHaveBeenCalledWith('admin:settings', expect.objectContaining({
          terminalCommands: newCommands,
        }))
      })
    })

    it('rejects write without valid session', async () => {
      vi.mocked(authMod.validateSession).mockResolvedValue(false)
      mockKvGet.mockResolvedValue(null)
      const res = mockRes()
      await handler({
        method: 'POST',
        query: {},
        body: { key: 'site-data', value: { name: 'test' } },
        headers: {},
      } as unknown as VercelRequest, res as unknown as unknown as VercelResponse)
      expect(res.status).toHaveBeenCalledWith(403)
      expect(mockKvSet).not.toHaveBeenCalled()
    })

    describe('admin-password-hash key', () => {
      it('rejects writes to admin-password-hash (must use /api/auth)', async () => {
        vi.mocked(authMod.validateSession).mockResolvedValue(false)
        mockKvGet.mockResolvedValue(null)
        const res = mockRes()
        await handler({
          method: 'POST',
          query: {},
          body: { key: 'admin-password-hash', value: 'new-hash' },
          headers: {},
        } as unknown as VercelRequest, res as unknown as unknown as VercelResponse)
        expect(res.status).toHaveBeenCalledWith(403)
        expect(mockKvSet).not.toHaveBeenCalled()
      })

      it('rejects password change without valid session', async () => {
        vi.mocked(authMod.validateSession).mockResolvedValue(false)
        mockKvGet.mockResolvedValue('correct-hash')
        const res = mockRes()
        await handler({
          method: 'POST',
          query: {},
          body: { key: 'admin-password-hash', value: 'evil-hash' },
          headers: {},
        } as unknown as VercelRequest, res as unknown as unknown as VercelResponse)
        expect(res.status).toHaveBeenCalledWith(403)
        expect(mockKvSet).not.toHaveBeenCalled()
      })
    })
  })

  it('returns 405 for unsupported methods', async () => {
    const res = mockRes()
    await handler({ method: 'DELETE', query: {}, body: {}, headers: {} } as unknown as VercelRequest, res as unknown as unknown as VercelResponse)
    expect(res.status).toHaveBeenCalledWith(405)
  })
})

describe('timingSafeEqual', () => {
  it('returns true for identical strings', () => {
    expect(timingSafeEqual('abc', 'abc')).toBe(true)
  })

  it('returns false for different strings of same length', () => {
    expect(timingSafeEqual('abc', 'abd')).toBe(false)
  })

  it('returns false for different lengths', () => {
    expect(timingSafeEqual('abc', 'abcd')).toBe(false)
  })

  it('returns false when a is not a string', () => {
    // @ts-expect-error testing runtime guard
    expect(timingSafeEqual(123, 'abc')).toBe(false)
  })

  it('returns true for empty strings', () => {
    expect(timingSafeEqual('', '')).toBe(true)
  })
})
