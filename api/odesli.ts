import type { VercelRequest, VercelResponse } from '@vercel/node'
import { applyRateLimit, applyOdesliGlobalRateLimit } from './_ratelimit.js'
import { odesliQuerySchema, validate } from './_schemas.js'
import { fetchWithRetry } from './_fetch-retry.js'
import { getRedisOrNull } from './_redis.js'

const CACHE_TTL_SECONDS = 86400

function cacheKey(url: string): string {
  const normalized = url.replace(/^https?:\/\//, '').replace(/[^a-zA-Z0-9._/-]/g, '_').slice(0, 200)
  return `odesli:links:${normalized}`
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  const allowed = await applyRateLimit(req, res)
  if (!allowed) return

  const parsed = validate(odesliQuerySchema, req.query)
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error })
    return
  }
  const { url } = parsed.data

  const redis = getRedisOrNull()
  const redisKey = cacheKey(url)

  if (redis) {
    try {
      const cached = await redis.get<unknown>(redisKey)
      if (cached !== null && cached !== undefined) {
        res.setHeader('Cache-Control', 'public, max-age=3600')
        res.setHeader('X-Cache', 'HIT')
        res.status(200).json(cached)
        return
      }
    } catch { /* fall through */ }
  }

  try {
    const globalAllowed = await applyOdesliGlobalRateLimit(res)
    if (!globalAllowed) return

    const response = await fetchWithRetry(
      `https://api.song.link/v1-alpha.1/links?url=${encodeURIComponent(url)}&userCountry=US`
    )

    if (!response.ok) throw new Error(`Odesli API responded with ${response.status}`)

    const data = await response.json()

    if (redis) {
      try { await redis.set(redisKey, data, { ex: CACHE_TTL_SECONDS }) } catch { /* non-fatal */ }
    }

    res.setHeader('Cache-Control', 'public, max-age=3600')
    res.setHeader('X-Cache', 'MISS')
    res.status(200).json(data)
  } catch (error) {
    console.error('Odesli API error:', error)
    res.status(500).json({ error: 'Failed to fetch from Odesli API' })
  }
}
