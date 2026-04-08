import type { VercelRequest, VercelResponse } from '@vercel/node'
import { applyRateLimit } from './_ratelimit.js'
import { itunesQuerySchema, validate } from './_schemas.js'
import { fetchWithRetry } from './_fetch-retry.js'
import { getRedisOrNull } from './_redis.js'

/** Redis TTL for iTunes results: 12 hours */
const CACHE_TTL_SECONDS = 43200

function cacheKey(term: string, entity: string): string {
  return `itunes:${term.toLowerCase().replace(/\s+/g, '-')}:${entity}`
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  const allowed = await applyRateLimit(req, res)
  if (!allowed) return

  const parsed = validate(itunesQuerySchema, req.query)
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error })
    return
  }
  const { term, entity } = parsed.data

  const redis = getRedisOrNull()
  const searchEntity = entity || 'album'
  const redisKey = cacheKey(term, entity === 'all' ? 'all' : searchEntity)

  // Serve from Redis cache if available
  if (redis) {
    try {
      const cached = await redis.get<unknown>(redisKey)
      if (cached !== null && cached !== undefined) {
        res.setHeader('Cache-Control', 'public, max-age=1800')
        res.setHeader('X-Cache', 'HIT')
        res.status(200).json(cached)
        return
      }
    } catch { /* fall through */ }
  }

  try {
    if (entity === 'all') {
      const [songsRes, albumsRes] = await Promise.all([
        fetchWithRetry(`https://itunes.apple.com/search?term=${encodeURIComponent(term)}&entity=song&limit=200`),
        fetchWithRetry(`https://itunes.apple.com/search?term=${encodeURIComponent(term)}&entity=album&limit=200`),
      ])

      if (songsRes.status === 429 || albumsRes.status === 429) {
        const retryAfter = songsRes.headers.get('Retry-After') ?? albumsRes.headers.get('Retry-After') ?? '60'
        res.setHeader('Retry-After', retryAfter)
        // Serve stale cache on 429
        if (redis) {
          try {
            const stale = await redis.get<unknown>(redisKey)
            if (stale !== null && stale !== undefined) {
              res.setHeader('X-Cache', 'STALE')
              res.status(200).json(stale)
              return
            }
          } catch { /* ignore */ }
        }
        return res.status(429).json({ error: 'rate_limited', retryAfter: parseInt(retryAfter, 10) })
      }
      if (!songsRes.ok) throw new Error(`iTunes songs API responded with ${songsRes.status}`)
      if (!albumsRes.ok) throw new Error(`iTunes albums API responded with ${albumsRes.status}`)

      const [songsData, albumsData] = await Promise.all([songsRes.json(), albumsRes.json()])
      const combined = {
        resultCount: (songsData.resultCount || 0) + (albumsData.resultCount || 0),
        results: [...(songsData.results || []), ...(albumsData.results || [])],
      }

      if (redis) {
        try { await redis.set(redisKey, combined, { ex: CACHE_TTL_SECONDS }) } catch { /* non-fatal */ }
      }

      res.setHeader('Cache-Control', 'public, max-age=1800')
      res.setHeader('X-Cache', 'MISS')
      res.status(200).json(combined)
      return
    }

    const response = await fetchWithRetry(`https://itunes.apple.com/search?term=${encodeURIComponent(term)}&entity=${encodeURIComponent(searchEntity)}&limit=200`)

    if (response.status === 429) {
      res.setHeader('Retry-After', response.headers.get('Retry-After') ?? '60')
      if (redis) {
        try {
          const stale = await redis.get<unknown>(redisKey)
          if (stale !== null && stale !== undefined) {
            res.setHeader('X-Cache', 'STALE')
            res.status(200).json(stale)
            return
          }
        } catch { /* ignore */ }
      }
      return res.status(429).json({ error: 'rate_limited', retryAfter: 60 })
    }
    if (!response.ok) throw new Error(`iTunes API responded with ${response.status}`)

    const data = await response.json()
    if (redis) {
      try { await redis.set(redisKey, data, { ex: CACHE_TTL_SECONDS }) } catch { /* non-fatal */ }
    }

    res.setHeader('Cache-Control', 'public, max-age=1800')
    res.setHeader('X-Cache', 'MISS')
    res.status(200).json(data)
  } catch (error) {
    console.error('iTunes API error:', error)
    res.status(500).json({ error: 'Failed to fetch from iTunes API' })
  }
}
