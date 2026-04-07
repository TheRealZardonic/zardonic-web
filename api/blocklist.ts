import { applyRateLimit } from './_ratelimit.js'
import { validateSession } from './auth.js'
import { blockIp, unblockIp, getAllBlockedIps } from './_blocklist.js'
import { z } from 'zod'
import { validate } from './_schemas.js'

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

const isKVConfigured = (): boolean => !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN)

const blockSchema = z.object({
  hashedIp: z.string().min(8).max(64),
  reason: z.string().max(200).optional().default('manual'),
  ttlSeconds: z.number().int().min(60).max(2592000).optional().default(604800),
})

const unblockSchema = z.object({
  hashedIp: z.string().min(8).max(64),
})

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

  if (!isKVConfigured()) {
    res.status(503).json({ error: 'Service unavailable' })
    return
  }

  try {
    if (req.method === 'GET') {
      const entries = await getAllBlockedIps()
      res.json({ blocked: entries })
      return
    }

    if (req.method === 'POST') {
      const parsed = validate(blockSchema, req.body)
      if (!parsed.success) {
        res.status(400).json({ error: parsed.error })
        return
      }
      await blockIp(parsed.data.hashedIp, parsed.data.reason, parsed.data.ttlSeconds)
      res.json({ success: true })
      return
    }

    if (req.method === 'DELETE') {
      const parsed = validate(unblockSchema, req.body)
      if (!parsed.success) {
        res.status(400).json({ error: parsed.error })
        return
      }
      await unblockIp(parsed.data.hashedIp)
      res.json({ success: true })
      return
    }

    res.status(405).json({ error: 'Method not allowed' })
  } catch (error) {
    console.error('Blocklist API error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}
