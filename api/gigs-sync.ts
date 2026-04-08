/**
 * POST /api/gigs-sync
 *
 * Fetches gig events from Bandsintown and stores them in Redis for 25 hours.
 * Called daily by the Vercel cron job and on-demand by admin "Sync Now" button.
 *
 * Vercel cron header `x-vercel-cron: 1` is checked for cron calls.
 * Admin calls must supply a valid x-session-token header.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getRedisOrNull } from './_redis.js'
import { fetchWithRetry } from './_fetch-retry.js'

const BANDSINTOWN_API_BASE = 'https://rest.bandsintown.com'
const ARTIST_NAME = 'Zardonic'
const GIGS_CACHE_KEY = 'gigs:events:zardonic'
const GIGS_TTL_SECONDS = 25 * 60 * 60 // 25 hours (1-hour buffer over the daily cron in case of execution delays)

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  // Allow Vercel cron calls (identified by x-vercel-cron header)
  const isCron = req.headers['x-vercel-cron'] === '1'

  // For non-cron calls, require an authenticated admin session token
  if (!isCron) {
    const sessionToken = req.headers['x-session-token'] as string | undefined
    if (!sessionToken) {
      res.status(401).json({ error: 'Unauthorized' })
      return
    }
    const redis = getRedisOrNull()
    if (!redis) {
      // If Redis isn't configured, we can't validate session — block for safety
      res.status(503).json({ error: 'Redis not configured' })
      return
    }
    const session = await redis.get(`session:${sessionToken}`).catch(() => null)
    if (!session) {
      res.status(401).json({ error: 'Unauthorized' })
      return
    }
  }

  const apiKey = process.env.BANDSINTOWN_API_KEY
  if (!apiKey) {
    res.status(503).json({ error: 'BANDSINTOWN_API_KEY not configured' })
    return
  }

  try {
    const url = new URL(`${BANDSINTOWN_API_BASE}/artists/${encodeURIComponent(ARTIST_NAME)}/events`)
    url.searchParams.set('app_id', apiKey)
    url.searchParams.set('date', 'all')

    const response = await fetchWithRetry(url.toString(), {
      headers: { Accept: 'application/json' },
    })

    if (response.status === 429) {
      // Bandsintown rate-limited us — extend existing cache silently
      const redis = getRedisOrNull()
      if (redis) {
        try {
          const cached = await redis.get(GIGS_CACHE_KEY)
          if (cached !== null) {
            await redis.expire(GIGS_CACHE_KEY, GIGS_TTL_SECONDS)
          }
        } catch { /* non-fatal */ }
      }
      res.status(429).json({ error: 'Bandsintown rate limit — existing cache extended' })
      return
    }

    if (response.status === 404) {
      res.status(200).json({ events: [], synced: true })
      return
    }

    if (!response.ok) {
      const body = await response.text().catch(() => '')
      console.error(`[gigs-sync] Bandsintown error ${response.status}:`, body)
      res.status(502).json({ error: `Bandsintown API returned ${response.status}` })
      return
    }

    const data = await response.json()
    const events = Array.isArray(data) ? data : []
    const payload = { events, syncedAt: new Date().toISOString() }

    const redis = getRedisOrNull()
    if (redis) {
      try {
        await redis.set(GIGS_CACHE_KEY, payload, { ex: GIGS_TTL_SECONDS })
      } catch (e) {
        console.error('[gigs-sync] Redis write failed:', e)
      }
    }

    res.setHeader('Cache-Control', 'no-store')
    res.status(200).json({ ...payload, cached: !!redis })
  } catch (error) {
    console.error('[gigs-sync] Unexpected error:', error)
    res.status(500).json({ error: 'Failed to sync gigs' })
  }
}
