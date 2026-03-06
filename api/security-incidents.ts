import { Redis } from '@upstash/redis'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { applyRateLimit } from './_ratelimit.js'
import { validateSession } from './auth.js'

let _redis: Redis | null = null

function getRedis(): Redis {
  if (_redis) return _redis
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    throw new Error('Missing Redis credentials')
  }
  _redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  })
  return _redis
}

const isKVConfigured = () =>
  !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)

/**
 * Security incidents API — returns honeytoken alerts and access violations.
 *
 * GET /api/security-incidents
 *   Requires admin session. Returns the last 500 security events from Redis.
 *
 * DELETE /api/security-incidents
 *   Requires admin session. Clears all stored security incidents.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end()

  const allowed = await applyRateLimit(req, res)
  if (!allowed) return

  const sessionValid = await validateSession(req)
  if (!sessionValid) return res.status(403).json({ error: 'Forbidden' })

  if (!isKVConfigured()) {
    return res.status(503).json({ error: 'Service unavailable', message: 'KV storage is not configured.' })
  }

  const kv = getRedis()

  try {
    if (req.method === 'GET') {
      const raw = await kv.lrange('zd-honeytoken-alerts', 0, 499)
      const incidents = (raw || []).map((entry) => {
        if (typeof entry === 'string') {
          try { return JSON.parse(entry) } catch { return entry }
        }
        return entry
      })
      return res.json({ incidents })
    }

    if (req.method === 'DELETE') {
      await kv.del('zd-honeytoken-alerts')
      return res.json({ success: true })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (error) {
    console.error('Security incidents API error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
