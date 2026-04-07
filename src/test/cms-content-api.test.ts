import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockKvGet = vi.fn()
const mockKvSet = vi.fn()
const mockKvDel = vi.fn()

vi.mock('@upstash/redis', () => ({
  Redis: class {
    get = mockKvGet
    set = mockKvSet
    del = mockKvDel
    incr = vi.fn().mockResolvedValue(1)
    expire = vi.fn().mockResolvedValue(1)
    lrange = vi.fn().mockResolvedValue([])
    lpush = vi.fn().mockResolvedValue(1)
    ltrim = vi.fn().mockResolvedValue('OK')
    llen = vi.fn().mockResolvedValue(0)
  },
}))

vi.mock('../../api/_ratelimit.ts', () => ({
  applyRateLimit: vi.fn().mockResolvedValue(true),
}))

const mockValidateSession = vi.fn()
vi.mock('../../api/auth.ts', () => ({
  validateSession: mockValidateSession,
}))

function mockRes() {
  const res: any = { status: vi.fn(), json: vi.fn(), setHeader: vi.fn(), end: vi.fn() }
  res.status.mockReturnValue(res)
  res.json.mockReturnValue(res)
  res.setHeader.mockReturnValue(res)
  res.end.mockReturnValue(res)
  return res
}

function mockReq(overrides: Record<string, unknown> = {}) {
  return { method: 'GET', query: {}, body: {}, headers: {}, ...overrides }
}

describe('cms/content handler', () => {
  let handler: (req: unknown, res: unknown) => Promise<void>

  beforeEach(async () => {
    vi.resetModules()
    mockKvGet.mockReset()
    mockKvSet.mockReset()
    mockKvDel.mockReset()
    mockValidateSession.mockResolvedValue(true)
    process.env.UPSTASH_REDIS_REST_URL = 'https://fake.upstash.io'
    process.env.UPSTASH_REDIS_REST_TOKEN = 'fake-token'
    const mod = await import('../../api/cms/content.ts')
    handler = mod.default
  })

  it('GET without auth → 401', async () => {
    mockValidateSession.mockResolvedValue(false)
    const res = mockRes()
    await handler(mockReq({ method: 'GET', query: { key: 'zd-cms:test' } }), res)
    expect(res.status).toHaveBeenCalledWith(401)
  })

  it('GET with auth, valid key → returns data', async () => {
    mockKvGet.mockResolvedValue({ foo: 'bar' })
    const res = mockRes()
    await handler(mockReq({ method: 'GET', query: { key: 'zd-cms:test' } }), res)
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ value: { foo: 'bar' } }))
  })

  it('GET with auth, missing key → returns null', async () => {
    mockKvGet.mockResolvedValue(null)
    const res = mockRes()
    await handler(mockReq({ method: 'GET', query: { key: 'zd-cms:test' } }), res)
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ value: null }))
  })

  it('GET with auth, invalid key → 400', async () => {
    const res = mockRes()
    await handler(mockReq({ method: 'GET', query: { key: 'invalid-key' } }), res)
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('POST without auth → 401', async () => {
    mockValidateSession.mockResolvedValue(false)
    const res = mockRes()
    await handler(mockReq({ method: 'POST', body: { key: 'zd-cms:test', value: {} } }), res)
    expect(res.status).toHaveBeenCalledWith(401)
  })

  it('POST with auth, valid body → saves to Redis', async () => {
    mockKvSet.mockResolvedValue('OK')
    const res = mockRes()
    await handler(mockReq({ method: 'POST', body: { key: 'zd-cms:test', value: { x: 1 } } }), res)
    expect(mockKvSet).toHaveBeenCalled()
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
  })

  it('POST with auth, invalid body (missing key) → 400', async () => {
    const res = mockRes()
    await handler(mockReq({ method: 'POST', body: { value: { x: 1 } } }), res)
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('DELETE without auth → 401', async () => {
    mockValidateSession.mockResolvedValue(false)
    const res = mockRes()
    await handler(mockReq({ method: 'DELETE', query: { key: 'zd-cms:test' } }), res)
    expect(res.status).toHaveBeenCalledWith(401)
  })

  it('DELETE with auth, valid key → deletes from Redis', async () => {
    mockKvDel.mockResolvedValue(1)
    const res = mockRes()
    await handler(mockReq({ method: 'DELETE', query: { key: 'zd-cms:test' } }), res)
    expect(mockKvDel).toHaveBeenCalled()
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
  })
})
