import type { VercelRequest, VercelResponse } from '@vercel/node'
import { applyRateLimit } from './_ratelimit.js'
import { fetchWithRetry } from './_fetch-retry.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Rate limiting
  const allowed = await applyRateLimit(req, res)
  if (!allowed) return

  const { artist } = req.query

  if (!artist || typeof artist !== 'string') {
    return res.status(400).json({ error: 'Missing artist parameter' })
  }

  // Check if Bandsintown API key is configured
  const apiKey = process.env.BANDSINTOWN_API_KEY
  if (!apiKey) {
    return res.status(503).json({
      error: 'Service unavailable',
      message: 'Bandsintown API is not configured. Please set BANDSINTOWN_API_KEY environment variable.'
    })
  }

  const params = new URLSearchParams()
  params.set('app_id', apiKey)

  try {
    const response = await fetchWithRetry(
      `https://rest.bandsintown.com/artists/${encodeURIComponent(artist)}/events?${params.toString()}`,
      { headers: { 'Accept': 'application/json' } }
    )

    if (!response.ok) {
      return res.status(response.status).json({ error: `Bandsintown API responded with ${response.status}` })
    }

    const text = await response.text()
    try {
      const data = JSON.parse(text)
      res.status(200).json(data)
    } catch {
      res.status(502).json({ error: 'Invalid JSON response from Bandsintown API' })
    }
  } catch (error) {
    console.error('Bandsintown proxy error:', error)
    res.status(502).json({ error: 'Failed to fetch from Bandsintown API' })
  }
}
