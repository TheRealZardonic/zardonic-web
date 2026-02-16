import { useEffect } from 'react'

/**
 * Analytics Hook - MIGRATED TO VERCEL KV ONLY
 * NO localStorage - all data stored in Vercel KV
 */

const TZ_COUNTRY_MAP: Record<string, string> = {
  'Europe/Berlin': 'DE', 'Europe/Vienna': 'AT', 'Europe/Zurich': 'CH',
  'Europe/London': 'GB', 'Europe/Paris': 'FR', 'Europe/Madrid': 'ES',
  'Europe/Rome': 'IT', 'Europe/Amsterdam': 'NL', 'Europe/Brussels': 'BE',
  'Europe/Stockholm': 'SE', 'Europe/Oslo': 'NO', 'Europe/Copenhagen': 'DK',
  'Europe/Helsinki': 'FI', 'Europe/Warsaw': 'PL', 'Europe/Prague': 'CZ',
  'Europe/Budapest': 'HU', 'Europe/Bucharest': 'RO', 'Europe/Sofia': 'BG',
  'Europe/Athens': 'GR', 'Europe/Lisbon': 'PT', 'Europe/Dublin': 'IE',
  'America/New_York': 'US', 'America/Chicago': 'US', 'America/Denver': 'US',
  'America/Los_Angeles': 'US', 'America/Toronto': 'CA', 'America/Vancouver': 'CA',
  'America/Mexico_City': 'MX', 'America/Sao_Paulo': 'BR', 'America/Buenos_Aires': 'AR',
  'America/Bogota': 'CO', 'America/Caracas': 'VE', 'America/Lima': 'PE',
  'America/Santiago': 'CL', 'Asia/Tokyo': 'JP', 'Asia/Shanghai': 'CN',
  'Asia/Seoul': 'KR', 'Asia/Kolkata': 'IN', 'Asia/Bangkok': 'TH',
  'Asia/Singapore': 'SG', 'Asia/Dubai': 'AE', 'Asia/Istanbul': 'TR',
  'Australia/Sydney': 'AU', 'Australia/Melbourne': 'AU', 'Pacific/Auckland': 'NZ',
  'Africa/Johannesburg': 'ZA', 'Africa/Cairo': 'EG', 'Africa/Lagos': 'NG',
  'Asia/Jakarta': 'ID', 'Asia/Manila': 'PH', 'Asia/Taipei': 'TW',
  'Europe/Moscow': 'RU', 'Asia/Riyadh': 'SA', 'Asia/Karachi': 'PK',
}

export interface HeatmapPoint {
  x: number
  y: number
  el: string
  ts: number
}

export interface AnalyticsData {
  pageViews: number
  sectionViews: Record<string, number>
  clicks: Record<string, number>
  visitors: string[]
  redirects: Record<string, number>
  devices: Record<string, number>
  referrers: Record<string, number>
  browsers: Record<string, number>
  screenResolutions: Record<string, number>
  heatmap: HeatmapPoint[]
  countries: Record<string, number>
  languages: Record<string, number>
  firstTracked?: string
  lastTracked?: string
}

// In-memory cache for client-side performance
let analyticsCache: AnalyticsData | null = null
let cacheTimestamp = 0
const CACHE_TTL = 60000 // 1 minute cache

/**
 * Get analytics data from Vercel KV API
 */
export async function getAnalyticsData(): Promise<AnalyticsData> {
  // Use cache if fresh
  if (analyticsCache && Date.now() - cacheTimestamp < CACHE_TTL) {
    return analyticsCache
  }

  try {
    const response = await fetch('/api/analytics')
    
    if (!response.ok) {
      console.warn('[Analytics] API unavailable, using empty data')
      return getEmptyAnalytics()
    }

    const result = await response.json()
    const data = result.value || getEmptyAnalytics()
    
    // Update cache
    analyticsCache = data
    cacheTimestamp = Date.now()
    
    return data
  } catch (error) {
    console.error('[Analytics] Failed to fetch:', error)
    return analyticsCache || getEmptyAnalytics()
  }
}

function getEmptyAnalytics(): AnalyticsData {
  return {
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
  }
}

/**
 * Save analytics data to Vercel KV API
 * Requires admin token for write access
 */
async function saveAnalyticsData(analytics: AnalyticsData): Promise<void> {
  try {
    // Update timestamps
    analytics.lastTracked = new Date().toISOString().split('T')[0]
    if (!analytics.firstTracked) {
      analytics.firstTracked = analytics.lastTracked
    }

    // Limit heatmap to last 500 points
    if (analytics.heatmap.length > 500) {
      analytics.heatmap = analytics.heatmap.slice(-500)
    }

    // Get admin token from session storage (temporary, cleared on tab close)
    const adminToken = sessionStorage.getItem('admin-session-token') || ''

    const response = await fetch('/api/analytics', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-token': adminToken,
      },
      body: JSON.stringify({ data: analytics }),
    })

    if (!response.ok) {
      console.warn('[Analytics] Failed to save:', response.status)
    } else {
      // Update cache
      analyticsCache = analytics
      cacheTimestamp = Date.now()
    }
  } catch (error) {
    console.error('[Analytics] Save error:', error)
  }
}

/**
 * Track section view
 */
async function trackSectionView(section: string): Promise<void> {
  try {
    const analytics = await getAnalyticsData()
    analytics.sectionViews[section] = (analytics.sectionViews[section] || 0) + 1
    await saveAnalyticsData(analytics)
  } catch (e) {
    console.error('[Analytics] trackSectionView error:', e)
  }
}

/**
 * Hook to track section views with IntersectionObserver
 */
export function useAnalytics(sectionId: string) {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            trackSectionView(sectionId)
          }
        })
      },
      { threshold: 0.5 }
    )

    const element = document.getElementById(sectionId)
    if (element) {
      observer.observe(element)
    }

    return () => {
      if (element) {
        observer.unobserve(element)
      }
    }
  }, [sectionId])
}

/**
 * Track click events
 */
export async function trackClick(element: string): Promise<void> {
  try {
    const analytics = await getAnalyticsData()
    analytics.clicks[element] = (analytics.clicks[element] || 0) + 1
    await saveAnalyticsData(analytics)
  } catch (e) {
    console.error('[Analytics] trackClick error:', e)
  }
}

/**
 * Track redirect/outbound link
 */
export async function trackRedirect(url: string): Promise<void> {
  try {
    const analytics = await getAnalyticsData()
    let label: string
    try {
      label = new URL(url).hostname
    } catch {
      label = url.slice(0, 50)
    }
    analytics.redirects[label] = (analytics.redirects[label] || 0) + 1
    await saveAnalyticsData(analytics)
  } catch (e) {
    console.error('[Analytics] trackRedirect error:', e)
  }
}

/**
 * Track heatmap click
 */
export async function trackHeatmapClick(x: number, y: number, el: string): Promise<void> {
  try {
    const analytics = await getAnalyticsData()
    analytics.heatmap.push({
      x: Math.round(x * 1000) / 1000,
      y: Math.round(y * 1000) / 1000,
      el,
      ts: Date.now(),
    })
    await saveAnalyticsData(analytics)
  } catch (e) {
    console.error('[Analytics] trackHeatmapClick error:', e)
  }
}

/**
 * Track page view with device/browser/geo data
 */
export async function trackPageView(): Promise<void> {
  try {
    const analytics = await getAnalyticsData()
    analytics.pageViews += 1

    // Track device type
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
    const deviceType = isMobile ? 'mobile' : 'desktop'
    analytics.devices[deviceType] = (analytics.devices[deviceType] || 0) + 1

    // Track referrer
    if (document.referrer) {
      try {
        const referrerHost = new URL(document.referrer).hostname
        if (referrerHost !== window.location.hostname) {
          analytics.referrers[referrerHost] = (analytics.referrers[referrerHost] || 0) + 1
        }
      } catch {
        // Invalid referrer
      }
    } else {
      analytics.referrers['direct'] = (analytics.referrers['direct'] || 0) + 1
    }

    // Track browser
    const ua = navigator.userAgent
    let browser = 'Other'
    if (ua.includes('Firefox')) browser = 'Firefox'
    else if (ua.includes('Edg/')) browser = 'Edge'
    else if (ua.includes('Chrome')) browser = 'Chrome'
    else if (ua.includes('Safari')) browser = 'Safari'
    analytics.browsers[browser] = (analytics.browsers[browser] || 0) + 1

    // Track screen resolution
    const res = `${window.screen.width}x${window.screen.height}`
    analytics.screenResolutions[res] = (analytics.screenResolutions[res] || 0) + 1

    // Track country via timezone
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ''
      const country = TZ_COUNTRY_MAP[tz] || 'Other'
      analytics.countries[country] = (analytics.countries[country] || 0) + 1
    } catch {
      // Ignore timezone errors
    }

    // Track language
    const lang = navigator.language?.split('-')[0] || 'unknown'
    analytics.languages[lang] = (analytics.languages[lang] || 0) + 1

    await saveAnalyticsData(analytics)
  } catch (e) {
    console.error('[Analytics] trackPageView error:', e)
  }
}

/**
 * Reset analytics data (requires admin token)
 */
export async function resetAnalytics(): Promise<void> {
  try {
    const adminToken = sessionStorage.getItem('admin-session-token') || ''
    
    const response = await fetch('/api/analytics', {
      method: 'DELETE',
      headers: {
        'x-admin-token': adminToken,
      },
    })

    if (response.ok) {
      // Clear cache
      analyticsCache = null
      cacheTimestamp = 0
    } else {
      console.warn('[Analytics] Reset failed:', response.status)
    }
  } catch (error) {
    console.error('[Analytics] Reset error:', error)
  }
}


