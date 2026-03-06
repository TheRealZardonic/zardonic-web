import type { VercelRequest, VercelResponse } from '@vercel/node'
import { applyRateLimit } from './_ratelimit.js'
import { fetchWithRetry } from './_fetch-retry.js'
import { validate, odesliQuerySchema } from './_schemas.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Rate limiting (GDPR-compliant, IP is hashed)
  const allowed = await applyRateLimit(req, res)
  if (!allowed) return

  // Zod validation
  const parsed = validate(odesliQuerySchema, req.query)
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error })
  }
  const { url, userCountry } = parsed.data

  const params = new URLSearchParams({ url })
  if (userCountry) params.set('userCountry', userCountry)

  try {
    const response = await fetchWithRetry(
      `https://api.song.link/v1-alpha.1/links?${params.toString()}`,
      { headers: { 'Accept': 'application/json' } }
    )

    if (!response.ok) {
      return res.status(500).json({ error: `Odesli API responded with ${response.status}` })
    }

    const data = await response.json()
    res.status(200).json(data)
  } catch (error) {
    console.error('Odesli proxy error:', error)
    res.status(502).json({ error: 'Failed to fetch from Odesli API' })
  }
}
