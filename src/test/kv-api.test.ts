import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---------------------------------------------------------------------------
// Mock @vercel/kv — must be declared before importing the handler
// ---------------------------------------------------------------------------
const mockKvGet = vi.fn()
const mockKvSet = vi.fn()

vi.mock('@vercel/kv', () => ({
  kv: { get: mockKvGet, set: mockKvSet },
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

// We need a dynamic import so vi.mock is applied before the handler reads it
const { default: handler, timingSafeEqual } = await import('../../api/kv.js')

// ---------------------------------------------------------------------------
describe('KV API handler', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.KV_REST_API_URL = 'https://fake-kv.vercel.test'
    process.env.KV_REST_API_TOKEN = 'fake-token'
  })

  it('OPTIONS returns 200', async () => {
    const res = mockRes()
    await handler({ method: 'OPTIONS', query: {}, body: {}, headers: {} }, res)
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.end).toHaveBeenCalled()
  })

  describe('GET', () => {
    it('returns 400 when key is missing', async () => {
      const res = mockRes()
      await handler({ method: 'GET', query: {}, body: {}, headers: {} }, res)
      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'key is required' }))
    })

    it('returns value when key exists in KV', async () => {
      mockKvGet.mockResolvedValue({ name: 'ZARDONIC' })
      const res = mockRes()
      await handler({ method: 'GET', query: { key: 'site-data' }, body: {}, headers: {} }, res)
      expect(mockKvGet).toHaveBeenCalledWith('site-data')
      expect(res.json).toHaveBeenCalledWith({ value: { name: 'ZARDONIC' } })
    })

    it('returns null when key does not exist', async () => {
      mockKvGet.mockResolvedValue(undefined)
      const res = mockRes()
      await handler({ method: 'GET', query: { key: 'nonexistent' }, body: {}, headers: {} }, res)
      expect(res.json).toHaveBeenCalledWith({ value: null })
    })

    it('returns 500 when KV throws', async () => {
      mockKvGet.mockRejectedValue(new Error('KV unavailable'))
      const res = mockRes()
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      await handler({ method: 'GET', query: { key: 'bad' }, body: {}, headers: {} }, res)
      expect(res.status).toHaveBeenCalledWith(500)
      consoleSpy.mockRestore()
    })
  })

  describe('POST', () => {
    it('returns 400 when body is missing', async () => {
      const res = mockRes()
      await handler({ method: 'POST', query: {}, body: null, headers: {} }, res)
      expect(res.status).toHaveBeenCalledWith(400)
    })

    it('returns 400 when key is missing from body', async () => {
      const res = mockRes()
      await handler({ method: 'POST', query: {}, body: { value: 'x' }, headers: {} }, res)
      expect(res.status).toHaveBeenCalledWith(400)
    })

    it('returns 400 when value is undefined', async () => {
      const res = mockRes()
      await handler({ method: 'POST', query: {}, body: { key: 'test' }, headers: {} }, res)
      expect(res.status).toHaveBeenCalledWith(400)
    })

    it('saves value when no admin password is set', async () => {
      mockKvGet.mockResolvedValue(null)
      mockKvSet.mockResolvedValue('OK')
      const res = mockRes()
      await handler({
        method: 'POST',
        query: {},
        body: { key: 'site-data', value: { name: 'test' } },
        headers: {},
      }, res)
      expect(mockKvSet).toHaveBeenCalledWith('site-data', { name: 'test' })
      expect(res.json).toHaveBeenCalledWith({ success: true })
    })

    it('saves value with valid admin token', async () => {
      const hash = 'abc123'
      mockKvGet.mockResolvedValue(hash)
      mockKvSet.mockResolvedValue('OK')
      const res = mockRes()
      await handler({
        method: 'POST',
        query: {},
        body: { key: 'site-data', value: { name: 'updated' } },
        headers: { 'x-admin-token': hash },
      }, res)
      expect(mockKvSet).toHaveBeenCalledWith('site-data', { name: 'updated' })
      expect(res.json).toHaveBeenCalledWith({ success: true })
    })

    it('rejects write with invalid admin token', async () => {
      mockKvGet.mockResolvedValue('correct-hash')
      const res = mockRes()
      await handler({
        method: 'POST',
        query: {},
        body: { key: 'site-data', value: 'x' },
        headers: { 'x-admin-token': 'wrong-hash' },
      }, res)
      expect(res.status).toHaveBeenCalledWith(403)
      expect(mockKvSet).not.toHaveBeenCalled()
    })

    describe('admin-password-hash key', () => {
      it('allows initial password setup without token', async () => {
        mockKvGet.mockResolvedValue(null)
        mockKvSet.mockResolvedValue('OK')
        const res = mockRes()
        await handler({
          method: 'POST',
          query: {},
          body: { key: 'admin-password-hash', value: 'new-hash' },
          headers: {},
        }, res)
        expect(mockKvSet).toHaveBeenCalledWith('admin-password-hash', 'new-hash')
        expect(res.json).toHaveBeenCalledWith({ success: true })
      })

      it('rejects password change with wrong token', async () => {
        mockKvGet.mockResolvedValue('correct-hash')
        const res = mockRes()
        await handler({
          method: 'POST',
          query: {},
          body: { key: 'admin-password-hash', value: 'evil-hash' },
          headers: { 'x-admin-token': 'wrong-token' },
        }, res)
        expect(res.status).toHaveBeenCalledWith(403)
        expect(mockKvSet).not.toHaveBeenCalled()
      })
    })
  })

  it('returns 405 for unsupported methods', async () => {
    const res = mockRes()
    await handler({ method: 'DELETE', query: {}, body: {}, headers: {} }, res)
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
