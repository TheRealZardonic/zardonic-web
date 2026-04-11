/**
 * POST /api/releases-cache-clear
 *
 * Admin-only endpoint that scans and deletes all `odesli:links:*` keys from
 * Redis, clearing any stale cached Odesli failures so the next enrichment run
 * gets fresh results.
 *
 * Requires a valid admin session (no cron access).
 *
 * Response: { ok: true, cleared: <number> }
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getRedisOrNull, isRedisConfigured } from './_redis.js'
import { validateSession } from './auth.js'

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method === 'OPTIONS') { res.status(200).end(); return }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return }

  const sessionValid = await validateSession(req)
  if (!sessionValid) { res.status(401).json({ error: 'Unauthorized' }); return }

  if (!isRedisConfigured()) {
    res.status(503).json({ error: 'Redis not configured' }); return
  }

  const redis = getRedisOrNull()!

  try {
    // Scan for all odesli:links:* keys and delete them in batches
    let cursor = '0'
    let cleared = 0

    do {
      const scanResult: [string, string[]] = await redis.scan(cursor, { match: 'odesli:links:*', count: 100 })
      cursor = scanResult[0]
      const keys: string[] = scanResult[1]

      if (keys.length > 0) {
        try {
          await Promise.all(keys.map(k => redis.del(k)))
          cleared += keys.length
        } catch {
          // Non-fatal: count what we can
        }
      }
    } while (cursor !== '0')

    console.log(`[releases-cache-clear] Cleared ${cleared} odesli:links:* keys from Redis`)
    res.status(200).json({ ok: true, cleared })
  } catch (error) {
    console.error('[releases-cache-clear] Unexpected error:', error)
    res.status(500).json({ error: 'Failed to clear cache' })
  }
}
