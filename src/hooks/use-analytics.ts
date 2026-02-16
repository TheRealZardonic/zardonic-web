import { useEffect } from 'react'

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

export function getAnalyticsData(): AnalyticsData {
  try {
    const stored = localStorage.getItem('zardonic-analytics')
    if (stored) {
      const parsed = JSON.parse(stored)
      return {
        pageViews: parsed.pageViews || 0,
        sectionViews: parsed.sectionViews || {},
        clicks: parsed.clicks || {},
        visitors: parsed.visitors || [],
        redirects: parsed.redirects || {},
        devices: parsed.devices || {},
        referrers: parsed.referrers || {},
        browsers: parsed.browsers || {},
        screenResolutions: parsed.screenResolutions || {},
        heatmap: parsed.heatmap || [],
        countries: parsed.countries || {},
        languages: parsed.languages || {},
        firstTracked: parsed.firstTracked,
        lastTracked: parsed.lastTracked,
      }
    }
  } catch {
    // ignore parse errors
  }
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

function saveAnalyticsData(analytics: AnalyticsData) {
  try {
    // Limit heatmap to last 500 points to avoid localStorage bloat
    if (analytics.heatmap.length > 500) {
      analytics.heatmap = analytics.heatmap.slice(-500)
    }
    analytics.lastTracked = new Date().toISOString().split('T')[0]
    if (!analytics.firstTracked) {
      analytics.firstTracked = analytics.lastTracked
    }
    localStorage.setItem('zardonic-analytics', JSON.stringify(analytics))
  } catch {
    // ignore storage errors
  }
}

async function trackSectionView(section: string) {
  try {
    const analytics = getAnalyticsData()
    analytics.sectionViews[section] = (analytics.sectionViews[section] || 0) + 1
    saveAnalyticsData(analytics)
  } catch (e) {
    console.error('Analytics error:', e)
  }
}

export async function trackClick(element: string) {
  try {
    const analytics = getAnalyticsData()
    analytics.clicks[element] = (analytics.clicks[element] || 0) + 1
    saveAnalyticsData(analytics)
  } catch (e) {
    console.error('Analytics error:', e)
  }
}

export async function trackRedirect(url: string) {
  try {
    const analytics = getAnalyticsData()
    // Store just the domain or a short label
    let label: string
    try {
      label = new URL(url).hostname
    } catch {
      label = url.slice(0, 50)
    }
    analytics.redirects[label] = (analytics.redirects[label] || 0) + 1
    saveAnalyticsData(analytics)
  } catch (e) {
    console.error('Analytics error:', e)
  }
}

export async function trackHeatmapClick(x: number, y: number, el: string) {
  try {
    const analytics = getAnalyticsData()
    analytics.heatmap.push({
      x: Math.round(x * 1000) / 1000,
      y: Math.round(y * 1000) / 1000,
      el,
      ts: Date.now(),
    })
    saveAnalyticsData(analytics)
  } catch (e) {
    console.error('Analytics error:', e)
  }
}

export function trackPageView() {
  try {
    const analytics = getAnalyticsData()
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
        // ignore invalid referrer
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
      // ignore timezone errors
    }

    // Track language
    const lang = navigator.language?.split('-')[0] || 'unknown'
    analytics.languages[lang] = (analytics.languages[lang] || 0) + 1

    saveAnalyticsData(analytics)
  } catch (e) {
    console.error('Analytics error:', e)
  }
}

export function resetAnalytics() {
  try {
    localStorage.removeItem('zardonic-analytics')
  } catch {
    // ignore storage errors
  }
}

