import type { VercelRequest, VercelResponse } from '@vercel/node'
import { applyRateLimit } from './_ratelimit.js'
import { fetchWithRetry } from './_fetch-retry.js'
import { validate, itunesQuerySchema } from './_schemas.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Rate limiting
  const allowed = await applyRateLimit(req, res)
  if (!allowed) return

  // Validate query parameters
  const parsed = validate(itunesQuerySchema, req.query)
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error })
  }

  const { term, entity } = parsed.data

  try {
    // When entity is "all", fetch both songs and albums to capture every release
    if (entity === 'all') {
      const [songsRes, albumsRes] = await Promise.all([
        fetchWithRetry(
          `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&entity=song&limit=200`,
          { headers: { 'Accept': 'application/json' } }
        ),
        fetchWithRetry(
          `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&entity=album&limit=200`,
          { headers: { 'Accept': 'application/json' } }
        ),
      ])

      if (!songsRes.ok) throw new Error(`iTunes songs API responded with ${songsRes.status}`)
      if (!albumsRes.ok) throw new Error(`iTunes albums API responded with ${albumsRes.status}`)

      const [songsData, albumsData] = await Promise.all([songsRes.json(), albumsRes.json()])

      const combined = {
        resultCount: (songsData.resultCount || 0) + (albumsData.resultCount || 0),
        results: [...(songsData.results || []), ...(albumsData.results || [])],
      }
      return res.status(200).json(combined)
    }

    // Default: single entity search
    const searchEntity = entity || 'album'
    const response = await fetchWithRetry(
      `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&entity=${encodeURIComponent(searchEntity)}&limit=200`,
      { headers: { 'Accept': 'application/json' } }
    )

    if (!response.ok) {
      return res.status(500).json({ error: `iTunes API responded with ${response.status}` })
    }

    const data = await response.json()
    res.status(200).json(data)
  } catch (error) {
    console.error('iTunes proxy error:', error)
    res.status(502).json({ error: 'Failed to fetch from iTunes API' })
  }
}
