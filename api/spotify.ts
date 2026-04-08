import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getRedisOrNull } from './_redis.js'
import { applyRateLimit } from './_ratelimit.js'
import { fetchWithRetry } from './_fetch-retry.js'
import { validate, spotifyQuerySchema } from './_schemas.js'

const SPOTIFY_TOKEN_KEY = 'spotify:access-token'
const TOKEN_TTL_SECONDS = 3500 // Spotify tokens live 3600s; cache with buffer

async function getAccessToken(): Promise<string> {
  const redis = getRedisOrNull()

  // Try cache first
  if (redis) {
    try {
      const cached = await redis.get<string>(SPOTIFY_TOKEN_KEY)
      if (cached) return cached
    } catch {
      // Cache miss or Redis error — continue to fetch a fresh token
    }
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    throw new Error('Spotify credentials are not configured')
  }

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')

  const response = await fetchWithRetry('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  })

  if (!response.ok) {
    throw new Error(`Spotify token request failed with status ${response.status}`)
  }

  const data = await response.json() as { access_token: string }
  const accessToken: string = data.access_token

  // Cache token in Redis with TTL
  if (redis) {
    try {
      await redis.set(SPOTIFY_TOKEN_KEY, accessToken, { ex: TOKEN_TTL_SECONDS })
    } catch {
      // Non-fatal: continue even if caching fails
    }
  }

  return accessToken
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Rate limiting
  const allowed = await applyRateLimit(req, res)
  if (!allowed) return

  // Check credentials
  if (!process.env.SPOTIFY_CLIENT_ID || !process.env.SPOTIFY_CLIENT_SECRET) {
    return res.status(503).json({
      error: 'Service unavailable',
      message: 'Spotify API is not configured. Please set SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET environment variables.',
    })
  }

  // Validate query parameters
  const parsed = validate(spotifyQuerySchema, req.query)
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error })
  }

  const { action, id, query, market } = parsed.data

  try {
    const token = await getAccessToken()
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
    }

    let apiUrl: string

    switch (action) {
      case 'artist': {
        if (!id) return res.status(400).json({ error: 'id parameter is required for action=artist' })
        apiUrl = `https://api.spotify.com/v1/artists/${encodeURIComponent(id)}`
        break
      }
      case 'top-tracks': {
        if (!id) return res.status(400).json({ error: 'id parameter is required for action=top-tracks' })
        const marketParam = market ? `?market=${encodeURIComponent(market)}` : '?market=US'
        apiUrl = `https://api.spotify.com/v1/artists/${encodeURIComponent(id)}/top-tracks${marketParam}`
        break
      }
      case 'albums': {
        if (!id) return res.status(400).json({ error: 'id parameter is required for action=albums' })
        apiUrl = `https://api.spotify.com/v1/artists/${encodeURIComponent(id)}/albums`
        break
      }
      case 'search': {
        if (!query) return res.status(400).json({ error: 'query parameter is required for action=search' })
        const searchType = (req.query.type as string) ?? 'album'
        const searchUrl = `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=${encodeURIComponent(searchType)}&limit=50&market=${market ?? 'US'}`

        const searchRedis = getRedisOrNull()
        const searchCacheKey = `spotify:search:${query.toLowerCase().replace(/\s+/g, '-')}:${searchType}`
        if (searchRedis) {
          try {
            const cached = await searchRedis.get<unknown>(searchCacheKey)
            if (cached !== null && cached !== undefined) {
              res.setHeader('Cache-Control', 'public, max-age=300')
              res.setHeader('X-Cache', 'HIT')
              return res.status(200).json(cached)
            }
          } catch { /* fall through */ }
        }

        const searchRes = await fetchWithRetry(searchUrl, { headers })
        if (!searchRes.ok) return res.status(searchRes.status).json({ error: `Spotify API responded with ${searchRes.status}` })
        const searchData = await searchRes.json()
        if (searchRedis) {
          try { await searchRedis.set(searchCacheKey, searchData, { ex: 43200 }) } catch { /* non-fatal */ }
        }
        res.setHeader('Cache-Control', 'public, max-age=300')
        res.setHeader('X-Cache', 'MISS')
        return res.status(200).json(searchData)
      }
      default:
        return res.status(400).json({ error: 'Invalid action parameter' })
    }

    const response = await fetchWithRetry(apiUrl, { headers })

    if (!response.ok) {
      return res.status(response.status).json({ error: `Spotify API responded with ${response.status}` })
    }

    const data = await response.json()
    res.setHeader('Cache-Control', 'public, max-age=300')
    return res.status(200).json(data)
  } catch (error) {
    console.error('Spotify proxy error:', error)
    return res.status(502).json({ error: 'Failed to fetch from Spotify API' })
  }
}
