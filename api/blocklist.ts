import type { VercelRequest, VercelResponse } from '@vercel/node'
import { applyRateLimit } from './_ratelimit.js'
import { validateSession } from './auth.js'
import { blockIp, unblockIp, getAllBlockedIps } from './_blocklist.js'
import { validate, blockSchema, unblockSchema } from './_schemas.js'

const isKVConfigured = () =>
  !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end()

  const allowed = await applyRateLimit(req, res)
  if (!allowed) return

  const sessionValid = await validateSession(req)
  if (!sessionValid) return res.status(403).json({ error: 'Forbidden' })

  if (!isKVConfigured()) return res.status(503).json({ error: 'Service unavailable' })

  try {
    if (req.method === 'GET') {
      const entries = await getAllBlockedIps()
      return res.json({ blocked: entries })
    }

    if (req.method === 'POST') {
      const parsed = validate(blockSchema, req.body)
      if (!parsed.success) return res.status(400).json({ error: parsed.error })
      await blockIp(parsed.data.hashedIp, parsed.data.reason, parsed.data.ttlSeconds)
      return res.json({ success: true })
    }

    if (req.method === 'DELETE') {
      const parsed = validate(unblockSchema, req.body)
      if (!parsed.success) return res.status(400).json({ error: parsed.error })
      await unblockIp(parsed.data.hashedIp)
      return res.json({ success: true })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (error) {
    console.error('Blocklist API error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
