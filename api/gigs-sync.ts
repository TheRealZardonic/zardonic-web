/**
 * POST /api/gigs-sync
 *
 * Server-side sync that:
 * 1. Fetches events from Bandsintown
 * 2. Parses them into the Gig format
 * 3. Geocodes new events via Nominatim (server-side)
 * 4. Merges them into the existing band-data in Redis
 * 5. Writes the result back to Redis band-data
 *
 * Cron calls must supply `Authorization: Bearer <CRON_SECRET>`.
 * Admin calls must supply a valid session (cookie or x-session-token header).
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getRedisOrNull, isRedisConfigured } from './_redis.js'
import { fetchWithRetry } from './_fetch-retry.js'
import { validateSession } from './auth.js'
import { timingSafeEqual } from 'node:crypto'

/** Constant-time string comparison to prevent timing-based CRON_SECRET enumeration. */
function verifyCronSecret(provided: string): boolean {
  const expected = process.env.CRON_SECRET
  if (!expected) return false
  try {
    const a = Buffer.from(expected, 'utf8')
    const b = Buffer.from(provided, 'utf8')
    if (a.length !== b.length) return false
    return timingSafeEqual(a, b)
  } catch {
    return false
  }
}

const BANDSINTOWN_API_BASE = 'https://rest.bandsintown.com'
const ARTIST_NAME = 'Zardonic'
const BAND_DATA_KEY = 'band-data'
const NOMINATIM_DELAY_MS = 1100 // 100ms safety margin above Nominatim's 1 req/sec policy

// ─── Types ────────────────────────────────────────────────────────────────────

interface BandsintownVenue {
  name?: string
  city?: string
  region?: string
  country?: string
  street_address?: string
  postal_code?: string
  latitude?: string
  longitude?: string
}

interface BandsintownApiEvent {
  id: string | number
  datetime?: string
  starts_at?: string
  url?: string
  sold_out?: boolean
  description?: string
  title?: string
  lineup?: string[]
  offers?: { url?: string }[]
  venue?: BandsintownVenue
}

interface Gig {
  id: string
  venue: string
  location: string
  date: string
  ticketUrl?: string
  support?: string
  lineup?: string[]
  streetAddress?: string
  postalCode?: string
  latitude?: string
  longitude?: string
  soldOut?: boolean
  startsAt?: string
  description?: string
  title?: string
}

interface SiteData {
  gigs: Gig[]
  [key: string]: unknown
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/** Parse a raw Bandsintown API event into the internal Gig format. */
function parseEvent(event: BandsintownApiEvent): Gig {
  return {
    id: `bit-${event.id}`,
    venue: event.venue?.name || 'TBA',
    location: [event.venue?.city, event.venue?.region, event.venue?.country]
      .filter(Boolean)
      .join(', '),
    date: event.datetime
      ? new Date(event.datetime).toISOString().split('T')[0]
      : '',
    startsAt: event.starts_at || event.datetime || undefined,
    ticketUrl: event.offers?.[0]?.url || event.url || undefined,
    lineup: event.lineup || [],
    streetAddress: event.venue?.street_address || undefined,
    postalCode: event.venue?.postal_code || undefined,
    latitude: event.venue?.latitude || undefined,
    longitude: event.venue?.longitude || undefined,
    soldOut: event.sold_out || false,
    description: event.description || undefined,
    title: event.title || undefined,
  }
}

interface NominatimResult {
  lat: string
  lon: string
}

/** Geocode a location string via Nominatim. Returns null on failure. */
async function geocodeLocation(location: string): Promise<{ latitude: string; longitude: string } | null> {
  if (!location.trim()) return null
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(location)}&format=json&limit=1`
    const response = await fetchWithRetry(url, {
      headers: {
        'User-Agent': 'zardonic-industrial/1.0 (https://zardonic.com)',
        'Accept-Language': 'en',
      },
    })
    if (!response.ok) return null
    const json: unknown = await response.json()
    if (!Array.isArray(json) || json.length === 0) return null
    const first = json[0] as NominatimResult
    if (typeof first.lat !== 'string' || typeof first.lon !== 'string') return null
    return { latitude: first.lat, longitude: first.lon }
  } catch {
    return null
  }
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  // Cron calls: validate Authorization: Bearer <CRON_SECRET> header.
  const authHeader = req.headers.authorization ?? ''
  const isCron = authHeader.startsWith('Bearer ') && verifyCronSecret(authHeader.slice(7))

  // For non-cron calls, require an authenticated admin session
  if (!isCron) {
    const sessionValid = await validateSession(req)
    if (!sessionValid) {
      res.status(401).json({ error: 'Unauthorized' })
      return
    }
  }

  if (!isRedisConfigured()) {
    res.status(503).json({ error: 'Redis not configured' })
    return
  }

  const apiKey = process.env.BANDSINTOWN_API_KEY
  if (!apiKey) {
    res.status(503).json({ error: 'BANDSINTOWN_API_KEY not configured' })
    return
  }

  try {
    // 1. Fetch events from Bandsintown
    const url = new URL(`${BANDSINTOWN_API_BASE}/artists/${encodeURIComponent(ARTIST_NAME)}/events`)
    url.searchParams.set('app_id', apiKey)
    url.searchParams.set('date', 'all')

    const response = await fetchWithRetry(url.toString(), {
      headers: { Accept: 'application/json' },
    })

    if (response.status === 429) {
      res.status(429).json({ error: 'Bandsintown rate limit exceeded' })
      return
    }

    if (response.status === 404) {
      res.status(200).json({ success: true, newCount: 0, updatedCount: 0, geocodedCount: 0 })
      return
    }

    if (!response.ok) {
      const body = await response.text().catch(() => '')
      console.error(`[gigs-sync] Bandsintown error ${response.status}:`, body)
      res.status(502).json({ error: `Bandsintown API returned ${response.status}` })
      return
    }

    const rawData = await response.json()
    const rawEvents: BandsintownApiEvent[] = Array.isArray(rawData) ? rawData : []

    // 2. Parse into internal Gig format
    const events: Gig[] = rawEvents.map(parseEvent)

    // 3. Geocode events missing coordinates (server-side)
    let geocodedCount = 0
    for (const event of events) {
      if (!event.latitude && !event.longitude && event.location) {
        const coords = await geocodeLocation(event.location)
        if (coords) {
          event.latitude = coords.latitude
          event.longitude = coords.longitude
          geocodedCount++
        }
        // Respect Nominatim's 1 req/sec policy
        await delay(NOMINATIM_DELAY_MS)
      }
    }

    // 4. Load existing band-data from Redis
    const redis = getRedisOrNull()
    if (!redis) {
      res.status(503).json({ error: 'Redis not configured' })
      return
    }
    const existing = await redis.get<SiteData>(BAND_DATA_KEY)
    const existingGigs: Gig[] = existing?.gigs ?? []
    const existingById = new Map(existingGigs.map(g => [g.id, g]))

    // 5. Merge: add new gigs, update existing ones
    let newCount = 0
    let updatedCount = 0
    for (const event of events) {
      const current = existingById.get(event.id)
      if (current) {
        updatedCount++
        existingById.set(event.id, {
          ...current,
          venue: event.venue || current.venue,
          location: event.location || current.location,
          date: event.date || current.date,
          lineup: event.lineup || current.lineup,
          streetAddress: event.streetAddress || current.streetAddress,
          postalCode: event.postalCode || current.postalCode,
          latitude: event.latitude ?? current.latitude,
          longitude: event.longitude ?? current.longitude,
          soldOut: event.soldOut ?? current.soldOut,
          startsAt: event.startsAt || current.startsAt,
          ticketUrl: event.ticketUrl || current.ticketUrl,
          description: event.description || current.description,
          title: event.title || current.title,
        })
      } else {
        newCount++
        existingById.set(event.id, event)
      }
    }

    // 6. Geocode any existing gigs still missing coordinates (not covered by new events)
    for (const gig of existingById.values()) {
      if (!gig.latitude && !gig.longitude && gig.location) {
        const coords = await geocodeLocation(gig.location)
        if (coords) {
          existingById.set(gig.id, { ...gig, latitude: coords.latitude, longitude: coords.longitude })
          geocodedCount++
        }
        await delay(NOMINATIM_DELAY_MS)
      }
    }

    // 7. Persist updated gigs back to band-data in Redis
    const updatedSiteData: SiteData = {
      ...(existing ?? {}),
      gigs: Array.from(existingById.values()),
    }
    await redis.set(BAND_DATA_KEY, updatedSiteData)

    res.setHeader('Cache-Control', 'no-store')
    res.status(200).json({ success: true, newCount, updatedCount, geocodedCount })
  } catch (error) {
    console.error('[gigs-sync] Unexpected error:', error)
    res.status(500).json({ error: 'Failed to sync gigs' })
  }
}
