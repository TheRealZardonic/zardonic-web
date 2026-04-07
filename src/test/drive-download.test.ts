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

type Res = { status: ReturnType<typeof vi.fn>; json: ReturnType<typeof vi.fn>; setHeader: ReturnType<typeof vi.fn>; end: ReturnType<typeof vi.fn>; write: ReturnType<typeof vi.fn> }

function mockRes() {
  const res: Res = {
    status: vi.fn(),
    json: vi.fn(),
    setHeader: vi.fn(),
    end: vi.fn(),
    write: vi.fn(),
  }
  res.status.mockReturnValue(res)
  res.json.mockReturnValue(res)
  res.setHeader.mockReturnValue(res)
  return res as unknown as unknown as VercelResponse
}

function createReadableBody(data: string): ReadableStream {
  return new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(data))
      controller.close()
    },
  })
}

const { default: handler } = await import('../../api/drive-download.js')

// ---------------------------------------------------------------------------
describe('Drive download API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockApplyRateLimit.mockResolvedValue(true)
  })

  it('rejects non-GET methods with 405', async () => {
    const res = mockRes()
    await handler({ method: 'POST', query: {}, headers: {} } as unknown as VercelRequest, res)
    expect(res.status).toHaveBeenCalledWith(405)
    expect(res.json).toHaveBeenCalledWith({ error: 'Method not allowed' })
  })

  it('returns 400 for missing fileId', async () => {
    const res = mockRes()
    await handler({ method: 'GET', query: {}, headers: {} } as unknown as VercelRequest, res)
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('returns 400 for invalid fileId format', async () => {
    const res = mockRes()
    await handler({ method: 'GET', query: { fileId: '../../../etc/passwd' }, headers: {} } as unknown as VercelRequest, res)
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('stops if rate limited', async () => {
    mockApplyRateLimit.mockResolvedValue(false)
    const res = mockRes()
    await handler({ method: 'GET', query: { fileId: 'abc123' }, headers: {} } as unknown as VercelRequest, res)
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('streams file from Google Drive download URL', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      headers: new Map([['content-type', 'application/zip'], ['content-length', '1024']]),
      body: createReadableBody('data'),
    })
    // Override headers.get for Response-like interface
    const headers = { get: (name: string) => name === 'content-type' ? 'application/zip' : name === 'content-length' ? '1024' : null }
    mockFetch.mockResolvedValue({ ok: true, headers, body: createReadableBody('data') })
    const res = mockRes()
    await handler({ method: 'GET', query: { fileId: 'abc123' }, headers: {} } as unknown as VercelRequest, res)
    expect(mockFetch).toHaveBeenCalledWith(
      'https://drive.google.com/uc?export=download&id=abc123',
      expect.objectContaining({ redirect: 'follow' })
    )
  })

  it('fetches with properly encoded fileId', async () => {
    const headers = { get: () => null }
    mockFetch.mockResolvedValue({ ok: true, headers, body: createReadableBody('data') })
    const res = mockRes()
    await handler({ method: 'GET', query: { fileId: 'test_file-123' }, headers: {} } as unknown as VercelRequest, res)
    expect(mockFetch).toHaveBeenCalledWith(
      'https://drive.google.com/uc?export=download&id=test_file-123',
      expect.objectContaining({ redirect: 'follow' })
    )
  })

  it('returns 502 when fetch fails', async () => {
    mockFetch.mockRejectedValue(new Error('Network failure'))
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const res = mockRes()
    await handler({ method: 'GET', query: { fileId: 'largeFileId' }, headers: {} } as unknown as VercelRequest, res)
    expect(res.status).toHaveBeenCalledWith(502)
    consoleSpy.mockRestore()
  })
})
