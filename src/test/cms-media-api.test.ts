import { describe, it, expect, vi, beforeEach } from 'vitest'

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

// Mock sharp to avoid requiring native binaries in tests
vi.mock('sharp', () => {
  function createSharpInstance() {
    const instance = {
      rotate: vi.fn().mockReturnThis(),
      resize: vi.fn().mockReturnThis(),
      webp: vi.fn().mockReturnThis(),
      clone: vi.fn().mockImplementation(createSharpInstance),
      metadata: vi.fn().mockResolvedValue({ width: 800, height: 600 }),
      toBuffer: vi.fn().mockResolvedValue(Buffer.from('fake-webp-data')),
    }
    return instance
  }
  return { default: vi.fn().mockImplementation(createSharpInstance) }
})

// Mock uuid for deterministic IDs
vi.mock('uuid', () => ({
  v4: vi.fn().mockReturnValue('test-uuid-1234'),
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

const { default: handler } = await import('../../api/cms/media.ts')
const { validateSession } = await import('../../api/auth.ts')

// Minimal valid 1x1 PNG encoded as base64 dataUrl
const VALID_DATA_URL = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='

beforeEach(() => {
  vi.clearAllMocks()
  mockGet.mockResolvedValue(null)
  mockSet.mockResolvedValue('OK')
  mockDel.mockResolvedValue(1)
})

describe('GET /api/cms/media', () => {
  it('returns 401 when not authenticated', async () => {
    vi.mocked(validateSession).mockResolvedValueOnce(false)
    const req: any = { method: 'GET', headers: {}, query: {} } as never
    const res = mockRes()
    await handler(req, res)
    expect(res.status).toHaveBeenCalledWith(401)
  })

  it('returns empty list when no media stored', async () => {
    mockGet.mockResolvedValueOnce(null)
    const req: any = { method: 'GET', headers: {}, query: {} } as never
    const res = mockRes()
    await handler(req, res)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ items: [], total: 0 })
    )
  })

  it('returns paginated media items', async () => {
    const index = ['id-1', 'id-2']
    const item1 = { id: 'id-1', fileName: 'photo.webp', mimeType: 'image/webp', size: 1024, width: 800, height: 600, url: 'data:image/webp;base64,abc', thumbnailUrl: 'data:image/webp;base64,xyz', uploadedAt: '2024-01-01T00:00:00.000Z' }
    const item2 = { id: 'id-2', fileName: 'banner.webp', mimeType: 'image/webp', size: 2048, width: 1200, height: 400, url: 'data:image/webp;base64,def', thumbnailUrl: 'data:image/webp;base64,ghi', uploadedAt: '2024-01-02T00:00:00.000Z' }
    mockGet
      .mockResolvedValueOnce(index)
      .mockResolvedValueOnce(item1)
      .mockResolvedValueOnce(item2)
    const req: any = { method: 'GET', headers: {}, query: { page: '1', limit: '20' } } as never
    const res = mockRes()
    await handler(req, res)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ total: 2, page: 1, limit: 20 })
    )
  })

  it('respects page and limit query parameters', async () => {
    const index = Array.from({ length: 5 }, (_, i) => `id-${i}`)
    mockGet.mockResolvedValueOnce(index)
    // No items on page 2 for limit 10
    const req: any = { method: 'GET', headers: {}, query: { page: '2', limit: '10' } } as never
    const res = mockRes()
    await handler(req, res)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ items: [], total: 5, page: 2, limit: 10 })
    )
  })
})

describe('POST /api/cms/media', () => {
  it('returns 401 when not authenticated', async () => {
    vi.mocked(validateSession).mockResolvedValueOnce(false)
    const req: any = {
      method: 'POST',
      headers: {},
      body: { fileName: 'test.png', mimeType: 'image/png', dataUrl: VALID_DATA_URL },
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

  it('returns 400 when fileName is missing', async () => {
    const req: any = {
      method: 'POST',
      headers: {},
      body: { mimeType: 'image/png', dataUrl: VALID_DATA_URL },
    } as never
    const res = mockRes()
    await handler(req, res)
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('returns 400 when mimeType is missing', async () => {
    const req: any = {
      method: 'POST',
      headers: {},
      body: { fileName: 'test.png', dataUrl: VALID_DATA_URL },
    } as never
    const res = mockRes()
    await handler(req, res)
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('returns 400 when dataUrl is missing', async () => {
    const req: any = {
      method: 'POST',
      headers: {},
      body: { fileName: 'test.png', mimeType: 'image/png' },
    } as never
    const res = mockRes()
    await handler(req, res)
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('returns 400 for disallowed MIME type', async () => {
    const req: any = {
      method: 'POST',
      headers: {},
      body: { fileName: 'virus.exe', mimeType: 'application/octet-stream', dataUrl: VALID_DATA_URL },
    } as never
    const res = mockRes()
    await handler(req, res)
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ details: ['Unsupported file type'] }))
  })

  it('returns 400 for PDF mime type', async () => {
    const req: any = {
      method: 'POST',
      headers: {},
      body: { fileName: 'doc.pdf', mimeType: 'application/pdf', dataUrl: VALID_DATA_URL },
    } as never
    const res = mockRes()
    await handler(req, res)
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('returns 413 for oversized payload', async () => {
    // Create a dataUrl that simulates > 5MB decoded (~6.67MB base64 = 5MB binary)
    const bigDataUrl = 'data:image/png;base64,' + 'A'.repeat(7 * 1024 * 1024)
    const req: any = {
      method: 'POST',
      headers: {},
      body: { fileName: 'huge.png', mimeType: 'image/png', dataUrl: bigDataUrl },
    } as never
    const res = mockRes()
    await handler(req, res)
    expect(res.status).toHaveBeenCalledWith(413)
  })

  it('uploads valid image and returns 201 with media item', async () => {
    mockGet.mockResolvedValueOnce([]) // current index
    const req: any = {
      method: 'POST',
      headers: {},
      body: { fileName: 'photo.png', mimeType: 'image/png', dataUrl: VALID_DATA_URL },
    } as never
    const res = mockRes()
    await handler(req, res)
    expect(res.status).toHaveBeenCalledWith(201)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        item: expect.objectContaining({
          mimeType: 'image/webp',
          id: 'test-uuid-1234',
        }),
      })
    )
  })

  it('renames uploaded file with .webp extension', async () => {
    mockGet.mockResolvedValueOnce([])
    const req: any = {
      method: 'POST',
      headers: {},
      body: { fileName: 'original.jpeg', mimeType: 'image/jpeg', dataUrl: VALID_DATA_URL },
    } as never
    const res = mockRes()
    await handler(req, res)
    expect(res.status).toHaveBeenCalledWith(201)
    const call = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0] as { item: { fileName: string } }
    expect(call.item.fileName).toBe('original.webp')
  })

  it('accepts all allowed MIME types', async () => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']
    for (const mimeType of allowedTypes) {
      vi.clearAllMocks()
      mockGet.mockResolvedValue([])
      mockSet.mockResolvedValue('OK')
      const req: any = {
        method: 'POST',
        headers: {},
        body: { fileName: 'img.png', mimeType, dataUrl: VALID_DATA_URL },
      } as never
      const res = mockRes()
      await handler(req, res)
      expect(res.status).toHaveBeenCalledWith(201)
    }
  })
})

describe('DELETE /api/cms/media', () => {
  it('returns 401 when not authenticated', async () => {
    vi.mocked(validateSession).mockResolvedValueOnce(false)
    const req: any = { method: 'DELETE', headers: {}, query: { id: 'test-uuid-1234' } } as never
    const res = mockRes()
    await handler(req, res)
    expect(res.status).toHaveBeenCalledWith(401)
  })

  it('returns 400 when id is missing', async () => {
    const req: any = { method: 'DELETE', headers: {}, query: {} } as never
    const res = mockRes()
    await handler(req, res)
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ details: ['id is required'] }))
  })

  it('returns 404 when media item does not exist', async () => {
    mockGet.mockResolvedValueOnce(null)
    const req: any = { method: 'DELETE', headers: {}, query: { id: 'nonexistent-id' } } as never
    const res = mockRes()
    await handler(req, res)
    expect(res.status).toHaveBeenCalledWith(404)
  })

  it('deletes existing media item and removes from index', async () => {
    const existingItem = { id: 'test-uuid-1234', fileName: 'photo.webp', mimeType: 'image/webp' }
    const index = ['test-uuid-1234', 'other-id']
    mockGet
      .mockResolvedValueOnce(existingItem) // item exists check
      .mockResolvedValueOnce(index)         // current index
    const req: any = { method: 'DELETE', headers: {}, query: { id: 'test-uuid-1234' } } as never
    const res = mockRes()
    await handler(req, res)
    expect(mockDel).toHaveBeenCalledWith('zd-cms:media:test-uuid-1234')
    expect(mockSet).toHaveBeenCalledWith('zd-cms:media:index', ['other-id'])
    expect(res.json).toHaveBeenCalledWith({ success: true })
  })
})

describe('Method not allowed', () => {
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
  it('returns 500 on Redis GET error', async () => {
    mockGet.mockRejectedValueOnce(new Error('Redis down'))
    const req: any = { method: 'GET', headers: {}, query: {} } as never
    const res = mockRes()
    await handler(req, res)
    expect(res.status).toHaveBeenCalledWith(500)
  })
})
