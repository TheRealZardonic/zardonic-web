/**
 * POST /api/gigs-sync
 *
 * Fetches gig events from Bandsintown and stores them in Redis for 25 hours.
 * Called daily by the Vercel cron job and on-demand by admin "Sync Now" button.
 *
 * Cron calls must supply `Authorization: Bearer <CRON_SECRET>`.
 * Admin calls must supply a valid session (cookie or x-session-token header).
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getRedisOrNull } from './_redis.js'
import { fetchWithRetry } from './_fetch-retry.js'
import { validateSession } from './auth.js'
import { timingSafeEqual } from 'node:crypto'

/** Constant-time string comparison to prevent timing-based CRON_SECRET enumeration. */
function verifyCronSecret(provided: string): boolean {
  const expected = process.env.CRON_SECRET
  if (!expected) return false
  try {
    const a = Buffer.from(expected, 'utf8')
    const b = Buffer.from(provided, 'utf8')
    if (a.length !== b.length) return false
    return timingSafeEqual(a, b)
  } catch {
    return false
  }
}

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

  // Cron calls: validate Authorization: Bearer <CRON_SECRET> header.
  // This replaces the spoofable x-vercel-cron header check.
  const authHeader = req.headers.authorization ?? ''
  const isCron = authHeader.startsWith('Bearer ') && verifyCronSecret(authHeader.slice(7))

  // For non-cron calls, require an authenticated admin session
  if (!isCron) {
    const sessionValid = await validateSession(req)
    if (!sessionValid) {
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
