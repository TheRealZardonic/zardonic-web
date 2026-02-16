import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock @upstash/redis
const mockKvGet = vi.fn()
const mockKvSet = vi.fn()

vi.mock('@upstash/redis', () => ({
  Redis: class {
    get = mockKvGet
    set = mockKvSet
  },
}))

type Res = { status: ReturnType<typeof vi.fn>; json: ReturnType<typeof vi.fn> }

function mockRes(): Res {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  }
}

const { default: handler } = await import('../../api/sync.ts')

describe('Sync API handler', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.UPSTASH_REDIS_REST_URL = 'https://fake-redis.upstash.io'
    process.env.UPSTASH_REDIS_REST_TOKEN = 'fake-token'
  })

  describe('GET /api/sync', () => {
    it('should return empty timestamps when none exist', async () => {
      mockKvGet.mockResolvedValue(null)
      
      const res = mockRes()
      await handler({ method: 'GET', query: {} } as any, res as any)

      expect(res.status).toHaveBeenCalledWith(200)
      expect(res.json).toHaveBeenCalledWith({
        lastReleasesSync: 0,
        lastGigsSync: 0,
      })
    })

    it('should return stored timestamps', async () => {
      const mockTimestamps = {
        lastReleasesSync: 1708123456789,
        lastGigsSync: 1708123456790,
      }
      mockKvGet.mockResolvedValue(mockTimestamps)
      
      const res = mockRes()
      await handler({ method: 'GET', query: {} } as any, res as any)

      expect(res.status).toHaveBeenCalledWith(200)
      expect(res.json).toHaveBeenCalledWith(mockTimestamps)
    })

    it('should return 503 when Redis not configured', async () => {
      delete process.env.UPSTASH_REDIS_REST_URL
      
      const res = mockRes()
      await handler({ method: 'GET', query: {} } as any, res as any)

      expect(res.status).toHaveBeenCalledWith(503)
    })
  })

  describe('POST /api/sync', () => {
    it('should update lastReleasesSync timestamp', async () => {
      const existingTimestamps = {
        lastReleasesSync: 1000,
        lastGigsSync: 2000,
      }
      mockKvGet.mockResolvedValue(existingTimestamps)
      
      const newTimestamp = 1708123456789
      const res = mockRes()
      await handler({
        method: 'POST',
        body: { lastReleasesSync: newTimestamp },
      } as any, res as any)

      expect(mockKvSet).toHaveBeenCalledWith(
        'sync-timestamps',
        {
          lastReleasesSync: newTimestamp,
          lastGigsSync: 2000, // unchanged
        },
        { ex: 90 * 24 * 60 * 60 }
      )
      expect(res.status).toHaveBeenCalledWith(200)
    })

    it('should update lastGigsSync timestamp', async () => {
      const existingTimestamps = {
        lastReleasesSync: 1000,
        lastGigsSync: 2000,
      }
      mockKvGet.mockResolvedValue(existingTimestamps)
      
      const newTimestamp = 1708123456790
      const res = mockRes()
      await handler({
        method: 'POST',
        body: { lastGigsSync: newTimestamp },
      } as any, res as any)

      expect(mockKvSet).toHaveBeenCalledWith(
        'sync-timestamps',
        {
          lastReleasesSync: 1000, // unchanged
          lastGigsSync: newTimestamp,
        },
        { ex: 90 * 24 * 60 * 60 }
      )
      expect(res.status).toHaveBeenCalledWith(200)
    })

    it('should update both timestamps', async () => {
      mockKvGet.mockResolvedValue(null) // No existing data
      
      const timestamps = {
        lastReleasesSync: 1708123456789,
        lastGigsSync: 1708123456790,
      }
      
      const res = mockRes()
      await handler({
        method: 'POST',
        body: timestamps,
      } as any, res as any)

      expect(mockKvSet).toHaveBeenCalledWith(
        'sync-timestamps',
        timestamps,
        { ex: 90 * 24 * 60 * 60 }
      )
      expect(res.status).toHaveBeenCalledWith(200)
    })

    it('should preserve existing timestamps when partial update', async () => {
      mockKvGet.mockResolvedValue({
        lastReleasesSync: 5000,
        lastGigsSync: 6000,
      })
      
      const res = mockRes()
      await handler({
        method: 'POST',
        body: {}, // Empty body
      } as any, res as any)

      expect(mockKvSet).toHaveBeenCalledWith(
        'sync-timestamps',
        {
          lastReleasesSync: 5000,
          lastGigsSync: 6000,
        },
        { ex: 90 * 24 * 60 * 60 }
      )
    })
  })

  it('should return 405 for unsupported methods', async () => {
    const res = mockRes()
    await handler({
      method: 'DELETE',
    } as any, res as any)

    expect(res.status).toHaveBeenCalledWith(405)
  })
})
