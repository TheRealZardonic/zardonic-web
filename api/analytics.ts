import { Redis } from '@upstash/redis'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { validateSession } from './auth.js'
import { applyRateLimit } from './_ratelimit.js'
import { analyticsPostSchema, validate } from './_schemas.js'
import { isHardBlocked } from './_blocklist.js'

const ANALYTICS_KEY = 'zd-analytics'
const HEATMAP_KEY = 'zd-heatmap'
const MAX_HEATMAP_POINTS = 5000
const MAX_DAILY_ENTRIES = 90
const MAX_ANALYTICS_FIELDS = 2000 // Safety cap against storage exhaustion DoS

let _redis: Redis | null = null

function getRedis(): Redis | null {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    console.warn('[Analytics API] Upstash Redis not configured')
    return null
  }
  if (!_redis) {
    _redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
  }
  return _redis
}

/** Normalize referrer to domain only to limit cardinality */
function normalizeReferrer(r: string | undefined): string | undefined {
  if (!r || r === 'direct') return r
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

const isKVConfigured = () =>
  !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)

interface AnalyticsEventMeta {
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

interface HeatmapClickData {
  x: number
  y: number
  page?: string
  elementTag?: string
}

/** Merge incoming event data into the persistent analytics object using atomic Redis operations */
async function mergeAnalytics(
  kv: Redis,
  event: { type: string; target?: string; meta?: AnalyticsEventMeta }
): Promise<void> {
  const { type, target, meta } = event
  const today = new Date().toISOString().split('T')[0]

  // Safety cap: check total hash fields to prevent storage exhaustion DoS
  const fieldCount = (await kv.hlen(ANALYTICS_KEY)) || 0
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
    const ref = normalizeReferrer(meta?.referrer)
    if (ref) pipe.hincrby(ANALYTICS_KEY, `referrer:${ref}`, 1)
    const dev = normalizeDevice(meta?.device)
    if (dev) pipe.hincrby(ANALYTICS_KEY, `device:${dev}`, 1)
    const br = normalizeBrowser(meta?.browser)
    if (br) pipe.hincrby(ANALYTICS_KEY, `browser:${br}`, 1)
    const scr = normalizeScreenResolution(meta?.screenResolution)
    if (scr) pipe.hincrby(ANALYTICS_KEY, `screen:${scr}`, 1)
    const lp = normalizeLandingPage(meta?.landingPage)
    if (lp) pipe.hincrby(ANALYTICS_KEY, `landing:${lp}`, 1)
    if (meta?.utmSource) pipe.hincrby(ANALYTICS_KEY, `utm_source:${meta.utmSource}`, 1)
    if (meta?.utmMedium) pipe.hincrby(ANALYTICS_KEY, `utm_medium:${meta.utmMedium}`, 1)
    if (meta?.utmCampaign) pipe.hincrby(ANALYTICS_KEY, `utm_campaign:${meta.utmCampaign}`, 1)
  }

  // Track this date in the set of known dates
  pipe.sadd(`${ANALYTICS_KEY}:dates`, today)

  // Track hourly visits for best posting time analysis
  if (type === 'page_view') {
    const hour = new Date().getUTCHours()
    pipe.hincrby(ANALYTICS_KEY, `hourly:${hour}`, 1)
  }

  // Set first/last tracked
  pipe.hsetnx(ANALYTICS_KEY, 'firstTracked', today)
  pipe.hset(ANALYTICS_KEY, { lastTracked: today })

  await pipe.exec()

  // Track unique sessions via a daily set
  if (type === 'page_view' && meta?.sessionId) {
    const added = await kv.sadd(`${ANALYTICS_KEY}:sessions:${today}`, meta.sessionId)
    if (added) {
      await kv.hincrby(ANALYTICS_KEY, 'totalSessions', 1)
    }
    // Expire session sets after 91 days
    await kv.expire(`${ANALYTICS_KEY}:sessions:${today}`, 91 * 86400)
  }
}

/** Store heatmap click data */
async function storeHeatmapClick(kv: Redis, clickData: HeatmapClickData): Promise<void> {
  const entry = {
    x: clickData.x,
    y: clickData.y,
    page: clickData.page || '/',
    el: clickData.elementTag || '',
    ts: Date.now(),
  }
  await kv.lpush(HEATMAP_KEY, JSON.stringify(entry))
  await kv.ltrim(HEATMAP_KEY, 0, MAX_HEATMAP_POINTS - 1)
}

/** Build the full analytics object from Redis hashes for the admin dashboard */
async function buildAnalyticsSnapshot(kv: Redis): Promise<Record<string, unknown>> {
  const allFields = await kv.hgetall(ANALYTICS_KEY) as Record<string, string> | null
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
  const dates = (await kv.smembers(`${ANALYTICS_KEY}:dates`)) as string[] || []
  if (dates.length > 0) {
    const sortedDates = [...dates].sort()
    const recentDates = sortedDates.slice(-MAX_DAILY_ENTRIES)
    const dailyStats = (result.dailyStats as unknown[])
    for (const date of recentDates) {
      dailyStats.push({
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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end()

  // Hard-block check — immediate rejection
  const blocked = await isHardBlocked(req)
  if (blocked) return res.status(403).json({ error: 'FORBIDDEN' })

  // Rate limiting (GDPR-compliant, IP is hashed)
  const allowed = await applyRateLimit(req, res)
  if (!allowed) return

  if (!isKVConfigured()) {
    return res.status(503).json({ error: 'Service unavailable', message: 'KV storage is not configured.' })
  }

  const kv = getRedis()!

  try {
    // POST: record an analytics event (public — no auth required)
    if (req.method === 'POST') {
      if (!req.body || typeof req.body !== 'object') {
        return res.status(400).json({ error: 'Request body is required' })
      }

      // Reject excessively large payloads
      const bodySize = JSON.stringify(req.body).length
      if (bodySize > 4096) {
        return res.status(413).json({ error: 'Request body too large' })
      }

      // Zod validation
      const parsed = validate(analyticsPostSchema, req.body)
      if (!parsed.success) return res.status(400).json({ error: parsed.error })
      const { type, target, meta, heatmap } = parsed.data

      // Sanitize string inputs to prevent injection into Redis keys
      const sanitize = (s: string | undefined): string | undefined =>
        typeof s === 'string' ? s.slice(0, 200).replace(/[\n\r\0:*?[\]{}]/g, '') : undefined

      const sanitizedMeta: AnalyticsEventMeta = meta && typeof meta === 'object' ? {
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

      await mergeAnalytics(kv, { type, target: sanitize(target), meta: sanitizedMeta })

      // Store heatmap data if present
      if (heatmap && typeof heatmap.x === 'number' && typeof heatmap.y === 'number') {
        // x: normalized viewport width (0–1); y: normalized document height (0–2, allows below-the-fold clicks)
        const hx = Math.round(Math.max(0, Math.min(1, heatmap.x)) * 10000) / 10000
        const hy = Math.round(Math.max(0, Math.min(2, heatmap.y)) * 10000) / 10000
        await storeHeatmapClick(kv, {
          x: hx,
          y: hy,
          page: sanitize(heatmap.page),
          elementTag: sanitize(heatmap.elementTag),
        })
      }

      return res.json({ ok: true })
    }

    // GET: retrieve analytics snapshot (admin only)
    if (req.method === 'GET') {
      const sessionValid = await validateSession(req)
      if (!sessionValid) return res.status(403).json({ error: 'Unauthorized' })

      const { type } = req.query

      if (type === 'heatmap') {
        const raw = (await kv.lrange(HEATMAP_KEY, 0, MAX_HEATMAP_POINTS - 1)) as unknown[]
        const points = raw.map((entry) => {
          try { return typeof entry === 'string' ? JSON.parse(entry) : entry }
          catch { return null }
        }).filter(Boolean)
        return res.json({ heatmap: points })
      }

      const snapshot = await buildAnalyticsSnapshot(kv)
      return res.json(snapshot)
    }

    // DELETE: reset analytics (admin only)
    if (req.method === 'DELETE') {
      const sessionValid = await validateSession(req)
      if (!sessionValid) return res.status(403).json({ error: 'Unauthorized' })

      const dates = (await kv.smembers(`${ANALYTICS_KEY}:dates`)) as string[] || []
      const pipe = kv.pipeline()
      pipe.del(ANALYTICS_KEY)
      pipe.del(HEATMAP_KEY)
      pipe.del(`${ANALYTICS_KEY}:dates`)
      for (const date of dates) {
        pipe.del(`${ANALYTICS_KEY}:sessions:${date}`)
      }
      await pipe.exec()

      return res.json({ ok: true })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (error) {
    console.error('Analytics API error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
