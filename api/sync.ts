import type { VercelRequest, VercelResponse } from '@vercel/node'
import { isRedisConfigured, getRedis } from './_redis.js'
import { validateSession } from './auth.js'
import { z } from 'zod'

const SYNC_KEY = 'sync-timestamps'

const syncPostSchema = z.object({
  lastReleasesSync: z.number().int().nonnegative().optional(),
  lastGigsSync: z.number().int().nonnegative().optional(),
}).strict()

/**
 * GET /api/sync  — read sync timestamps (public)
 * POST /api/sync — update sync timestamps (requires valid admin session)
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (!isRedisConfigured()) {
    // Fail gracefully — the client handles missing data
    return res.status(200).json({ lastReleasesSync: 0, lastGigsSync: 0 })
  }

  const kv = getRedis()

  if (req.method === 'GET') {
    try {
      const data = await kv.get<{ lastReleasesSync?: number; lastGigsSync?: number }>(SYNC_KEY)
      return res.status(200).json({
        lastReleasesSync: data?.lastReleasesSync ?? 0,
        lastGigsSync: data?.lastGigsSync ?? 0,
      })
    } catch (err) {
      console.error('[Sync] Failed to read timestamps:', err)
      return res.status(200).json({ lastReleasesSync: 0, lastGigsSync: 0 })
    }
  }

  if (req.method === 'POST') {
    // Require authenticated admin session for writes
    const sessionValid = await validateSession(req)
    if (!sessionValid) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    try {
      const parsed = syncPostSchema.safeParse(req.body)
      if (!parsed.success) {
        return res.status(400).json({ error: 'Invalid request body', details: parsed.error.issues })
      }
      const body = parsed.data

      // Merge with existing timestamps
      const existing = await kv.get<{ lastReleasesSync?: number; lastGigsSync?: number }>(SYNC_KEY) ?? {}
      const updated = {
        lastReleasesSync: body.lastReleasesSync ?? existing.lastReleasesSync ?? 0,
        lastGigsSync: body.lastGigsSync ?? existing.lastGigsSync ?? 0,
      }

      await kv.set(SYNC_KEY, updated)
      return res.status(200).json(updated)
    } catch (err) {
      console.error('[Sync] Failed to update timestamps:', err)
      return res.status(500).json({ error: 'Failed to update sync timestamps' })
    }
  }

  return res.status(405).json({ error: 'Method Not Allowed' })
}
