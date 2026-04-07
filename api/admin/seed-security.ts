import { validateSession } from '../auth.js'
import { applyRateLimit } from '../_ratelimit.js'
import { seedHoneytokens, HONEYTOKEN_KEYS } from '../_honeytokens.js'
import { Redis } from '@upstash/redis'
const kv = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || '',
  token: process.env.UPSTASH_REDIS_REST_TOKEN || ''
})

/**
 * Admin endpoint — seed security honeytokens into KV.
 *
 * GET /api/admin/seed-security
 *   Idempotent: checks each honeytoken key and only creates entries that do
 *   not already exist.  Returns a report of which keys were seeded and which
 *   already had values.
 *
 * This endpoint must be called once after initial deployment to ensure the
 * honeytoken trap is active.  Subsequent calls are safe and produce no
 * side-effects on already-seeded keys.
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

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  if (req.method !== 'GET' && req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  // Admin-only: validate session first, then fall back to rate limit for
  // unauthenticated callers to prevent brute-force discovery.
  const sessionValid = await validateSession(req)
  if (!sessionValid) {
    const allowed = await applyRateLimit(req, res)
    if (!allowed) return
    res.status(403).json({ error: 'Forbidden' })
    return
  }

  // Check which honeytoken keys already exist before seeding
  const precheck: Record<string, boolean> = {}
  for (const key of HONEYTOKEN_KEYS) {
    try {
      const existing = await kv.get(key)
      precheck[key] = existing != null
    } catch {
      precheck[key] = false
    }
  }

  await seedHoneytokens()

  const alreadyExisted = HONEYTOKEN_KEYS.filter(k => precheck[k])
  const newlySeeded = HONEYTOKEN_KEYS.filter(k => !precheck[k])

  res.status(200).json({
    success: true,
    alreadyExisted,
    newlySeeded,
    totalKeys: HONEYTOKEN_KEYS.length,
  })
}
