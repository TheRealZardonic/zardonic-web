/**
 * Sync Timestamps API for Upstash Redis storage
 * Handles iTunes and Bandsintown sync timestamps
 * GET is public; POST requires admin session
 */

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { Redis } from '@upstash/redis'
import { validateSession } from './auth.js'

const SYNC_KEY = 'zd-sync-timestamps'

interface SyncTimestamps {
  lastReleasesSync: number
  lastGigsSync: number
}

let _redis: Redis | null = null

function getRedis(): Redis | null {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    console.warn('[Sync API] Upstash Redis not configured')
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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const kv = getRedis()

  if (!kv) {
    return res.status(503).json({ error: 'Service unavailable', message: 'Sync storage is not configured' })
  }

  try {
    // GET: Retrieve sync timestamps (public — needed by frontend before login)
    if (req.method === 'GET') {
      const data = await kv.get<SyncTimestamps>(SYNC_KEY)
      return res.status(200).json(data ?? { lastReleasesSync: 0, lastGigsSync: 0 })
    }

    // POST: Update sync timestamps (admin only)
    if (req.method === 'POST') {
      const sessionValid = await validateSession(req)
      if (!sessionValid) {
        return res.status(403).json({ error: 'Unauthorized' })
      }

      const body = req.body as Partial<SyncTimestamps>
      const lastReleasesSync = typeof body.lastReleasesSync === 'number' ? body.lastReleasesSync : undefined
      const lastGigsSync = typeof body.lastGigsSync === 'number' ? body.lastGigsSync : undefined

      const current = await kv.get<SyncTimestamps>(SYNC_KEY) ?? { lastReleasesSync: 0, lastGigsSync: 0 }

      const updated: SyncTimestamps = {
        lastReleasesSync: lastReleasesSync ?? current.lastReleasesSync,
        lastGigsSync: lastGigsSync ?? current.lastGigsSync,
      }

      await kv.set(SYNC_KEY, updated, { ex: 90 * 24 * 60 * 60 })
      return res.status(200).json({ success: true, timestamps: updated })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (error) {
    console.error('[Sync API] Error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
