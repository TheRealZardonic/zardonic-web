import { applyRateLimit } from './_ratelimit.js'
import { odesliQuerySchema, validate } from './_schemas.js'
import { fetchWithRetry } from './_fetch-retry.js'

interface VercelRequest {
  method?: string
  body?: Record<string, unknown>
  query?: Record<string, string | string[]>
  headers: Record<string, string | string[] | undefined>
}

interface VercelResponse {
  setHeader(key: string, value: string): VercelResponse
  status(code: number): VercelResponse
  json(data: unknown): VercelResponse
  end(): VercelResponse
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  // Rate limiting (GDPR-compliant, IP is hashed)
  const allowed = await applyRateLimit(req, res)
  if (!allowed) return

  // Zod validation
  const parsed = validate(odesliQuerySchema, req.query)
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error })
    return
  }
  const { url } = parsed.data

  try {
    const response = await fetchWithRetry(
      `https://api.song.link/v1-alpha.1/links?url=${encodeURIComponent(url)}&userCountry=US`
    )

    if (!response.ok) {
      throw new Error(`Odesli API responded with ${response.status}`)
    }

    const data = await response.json()
    res.status(200).json(data)
  } catch (error) {
    console.error('Odesli API error:', error)
    res.status(500).json({ error: 'Failed to fetch from Odesli API' })
  }
}
