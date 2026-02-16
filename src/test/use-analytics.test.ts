import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useAnalytics, trackClick, trackRedirect, trackHeatmapClick, trackPageView, getAnalyticsData, resetAnalytics } from '@/hooks/use-analytics'
import { renderHook } from '@testing-library/react'

describe('use-analytics', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  describe('getAnalyticsData', () => {
    it('should return empty analytics data when localStorage is empty', () => {
      const data = getAnalyticsData()
      
      expect(data).toEqual({
        pageViews: 0,
        sectionViews: {},
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
      })
    })

    it('should return stored analytics data from localStorage', () => {
      const mockData = {
        pageViews: 100,
        sectionViews: { bio: 50 },
        clicks: { button1: 10 },
        visitors: ['user1'],
        redirects: {},
        devices: {},
        referrers: {},
        browsers: {},
        screenResolutions: {},
        heatmap: [],
        countries: {},
        languages: {},
        firstTracked: '2024-01-01',
        lastTracked: '2024-01-15',
      }
      
      localStorage.setItem('zardonic-analytics', JSON.stringify(mockData))
      
      const data = getAnalyticsData()
      expect(data).toEqual(mockData)
    })

    it('should handle corrupted localStorage data gracefully', () => {
      localStorage.setItem('zardonic-analytics', 'invalid-json')
      
      const data = getAnalyticsData()
      
      expect(data).toEqual({
        pageViews: 0,
        sectionViews: {},
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
      })
    })

    it('should provide default values for missing fields', () => {
      const partialData = {
        pageViews: 50,
        sectionViews: { music: 25 },
      }
      
      localStorage.setItem('zardonic-analytics', JSON.stringify(partialData))
      
      const data = getAnalyticsData()
      
      expect(data.pageViews).toBe(50)
      expect(data.sectionViews).toEqual({ music: 25 })
      expect(data.clicks).toEqual({})
      expect(data.heatmap).toEqual([])
    })
  })

  describe('trackPageView', () => {
    it('should increment page views', () => {
      trackPageView()
      
      const data = getAnalyticsData()
      expect(data.pageViews).toBe(1)
    })

    it('should track device type', () => {
      trackPageView()
      
      const data = getAnalyticsData()
      expect(data.devices).toHaveProperty('desktop')
      expect(data.devices.desktop).toBeGreaterThan(0)
    })

    it('should track browser', () => {
      trackPageView()
      
      const data = getAnalyticsData()
      expect(Object.keys(data.browsers).length).toBeGreaterThan(0)
    })

    it('should track screen resolution', () => {
      trackPageView()
      
      const data = getAnalyticsData()
      expect(Object.keys(data.screenResolutions).length).toBeGreaterThan(0)
    })

    it('should track referrer as direct when no referrer', () => {
      trackPageView()
      
      const data = getAnalyticsData()
      expect(data.referrers.direct).toBe(1)
    })

    it('should set firstTracked and lastTracked timestamps', () => {
      trackPageView()
      
      const data = getAnalyticsData()
      expect(data.firstTracked).toBeDefined()
      expect(data.lastTracked).toBeDefined()
    })
  })

  describe('trackClick', () => {
    it('should track click events', async () => {
      await trackClick('test-button')
      
      const data = getAnalyticsData()
      expect(data.clicks['test-button']).toBe(1)
    })

    it('should increment existing click counts', async () => {
      await trackClick('button1')
      await trackClick('button1')
      await trackClick('button1')
      
      const data = getAnalyticsData()
      expect(data.clicks['button1']).toBe(3)
    })

    it('should handle errors gracefully', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {})
      vi.spyOn(Storage.prototype, 'setItem').mockImplementationOnce(() => {
        throw new Error('Storage quota exceeded')
      })
      
      await expect(trackClick('button')).resolves.not.toThrow()
      
      vi.restoreAllMocks()
    })
  })

  describe('trackRedirect', () => {
    it('should track redirects by hostname', async () => {
      await trackRedirect('https://example.com/page')
      
      const data = getAnalyticsData()
      expect(data.redirects['example.com']).toBe(1)
    })

    it('should handle invalid URLs', async () => {
      await trackRedirect('not-a-url')
      
      const data = getAnalyticsData()
      expect(data.redirects['not-a-url']).toBe(1)
    })

    it('should truncate long URLs', async () => {
      const longUrl = 'a'.repeat(100)
      await trackRedirect(longUrl)
      
      const data = getAnalyticsData()
      const keys = Object.keys(data.redirects)
      expect(keys[0].length).toBeLessThanOrEqual(50)
    })
  })

  describe('trackHeatmapClick', () => {
    it('should track click coordinates and element', async () => {
      await trackHeatmapClick(0.5, 0.75, 'button')
      
      const data = getAnalyticsData()
      expect(data.heatmap).toHaveLength(1)
      expect(data.heatmap[0]).toEqual({
        x: 0.5,
        y: 0.75,
        el: 'button',
        ts: expect.any(Number),
      })
    })

    it('should round coordinates to 3 decimal places', async () => {
      await trackHeatmapClick(0.123456, 0.987654, 'link')
      
      const data = getAnalyticsData()
      expect(data.heatmap[0].x).toBe(0.123)
      expect(data.heatmap[0].y).toBe(0.988)
    })

    it('should limit heatmap to 500 points', async () => {
      // Add 600 points
      for (let i = 0; i < 600; i++) {
        await trackHeatmapClick(0.5, 0.5, 'button')
      }
      
      const data = getAnalyticsData()
      expect(data.heatmap.length).toBe(500)
    })
  })

  describe('resetAnalytics', () => {
    it('should clear analytics data from localStorage', () => {
      trackPageView()
      
      let data = getAnalyticsData()
      expect(data.pageViews).toBeGreaterThan(0)
      
      resetAnalytics()
      
      data = getAnalyticsData()
      expect(data.pageViews).toBe(0)
    })

    it('should handle errors gracefully', () => {
      vi.spyOn(console, 'error').mockImplementation(() => {})
      vi.spyOn(Storage.prototype, 'removeItem').mockImplementationOnce(() => {
        throw new Error('Storage error')
      })
      
      expect(() => resetAnalytics()).not.toThrow()
      
      vi.restoreAllMocks()
    })
  })

  describe('useAnalytics hook', () => {
    it('should track section view when element intersects', () => {
      // Mock IntersectionObserver
      const mockObserve = vi.fn()
      const mockUnobserve = vi.fn()
      const mockDisconnect = vi.fn()
      
      global.IntersectionObserver = vi.fn().mockImplementation((callback) => {
        // Simulate intersection
        setTimeout(() => {
          callback([{ isIntersecting: true }], {})
        }, 0)
        
        return {
          observe: mockObserve,
          unobserve: mockUnobserve,
          disconnect: mockDisconnect,
        }
      }) as any
      
      // Create a test element
      const element = document.createElement('section')
      element.id = 'test-section'
      document.body.appendChild(element)
      
      const { unmount } = renderHook(() => useAnalytics('test-section'))
      
      expect(mockObserve).toHaveBeenCalled()
      
      unmount()
      expect(mockUnobserve).toHaveBeenCalled()
      
      document.body.removeChild(element)
    })

    it('should handle missing element gracefully', () => {
      global.IntersectionObserver = vi.fn().mockImplementation(() => ({
        observe: vi.fn(),
        unobserve: vi.fn(),
        disconnect: vi.fn(),
      })) as any
      
      const { unmount } = renderHook(() => useAnalytics('non-existent'))
      
      expect(() => unmount()).not.toThrow()
    })
  })
})
