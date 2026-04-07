import { Redis } from '@upstash/redis'
const kv = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || '',
  token: process.env.UPSTASH_REDIS_REST_TOKEN || ''
})
import { applyRateLimit } from './_ratelimit.js'
import { validateSession } from './auth.js'

/**
 * Canary alerts API — retrieve persisted canary document callback data.
 *
 * GET  /api/canary-alerts  → list canary callback alerts (admin only)
 *
 * Returns an array of canary callback events, each containing:
 * - token, hashedIp, openerIp, downloaderIp
 * - userAgent, acceptLanguage, event type
 * - timestamp, documentPath
 * - jsFingerprint (timezone, language, platform, screen, canvas hash, realIp)
 */

interface VercelRequest {
  method?: string
  body?: Record<string, unknown>
  query?: Record<string, string | string[]>
  headers: Record<string, string | string[] | undefined>
}

interface VercelResponse {
  setHeader(key: string, value: string): VercelResponse
  status(code: number): VercelResponse
  json(data: unknown): VercelResponse
  end(): VercelResponse
}

const CANARY_ALERTS_KEY = 'nk-canary-alerts'

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  // Validate session first — authenticated admins bypass rate limiting
  // to prevent 429 errors when the dashboard loads multiple endpoints after login
  const sessionValid = await validateSession(req)
  if (!sessionValid) {
    const allowed = await applyRateLimit(req, res)
    if (!allowed) return
    res.status(403).json({ error: 'Forbidden' })
    return
  }

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  try {
    const raw = await kv.lrange(CANARY_ALERTS_KEY, 0, 499)
    const alerts = (raw || []).map(entry => {
      if (typeof entry === 'string') {
        try { return JSON.parse(entry) } catch { return entry }
      }
      return entry
    })

    res.json({ alerts })
  } catch (error) {
    console.error('Canary alerts API error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}
