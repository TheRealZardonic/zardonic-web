import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---------------------------------------------------------------------------
// Mock @vercel/kv
// ---------------------------------------------------------------------------
const mockKvGet = vi.fn()

vi.mock('@vercel/kv', () => ({
  kv: { get: mockKvGet, set: vi.fn() },
}))

// Mock rate limiter — always allow requests in tests
vi.mock('../../api/_ratelimit.js', () => ({
  applyRateLimit: vi.fn().mockResolvedValue(true),
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

const { default: handler } = await import('../../api/terminal.js')

const BAND_DATA_WITH_COMMANDS = {
  name: 'NEUROKLAST',
  terminalCommands: [
    { name: 'status', description: 'System status', output: ['STATUS: ACTIVE', 'LEVEL: CLASSIFIED'] },
    { name: 'secret', description: 'Secret file', output: ['DECRYPTING...'], fileUrl: 'https://example.com/secret.zip', fileName: 'secret.zip' },
  ],
}

// ---------------------------------------------------------------------------
describe('Terminal API handler', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.KV_REST_API_URL = 'https://fake-kv.vercel.test'
    process.env.KV_REST_API_TOKEN = 'fake-token'
  })

  it('OPTIONS returns 200', async () => {
    const res = mockRes()
    await handler({ method: 'OPTIONS', body: {}, headers: {} }, res)
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.end).toHaveBeenCalled()
  })

  it('returns 405 for GET', async () => {
    const res = mockRes()
    await handler({ method: 'GET', body: {}, headers: {} }, res)
    expect(res.status).toHaveBeenCalledWith(405)
  })

  it('returns 400 when body is missing', async () => {
    const res = mockRes()
    await handler({ method: 'POST', body: null, headers: {} }, res)
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('returns 400 when command is missing', async () => {
    const res = mockRes()
    await handler({ method: 'POST', body: {}, headers: {} }, res)
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('returns 400 for invalid command format (spaces)', async () => {
    const res = mockRes()
    await handler({ method: 'POST', body: { command: 'my command' }, headers: {} }, res)
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('returns matching command output', async () => {
    mockKvGet.mockResolvedValue(BAND_DATA_WITH_COMMANDS)
    const res = mockRes()
    await handler({ method: 'POST', body: { command: 'status' }, headers: {} }, res)
    expect(res.json).toHaveBeenCalledWith({
      found: true,
      output: ['STATUS: ACTIVE', 'LEVEL: CLASSIFIED'],
      fileUrl: null,
      fileName: null,
    })
  })

  it('returns file info when command has fileUrl', async () => {
    mockKvGet.mockResolvedValue(BAND_DATA_WITH_COMMANDS)
    const res = mockRes()
    await handler({ method: 'POST', body: { command: 'secret' }, headers: {} }, res)
    expect(res.json).toHaveBeenCalledWith({
      found: true,
      output: ['DECRYPTING...'],
      fileUrl: 'https://example.com/secret.zip',
      fileName: 'secret.zip',
    })
  })

  it('returns found: false for unknown command', async () => {
    mockKvGet.mockResolvedValue(BAND_DATA_WITH_COMMANDS)
    const res = mockRes()
    await handler({ method: 'POST', body: { command: 'nonexistent' }, headers: {} }, res)
    expect(res.json).toHaveBeenCalledWith({ found: false })
  })

  it('help returns only names and descriptions, not outputs', async () => {
    mockKvGet.mockResolvedValue(BAND_DATA_WITH_COMMANDS)
    const res = mockRes()
    await handler({ method: 'POST', body: { command: 'help' }, headers: {} }, res)
    const response = res.json.mock.calls[0][0]
    expect(response.found).toBe(true)
    expect(response.listing).toHaveLength(2)
    expect(response.listing[0]).toEqual({ name: 'status', description: 'System status' })
    expect(response.listing[1]).toEqual({ name: 'secret', description: 'Secret file' })
    // Ensure no output or fileUrl is leaked in help
    expect(response.listing[0].output).toBeUndefined()
    expect(response.listing[0].fileUrl).toBeUndefined()
  })

  it('returns found: false when band-data has no terminalCommands', async () => {
    mockKvGet.mockResolvedValue({ name: 'NEUROKLAST' })
    const res = mockRes()
    await handler({ method: 'POST', body: { command: 'status' }, headers: {} }, res)
    expect(res.json).toHaveBeenCalledWith({ found: false })
  })

  it('returns found: false when band-data is null', async () => {
    mockKvGet.mockResolvedValue(null)
    const res = mockRes()
    await handler({ method: 'POST', body: { command: 'status' }, headers: {} }, res)
    expect(res.json).toHaveBeenCalledWith({ found: false })
  })

  it('returns 503 when KV is not configured', async () => {
    delete process.env.KV_REST_API_URL
    delete process.env.KV_REST_API_TOKEN
    const res = mockRes()
    await handler({ method: 'POST', body: { command: 'status' }, headers: {} }, res)
    expect(res.status).toHaveBeenCalledWith(503)
  })

  it('returns 500 when KV throws', async () => {
    mockKvGet.mockRejectedValue(new Error('KV failure'))
    const res = mockRes()
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    await handler({ method: 'POST', body: { command: 'status' }, headers: {} }, res)
    expect(res.status).toHaveBeenCalledWith(500)
    consoleSpy.mockRestore()
  })
})
