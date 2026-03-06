import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the global fetch
global.fetch = vi.fn()

type Res = { status: ReturnType<typeof vi.fn>; json: ReturnType<typeof vi.fn> }

function mockRes(): Res {
  const res: Res = {
    status: vi.fn(),
    json: vi.fn(),
  }
  res.status.mockReturnValue(res)
  res.json.mockReturnValue(res)
  return res
}

const { default: handler } = await import('../../api/bandsintown.ts')

describe('Bandsintown API handler', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    delete process.env.BANDSINTOWN_API_KEY
  })

  it('should return 400 if artist parameter is missing', async () => {
    process.env.BANDSINTOWN_API_KEY = 'test-api-key'
    const res = mockRes()
    await handler({ query: {} } as any, res as any)
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({ error: 'Missing artist parameter' })
  })

  it('should return 503 if BANDSINTOWN_API_KEY is not configured', async () => {
    const res = mockRes()
    await handler({ query: { artist: 'Zardonic' } } as any, res as any)
    expect(res.status).toHaveBeenCalledWith(503)
    expect(res.json).toHaveBeenCalledWith({
      error: 'Service unavailable',
      message: 'Bandsintown API is not configured. Please set BANDSINTOWN_API_KEY environment variable.'
    })
  })

  it('should fetch events from Bandsintown API with API key', async () => {
    process.env.BANDSINTOWN_API_KEY = 'test-api-key'
    const mockData = [{ id: '123', venue: { name: 'Test Venue' } }]
    
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(JSON.stringify(mockData)),
    })

    const res = mockRes()
    await handler({ query: { artist: 'Zardonic' } } as any, res as any)

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('https://rest.bandsintown.com/artists/Zardonic/events?app_id=test-api-key'),
      expect.any(Object)
    )
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith(mockData)
  })

  it('should return error if Bandsintown API responds with non-ok status', async () => {
    process.env.BANDSINTOWN_API_KEY = 'test-api-key'
    
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      status: 404,
    })

    const res = mockRes()
    await handler({ query: { artist: 'Zardonic' } } as any, res as any)

    expect(res.status).toHaveBeenCalledWith(404)
    expect(res.json).toHaveBeenCalledWith({ error: 'Bandsintown API responded with 404' })
  })

  it('should return 502 if response is not valid JSON', async () => {
    process.env.BANDSINTOWN_API_KEY = 'test-api-key'
    
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      text: () => Promise.resolve('invalid json'),
    })

    const res = mockRes()
    await handler({ query: { artist: 'Zardonic' } } as any, res as any)

    expect(res.status).toHaveBeenCalledWith(502)
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid JSON response from Bandsintown API' })
  })

  it('should return 502 if fetch throws an error', async () => {
    process.env.BANDSINTOWN_API_KEY = 'test-api-key'
    
    ;(global.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Network error'))

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const res = mockRes()
    await handler({ query: { artist: 'Zardonic' } } as any, res as any)

    expect(res.status).toHaveBeenCalledWith(502)
    expect(res.json).toHaveBeenCalledWith({ error: 'Failed to fetch from Bandsintown API' })
    consoleSpy.mockRestore()
  })
})
