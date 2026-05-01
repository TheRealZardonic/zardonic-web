/** Persistent analytics tracking with server-side storage via Upstash Redis.
 *  Tracks page visits, section views, interactions, clicks, heatmap data,
 *  and marketing-relevant metadata (UTM, device, browser, screen resolution).
 *  Data is synced to the server for persistence across deployments and
 *  also stored client-side in localStorage as a fallback.
 */
import { useEffect } from 'react'

const STORAGE_KEY = 'zd-site-analytics'
const SESSION_ID_KEY = 'zd-session-id'
/** Minimum milliseconds between server-side heatmap event POSTs (rate-limit guard). */
const HEATMAP_THROTTLE_MS = 1000

export interface HeatmapPoint {
  /** X position as ratio (0-1) of viewport width */
  x: number
  /** Y position as ratio (0-2, allows below-the-fold clicks) of document scrollHeight */
  y: number
  /** Page path */
  page: string
  /** Element tag that was clicked */
  el: string
  /** Unix timestamp (ms) — added server-side on storage */
  ts: number
}

export interface DailyStats {
  date: string
  pageViews: number
  sectionViews: number
  interactions: number
  clicks?: number
}

/** Shape returned by GET /api/analytics (Redis hash snapshot) */
export interface SiteAnalytics {
  totalPageViews: number
  totalSessions: number
  sectionViews: Record<string, number>
  interactions: Record<string, number>
  dailyStats: DailyStats[]
  referrers: Record<string, number>
  devices: Record<string, number>
  browsers?: Record<string, number>
  screenResolutions?: Record<string, number>
  landingPages?: Record<string, number>
  utmSources?: Record<string, number>
  utmMediums?: Record<string, number>
  utmCampaigns?: Record<string, number>
  hourlyVisits?: Record<string, number>
  firstTracked?: string
  lastTracked?: string
}

/** Legacy shape kept for backward compat with StatsDashboard (mapped on fetch) */
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

// ─── localStorage helpers (offline fallback) ─────────────────────────────────

function emptySiteAnalytics(): SiteAnalytics {
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

function loadLocalAnalytics(): SiteAnalytics {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return emptySiteAnalytics()
    return JSON.parse(stored) as SiteAnalytics
  } catch {
    return emptySiteAnalytics()
  }
}

function saveLocalAnalytics(analytics: SiteAnalytics): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(analytics))
  } catch { /* storage full */ }
}

function ensureDailyEntry(analytics: SiteAnalytics): DailyStats {
  const today = new Date().toISOString().split('T')[0]
  let entry = analytics.dailyStats.find(d => d.date === today)
  if (!entry) {
    entry = { date: today, pageViews: 0, sectionViews: 0, interactions: 0, clicks: 0 }
    analytics.dailyStats.push(entry)
    if (analytics.dailyStats.length > 30) {
      analytics.dailyStats = analytics.dailyStats.slice(-30)
    }
  }
  return entry
}

// ─── Device / browser / UTM helpers ──────────────────────────────────────────

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
      id = crypto.randomUUID()
      sessionStorage.setItem(SESSION_ID_KEY, id)
    }
    return id
  } catch {
    return crypto.randomUUID()
  }
}

// ─── Server communication ─────────────────────────────────────────────────────

/** Module-level rate-limit state for analytics POSTs — max 10 per 60s window. */
const ANALYTICS_RATE_LIMIT = 10
const ANALYTICS_RATE_WINDOW_MS = 60_000
let _analyticsWindowStart = 0
let _analyticsPostCount = 0

/** Deduplicate section_view events — each section is only tracked once per session. */
const _trackedSections = new Set<string>()

/** Fire-and-forget POST of an individual analytics event to the server */
function sendToServer(payload: {
  type: string
  target?: string
  meta?: Record<string, string | undefined>
  heatmap?: { x: number; y: number; page: string; elementTag: string }
}): void {
  // Client-side rate limiting: max ANALYTICS_RATE_LIMIT POSTs per window
  const now = Date.now()
  if (now - _analyticsWindowStart > ANALYTICS_RATE_WINDOW_MS) {
    _analyticsWindowStart = now
    _analyticsPostCount = 0
  }
  if (_analyticsPostCount >= ANALYTICS_RATE_LIMIT) return
  _analyticsPostCount++

  try {
    const body = JSON.stringify(payload)
    if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
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
    /* silently fail — localStorage still has the data */
  }
}

/** Fetch the full analytics snapshot from the server (admin only) */
export async function getAnalyticsData(): Promise<AnalyticsData> {
  try {
    const res = await fetch('/api/analytics', { credentials: 'same-origin' })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data: SiteAnalytics = await res.json()
    // Map new SiteAnalytics format to legacy AnalyticsData for StatsDashboard
    return {
      pageViews: data.totalPageViews || 0,
      sectionViews: data.sectionViews || {},
      clicks: data.interactions || {},
      visitors: [],
      redirects: {},
      devices: data.devices || {},
      referrers: data.referrers || {},
      browsers: data.browsers || {},
      screenResolutions: data.screenResolutions || {},
      heatmap: [],
      countries: {},
      languages: {},
      firstTracked: data.firstTracked,
      lastTracked: data.lastTracked,
    }
  } catch {
    const local = loadLocalAnalytics()
    return {
      pageViews: local.totalPageViews,
      sectionViews: local.sectionViews,
      clicks: local.interactions,
      visitors: [],
      redirects: {},
      devices: local.devices,
      referrers: local.referrers,
      browsers: local.browsers || {},
      screenResolutions: local.screenResolutions || {},
      heatmap: [],
      countries: {},
      languages: {},
      firstTracked: local.firstTracked,
      lastTracked: local.lastTracked,
    }
  }
}

/** Fetch heatmap data from the server (admin only) */
export async function getHeatmapData(): Promise<HeatmapPoint[]> {
  try {
    const res = await fetch('/api/analytics?type=heatmap', { credentials: 'same-origin' })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    return data.heatmap || []
  } catch {
    return []
  }
}

/** Reset all analytics data on the server (admin only) */
export async function resetAnalytics(): Promise<void> {
  try {
    await fetch('/api/analytics', { method: 'DELETE', credentials: 'same-origin' })
  } catch { /* ignore */ }
  localStorage.removeItem(STORAGE_KEY)
}

// ─── Public tracking API ──────────────────────────────────────────────────────

/** Module-level timestamp of last heatmap server POST — throttles the call rate. */
let _lastHeatmapSend = 0

/** Track a page view. Call once on initial page load. */
export function trackPageView(): void {
  const analytics = loadLocalAnalytics()
  const today = new Date().toISOString().split('T')[0]

  analytics.totalPageViews++
  analytics.lastTracked = today
  if (!analytics.firstTracked) analytics.firstTracked = today

  const dailyEntry = ensureDailyEntry(analytics)
  dailyEntry.pageViews++

  const referrer = getReferrerDomain()
  analytics.referrers[referrer] = (analytics.referrers[referrer] || 0) + 1

  const device = getDeviceType()
  analytics.devices[device] = (analytics.devices[device] || 0) + 1

  const browser = getBrowser()
  if (!analytics.browsers) analytics.browsers = {}
  analytics.browsers[browser] = (analytics.browsers[browser] || 0) + 1

  const screenRes = getScreenResolution()
  if (!analytics.screenResolutions) analytics.screenResolutions = {}
  analytics.screenResolutions[screenRes] = (analytics.screenResolutions[screenRes] || 0) + 1

  const landingPage = window.location.pathname
  if (!analytics.landingPages) analytics.landingPages = {}
  analytics.landingPages[landingPage] = (analytics.landingPages[landingPage] || 0) + 1

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

  // Count unique sessions per day in sessionStorage
  const sessionKey = `zd-session-${today}`
  if (!sessionStorage.getItem(sessionKey)) {
    sessionStorage.setItem(sessionKey, '1')
    analytics.totalSessions++
  }

  saveLocalAnalytics(analytics)

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

/** Track a section becoming visible (IntersectionObserver) */
export function trackSectionView(sectionId: string): void {
  // Deduplicate: only track each section once per session
  if (_trackedSections.has(sectionId)) return
  _trackedSections.add(sectionId)

  const analytics = loadLocalAnalytics()
  analytics.sectionViews[sectionId] = (analytics.sectionViews[sectionId] || 0) + 1
  const dailyEntry = ensureDailyEntry(analytics)
  dailyEntry.sectionViews++
  saveLocalAnalytics(analytics)
  sendToServer({ type: 'section_view', target: sectionId })
}

/** Track a user interaction (button click, profile open, etc.) */
export function trackInteraction(action: string): void {
  const analytics = loadLocalAnalytics()
  analytics.interactions[action] = (analytics.interactions[action] || 0) + 1
  const dailyEntry = ensureDailyEntry(analytics)
  dailyEntry.interactions++
  saveLocalAnalytics(analytics)
  sendToServer({ type: 'interaction', target: action })
}

/** Derive a human-readable label for a clicked element */
export function describeClickTarget(target: HTMLElement | null): string {
  if (!target) return 'unknown'
  const interactive = target.closest('button, a, [role="button"]') as HTMLElement | null
  const el = interactive || target
  const track = el.getAttribute('data-track') || target.getAttribute('data-track')
  if (track) return track
  const aria = el.getAttribute('aria-label') || el.getAttribute('title')
  if (aria) return aria
  if (interactive) {
    const text = (interactive.textContent || '').replace(/\s+/g, ' ').trim()
    if (text && text.length <= 60) return text
    if (text) return text.slice(0, 57) + '...'
  }
  const section = target.closest('section[id], nav, footer, header')
  const sectionId = section?.getAttribute('id') || section?.tagName?.toLowerCase()
  if (sectionId) return `${sectionId}::${target.tagName.toLowerCase()}`
  return target.tagName?.toLowerCase() || 'unknown'
}

/** Track a mouse click with heatmap position data */
export function trackClick(event: MouseEvent): void {
  const analytics = loadLocalAnalytics()
  const dailyEntry = ensureDailyEntry(analytics)
  if (!dailyEntry.clicks) dailyEntry.clicks = 0
  dailyEntry.clicks++
  saveLocalAnalytics(analytics)

  const target = event.target as HTMLElement
  const vw = window.innerWidth || 1
  const dh = document.documentElement.scrollHeight || 1
  const x = event.clientX / vw
  // y is normalized by full document scrollHeight; values > 1 represent clicks below the initial viewport fold
  const y = (event.clientY + window.scrollY) / dh
  const label = describeClickTarget(target)

  const now = Date.now()
  if (now - _lastHeatmapSend < HEATMAP_THROTTLE_MS) return
  _lastHeatmapSend = now

  sendToServer({
    type: 'click',
    target: label,
    heatmap: {
      x: Math.min(1, Math.max(0, x)),
      y: Math.min(2, Math.max(0, y)),
      page: window.location.pathname,
      elementTag: label,
    },
  })
}

/** Track a heatmap click by raw coordinates (for explicit calls) */
export function trackHeatmapClick(x: number, y: number, el: string): void {
  const now = Date.now()
  if (now - _lastHeatmapSend < HEATMAP_THROTTLE_MS) return
  _lastHeatmapSend = now

  sendToServer({
    type: 'click',
    target: el,
    heatmap: {
      x: Math.min(1, Math.max(0, x)),
      y: Math.min(2, Math.max(0, y)),
      page: window.location.pathname,
      elementTag: el,
    },
  })
}

/** Track a redirect / outbound link click */
export function trackRedirect(url: string): void {
  let label: string
  try {
    label = new URL(url).hostname
  } catch {
    label = url.slice(0, 50)
  }
  trackInteraction(`redirect_${label}`)
}

/** Track a social platform click */
export function trackSocialClick(platform: string, _url?: string): void {
  trackInteraction(`social_click_${platform}`)
}

/** Track a newsletter signup */
export function trackNewsletterSignup(): void {
  trackInteraction('newsletter_signup')
}

// ─── React hook ───────────────────────────────────────────────────────────────

/** Hook to track section views via IntersectionObserver */
export function useAnalytics(sectionId: string): void {
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
    if (element) observer.observe(element)
    return () => { if (element) observer.unobserve(element) }
  }, [sectionId])
}
