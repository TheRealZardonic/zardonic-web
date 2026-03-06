import { Redis } from '@upstash/redis'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { applyRateLimit } from './_ratelimit.js'
import { validateSession } from './auth.js'
import { validate, securitySettingsSchema } from './_schemas.js'

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

/**
 * Security settings API — server-persisted security configuration.
 *
 * Settings are stored in Redis under `zd-security-settings`.
 *
 * GET  /api/security-settings  → read current settings (admin only)
 * POST /api/security-settings  → update settings (admin only)
 */

const KV_KEY = 'zd-security-settings'

const isKVConfigured = () =>
  !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)

/** Default security settings */
const DEFAULTS = {
  honeytokensEnabled: true,
  rateLimitEnabled: true,
  robotsTrapEnabled: true,
  entropyInjectionEnabled: true,
  suspiciousUaBlockingEnabled: true,
  sessionBindingEnabled: true,
  maxAlertsStored: 500,
  tarpitMinMs: 3000,
  tarpitMaxMs: 8000,
  sessionTtlSeconds: 14400,
  threatScoringEnabled: true,
  zipBombEnabled: false,
  alertingEnabled: false,
  hardBlockEnabled: true,
  autoBlockThreshold: 12,
}

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
      const stored = await kv.get<Record<string, unknown>>(KV_KEY)
      const settings = { ...DEFAULTS, ...(stored || {}) }
      return res.json({ settings })
    }

    if (req.method === 'POST') {
      if (!req.body || typeof req.body !== 'object') {
        return res.status(400).json({ error: 'Request body is required' })
      }

      const parsed = validate(securitySettingsSchema, req.body)
      if (!parsed.success) return res.status(400).json({ error: parsed.error })

      const stored = await kv.get<Record<string, unknown>>(KV_KEY)
      const updated = { ...DEFAULTS, ...(stored || {}), ...parsed.data }

      await kv.set(KV_KEY, updated)
      return res.json({ success: true, settings: updated })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (error) {
    console.error('Security settings API error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
