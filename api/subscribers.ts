import { Redis } from '@upstash/redis'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { applyRateLimit } from './_ratelimit.js'
import { validateSession } from './auth.js'

const KV_KEY = 'newsletter-subscribers'

let _redis: Redis | null = null

function getRedis(): Redis | null {
  if (_redis) return _redis
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return null
  }
  _redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  })
  return _redis
}

/**
 * Newsletter subscriber management API (admin only).
 *
 * GET    — list all locally stored subscribers
 * DELETE — remove a subscriber by email
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end()

  const allowed = await applyRateLimit(req, res)
  if (!allowed) return

  const kv = getRedis()
  if (!kv) {
    return res.status(503).json({ error: 'KV storage not configured' })
  }

  const sessionValid = await validateSession(req)
  if (!sessionValid) {
    return res.status(403).json({ error: 'Forbidden' })
  }

  try {
    if (req.method === 'GET') {
      const subscribers = (await kv.get(KV_KEY)) || []
      return res.status(200).json({ subscribers })
    }

    if (req.method === 'DELETE') {
      const { email } = (req.body as { email?: string }) || {}
      if (!email) {
        return res.status(400).json({ error: 'Email is required' })
      }
      const raw = await kv.get(KV_KEY)
      const subscribers = Array.isArray(raw) ? raw as Array<{ email: string }> : []
      const filtered = subscribers.filter((s) => s.email !== email)
      await kv.set(KV_KEY, filtered)
      return res.status(200).json({ success: true })
    }

    res.setHeader('Allow', 'GET, DELETE, OPTIONS')
    return res.status(405).json({ error: 'Method not allowed' })
  } catch (err) {
    console.error('Subscribers API error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
