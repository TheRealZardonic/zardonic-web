import type { VercelRequest, VercelResponse } from '@vercel/node'
import { applyRateLimit } from '../_ratelimit.js'
import { getRedis } from '../_redis.js'
import { validateSession } from '../auth.js'
import { cmsAutoSaveSchema } from '../../src/cms/schemas.js'

const AUTOSAVE_TTL = 24 * 60 * 60 // 24 hours in seconds
const KEY_PREFIX = /^zd-cms:/

function buildAutoSaveKey(key: string): string {
  const rest = key.replace(/^zd-cms:/, '')
  return `zd-cms:autosave:${rest}`
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // OWASP A07:2021 — Authentication check
  const authenticated = await validateSession(req)
  if (!authenticated) return res.status(401).json({ error: 'Unauthorized' })

  // OWASP A07:2021 — Rate limiting
  const allowed = await applyRateLimit(req, res)
  if (!allowed) return

  try {
    if (req.method === 'GET') {
      // OWASP A03:2021 — Input validation
      const keyParam = req.query.key
      if (typeof keyParam !== 'string' || !KEY_PREFIX.test(keyParam)) {
        return res.status(400).json({ error: 'Bad Request', details: ['key must start with zd-cms:'] })
      }

      const kv = getRedis()
      const autoSaveKey = buildAutoSaveKey(keyParam)
      const value = await kv.get(autoSaveKey)

      return res.json({ value: value ?? null })
    }

    if (req.method === 'POST') {
      if (!req.body || typeof req.body !== 'object') {
        return res.status(400).json({ error: 'Bad Request', details: ['Body is required'] })
      }

      // OWASP A03:2021 — Input validation via Zod
      const parsed = cmsAutoSaveSchema.safeParse(req.body)
      if (!parsed.success) {
        return res.status(400).json({ error: 'Bad Request', details: parsed.error.errors.map(e => e.message) })
      }

      const { key, value } = parsed.data
      const kv = getRedis()
      const autoSaveKey = buildAutoSaveKey(key)
      await kv.set(autoSaveKey, value, { ex: AUTOSAVE_TTL })

      return res.json({ success: true })
    }

    if (req.method === 'DELETE') {
      // OWASP A03:2021 — Input validation
      const keyParam = req.query.key
      if (typeof keyParam !== 'string' || !KEY_PREFIX.test(keyParam)) {
        return res.status(400).json({ error: 'Bad Request', details: ['key must start with zd-cms:'] })
      }

      const kv = getRedis()
      const autoSaveKey = buildAutoSaveKey(keyParam)
      await kv.del(autoSaveKey)

      return res.json({ success: true })
    }

    return res.status(405).json({ error: 'Method Not Allowed' })
  } catch (err) {
    console.error('[cms/autosave] error:', err)
    return res.status(500).json({ error: 'Internal Server Error' })
  }
}
