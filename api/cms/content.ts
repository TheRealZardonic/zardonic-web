import type { VercelRequest, VercelResponse } from '@vercel/node'
import { Redis } from '@upstash/redis'
import { applyRateLimit } from '../_ratelimit.js'
import { validateSession } from '../auth.js'
import { cmsContentPostSchema } from '../../src/cms/schemas.js'

let _redis: Redis | null = null
function getRedis(): Redis {
  if (_redis) return _redis
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) throw new Error('Missing Redis config')
  _redis = new Redis({ url, token })
  return _redis
}

// OWASP A03:2021 — Input validation: key must start with zd-cms:
const KEY_PREFIX = /^zd-cms:/

function buildDraftKey(key: string): string {
  // Strip leading "zd-cms:" and store under zd-cms:drafts:{rest}
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

  const kv = getRedis()

  try {
    if (req.method === 'GET') {
      // OWASP A03:2021 — Input validation
      const keyParam = req.query.key
      if (typeof keyParam !== 'string' || !KEY_PREFIX.test(keyParam)) {
        return res.status(400).json({ error: 'Bad Request', details: ['key must start with zd-cms:'] })
      }

      const wantDraft = req.query.draft === 'true'
      const draftKey = buildDraftKey(keyParam)
      const publishedKey = buildPublishedKey(keyParam)

      if (wantDraft) {
        const draft = await kv.get(draftKey)
        if (draft !== null) return res.json({ value: draft, source: 'draft' })
        // Fall through to published if no draft
        const published = await kv.get(publishedKey)
        return res.json({ value: published ?? null, source: published !== null ? 'published' : 'none' })
      }

      const published = await kv.get(publishedKey)
      return res.json({ value: published ?? null, source: published !== null ? 'published' : 'none' })
    }

    if (req.method === 'POST') {
      if (!req.body || typeof req.body !== 'object') {
        return res.status(400).json({ error: 'Bad Request', details: ['Body is required'] })
      }

      // OWASP A03:2021 — Input validation via Zod
      const parsed = cmsContentPostSchema.safeParse(req.body)
      if (!parsed.success) {
        return res.status(400).json({ error: 'Bad Request', details: parsed.error.errors.map(e => e.message) })
      }

      const { key, value, draft } = parsed.data
      const targetKey = draft ? buildDraftKey(key) : buildPublishedKey(key)
      await kv.set(targetKey, value)

      return res.json({ success: true, key: targetKey })
    }

    if (req.method === 'DELETE') {
      // OWASP A03:2021 — Input validation
      const keyParam = req.query.key
      if (typeof keyParam !== 'string' || !KEY_PREFIX.test(keyParam)) {
        return res.status(400).json({ error: 'Bad Request', details: ['key must start with zd-cms:'] })
      }

      const draftKey = buildDraftKey(keyParam)
      await kv.del(draftKey)

      return res.json({ success: true })
    }

    return res.status(405).json({ error: 'Method Not Allowed' })
  } catch (err) {
    console.error('[cms/content] error:', err)
    return res.status(500).json({ error: 'Internal Server Error' })
  }
}
