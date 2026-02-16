import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock @upstash/redis
const mockKvGet = vi.fn()
const mockKvSet = vi.fn()
const mockKvDel = vi.fn()

vi.mock('@upstash/redis', () => ({
  Redis: class {
    get = mockKvGet
    set = mockKvSet
    del = mockKvDel
  },
}))

type Res = { status: ReturnType<typeof vi.fn>; json: ReturnType<typeof vi.fn> }

function mockRes(): Res {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  }
}

const { default: handler } = await import('../../api/analytics.ts')

describe('Analytics API handler', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.UPSTASH_REDIS_REST_URL = 'https://fake-redis.upstash.io'
    process.env.UPSTASH_REDIS_REST_TOKEN = 'fake-token'
  })

  describe('GET /api/analytics', () => {
    it('should return empty analytics data when none exists', async () => {
      mockKvGet.mockResolvedValue(null)
      
      const res = mockRes()
      await handler({ method: 'GET', query: {}, headers: {} } as any, res as any)

      expect(res.status).toHaveBeenCalledWith(200)
      expect(res.json).toHaveBeenCalledWith({
        value: expect.objectContaining({
          pageViews: 0,
          sectionViews: {},
          clicks: {},
          heatmap: [],
        }),
      })
    })

    it('should return stored analytics data', async () => {
      const mockData = {
        pageViews: 100,
        sectionViews: { bio: 50, music: 30 },
        clicks: { button1: 10 },
        visitors: ['visitor1'],
        redirects: {},
        devices: { mobile: 60, desktop: 40 },
        referrers: {},
        browsers: {},
        screenResolutions: {},
        heatmap: [],
        countries: {},
        languages: {},
      }
      mockKvGet.mockResolvedValue(mockData)
      
      const res = mockRes()
      await handler({ method: 'GET', query: {}, headers: {} } as any, res as any)

      expect(res.status).toHaveBeenCalledWith(200)
      expect(res.json).toHaveBeenCalledWith({ value: mockData })
    })

    it('should return 503 when Redis is not configured', async () => {
      delete process.env.UPSTASH_REDIS_REST_URL
      
      const res = mockRes()
      await handler({ method: 'GET', query: {}, headers: {} } as any, res as any)

      expect(res.status).toHaveBeenCalledWith(503)
      expect(res.json).toHaveBeenCalledWith({
        error: 'Service unavailable',
        message: expect.any(String),
      })
    })
  })

  describe('POST /api/analytics', () => {
    it('should require admin token', async () => {
      const res = mockRes()
      await handler({
        method: 'POST',
        body: { data: { pageViews: 1 } },
        headers: {},
      } as any, res as any)

      expect(res.status).toHaveBeenCalledWith(401)
    })

    it('should update analytics data with valid admin token', async () => {
      // Mock admin token validation
      mockKvGet.mockResolvedValueOnce('valid-hash')
      
      const analyticsData = {
        pageViews: 150,
        sectionViews: { bio: 75 },
        clicks: {},
        visitors: [],
        redirects: {},
        devices: {},
        referrers: {},
        browsers: {},
        screenResolutions: {},
        heatmap: [],
        countries: {},
        languages: {},
      }

      const res = mockRes()
      await handler({
        method: 'POST',
        body: { data: analyticsData },
        headers: { 'x-admin-token': 'valid-hash' },
      } as any, res as any)

      expect(mockKvSet).toHaveBeenCalledWith(
        'zardonic-analytics',
        analyticsData,
        { ex: 30 * 24 * 60 * 60 }
      )
      expect(res.status).toHaveBeenCalledWith(200)
      expect(res.json).toHaveBeenCalledWith({ success: true })
    })

    it('should limit heatmap size to 500 points', async () => {
      mockKvGet.mockResolvedValueOnce('valid-hash')
      
      const heatmap = Array.from({ length: 600 }, (_, i) => ({
        x: i,
        y: i,
        el: 'button',
        ts: Date.now(),
      }))

      const analyticsData = {
        pageViews: 1,
        sectionViews: {},
        clicks: {},
        visitors: [],
        redirects: {},
        devices: {},
        referrers: {},
        browsers: {},
        screenResolutions: {},
        heatmap,
        countries: {},
        languages: {},
      }

      const res = mockRes()
      await handler({
        method: 'POST',
        body: { data: analyticsData },
        headers: { 'x-admin-token': 'valid-hash' },
      } as any, res as any)

      // Verify heatmap was limited to last 500
      const savedData = mockKvSet.mock.calls[0][1]
      expect(savedData.heatmap).toHaveLength(500)
    })

    it('should return 400 if data is missing', async () => {
      mockKvGet.mockResolvedValueOnce('valid-hash')
      
      const res = mockRes()
      await handler({
        method: 'POST',
        body: {},
        headers: { 'x-admin-token': 'valid-hash' },
      } as any, res as any)

      expect(res.status).toHaveBeenCalledWith(400)
    })
  })

  describe('DELETE /api/analytics', () => {
    it('should require admin token', async () => {
      const res = mockRes()
      await handler({
        method: 'DELETE',
        headers: {},
      } as any, res as any)

      expect(res.status).toHaveBeenCalledWith(401)
    })

    it('should delete analytics data with valid admin token', async () => {
      mockKvGet.mockResolvedValueOnce('valid-hash')
      
      const res = mockRes()
      await handler({
        method: 'DELETE',
        headers: { 'x-admin-token': 'valid-hash' },
      } as any, res as any)

      expect(mockKvDel).toHaveBeenCalledWith('zardonic-analytics')
      expect(res.status).toHaveBeenCalledWith(200)
      expect(res.json).toHaveBeenCalledWith({ success: true })
    })
  })

  it('should return 405 for unsupported methods', async () => {
    const res = mockRes()
    await handler({
      method: 'PUT',
      headers: {},
    } as any, res as any)

    expect(res.status).toHaveBeenCalledWith(405)
  })
})
