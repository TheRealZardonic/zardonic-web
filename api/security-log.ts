import { Redis } from '@upstash/redis'
const kv = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || '',
  token: process.env.UPSTASH_REDIS_REST_TOKEN || ''
})
import { applyRateLimit } from './_ratelimit.js'
import { validateSession } from './auth.js'
import { z } from 'zod'
import { validate } from './_schemas.js'

/**
 * Unified security log endpoint — admin-only access to the structured
 * event log written by all security countermeasure modules.
 *
 * GET /api/security-log
 *   Requires admin session. Returns up to `limit` (default 100, max 500)
 *   structured security event entries from newest to oldest.
 *
 *   Query params:
 *     limit   — number of entries (1–500, default 100)
 *     event   — filter by event name (e.g. HONEYTOKEN_ACCESS)
 *     severity — filter by severity (info|warn|high|critical)
 *
 * DELETE /api/security-log
 *   Requires admin session. Clears the entire unified security log from KV.
 */

const SECURITY_LOG_KEY = 'nk-security-log'

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

const isKVConfigured = (): boolean =>
  !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN)

const querySchema = z.object({
  limit: z.coerce.number().int().min(1).max(500).optional().default(100),
  event: z.string().max(64).optional(),
  severity: z.enum(['info', 'warn', 'high', 'critical']).optional(),
})

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  // Admin session required — no unauthenticated access to security logs
  const sessionValid = await validateSession(req)
  if (!sessionValid) {
    const allowed = await applyRateLimit(req, res)
    if (!allowed) return
    res.status(403).json({ error: 'Forbidden' })
    return
  }

  if (!isKVConfigured()) {
    res.status(503).json({ error: 'Service unavailable', message: 'KV storage is not configured.' })
    return
  }

  try {
    if (req.method === 'GET') {
      const parsed = validate(querySchema, req.query)
      if (!parsed.success) {
        res.status(400).json({ error: parsed.error })
        return
      }

      const { limit, event: eventFilter, severity: severityFilter } = parsed.data

      // Fetch raw entries (fetch up to 500 from KV, filter client-side)
      const raw = await kv.lrange(SECURITY_LOG_KEY, 0, 499)
      let entries = (raw || []).map(entry => {
        if (typeof entry === 'string') {
          try { return JSON.parse(entry) as Record<string, unknown> } catch { return entry }
        }
        return entry
      })

      // Apply filters
      if (eventFilter) {
        entries = entries.filter(
          e => typeof e === 'object' && e !== null && (e as Record<string, unknown>).event === eventFilter
        )
      }
      if (severityFilter) {
        entries = entries.filter(
          e => typeof e === 'object' && e !== null && (e as Record<string, unknown>).severity === severityFilter
        )
      }

      // Apply limit
      entries = entries.slice(0, limit)

      res.json({
        entries,
        total: entries.length,
        meta: {
          retrievedAt: new Date().toISOString(),
          filters: { event: eventFilter ?? null, severity: severityFilter ?? null },
        },
      })
      return
    }

    if (req.method === 'DELETE') {
      await kv.del(SECURITY_LOG_KEY)
      console.error('[SECURITY:LOG_CLEARED]', JSON.stringify({
        timestamp: new Date().toISOString(),
        action: 'security_log_cleared',
      }))
      res.json({ success: true })
      return
    }

    res.status(405).json({ error: 'Method not allowed' })
  } catch (error) {
    console.error('Security log API error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}
