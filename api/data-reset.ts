/**
 * POST /api/data-reset
 *
 * Clears the releases or gigs array from the `band-data` KV entry so the
 * admin can trigger a fresh import on the next sync.
 *
 * Body: { target: 'releases' | 'gigs' }
 * Requires a valid admin session.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getRedisOrNull, isRedisConfigured } from './_redis.js'
import { validateSession } from './auth.js'

interface SiteData {
  releases?: unknown[]
  gigs?: unknown[]
  [key: string]: unknown
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method === 'OPTIONS') { res.status(200).end(); return }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return }

  const sessionValid = await validateSession(req)
  if (!sessionValid) { res.status(401).json({ error: 'Unauthorized' }); return }

  if (!isRedisConfigured()) {
    res.status(503).json({ error: 'Redis not configured' }); return
  }

  const { target } = (req.body ?? {}) as { target?: string }
  if (target !== 'releases' && target !== 'gigs') {
    res.status(400).json({ error: 'Invalid target. Must be "releases" or "gigs".' }); return
  }

  const redis = getRedisOrNull()!

  try {
    const existing = await redis.get<SiteData>('band-data')
    const updated: SiteData = { ...(existing ?? {}), [target]: [] }
    await redis.set('band-data', updated)

    res.status(200).json({ ok: true, target, cleared: existing?.[target]?.length ?? 0 })
  } catch (error) {
    console.error('[data-reset] Unexpected error:', error)
    res.status(500).json({ error: 'Failed to reset data' })
  }
}
