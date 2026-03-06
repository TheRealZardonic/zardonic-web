import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---------------------------------------------------------------------------
// Mock rate limiter
// ---------------------------------------------------------------------------
const mockApplyRateLimit = vi.fn()

vi.mock('../../api/_ratelimit.js', () => ({
  applyRateLimit: (...args: unknown[]) => mockApplyRateLimit(...args),
  hashIp: vi.fn().mockReturnValue('hashed-ip'),
  getClientIp: vi.fn().mockReturnValue('1.2.3.4'),
}))

type Res = { status: ReturnType<typeof vi.fn>; json: ReturnType<typeof vi.fn>; redirect: ReturnType<typeof vi.fn> }

function mockRes(): Res {
  const res: Res = {
    status: vi.fn(),
    json: vi.fn(),
    redirect: vi.fn(),
  }
  res.status.mockReturnValue(res)
  res.json.mockReturnValue(res)
  return res
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
    await handler({ method: 'POST', query: {}, headers: {} }, res)
    expect(res.status).toHaveBeenCalledWith(405)
    expect(res.json).toHaveBeenCalledWith({ error: 'Method not allowed' })
  })

  it('returns 400 for missing fileId', async () => {
    const res = mockRes()
    await handler({ method: 'GET', query: {}, headers: {} }, res)
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('returns 400 for invalid fileId format', async () => {
    const res = mockRes()
    await handler({ method: 'GET', query: { fileId: '../../../etc/passwd' }, headers: {} }, res)
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('stops if rate limited', async () => {
    mockApplyRateLimit.mockResolvedValue(false)
    const res = mockRes()
    await handler({ method: 'GET', query: { fileId: 'abc123' }, headers: {} }, res)
    expect(res.redirect).not.toHaveBeenCalled()
  })

  it('redirects to Google Drive download URL with 307 status', async () => {
    const res = mockRes()
    await handler({ method: 'GET', query: { fileId: 'abc123' }, headers: {} }, res)
    expect(res.redirect).toHaveBeenCalledWith(307, 'https://drive.google.com/uc?export=download&id=abc123')
  })

  it('properly encodes fileId in redirect URL', async () => {
    const res = mockRes()
    await handler({ method: 'GET', query: { fileId: 'test_file-123' }, headers: {} }, res)
    expect(res.redirect).toHaveBeenCalledWith(307, 'https://drive.google.com/uc?export=download&id=test_file-123')
  })

  it('always redirects regardless of file size', async () => {
    const res = mockRes()
    await handler({ method: 'GET', query: { fileId: 'largeFileId' }, headers: {} }, res)
    expect(res.redirect).toHaveBeenCalledWith(307, 'https://drive.google.com/uc?export=download&id=largeFileId')
  })
})
