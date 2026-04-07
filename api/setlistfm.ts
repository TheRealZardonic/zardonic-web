/**
 * GET /api/setlistfm?mbid=<uuid>&p=<page>
 *
 * Proxy for the Setlist.fm public API that avoids CORS issues from the browser.
 * Requires the SETLISTFM_API_KEY environment variable.
 *
 * Returns:
 *   200 { setlists: SetlistItem[] }
 *   200 { setlists: [], error: 'SETLISTFM_API_KEY not configured' }  — key absent
 *   400 { error: string }                                             — bad input
 *   429 / 503                                                         — rate limit
 *   500 { error: string }                                             — upstream failure
 */
import { applyRateLimit } from './_ratelimit.js'
import { setlistfmQuerySchema, validate } from './_schemas.js'
import { fetchWithRetry } from './_fetch-retry.js'

interface VercelRequest {
  method?: string
  query?: Record<string, string | string[]>
  headers: Record<string, string | string[] | undefined>
}

interface VercelResponse {
  setHeader(key: string, value: string): VercelResponse
  status(code: number): VercelResponse
  json(data: unknown): VercelResponse
  end(): VercelResponse
}

/** A single setlist entry from the Setlist.fm API. */
export interface SetlistItem {
  id: string
  eventDate: string
  venue: {
    name: string
    city: {
      name: string
      country: { code: string; name: string }
    }
  }
  sets: {
    set: Array<{
      song: Array<{ name: string; tape?: boolean }>
    }>
  }
  url: string
}

interface SetlistFmApiResponse {
  setlist?: SetlistItem[]
  code?: number
  message?: string
}

const SETLISTFM_API_BASE = 'https://api.setlist.fm/rest/1.0'

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  // Only GET is supported
  if (req.method && req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  // Rate limiting (GDPR-compliant, IP is hashed)
  const allowed = await applyRateLimit(req, res)
  if (!allowed) return

  // Validate query parameters
  const parsed = validate(setlistfmQuerySchema, req.query)
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error })
    return
  }
  const { mbid, p } = parsed.data

  // Return empty result when API key is not configured
  const apiKey = process.env.SETLISTFM_API_KEY
  if (!apiKey) {
    res
      .setHeader('Cache-Control', 'public, max-age=300')
      .status(200)
      .json({ setlists: [], error: 'SETLISTFM_API_KEY not configured' })
    return
  }

  try {
    const response = await fetchWithRetry(
      `${SETLISTFM_API_BASE}/artist/${encodeURIComponent(mbid)}/setlists?p=${p}`,
      {
        headers: {
          Accept: 'application/json',
          'x-api-key': apiKey,
        },
      },
    )

    if (!response.ok) {
      const body = await response.text().catch(() => '')
      console.error(`Setlist.fm API error ${response.status}:`, body)
      res.status(500).json({ error: `Setlist.fm API returned ${response.status}` })
      return
    }

    const data = (await response.json()) as SetlistFmApiResponse

    // Cache successful results for 1 hour
    res
      .setHeader('Cache-Control', 'public, max-age=3600')
      .status(200)
      .json({ setlists: data.setlist ?? [] })
  } catch (error) {
    console.error('Setlist.fm proxy error:', error)
    res.status(500).json({ error: 'Failed to fetch setlist data' })
  }
}
