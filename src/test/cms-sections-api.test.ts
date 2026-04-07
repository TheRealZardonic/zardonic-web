import { describe, it, expect, vi, beforeEach } from 'vitest'

process.env.UPSTASH_REDIS_REST_URL = 'https://test.upstash.io'
process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token'

const mockGet = vi.fn()
const mockSet = vi.fn()

vi.mock('@upstash/redis', () => ({
  Redis: class {
    get = mockGet
    set = mockSet
    del = vi.fn()
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

type MockRes = {
  status: ReturnType<typeof vi.fn>
  json: ReturnType<typeof vi.fn>
  setHeader: ReturnType<typeof vi.fn>
  end: ReturnType<typeof vi.fn>
}

function mockRes(): MockRes {
  const res: any = {
    status: vi.fn(),
    json: vi.fn(),
    setHeader: vi.fn(),
    end: vi.fn(),
  }
  res.status.mockReturnValue(res)
  res.json.mockReturnValue(res)
  res.setHeader.mockReturnValue(res)
  res.end.mockReturnValue(res)
  return res
}

const { default: handler } = await import('../../api/cms/sections.ts')
const { validateSession } = await import('../../api/auth.ts')

const validSection = {
  id: 'hero',
  type: 'hero',
  label: 'Hero',
  enabled: true,
  order: 0,
}

beforeEach(() => {
  vi.clearAllMocks()
  mockGet.mockResolvedValue(null)
  mockSet.mockResolvedValue('OK')
})

describe('GET /api/cms/sections', () => {
  it('returns 401 when not authenticated', async () => {
    vi.mocked(validateSession).mockResolvedValueOnce(false)
    const req: any = { method: 'GET', headers: {}, query: {} } as never
    const res = mockRes()
    await handler(req, res)
    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.json).toHaveBeenCalledWith({ error: 'Unauthorized' })
  })

  it('returns empty array when no sections stored', async () => {
    mockGet.mockResolvedValueOnce(null)
    const req: any = { method: 'GET', headers: {}, query: {} } as never
    const res = mockRes()
    await handler(req, res)
    expect(res.json).toHaveBeenCalledWith({ sections: [] })
  })

  it('returns stored sections', async () => {
    const sections = [validSection]
    mockGet.mockResolvedValueOnce(sections)
    const req: any = { method: 'GET', headers: {}, query: {} } as never
    const res = mockRes()
    await handler(req, res)
    expect(res.json).toHaveBeenCalledWith({ sections })
  })
})

describe('POST /api/cms/sections', () => {
  it('returns 401 when not authenticated', async () => {
    vi.mocked(validateSession).mockResolvedValueOnce(false)
    const req: any = {
      method: 'POST',
      headers: {},
      body: { sections: [validSection] },
    } as never
    const res = mockRes()
    await handler(req, res)
    expect(res.status).toHaveBeenCalledWith(401)
  })

  it('returns 400 when body is missing', async () => {
    const req: any = { method: 'POST', headers: {}, body: undefined } as never
    const res = mockRes()
    await handler(req, res)
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('returns 400 when body is not an object', async () => {
    const req: any = { method: 'POST', headers: {}, body: 'invalid' } as never
    const res = mockRes()
    await handler(req, res)
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('returns 400 when sections is not an array', async () => {
    const req: any = {
      method: 'POST',
      headers: {},
      body: { sections: 'not-an-array' },
    } as never
    const res = mockRes()
    await handler(req, res)
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('saves sections and returns success', async () => {
    const sections = [validSection]
    const req: any = {
      method: 'POST',
      headers: {},
      body: { sections },
    } as never
    const res = mockRes()
    await handler(req, res)
    expect(mockSet).toHaveBeenCalled()
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, sections })
    )
  })

  it('saves multiple sections with correct order', async () => {
    const sections = [
      { id: 'hero', type: 'hero', label: 'Hero', enabled: true, order: 0 },
      { id: 'bio', type: 'biography', label: 'Biography', enabled: false, order: 1 },
    ]
    const req: any = { method: 'POST', headers: {}, body: { sections } } as never
    const res = mockRes()
    await handler(req, res)
    expect(mockSet).toHaveBeenCalled()
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, sections })
    )
  })
})

describe('Method not allowed', () => {
  it('returns 405 for PUT', async () => {
    const req: any = { method: 'PUT', headers: {}, body: {} } as never
    const res = mockRes()
    await handler(req, res)
    expect(res.status).toHaveBeenCalledWith(405)
  })

  it('returns 405 for DELETE', async () => {
    const req: any = { method: 'DELETE', headers: {}, query: {} } as never
    const res = mockRes()
    await handler(req, res)
    expect(res.status).toHaveBeenCalledWith(405)
  })

  it('returns 405 for PATCH', async () => {
    const req: any = { method: 'PATCH', headers: {}, body: {} } as never
    const res = mockRes()
    await handler(req, res)
    expect(res.status).toHaveBeenCalledWith(405)
  })
})

describe('Error handling', () => {
  it('returns 500 on Redis error', async () => {
    mockGet.mockRejectedValueOnce(new Error('Redis connection failed'))
    const req: any = { method: 'GET', headers: {}, query: {} } as never
    const res = mockRes()
    await handler(req, res)
    expect(res.status).toHaveBeenCalledWith(500)
  })

  it('returns 500 on Redis set error', async () => {
    mockSet.mockRejectedValueOnce(new Error('Redis write failed'))
    const req: any = {
      method: 'POST',
      headers: {},
      body: { sections: [validSection] },
    } as never
    const res = mockRes()
    await handler(req, res)
    expect(res.status).toHaveBeenCalledWith(500)
  })
})
