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

const { default: handler } = await import('../../api/cms/publish.ts')
const { validateSession } = await import('../../api/auth.ts')

beforeEach(() => {
  vi.clearAllMocks()
  mockGet.mockResolvedValue(null)
  mockSet.mockResolvedValue('OK')
  mockDel.mockResolvedValue(1)
})

describe('POST /api/cms/publish', () => {
  it('returns 401 when not authenticated', async () => {
    vi.mocked(validateSession).mockResolvedValueOnce(false)
    const req: any = { method: 'POST', headers: {}, body: { key: 'zd-cms:hero' } } as never
    const res = mockRes()
    await handler(req, res)
    expect(res.status).toHaveBeenCalledWith(401)
  })

  it('returns 405 for non-POST methods', async () => {
    const req: any = { method: 'GET', headers: {}, body: {} } as never
    const res = mockRes()
    await handler(req, res)
    expect(res.status).toHaveBeenCalledWith(405)
  })

  it('returns 400 for missing body', async () => {
    const req: any = { method: 'POST', headers: {}, body: null } as never
    const res = mockRes()
    await handler(req, res)
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('returns 400 when key lacks zd-cms: prefix', async () => {
    const req: any = { method: 'POST', headers: {}, body: { key: 'hero' } } as never
    const res = mockRes()
    await handler(req, res)
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('copies draft to published on valid publish', async () => {
    mockGet.mockResolvedValueOnce({ headline: 'Test' })
    const req: any = { method: 'POST', headers: {}, body: { key: 'zd-cms:hero' } } as never
    const res = mockRes()
    await handler(req, res)
    expect(mockGet).toHaveBeenCalled()
    expect(mockSet).toHaveBeenCalled()
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
  })

  it('deletes published on revert:true', async () => {
    const req: any = { method: 'POST', headers: {}, body: { key: 'zd-cms:hero', revert: true } } as never
    const res = mockRes()
    await handler(req, res)
    expect(mockDel).toHaveBeenCalled()
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
  })
})
