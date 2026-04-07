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

const { default: handler } = await import('../../api/cms/site-config.ts')
const { validateSession } = await import('../../api/auth.ts')

const validConfig = {
  name: 'Zardonic',
  description: 'Industrial Metal Artist',
  logoUrl: 'https://example.com/logo.webp',
  faviconUrl: 'https://example.com/favicon.ico',
  ogImageUrl: 'https://example.com/og.webp',
  analyticsId: 'UA-000000',
  customMeta: [],
}

beforeEach(() => {
  vi.clearAllMocks()
  mockGet.mockResolvedValue(null)
  mockSet.mockResolvedValue('OK')
})

describe('GET /api/cms/site-config', () => {
  it('returns 401 when not authenticated', async () => {
    vi.mocked(validateSession).mockResolvedValueOnce(false)
    const req: any = { method: 'GET', headers: {}, query: {} } as never
    const res = mockRes()
    await handler(req, res)
    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.json).toHaveBeenCalledWith({ error: 'Unauthorized' })
  })

  it('returns null config when nothing stored', async () => {
    mockGet.mockResolvedValueOnce(null)
    const req: any = { method: 'GET', headers: {}, query: {} } as never
    const res = mockRes()
    await handler(req, res)
    expect(res.json).toHaveBeenCalledWith({ config: null })
  })

  it('returns stored config', async () => {
    mockGet.mockResolvedValueOnce(validConfig)
    const req: any = { method: 'GET', headers: {}, query: {} } as never
    const res = mockRes()
    await handler(req, res)
    expect(res.json).toHaveBeenCalledWith({ config: validConfig })
  })
})

describe('POST /api/cms/site-config', () => {
  it('returns 401 when not authenticated', async () => {
    vi.mocked(validateSession).mockResolvedValueOnce(false)
    const req: any = { method: 'POST', headers: {}, body: validConfig } as never
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
    const req: any = { method: 'POST', headers: {}, body: 'invalid-string' } as never
    const res = mockRes()
    await handler(req, res)
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('returns 400 for invalid config schema (missing name)', async () => {
    const req: any = {
      method: 'POST',
      headers: {},
      body: { description: 'Missing name' },
    } as never
    const res = mockRes()
    await handler(req, res)
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('saves valid config and returns success', async () => {
    const req: any = { method: 'POST', headers: {}, body: validConfig } as never
    const res = mockRes()
    await handler(req, res)
    expect(mockSet).toHaveBeenCalledWith('zd-cms:config', expect.objectContaining({ name: 'Zardonic' }))
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, config: expect.objectContaining({ name: 'Zardonic' }) })
    )
  })

  it('saves config with optional fields omitted', async () => {
    const minimalConfig = { name: 'Zardonic', description: 'Metal' }
    const req: any = { method: 'POST', headers: {}, body: minimalConfig } as never
    const res = mockRes()
    await handler(req, res)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true })
    )
  })
})

describe('Method not allowed', () => {
  it('returns 405 for DELETE', async () => {
    const req: any = { method: 'DELETE', headers: {}, query: {} } as never
    const res = mockRes()
    await handler(req, res)
    expect(res.status).toHaveBeenCalledWith(405)
  })

  it('returns 405 for PUT', async () => {
    const req: any = { method: 'PUT', headers: {}, body: {} } as never
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
  it('returns 500 on Redis error during GET', async () => {
    mockGet.mockRejectedValueOnce(new Error('Redis down'))
    const req: any = { method: 'GET', headers: {}, query: {} } as never
    const res = mockRes()
    await handler(req, res)
    expect(res.status).toHaveBeenCalledWith(500)
  })

  it('returns 500 on Redis set error during POST', async () => {
    mockSet.mockRejectedValueOnce(new Error('Redis write failed'))
    const req: any = { method: 'POST', headers: {}, body: validConfig } as never
    const res = mockRes()
    await handler(req, res)
    expect(res.status).toHaveBeenCalledWith(500)
  })
})
