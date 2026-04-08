/**
 * GET /api/bandsintown?artist=<name>[&include_past=true]
 *
 * Server-side proxy for the Bandsintown REST API that avoids CSP / CORS issues
 * when called from the browser.
 *
 * The Bandsintown API key is read from the BANDSINTOWN_API_KEY environment
 * variable and is never exposed to the client.
 *
 * Returns:
 *   200 { events: BandsintownEvent[] }   — success (may be empty array)
 *   400 { error: string }                — missing / invalid params
 *   429 / 503                            — rate limit
 *   500 { error: string }                — upstream failure
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { applyRateLimit } from './_ratelimit.js'
import { bandsintownQuerySchema, validate } from './_schemas.js'
import { fetchWithRetry } from './_fetch-retry.js'
import { getRedisOrNull } from './_redis.js'
/** Venue as returned by the Bandsintown REST API. */
export interface BandsintownVenue {
  pk?: number
  name: string
  latitude?: string
  longitude?: string
  city: string
  region?: string
  country: string
  zip_code?: string
}

/** An offer (e.g. ticket link) as returned by the Bandsintown REST API. */
export interface BandsintownOffer {
  type: string
  url: string
  status: string
}

/** A single event as returned by the Bandsintown REST API. */
export interface BandsintownEvent {
  id: string
  artist_id?: string
  url: string
  on_sale_datetime?: string
  datetime: string
  description?: string
  title?: string
  lineup?: string[]
  offers?: BandsintownOffer[]
  venue: BandsintownVenue
}

const BANDSINTOWN_API_BASE = 'https://rest.bandsintown.com'

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  // Only GET is supported
  if (req.method && req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  // Rate limiting (GDPR-compliant, IP is hashed)
  const allowed = await applyRateLimit(req, res)
  if (!allowed) return

  // Validate query parameters
  const parsed = validate(bandsintownQuerySchema, req.query)
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error })
    return
  }
  const { artist, include_past } = parsed.data

  const apiKey = process.env.BANDSINTOWN_API_KEY
  if (!apiKey) {
    res.status(503).json({
      error: 'BANDSINTOWN_API_KEY not configured',
      message: 'Please set BANDSINTOWN_API_KEY environment variable',
    })
    return
  }

  const redis = getRedisOrNull()
  const redisKey = `bandsintown:events:${artist.toLowerCase().replace(/\s+/g, '-')}:${include_past ? 'all' : 'upcoming'}`

  if (redis) {
    try {
      const cached = await redis.get<unknown>(redisKey)
      if (cached !== null && cached !== undefined) {
        res.setHeader('Cache-Control', 'public, max-age=3600')
        res.setHeader('X-Cache', 'HIT')
        res.status(200).json(cached)
        return
      }
    } catch { /* fall through */ }
  }

  try {
    const url = new URL(
      `${BANDSINTOWN_API_BASE}/artists/${encodeURIComponent(artist)}/events`,
    )
    url.searchParams.set('app_id', apiKey)
    if (include_past) {
      url.searchParams.set('date', 'all')
    }

    const response = await fetchWithRetry(url.toString(), {
      headers: { Accept: 'application/json' },
    })

    if (response.status === 404) {
      // Artist not found on Bandsintown — return empty list
      res
        .setHeader('Cache-Control', 'public, max-age=300')
        .status(200)
        .json({ events: [] })
      return
    }

    if (!response.ok) {
      const body = await response.text().catch(() => '')
      console.error(`Bandsintown API error ${response.status}:`, body)

      // On 429 (rate limit), serve stale cache if available
      if (response.status === 429 && redis) {
        try {
          const stale = await redis.get<unknown>(redisKey)
          if (stale !== null && stale !== undefined) {
            res.setHeader('Cache-Control', 'public, max-age=3600')
            res.setHeader('X-Cache', 'STALE')
            res.status(200).json(stale)
            return
          }
        } catch { /* fall through */ }
      }

      res.status(500).json({ error: `Bandsintown API returned ${response.status}` })
      return
    }

    const data = (await response.json()) as BandsintownEvent[] | null

    // Bandsintown returns an array directly (not wrapped in an object)
    const events: BandsintownEvent[] = Array.isArray(data) ? data : []

    const payload = { events }
    if (redis) {
      // 24-hour TTL aligns with the daily gigs-sync cron job
      try { await redis.set(redisKey, payload, { ex: 86400 }) } catch { /* non-fatal */ }
    }
    res
      .setHeader('Cache-Control', 'public, max-age=3600')
      .setHeader('X-Cache', 'MISS')
      .status(200)
      .json(payload)
  } catch (error) {
    console.error('Bandsintown proxy error:', error)
    res.status(500).json({ error: 'Failed to fetch from Bandsintown API' })
  }
}
