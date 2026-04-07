import { Redis } from '@upstash/redis'
const kv = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || '',
  token: process.env.UPSTASH_REDIS_REST_TOKEN || ''
})
import { validateSession } from './auth.js'
import { applyRateLimit } from './_ratelimit.js'
import { analyticsPostSchema, validate } from './_schemas.js'
import { isHardBlocked } from './_blocklist.js'

interface VercelRequest {
  method?: string
  body?: Record<string, unknown>
  query?: Record<string, string | string[]>
  headers: Record<string, string | string[] | undefined>
}

interface VercelResponse {
  setHeader(key: string, value: string): VercelResponse
  status(code: number): VercelResponse
  json(data: unknown): VercelResponse
  end(): VercelResponse
}

interface AnalyticsMeta {
  referrer?: string
  device?: string
  browser?: string
  screenResolution?: string
  landingPage?: string
  utmSource?: string
  utmMedium?: string
  utmCampaign?: string
  sessionId?: string
}

const ANALYTICS_KEY = 'nk-analytics'
const HEATMAP_KEY = 'nk-heatmap'
const MAX_HEATMAP_POINTS = 5000
const MAX_DAILY_ENTRIES = 90
const MAX_ANALYTICS_FIELDS = 2000 // Safety cap against storage exhaustion DoS

/** Normalize referrer to domain only to limit cardinality */
function normalizeReferrer(r: string | undefined): string | undefined {
  if (!r || r === 'direct') return 'direct'
  try {
    const url = new URL(r.startsWith('http') ? r : `https://${r}`)
    return url.hostname
  } catch {
    return r.slice(0, 50)
  }
}

const KNOWN_DEVICES = new Set(['desktop', 'mobile', 'tablet'])
function normalizeDevice(d: string | undefined): string | undefined {
  if (!d) return undefined
  const lower = d.toLowerCase()
  return KNOWN_DEVICES.has(lower) ? lower : 'other'
}

const KNOWN_BROWSERS = ['chrome', 'firefox', 'safari', 'edge', 'opera']
function normalizeBrowser(b: string | undefined): string | undefined {
  if (!b) return undefined
  const lower = b.toLowerCase()
  for (const known of KNOWN_BROWSERS) {
    if (lower.includes(known)) return known
  }
  return 'other'
}

function normalizeScreenResolution(r: string | undefined): string | undefined {
  if (!r) return undefined
  const match = r.match(/^(\d{2,5})x(\d{2,5})$/)
  return match ? `${match[1]}x${match[2]}` : 'unknown'
}

function normalizeLandingPage(p: string | undefined): string | undefined {
  if (!p) return undefined
  try {
    const url = new URL(p, 'http://x')
    return url.pathname.slice(0, 50)
  } catch {
    return p.slice(0, 50)
  }
}

// Check if KV is properly configured
const isKVConfigured = (): boolean => {
  return !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN)
}

interface AnalyticsEvent {
  type: string
  target?: string
  meta?: AnalyticsMeta
}

/** Merge incoming event data into the persistent analytics object using atomic Redis operations */
async function mergeAnalytics(event: AnalyticsEvent): Promise<void> {
  const { type, target, meta } = event
  const today = new Date().toISOString().split('T')[0]

  // Safety cap: check total hash fields to prevent storage exhaustion DoS
  const fieldCount = await kv.hlen(ANALYTICS_KEY) || 0
  const canAddDynamic = fieldCount < MAX_ANALYTICS_FIELDS

  // Use a pipeline for atomic batch updates
  const pipe = kv.pipeline()

  // Increment total counters (bounded — always allowed)
  pipe.hincrby(ANALYTICS_KEY, 'totalPageViews', type === 'page_view' ? 1 : 0)
  pipe.hincrby(ANALYTICS_KEY, `daily:${today}:pageViews`, type === 'page_view' ? 1 : 0)
  pipe.hincrby(ANALYTICS_KEY, `daily:${today}:sectionViews`, type === 'section_view' ? 1 : 0)
  pipe.hincrby(ANALYTICS_KEY, `daily:${today}:interactions`, type === 'interaction' ? 1 : 0)
  pipe.hincrby(ANALYTICS_KEY, `daily:${today}:clicks`, type === 'click' ? 1 : 0)

  // Dynamic fields — normalized to limit cardinality + HLEN safety cap
  if (canAddDynamic) {
    if (type === 'section_view' && target) {
      pipe.hincrby(ANALYTICS_KEY, `section:${target}`, 1)
    }
    if (type === 'interaction' && target) {
      pipe.hincrby(ANALYTICS_KEY, `interaction:${target}`, 1)
    }
    // Normalized referrer (domain only)
    const ref = normalizeReferrer(meta?.referrer)
    if (ref) {
      pipe.hincrby(ANALYTICS_KEY, `referrer:${ref}`, 1)
    }
    // Normalized device (known set only)
    const dev = normalizeDevice(meta?.device)
    if (dev) {
      pipe.hincrby(ANALYTICS_KEY, `device:${dev}`, 1)
    }
    // Normalized browser (known set only)
    const br = normalizeBrowser(meta?.browser)
    if (br) {
      pipe.hincrby(ANALYTICS_KEY, `browser:${br}`, 1)
    }
    // Normalized screen resolution (NNNNxNNNN format only)
    const scr = normalizeScreenResolution(meta?.screenResolution)
    if (scr) {
      pipe.hincrby(ANALYTICS_KEY, `screen:${scr}`, 1)
    }
    // Normalized landing page (path only, max 50 chars)
    const lp = normalizeLandingPage(meta?.landingPage)
    if (lp) {
      pipe.hincrby(ANALYTICS_KEY, `landing:${lp}`, 1)
    }
    // UTM parameters (sanitized by schema, capped by HLEN)
    if (meta?.utmSource) {
      pipe.hincrby(ANALYTICS_KEY, `utm_source:${meta.utmSource}`, 1)
    }
    if (meta?.utmMedium) {
      pipe.hincrby(ANALYTICS_KEY, `utm_medium:${meta.utmMedium}`, 1)
    }
    if (meta?.utmCampaign) {
      pipe.hincrby(ANALYTICS_KEY, `utm_campaign:${meta.utmCampaign}`, 1)
    }
  }

  // Track this date in the set of known dates
  pipe.sadd(`${ANALYTICS_KEY}:dates`, today)

  // Track hourly visits for best posting time analysis
  if (type === 'page_view') {
    const hour = new Date().getUTCHours() // UTC hours; dashboard shows these as-is for consistency
    pipe.hincrby(ANALYTICS_KEY, `hourly:${hour}`, 1)
  }

  // Set first/last tracked
  pipe.hsetnx(ANALYTICS_KEY, 'firstTracked', today)
  pipe.hset(ANALYTICS_KEY, 'lastTracked', today)

  await pipe.exec()

  // Track unique sessions via a daily set
  if (type === 'page_view' && meta?.sessionId) {
    const added = await kv.sadd(`${ANALYTICS_KEY}:sessions:${today}`, meta.sessionId)
    if (added) {
      await kv.hincrby(ANALYTICS_KEY, 'totalSessions', 1)
    }
    // Expire session sets after 91 days to prevent unbounded growth
    await kv.expire(`${ANALYTICS_KEY}:sessions:${today}`, 91 * 86400)
  }
}

interface HeatmapClick {
  x: number
  y: number
  page?: string
  elementTag?: string
}

/** Store heatmap click data */
async function storeHeatmapClick(clickData: HeatmapClick): Promise<void> {
  const entry = {
    x: clickData.x,
    y: clickData.y,
    page: clickData.page || '/',
    el: clickData.elementTag || '',
    ts: Date.now(),
  }
  // Use a list, capped at MAX_HEATMAP_POINTS
  await kv.lpush(HEATMAP_KEY, JSON.stringify(entry))
  await kv.ltrim(HEATMAP_KEY, 0, MAX_HEATMAP_POINTS - 1)
}

/** Build the full analytics object from Redis hashes for the admin dashboard */
async function buildAnalyticsSnapshot(): Promise<Record<string, unknown>> {
  // Get all hash fields
  const allFields = await kv.hgetall(ANALYTICS_KEY)
  if (!allFields) {
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

  const result: Record<string, unknown> = {
    totalPageViews: Number(allFields.totalPageViews) || 0,
    totalSessions: Number(allFields.totalSessions) || 0,
    firstTracked: allFields.firstTracked || null,
    lastTracked: allFields.lastTracked || null,
    sectionViews: {} as Record<string, number>,
    interactions: {} as Record<string, number>,
    dailyStats: [] as unknown[],
    referrers: {} as Record<string, number>,
    devices: {} as Record<string, number>,
    browsers: {} as Record<string, number>,
    screenResolutions: {} as Record<string, number>,
    landingPages: {} as Record<string, number>,
    utmSources: {} as Record<string, number>,
    utmMediums: {} as Record<string, number>,
    utmCampaigns: {} as Record<string, number>,
    hourlyVisits: {} as Record<string, number>,
  }

  // Parse hash fields into categories
  for (const [key, value] of Object.entries(allFields)) {
    const num = Number(value)
    if (key.startsWith('section:')) {
      (result.sectionViews as Record<string, number>)[key.slice(8)] = num
    } else if (key.startsWith('interaction:')) {
      (result.interactions as Record<string, number>)[key.slice(12)] = num
    } else if (key.startsWith('referrer:')) {
      (result.referrers as Record<string, number>)[key.slice(9)] = num
    } else if (key.startsWith('device:')) {
      (result.devices as Record<string, number>)[key.slice(7)] = num
    } else if (key.startsWith('browser:')) {
      (result.browsers as Record<string, number>)[key.slice(8)] = num
    } else if (key.startsWith('screen:')) {
      (result.screenResolutions as Record<string, number>)[key.slice(7)] = num
    } else if (key.startsWith('landing:')) {
      (result.landingPages as Record<string, number>)[key.slice(8)] = num
    } else if (key.startsWith('utm_source:')) {
      (result.utmSources as Record<string, number>)[key.slice(11)] = num
    } else if (key.startsWith('utm_medium:')) {
      (result.utmMediums as Record<string, number>)[key.slice(11)] = num
    } else if (key.startsWith('utm_campaign:')) {
      (result.utmCampaigns as Record<string, number>)[key.slice(13)] = num
    } else if (key.startsWith('hourly:')) {
      (result.hourlyVisits as Record<string, number>)[key.slice(7)] = num
    }
  }

  // Build daily stats from known dates
  const dates = await kv.smembers(`${ANALYTICS_KEY}:dates`)
  if (dates && dates.length > 0) {
    const sortedDates = dates.sort()
    // Keep only last MAX_DAILY_ENTRIES days
    const recentDates = sortedDates.slice(-MAX_DAILY_ENTRIES)

    for (const date of recentDates) {
      (result.dailyStats as unknown[]).push({
        date,
        pageViews: Number(allFields[`daily:${date}:pageViews`]) || 0,
        sectionViews: Number(allFields[`daily:${date}:sectionViews`]) || 0,
        interactions: Number(allFields[`daily:${date}:interactions`]) || 0,
        clicks: Number(allFields[`daily:${date}:clicks`]) || 0,
      })
    }
  }

  return result
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  // Hard-block check — immediate rejection
  const blocked = await isHardBlocked(req)
  if (blocked) {
    res.status(403).json({ error: 'FORBIDDEN' })
    return
  }

  // Rate limiting — blocks analytics spam / DoS (GDPR-compliant, IP is hashed)
  const allowed = await applyRateLimit(req, res)
  if (!allowed) return

  if (!isKVConfigured()) {
    res.status(503).json({
      error: 'Service unavailable',
      message: 'KV storage is not configured.',
    })
    return
  }

  try {
    // POST: record an analytics event (no auth required — public tracking)
    if (req.method === 'POST') {
      if (!req.body || typeof req.body !== 'object') {
        res.status(400).json({ error: 'Request body is required' })
        return
      }

      // Reject excessively large payloads (protect against abuse)
      const bodySize = JSON.stringify(req.body).length
      if (bodySize > 4096) {
        res.status(413).json({ error: 'Request body too large' })
        return
      }

      // Zod validation — validates event type + meta shape
      const parsed = validate(analyticsPostSchema, req.body)
      if (!parsed.success) {
        res.status(400).json({ error: parsed.error })
        return
      }
      const { type, target, meta, heatmap } = parsed.data

      // Sanitize string inputs to prevent injection into Redis keys
      const sanitize = (s: string | undefined): string | undefined =>
        (typeof s === 'string' ? s.slice(0, 200).replace(/[\n\r:*?[\]{}]/g, '').replace(/\0/g, '') : undefined)

      // Limit the number of meta fields to prevent unbounded key pollution
      const sanitizedMeta: AnalyticsMeta = meta && typeof meta === 'object' ? {
        referrer: sanitize(meta.referrer),
        device: sanitize(meta.device),
        browser: sanitize(meta.browser),
        screenResolution: sanitize(meta.screenResolution),
        landingPage: sanitize(meta.landingPage),
        utmSource: sanitize(meta.utmSource),
        utmMedium: sanitize(meta.utmMedium),
        utmCampaign: sanitize(meta.utmCampaign),
        sessionId: sanitize(meta.sessionId),
      } : {}

      await mergeAnalytics({ type, target: sanitize(target), meta: sanitizedMeta })

      // Store heatmap data if present — validate coordinates are in valid range
      // x: normalized viewport width (0-1), y: normalized document height (0-2, allows scrolling beyond viewport)
      if (heatmap && typeof heatmap.x === 'number' && typeof heatmap.y === 'number') {
        const hx = Math.round(Math.max(0, Math.min(1, heatmap.x)) * 10000) / 10000
        const hy = Math.round(Math.max(0, Math.min(2, heatmap.y)) * 10000) / 10000
        await storeHeatmapClick({
          x: hx,
          y: hy,
          page: sanitize(heatmap.page),
          elementTag: sanitize(heatmap.elementTag),
        })
      }

      res.json({ ok: true })
      return
    }

    // GET: retrieve analytics snapshot (admin only)
    if (req.method === 'GET') {
      const sessionValid = await validateSession(req)
      if (!sessionValid) {
        res.status(403).json({ error: 'Unauthorized' })
        return
      }

      const { type } = req.query

      if (type === 'heatmap') {
        const raw = await kv.lrange(HEATMAP_KEY, 0, MAX_HEATMAP_POINTS - 1)
        const points = (raw || []).map((entry) => {
          try { return typeof entry === 'string' ? JSON.parse(entry) : entry } catch (e) { console.warn('Malformed heatmap entry:', e); return null }
        }).filter(Boolean)
        res.json({ heatmap: points })
        return
      }

      const snapshot = await buildAnalyticsSnapshot()
      res.json(snapshot)
      return
    }

    // DELETE: reset analytics (admin only)
    if (req.method === 'DELETE') {
      const sessionValid = await validateSession(req)
      if (!sessionValid) {
        res.status(403).json({ error: 'Unauthorized' })
        return
      }

      // Delete analytics keys
      const dates = await kv.smembers(`${ANALYTICS_KEY}:dates`)
      const pipe = kv.pipeline()
      pipe.del(ANALYTICS_KEY)
      pipe.del(HEATMAP_KEY)
      pipe.del(`${ANALYTICS_KEY}:dates`)
      if (dates) {
        for (const date of dates) {
          pipe.del(`${ANALYTICS_KEY}:sessions:${date}`)
        }
      }
      await pipe.exec()

      res.json({ ok: true })
      return
    }

    res.status(405).json({ error: 'Method not allowed' })
  } catch (error) {
    console.error('Analytics API error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}
