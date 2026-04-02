import type { VercelRequest, VercelResponse } from '@vercel/node'
import { Redis } from '@upstash/redis'
import { applyRateLimit } from '../_ratelimit.js'
import { validateSession } from '../auth.js'
import { siteConfigSchema } from '../../src/cms/schemas.js'

const CONFIG_KEY = 'zd-cms:config'

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
      const config = await kv.get(CONFIG_KEY)
      return res.json({ config: config ?? null })
    }

    if (req.method === 'POST') {
      if (!req.body || typeof req.body !== 'object') {
        return res.status(400).json({ error: 'Bad Request', details: ['Body is required'] })
      }

      // OWASP A03:2021 — Input validation via Zod
      const parsed = siteConfigSchema.safeParse(req.body)
      if (!parsed.success) {
        return res.status(400).json({ error: 'Bad Request', details: parsed.error.errors.map(e => e.message) })
      }

      await kv.set(CONFIG_KEY, parsed.data)

      return res.json({ success: true, config: parsed.data })
    }

    return res.status(405).json({ error: 'Method Not Allowed' })
  } catch (err) {
    console.error('[cms/site-config] error:', err)
    return res.status(500).json({ error: 'Internal Server Error' })
  }
}
