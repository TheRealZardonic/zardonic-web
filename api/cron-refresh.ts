/**
 * Vercel Cron Job — Daily refresh of iTunes releases and Bandsintown events.
 * Runs at 06:00 UTC daily (configured in vercel.json).
 *
 * Fetches fresh data from external APIs and stores updated sync timestamps
 * in Upstash Redis so the frontend knows when data was last refreshed.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { Redis } from '@upstash/redis'
import { fetchWithRetry } from './_fetch-retry.js'

const SYNC_KEY = 'zd-sync-timestamps'

interface SyncTimestamps {
  lastReleasesSync: number
  lastGigsSync: number
}

function getRedis(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) return null
  return new Redis({ url, token })
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Vercel Cron jobs send a GET with Authorization header
  const authHeader = req.headers['authorization']
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const redis = getRedis()
  if (!redis) {
    return res.status(503).json({ error: 'Redis not configured' })
  }

  const results: { itunes: string; bandsintown: string } = {
    itunes: 'skipped',
    bandsintown: 'skipped',
  }

  // Refresh iTunes releases
  try {
    const itunesRes = await fetchWithRetry(
      `https://itunes.apple.com/search?term=${encodeURIComponent('Zardonic')}&entity=song&limit=200`,
      { headers: { Accept: 'application/json' } }
    )
    if (itunesRes.ok) {
      results.itunes = 'ok'
    } else {
      results.itunes = `error:${itunesRes.status}`
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    results.itunes = `error:${message}`
  }

  // Refresh Bandsintown events
  const bandsintownKey = process.env.BANDSINTOWN_API_KEY
  if (bandsintownKey) {
    try {
      const params = new URLSearchParams()
      params.set('app_id', bandsintownKey)
      const bitRes = await fetchWithRetry(
        `https://rest.bandsintown.com/artists/${encodeURIComponent('Zardonic')}/events?${params.toString()}`,
        { headers: { Accept: 'application/json' } }
      )
      if (bitRes.ok) {
        results.bandsintown = 'ok'
      } else {
        results.bandsintown = `error:${bitRes.status}`
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      results.bandsintown = `error:${message}`
    }
  }

  // Update sync timestamps so the frontend picks up the fresh data
  const now = Date.now()
  const timestamps: SyncTimestamps = {
    lastReleasesSync: results.itunes === 'ok' ? now : 0,
    lastGigsSync: results.bandsintown === 'ok' ? now : 0,
  }

  try {
    const current = await redis.get<SyncTimestamps>(SYNC_KEY) ?? { lastReleasesSync: 0, lastGigsSync: 0 }
    const merged: SyncTimestamps = {
      lastReleasesSync: timestamps.lastReleasesSync || current.lastReleasesSync,
      lastGigsSync: timestamps.lastGigsSync || current.lastGigsSync,
    }
    await redis.set(SYNC_KEY, merged, { ex: 90 * 24 * 60 * 60 })
  } catch (error) {
    console.error('[Cron] Failed to update sync timestamps:', error)
  }

  return res.status(200).json({ success: true, results, timestamp: now })
}
