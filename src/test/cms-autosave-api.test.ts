import { describe, it, expect, vi, beforeEach } from 'vitest'

// Provide env vars so getRedis() doesn't throw before the Redis mock is used
process.env.UPSTASH_REDIS_REST_URL = 'https://test.upstash.io'
process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token'

const mockGet = vi.fn()
const mockSet = vi.fn()
const mockDel = vi.fn()

vi.mock('@upstash/redis', () => ({
  Redis: class {
    get = mockGet
    set = mockSet
    del = mockDel
    incr = vi.fn().mockResolvedValue(1)
    expire = vi.fn().mockResolvedValue(1)
  },
}))

vi.mock('../../api/_ratelimit.ts', () => ({
  applyRateLimit: vi.fn().mockResolvedValue(true),
  getClientIp: vi.fn().mockReturnValue('127.0.0.1'),
  hashIp: vi.fn().mockReturnValue('hashed-ip'),
}))

vi.mock('../../api/auth.ts', () => ({
  validateSession: vi.fn().mockResolvedValue(true),
}))

type MockRes = { status: ReturnType<typeof vi.fn>; json: ReturnType<typeof vi.fn>; setHeader: ReturnType<typeof vi.fn>; end: ReturnType<typeof vi.fn> }

function mockRes(): MockRes {
  const res: any = { status: vi.fn(), json: vi.fn(), setHeader: vi.fn(), end: vi.fn() }
  res.status.mockReturnValue(res)
  res.json.mockReturnValue(res)
  res.setHeader.mockReturnValue(res)
  res.end.mockReturnValue(res)
  return res
}

const { default: handler } = await import('../../api/cms/autosave.ts')
const { validateSession } = await import('../../api/auth.ts')

beforeEach(() => {
  vi.clearAllMocks()
  mockGet.mockResolvedValue(null)
  mockSet.mockResolvedValue('OK')
  mockDel.mockResolvedValue(1)
})

describe('GET /api/cms/autosave', () => {
  it('returns 401 when not authenticated', async () => {
    vi.mocked(validateSession).mockResolvedValueOnce(false)
    const req: any = { method: 'GET', headers: {}, query: { key: 'zd-cms:hero' } } as never
    const res = mockRes()
    await handler(req, res)
    expect(res.status).toHaveBeenCalledWith(401)
  })

  it('returns 400 for key without zd-cms: prefix', async () => {
    const req: any = { method: 'GET', headers: {}, query: { key: 'hero' } } as never
    const res = mockRes()
    await handler(req, res)
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('returns autosave data', async () => {
    mockGet.mockResolvedValueOnce({ headline: 'Draft' })
    const req: any = { method: 'GET', headers: {}, query: { key: 'zd-cms:hero' } } as never
    const res = mockRes()
    await handler(req, res)
    expect(res.json).toHaveBeenCalledWith({ value: { headline: 'Draft' } })
  })
})

describe('POST /api/cms/autosave', () => {
  it('returns 401 when not authenticated', async () => {
    vi.mocked(validateSession).mockResolvedValueOnce(false)
    const req: any = { method: 'POST', headers: {}, body: { key: 'zd-cms:hero', value: {} } } as never
    const res = mockRes()
    await handler(req, res)
    expect(res.status).toHaveBeenCalledWith(401)
  })

  it('returns 400 for key without zd-cms: prefix', async () => {
    const req: any = { method: 'POST', headers: {}, body: { key: 'hero', value: {} } } as never
    const res = mockRes()
    await handler(req, res)
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('saves autosave with TTL', async () => {
    const req: any = { method: 'POST', headers: {}, body: { key: 'zd-cms:hero', value: { headline: 'x' } } } as never
    const res = mockRes()
    await handler(req, res)
    expect(mockSet).toHaveBeenCalled()
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
  })
})

describe('DELETE /api/cms/autosave', () => {
  it('returns 401 when not authenticated', async () => {
    vi.mocked(validateSession).mockResolvedValueOnce(false)
    const req: any = { method: 'DELETE', headers: {}, query: { key: 'zd-cms:hero' } } as never
    const res = mockRes()
    await handler(req, res)
    expect(res.status).toHaveBeenCalledWith(401)
  })

  it('deletes autosave', async () => {
    const req: any = { method: 'DELETE', headers: {}, query: { key: 'zd-cms:hero' } } as never
    const res = mockRes()
    await handler(req, res)
    expect(mockDel).toHaveBeenCalled()
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
  })
})
