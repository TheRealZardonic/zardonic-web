/**
 * GET /api/bandsintown?artist=<name>&app_id=<id>[&include_past=true]
 *
 * Server-side proxy for the Bandsintown REST API that avoids CSP / CORS issues
 * when called from the browser.
 *
 * The Bandsintown app_id is a public client identifier, not a secret — it is
 * safe to pass it through the query string.
 *
 * Returns:
 *   200 { events: BandsintownEvent[] }   — success (may be empty array)
 *   400 { error: string }                — missing / invalid params
 *   429 / 503                            — rate limit
 *   500 { error: string }                — upstream failure
 */
import { applyRateLimit } from './_ratelimit.js'
import { bandsintownQuerySchema, validate } from './_schemas.js'
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

/** Venue as returned by the Bandsintown REST API. */
export interface BandsintownVenue {
  pk?: number
  name: string
  latitude?: string
  longitude?: string
  city: string
  region?: string
  country: string
  zip_code?: string
}

/** An offer (e.g. ticket link) as returned by the Bandsintown REST API. */
export interface BandsintownOffer {
  type: string
  url: string
  status: string
}

/** A single event as returned by the Bandsintown REST API. */
export interface BandsintownEvent {
  id: string
  artist_id?: string
  url: string
  on_sale_datetime?: string
  datetime: string
  description?: string
  title?: string
  lineup?: string[]
  offers?: BandsintownOffer[]
  venue: BandsintownVenue
}

const BANDSINTOWN_API_BASE = 'https://rest.bandsintown.com'

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
  const parsed = validate(bandsintownQuerySchema, req.query)
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error })
    return
  }
  const { artist, app_id, include_past } = parsed.data

  try {
    const url = new URL(
      `${BANDSINTOWN_API_BASE}/artists/${encodeURIComponent(artist)}/events`,
    )
    url.searchParams.set('app_id', app_id)
    if (include_past) {
      url.searchParams.set('date', 'all')
    }

    const response = await fetchWithRetry(url.toString(), {
      headers: { Accept: 'application/json' },
    })

    if (response.status === 404) {
      // Artist not found on Bandsintown — return empty list
      res
        .setHeader('Cache-Control', 'public, max-age=300')
        .status(200)
        .json({ events: [] })
      return
    }

    if (!response.ok) {
      const body = await response.text().catch(() => '')
      console.error(`Bandsintown API error ${response.status}:`, body)
      res.status(500).json({ error: `Bandsintown API returned ${response.status}` })
      return
    }

    const data = (await response.json()) as BandsintownEvent[] | null

    // Bandsintown returns an array directly (not wrapped in an object)
    const events: BandsintownEvent[] = Array.isArray(data) ? data : []

    // Cache successful results for 30 minutes
    res
      .setHeader('Cache-Control', 'public, max-age=1800')
      .status(200)
      .json({ events })
  } catch (error) {
    console.error('Bandsintown proxy error:', error)
    res.status(500).json({ error: 'Failed to fetch from Bandsintown API' })
  }
}
