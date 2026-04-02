import type { VercelRequest, VercelResponse } from '@vercel/node'
import { Redis } from '@upstash/redis'
import { applyRateLimit } from '../_ratelimit.js'
import { validateSession } from '../auth.js'
import { cmsPublishSchema } from '../../src/cms/schemas.js'

let _redis: Redis | null = null
function getRedis(): Redis {
  if (_redis) return _redis
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) throw new Error('Missing Redis config')
  _redis = new Redis({ url, token })
  return _redis
}

function buildDraftKey(key: string): string {
  const rest = key.replace(/^zd-cms:/, '')
  return `zd-cms:drafts:${rest}`
}

function buildPublishedKey(key: string): string {
  const rest = key.replace(/^zd-cms:/, '')
  return `zd-cms:published:${rest}`
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // OWASP A07:2021 — Authentication check
  const authenticated = await validateSession(req)
  if (!authenticated) return res.status(401).json({ error: 'Unauthorized' })

  // OWASP A07:2021 — Rate limiting
  const allowed = await applyRateLimit(req, res)
  if (!allowed) return

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  if (!req.body || typeof req.body !== 'object') {
    return res.status(400).json({ error: 'Bad Request', details: ['Body is required'] })
  }

  // OWASP A03:2021 — Input validation via Zod
  const parsed = cmsPublishSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: 'Bad Request', details: parsed.error.errors.map(e => e.message) })
  }

  const { key, revert } = parsed.data
  const draftKey = buildDraftKey(key)
  const publishedKey = buildPublishedKey(key)

  const kv = getRedis()

  try {
    if (revert) {
      // Revert: delete published version, leaving draft intact
      await kv.del(publishedKey)
      return res.json({ success: true, action: 'reverted' })
    }

    // Publish: copy draft → published
    const draft = await kv.get(draftKey)
    if (draft === null) {
      return res.status(404).json({ error: 'Not Found', details: ['No draft found for this key'] })
    }

    await kv.set(publishedKey, draft)
    return res.json({ success: true, action: 'published' })
  } catch (err) {
    console.error('[cms/publish] error:', err)
    return res.status(500).json({ error: 'Internal Server Error' })
  }
}
