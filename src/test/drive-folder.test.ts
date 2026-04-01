import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { VercelRequest, VercelResponse } from '@vercel/node';

// ---------------------------------------------------------------------------
// Mock rate limiter
// ---------------------------------------------------------------------------
const mockApplyRateLimit = vi.fn()

vi.mock('../../api/_ratelimit.js', () => ({
  applyRateLimit: (...args: unknown[]) => mockApplyRateLimit(...args),
  hashIp: vi.fn().mockReturnValue('hashed-ip'),
  getClientIp: vi.fn().mockReturnValue('1.2.3.4'),
}))

// ---------------------------------------------------------------------------
// Mock global fetch
// ---------------------------------------------------------------------------
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

type Res = { status: ReturnType<typeof vi.fn>; json: ReturnType<typeof vi.fn>; setHeader: ReturnType<typeof vi.fn> }

function mockRes() {
  const res: Res = {
    status: vi.fn(),
    json: vi.fn(),
    setHeader: vi.fn(),
  }
  res.status.mockReturnValue(res)
  res.json.mockReturnValue(res)
  return res as unknown as VercelResponse
}

const { default: handler } = await import('../../api/drive-folder.js')

// ---------------------------------------------------------------------------
describe('Drive folder API (Google Drive v3)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockApplyRateLimit.mockResolvedValue(true)
    process.env.GOOGLE_DRIVE_API_KEY = 'test-api-key'
  })

  it('rejects non-GET methods with 405', async () => {
    const res = mockRes()
    await handler({ method: 'POST', query: {}, headers: {} } as unknown as VercelRequest, res)
    expect(res.status).toHaveBeenCalledWith(405)
    expect(res.json).toHaveBeenCalledWith({ error: 'Method not allowed' })
  })

  it('returns 400 for missing folderId', async () => {
    const res = mockRes()
    await handler({ method: 'GET', query: {}, headers: {} } as unknown as VercelRequest, res)
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('returns 400 for invalid folderId', async () => {
    const res = mockRes()
    await handler({ method: 'GET', query: { folderId: 'bad folder!@#' }, headers: {} } as unknown as VercelRequest, res)
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('blocks requests when rate limited', async () => {
    (mockApplyRateLimit as ReturnType<typeof vi.fn>).mockImplementation(async (_req: unknown, res: Res) => {
      res.status(429).json({ error: 'Too Many Requests' })
      return false
    })
    const res = mockRes()
    await handler({ method: 'GET', query: { folderId: 'abc123' }, headers: {} } as unknown as VercelRequest, res)
    expect(res.status).toHaveBeenCalledWith(429)
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('calls Google Drive API v3 with correct parameters', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ files: [] }),
    })
    const res = mockRes()
    await handler({ method: 'GET', query: { folderId: 'testFolder123' }, headers: {} } as unknown as VercelRequest, res)

    expect(mockFetch).toHaveBeenCalledTimes(1)
    const calledUrl = mockFetch.mock.calls[0][0] as string
    expect(calledUrl).toContain('https://www.googleapis.com/drive/v3/files')
    expect(calledUrl).toContain('testFolder123')
    expect(calledUrl).toContain('key=test-api-key')
    expect(calledUrl).toContain('fields=files')
    // Must NOT contain old scraping patterns
    expect(calledUrl).not.toContain('embeddedfolderview')
    expect(calledUrl).not.toContain('NeuroklastBot')
  })

  it('maps API files to correct image structure', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        files: [
          { id: 'fileAAA', name: 'photo1.jpg', mimeType: 'image/jpeg' },
          { id: 'fileBBB', name: 'photo2.png', mimeType: 'image/png' },
        ],
      }),
    })
    const res = mockRes()
    await handler({ method: 'GET', query: { folderId: 'testFolder123' }, headers: {} } as unknown as VercelRequest, res)

    expect(res.json).toHaveBeenCalledTimes(1)
    const { images } = res.json.mock.calls[0][0]
    expect(images).toHaveLength(2)

    // Check structure
    expect(images[0].id).toBe('drive-fileAAA')
    expect(images[0].caption).toBe('photo1')
    expect(images[1].id).toBe('drive-fileBBB')
    expect(images[1].caption).toBe('photo2')

    // Check proxy URL chain
    for (const img of images) {
      expect(img.url).toMatch(/^\/api\/image-proxy\?url=/)
      const proxyUrl = decodeURIComponent(img.url.replace('/api/image-proxy?url=', ''))
      expect(proxyUrl).toContain('wsrv.nl')
      expect(proxyUrl).toContain('w=800')
      expect(proxyUrl).toContain('q=80')
      expect(proxyUrl).toContain('lh3.googleusercontent.com')
    }
  })

  it('sets Cache-Control header on success', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ files: [] }),
    })
    const res = mockRes()
    await handler({ method: 'GET', query: { folderId: 'abc123' }, headers: {} } as unknown as VercelRequest, res)
    expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', 'public, max-age=300, s-maxage=600')
  })

  it('returns 502 when Google API returns an error', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 403 })
    const res = mockRes()
    await handler({ method: 'GET', query: { folderId: 'abc123' }, headers: {} } as unknown as VercelRequest, res)
    expect(res.status).toHaveBeenCalledWith(502)
    expect(res.json).toHaveBeenCalledWith({ error: 'Failed to list Drive folder' })
  })

  it('returns 502 when fetch throws a network error', async () => {
    mockFetch.mockRejectedValue(new Error('Network failure'))
    const res = mockRes()
    await handler({ method: 'GET', query: { folderId: 'abc123' }, headers: {} } as unknown as VercelRequest, res)
    expect(res.status).toHaveBeenCalledWith(502)
    expect(res.json).toHaveBeenCalledWith({ error: 'Failed to list Drive folder' })
  })

  it('handles empty files array gracefully', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ files: [] }),
    })
    const res = mockRes()
    await handler({ method: 'GET', query: { folderId: 'abc123' }, headers: {} } as unknown as VercelRequest, res)
    expect(res.json).toHaveBeenCalledWith({ images: [] })
  })

  it('strips file extension from caption', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        files: [
          { id: 'f1', name: 'my.photo.jpeg', mimeType: 'image/jpeg' },
        ],
      }),
    })
    const res = mockRes()
    await handler({ method: 'GET', query: { folderId: 'abc123' }, headers: {} } as unknown as VercelRequest, res)
    const { images } = res.json.mock.calls[0][0]
    expect(images[0].caption).toBe('my.photo')
  })

  it('returns 503 when GOOGLE_DRIVE_API_KEY is not set', async () => {
    delete process.env.GOOGLE_DRIVE_API_KEY
    const res = mockRes()
    await handler({ method: 'GET', query: { folderId: 'abc123' }, headers: {} } as unknown as VercelRequest, res)
    expect(res.status).toHaveBeenCalledWith(503)
    expect(res.json).toHaveBeenCalledWith({ error: 'Service unavailable' })
    expect(mockFetch).not.toHaveBeenCalled()
  })
})
