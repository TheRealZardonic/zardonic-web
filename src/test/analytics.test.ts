import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  loadAnalytics,
  trackPageView,
  trackSectionView,
  trackInteraction,
  trackClick,
  resetAnalytics,
  describeClickTarget,
} from '@/lib/analytics'

// Mock sendBeacon and fetch to prevent actual server calls in tests
beforeEach(() => {
  // jsdom doesn't define sendBeacon, so define it as a mock
  Object.defineProperty(navigator, 'sendBeacon', {
    value: vi.fn().mockReturnValue(true),
    writable: true,
    configurable: true,
  })
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}'))
})

describe('analytics', () => {
  beforeEach(async () => {
    await resetAnalytics()
    localStorage.clear()
    sessionStorage.clear()
  })

  it('returns empty analytics when no data exists', () => {
    const analytics = loadAnalytics()
    expect(analytics.totalPageViews).toBe(0)
    expect(analytics.totalSessions).toBe(0)
    expect(analytics.sectionViews).toEqual({})
    expect(analytics.interactions).toEqual({})
    expect(analytics.dailyStats).toEqual([])
    expect(analytics.browsers).toEqual({})
    expect(analytics.screenResolutions).toEqual({})
    expect(analytics.landingPages).toEqual({})
  })

  it('tracks page views', () => {
    trackPageView()
    const analytics = loadAnalytics()
    expect(analytics.totalPageViews).toBe(1)
    expect(analytics.totalSessions).toBe(1)
    expect(analytics.dailyStats.length).toBe(1)
    expect(analytics.dailyStats[0].pageViews).toBe(1)
    expect(analytics.firstTracked).toBeDefined()
    expect(analytics.lastTracked).toBeDefined()
  })

  it('increments page views on multiple calls', () => {
    trackPageView()
    trackPageView()
    trackPageView()
    const analytics = loadAnalytics()
    expect(analytics.totalPageViews).toBe(3)
    // Sessions should be 1 since they deduplicate per day via sessionStorage
    expect(analytics.totalSessions).toBe(1)
  })

  it('tracks section views', () => {
    trackSectionView('biography')
    trackSectionView('releases')
    trackSectionView('biography')
    const analytics = loadAnalytics()
    expect(analytics.sectionViews['biography']).toBe(2)
    expect(analytics.sectionViews['releases']).toBe(1)
  })

  it('tracks interactions', () => {
    trackInteraction('member_profile')
    trackInteraction('release_click')
    trackInteraction('member_profile')
    const analytics = loadAnalytics()
    expect(analytics.interactions['member_profile']).toBe(2)
    expect(analytics.interactions['release_click']).toBe(1)
  })

  it('tracks daily stats for section views and interactions', () => {
    trackSectionView('gigs')
    trackInteraction('ticket_click')
    const analytics = loadAnalytics()
    const today = analytics.dailyStats[analytics.dailyStats.length - 1]
    expect(today.sectionViews).toBeGreaterThanOrEqual(1)
    expect(today.interactions).toBeGreaterThanOrEqual(1)
  })

  it('tracks device type on page view', () => {
    trackPageView()
    const analytics = loadAnalytics()
    // jsdom user agent is typically desktop-like
    expect(Object.keys(analytics.devices).length).toBeGreaterThan(0)
  })

  it('tracks referrer on page view', () => {
    trackPageView()
    const analytics = loadAnalytics()
    expect(analytics.referrers['direct']).toBeDefined()
  })

  it('resets analytics to zero state', async () => {
    // Accumulate some data
    trackPageView()
    trackSectionView('test-section')
    trackInteraction('test-action')
    
    // Verify data exists before reset
    const before = loadAnalytics()
    expect(before.totalPageViews).toBeGreaterThan(0)
    
    // Reset should clear the storage key entirely
    await resetAnalytics()
    
    // After reset, loadAnalytics should return zero state
    let after = loadAnalytics()
    expect(after.totalPageViews).toBe(0)
    expect(after.totalSessions).toBe(0)
    expect(Object.keys(after.sectionViews).length).toBe(0)
    expect(Object.keys(after.interactions).length).toBe(0)
    
    // Verify we can start tracking fresh
    trackPageView()
    after = loadAnalytics()
    expect(after.totalPageViews).toBe(1)
  })

  it('handles corrupted localStorage gracefully', () => {
    localStorage.setItem('nk-site-analytics', 'invalid json')
    const analytics = loadAnalytics()
    expect(analytics.totalPageViews).toBe(0)
  })

  it('tracks browser type on page view', () => {
    trackPageView()
    const analytics = loadAnalytics()
    expect(analytics.browsers).toBeDefined()
    expect(Object.keys(analytics.browsers!).length).toBeGreaterThan(0)
  })

  it('tracks screen resolution on page view', () => {
    trackPageView()
    const analytics = loadAnalytics()
    expect(analytics.screenResolutions).toBeDefined()
    expect(Object.keys(analytics.screenResolutions!).length).toBeGreaterThan(0)
  })

  it('tracks landing page on page view', () => {
    trackPageView()
    const analytics = loadAnalytics()
    expect(analytics.landingPages).toBeDefined()
    expect(Object.keys(analytics.landingPages!).length).toBeGreaterThan(0)
  })

  it('sends data to server via sendBeacon on page view', () => {
    trackPageView()
    expect(navigator.sendBeacon).toHaveBeenCalledWith(
      '/api/analytics',
      expect.any(Blob)
    )
  })

  it('sends data to server on section view', () => {
    trackSectionView('hero')
    expect(navigator.sendBeacon).toHaveBeenCalled()
  })

  it('sends data to server on interaction', () => {
    trackInteraction('release_click')
    expect(navigator.sendBeacon).toHaveBeenCalled()
  })

  it('tracks click events with heatmap data', () => {
    const mockEvent = new MouseEvent('click', {
      clientX: 100,
      clientY: 200,
    })
    Object.defineProperty(mockEvent, 'target', {
      value: document.createElement('button'),
    })
    trackClick(mockEvent)
    expect(navigator.sendBeacon).toHaveBeenCalled()
    const analytics = loadAnalytics()
    const today = analytics.dailyStats[analytics.dailyStats.length - 1]
    expect(today.clicks).toBeGreaterThanOrEqual(1)
  })
})

describe('describeClickTarget', () => {
  it('returns "unknown" for null', () => {
    expect(describeClickTarget(null)).toBe('unknown')
  })

  it('returns data-track attribute when present', () => {
    const btn = document.createElement('button')
    btn.setAttribute('data-track', 'nav::NEWS')
    expect(describeClickTarget(btn)).toBe('nav::NEWS')
  })

  it('returns aria-label when present', () => {
    const btn = document.createElement('button')
    btn.setAttribute('aria-label', 'Play music')
    expect(describeClickTarget(btn)).toBe('Play music')
  })

  it('returns title attribute when present', () => {
    const btn = document.createElement('button')
    btn.setAttribute('title', 'Next track')
    expect(describeClickTarget(btn)).toBe('Next track')
  })

  it('returns button text content', () => {
    const btn = document.createElement('button')
    btn.textContent = 'OPEN MEDIA ARCHIVE'
    expect(describeClickTarget(btn)).toBe('OPEN MEDIA ARCHIVE')
  })

  it('returns parent button text when child span is clicked', () => {
    const btn = document.createElement('button')
    const span = document.createElement('span')
    span.textContent = 'DOWNLOAD'
    btn.appendChild(span)
    expect(describeClickTarget(span)).toBe('DOWNLOAD')
  })

  it('truncates long text content', () => {
    const btn = document.createElement('button')
    btn.textContent = 'A'.repeat(100)
    const result = describeClickTarget(btn)
    expect(result.length).toBeLessThanOrEqual(60)
    expect(result).toContain('...')
  })

  it('uses section id as context for non-interactive elements', () => {
    const section = document.createElement('section')
    section.id = 'releases'
    const div = document.createElement('div')
    section.appendChild(div)
    document.body.appendChild(section)
    try {
      expect(describeClickTarget(div)).toBe('releases::div')
    } finally {
      document.body.removeChild(section)
    }
  })

  it('falls back to tag name for generic elements', () => {
    const div = document.createElement('div')
    expect(describeClickTarget(div)).toBe('div')
  })

  it('prefers data-track on ancestor button over text', () => {
    const btn = document.createElement('button')
    btn.setAttribute('data-track', 'nav::HOME')
    btn.textContent = 'HOME'
    const icon = document.createElement('span')
    btn.appendChild(icon)
    expect(describeClickTarget(icon)).toBe('nav::HOME')
  })
})
