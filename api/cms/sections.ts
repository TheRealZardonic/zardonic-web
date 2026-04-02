import type { VercelRequest, VercelResponse } from '@vercel/node'
import { Redis } from '@upstash/redis'
import { applyRateLimit } from '../_ratelimit.js'
import { validateSession } from '../auth.js'
import { cmsSectionsPostSchema } from '../../src/cms/schemas.js'

const SECTIONS_KEY = 'zd-cms:sections:index'

let _redis: Redis | null = null
function getRedis(): Redis {
  if (_redis) return _redis
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) throw new Error('Missing Redis config')
  _redis = new Redis({ url, token })
  return _redis
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // OWASP A07:2021 — Authentication check
  const authenticated = await validateSession(req)
  if (!authenticated) return res.status(401).json({ error: 'Unauthorized' })

  // OWASP A07:2021 — Rate limiting
  const allowed = await applyRateLimit(req, res)
  if (!allowed) return

  const kv = getRedis()

  try {
    if (req.method === 'GET') {
      const sections = await kv.get(SECTIONS_KEY)
      return res.json({ sections: sections ?? [] })
    }

    if (req.method === 'POST') {
      if (!req.body || typeof req.body !== 'object') {
        return res.status(400).json({ error: 'Bad Request', details: ['Body is required'] })
      }

      // OWASP A03:2021 — Input validation via Zod
      const parsed = cmsSectionsPostSchema.safeParse(req.body)
      if (!parsed.success) {
        return res.status(400).json({ error: 'Bad Request', details: parsed.error.errors.map(e => e.message) })
      }

      await kv.set(SECTIONS_KEY, parsed.data.sections)

      return res.json({ success: true, sections: parsed.data.sections })
    }

    return res.status(405).json({ error: 'Method Not Allowed' })
  } catch (err) {
    console.error('[cms/sections] error:', err)
    return res.status(500).json({ error: 'Internal Server Error' })
  }
}
