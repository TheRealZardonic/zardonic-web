/** Persistent analytics tracking with server-side storage via Vercel KV.
 *  Tracks page visits, section views, interactions, clicks, heatmap data,
 *  and marketing-relevant metadata (UTM, device, browser, screen resolution).
 *  Data is synced to the server for persistence across deployments and
 *  also stored client-side in localStorage as a fallback.
 */

const STORAGE_KEY = 'nk-site-analytics'
const SESSION_ID_KEY = 'nk-session-id'

export interface AnalyticsEvent {
  type: 'page_view' | 'section_view' | 'interaction' | 'click'
  target: string
  timestamp: number
}

export interface DailyStats {
  date: string
  pageViews: number
  sectionViews: number
  interactions: number
  clicks?: number
}

export interface SiteAnalytics {
  /** Total page views since tracking began */
  totalPageViews: number
  /** Total unique sessions (approximated by day) */
  totalSessions: number
  /** Section view counts */
  sectionViews: Record<string, number>
  /** Interaction counts (clicks on releases, gigs, profiles, etc.) */
  interactions: Record<string, number>
  /** Daily stats for the last 30 days */
  dailyStats: DailyStats[]
  /** Referrer counts */
  referrers: Record<string, number>
  /** Device type counts */
  devices: Record<string, number>
  /** Browser counts */
  browsers?: Record<string, number>
  /** Screen resolution counts */
  screenResolutions?: Record<string, number>
  /** Landing page counts */
  landingPages?: Record<string, number>
  /** UTM source counts */
  utmSources?: Record<string, number>
  /** UTM medium counts */
  utmMediums?: Record<string, number>
  /** UTM campaign counts */
  utmCampaigns?: Record<string, number>
  /** Hourly visit counts (key: hour "0"-"23", value: count) */
  hourlyVisits?: Record<string, number>
  /** First tracked date */
  firstTracked?: string
  /** Last tracked date */
  lastTracked?: string
}

export interface HeatmapPoint {
  /** X position as ratio (0-1) of viewport width */
  x: number
  /** Y position as ratio (0-1) of document height */
  y: number
  /** Page path */
  page: string
  /** Element tag that was clicked */
  el: string
  /** Timestamp */
  ts: number
}

function emptyAnalytics(): SiteAnalytics {
  return {
    totalPageViews: 0,
    totalSessions: 0,
    sectionViews: {},
    interactions: {},
    dailyStats: [],
    referrers: {},
    devices: {},
    browsers: {},
    screenResolutions: {},
    landingPages: {},
    utmSources: {},
    utmMediums: {},
    utmCampaigns: {},
    hourlyVisits: {},
  }
}

function getToday(): string {
  return new Date().toISOString().split('T')[0]
}

function getDeviceType(): string {
  const ua = navigator.userAgent
  if (/Mobi|Android/i.test(ua)) return 'mobile'
  if (/Tablet|iPad/i.test(ua)) return 'tablet'
  return 'desktop'
}

function getBrowser(): string {
  const ua = navigator.userAgent
  if (/Firefox\//i.test(ua)) return 'Firefox'
  if (/Edg\//i.test(ua)) return 'Edge'
  if (/OPR\//i.test(ua) || /Opera/i.test(ua)) return 'Opera'
  if (/Chrome\//i.test(ua) && !/Edg\//i.test(ua)) return 'Chrome'
  if (/Safari\//i.test(ua) && !/Chrome\//i.test(ua)) return 'Safari'
  return 'Other'
}

function getScreenResolution(): string {
  return `${screen.width}x${screen.height}`
}

function getReferrerDomain(): string {
  try {
    const ref = document.referrer
    if (!ref) return 'direct'
    const url = new URL(ref)
    if (url.hostname === window.location.hostname) return 'direct'
    return url.hostname
  } catch {
    return 'direct'
  }
}

function getUTMParams(): { utmSource?: string; utmMedium?: string; utmCampaign?: string } {
  try {
    const params = new URLSearchParams(window.location.search)
    return {
      utmSource: params.get('utm_source') || undefined,
      utmMedium: params.get('utm_medium') || undefined,
      utmCampaign: params.get('utm_campaign') || undefined,
    }
  } catch {
    return {}
  }
}

function getOrCreateSessionId(): string {
  try {
    let id = sessionStorage.getItem(SESSION_ID_KEY)
    if (!id) {
      id = `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
      sessionStorage.setItem(SESSION_ID_KEY, id)
    }
    return id
  } catch {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
  }
}

/** Send an analytics event to the server (fire-and-forget) */
function sendToServer(payload: {
  type: string
  target?: string
  meta?: Record<string, string | undefined>
  heatmap?: { x: number; y: number; page: string; elementTag: string }
}): void {
  try {
    const body = JSON.stringify(payload)
    // Use sendBeacon for fire-and-forget reliability (survives page unload)
    if (navigator.sendBeacon) {
      const blob = new Blob([body], { type: 'application/json' })
      navigator.sendBeacon('/api/analytics', blob)
    } else {
      fetch('/api/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        keepalive: true,
      }).catch(() => { /* fire and forget */ })
    }
  } catch {
    // Silently fail — localStorage still has the data
  }
}

/** Load analytics from localStorage */
export function loadAnalytics(): SiteAnalytics {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return emptyAnalytics()
    return JSON.parse(stored) as SiteAnalytics
  } catch {
    return emptyAnalytics()
  }
}

/** Save analytics to localStorage */
function saveAnalytics(analytics: SiteAnalytics): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(analytics))
  } catch {
    // localStorage might be full or unavailable
  }
}

/** Ensure a daily stats entry exists for today */
function ensureDailyEntry(analytics: SiteAnalytics): DailyStats {
  const today = getToday()
  let entry = analytics.dailyStats.find(d => d.date === today)
  if (!entry) {
    entry = { date: today, pageViews: 0, sectionViews: 0, interactions: 0, clicks: 0 }
    analytics.dailyStats.push(entry)
    // Keep only last 30 days
    if (analytics.dailyStats.length > 30) {
      analytics.dailyStats = analytics.dailyStats.slice(-30)
    }
  }
  return entry
}

/** Track a page view (call once on page load) */
export function trackPageView(): void {
  const analytics = loadAnalytics()
  const today = getToday()

  analytics.totalPageViews++
  analytics.lastTracked = today
  if (!analytics.firstTracked) analytics.firstTracked = today

  const dailyEntry = ensureDailyEntry(analytics)
  dailyEntry.pageViews++

  // Track referrer
  const referrer = getReferrerDomain()
  analytics.referrers[referrer] = (analytics.referrers[referrer] || 0) + 1

  // Track device type
  const device = getDeviceType()
  analytics.devices[device] = (analytics.devices[device] || 0) + 1

  // Track browser
  const browser = getBrowser()
  if (!analytics.browsers) analytics.browsers = {}
  analytics.browsers[browser] = (analytics.browsers[browser] || 0) + 1

  // Track screen resolution
  const screenRes = getScreenResolution()
  if (!analytics.screenResolutions) analytics.screenResolutions = {}
  analytics.screenResolutions[screenRes] = (analytics.screenResolutions[screenRes] || 0) + 1

  // Track landing page
  const landingPage = window.location.pathname
  if (!analytics.landingPages) analytics.landingPages = {}
  analytics.landingPages[landingPage] = (analytics.landingPages[landingPage] || 0) + 1

  // Track UTM params
  const utm = getUTMParams()
  if (utm.utmSource) {
    if (!analytics.utmSources) analytics.utmSources = {}
    analytics.utmSources[utm.utmSource] = (analytics.utmSources[utm.utmSource] || 0) + 1
  }
  if (utm.utmMedium) {
    if (!analytics.utmMediums) analytics.utmMediums = {}
    analytics.utmMediums[utm.utmMedium] = (analytics.utmMediums[utm.utmMedium] || 0) + 1
  }
  if (utm.utmCampaign) {
    if (!analytics.utmCampaigns) analytics.utmCampaigns = {}
    analytics.utmCampaigns[utm.utmCampaign] = (analytics.utmCampaigns[utm.utmCampaign] || 0) + 1
  }

  // Count unique sessions (one per day)
  const sessionKey = `nk-session-${today}`
  if (!sessionStorage.getItem(sessionKey)) {
    sessionStorage.setItem(sessionKey, '1')
    analytics.totalSessions++
  }

  saveAnalytics(analytics)

  // Sync to server
  sendToServer({
    type: 'page_view',
    meta: {
      referrer,
      device,
      browser,
      screenResolution: screenRes,
      landingPage,
      sessionId: getOrCreateSessionId(),
      ...utm,
    },
  })
}

/** Track a section becoming visible */
export function trackSectionView(sectionId: string): void {
  const analytics = loadAnalytics()
  analytics.sectionViews[sectionId] = (analytics.sectionViews[sectionId] || 0) + 1
  const dailyEntry = ensureDailyEntry(analytics)
  dailyEntry.sectionViews++
  saveAnalytics(analytics)

  sendToServer({ type: 'section_view', target: sectionId })
}

/** Track a user interaction (click, profile open, etc.) */
export function trackInteraction(action: string): void {
  const analytics = loadAnalytics()
  analytics.interactions[action] = (analytics.interactions[action] || 0) + 1
  const dailyEntry = ensureDailyEntry(analytics)
  dailyEntry.interactions++
  saveAnalytics(analytics)

  sendToServer({ type: 'interaction', target: action })
}

/** Derive a human-readable label for a clicked element.
 *  Priority: data-track → aria-label → button/link text → closest section id → tag name.
 */
export function describeClickTarget(target: HTMLElement | null): string {
  if (!target) return 'unknown'

  // Walk up to find the nearest interactive element (button/link) for context
  const interactive = target.closest('button, a, [role="button"]') as HTMLElement | null
  const el = interactive || target

  // Explicit tracking label
  const track = el.getAttribute('data-track') || target.getAttribute('data-track')
  if (track) return track

  // Aria label
  const aria = el.getAttribute('aria-label') || el.getAttribute('title')
  if (aria) return aria

  // Visible text on a button or link (trimmed, capped)
  if (interactive) {
    const text = (interactive.textContent || '').replace(/\s+/g, ' ').trim()
    if (text && text.length <= 60) return text
    if (text) return text.slice(0, 57) + '...'
  }

  // Closest section id gives area context
  const section = target.closest('section[id], nav, footer, header')
  const sectionId = section?.getAttribute('id') || section?.tagName?.toLowerCase()
  if (sectionId) return `${sectionId}::${target.tagName.toLowerCase()}`

  return target.tagName?.toLowerCase() || 'unknown'
}

/** Track a click with position for heatmap */
export function trackClick(event: MouseEvent): void {
  const analytics = loadAnalytics()
  const dailyEntry = ensureDailyEntry(analytics)
  if (!dailyEntry.clicks) dailyEntry.clicks = 0
  dailyEntry.clicks++
  saveAnalytics(analytics)

  const target = event.target as HTMLElement
  const vw = window.innerWidth || 1
  const dh = document.documentElement.scrollHeight || 1
  const x = event.clientX / vw
  const y = (event.clientY + window.scrollY) / dh
  const label = describeClickTarget(target)

  sendToServer({
    type: 'click',
    target: label,
    heatmap: {
      x,
      y,
      page: window.location.pathname,
      elementTag: label,
    },
  })
}

/** Fetch persistent analytics from the server */
export async function loadServerAnalytics(): Promise<SiteAnalytics> {
  try {
    const res = await fetch('/api/analytics')
    if (!res.ok) throw new Error('Failed to fetch')
    return await res.json()
  } catch {
    // Fall back to localStorage
    return loadAnalytics()
  }
}

/** Fetch heatmap data from the server */
export async function loadHeatmapData(): Promise<HeatmapPoint[]> {
  try {
    const res = await fetch('/api/analytics?type=heatmap')
    if (!res.ok) throw new Error('Failed to fetch')
    const data = await res.json()
    return data.heatmap || []
  } catch {
    return []
  }
}

/** Reset all analytics data (server + local) */
export async function resetAnalytics(): Promise<void> {
  localStorage.removeItem(STORAGE_KEY)

  try {
    await fetch('/api/analytics', {
      method: 'DELETE',
      credentials: 'same-origin',
    })
  } catch {
    // Server reset failed, local is already cleared
  }
}

/** Track a social platform click */
export function trackSocialClick(platform: string, url: string): void {
  trackInteraction(`social_click_${platform}`)
  // url parameter is kept for future extended click tracking
  void url
}

/** Track a newsletter signup */
export function trackNewsletterSignup(): void {
  trackInteraction('newsletter_signup')
}
