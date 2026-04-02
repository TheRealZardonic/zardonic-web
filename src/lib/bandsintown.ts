export interface BandsintownEvent {
  id: string
  venue: string
  location: string
  date: string
  startsAt?: string
  ticketUrl?: string
  lineup?: string[]
  streetAddress?: string
  postalCode?: string
  latitude?: string
  longitude?: string
  soldOut?: boolean
  description?: string
  title?: string
}

/** Shape of a single event from the Bandsintown REST API */
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
  venue?: {
    name?: string
    city?: string
    region?: string
    country?: string
    street_address?: string
    postal_code?: string
    latitude?: string
    longitude?: string
  }
}

const ARTIST_NAME = 'Zardonic'

export async function fetchBandsintownEvents(): Promise<BandsintownEvent[]> {
  try {
    const response = await fetch(
      `/api/bandsintown?artist=${encodeURIComponent(ARTIST_NAME)}`
    )

    if (!response.ok) {
      // Check if it's a configuration error (503)
      if (response.status === 503) {
        const data = await response.json().catch(() => ({}))
        console.error('Bandsintown API configuration error:', data.message || 'Service unavailable')
        console.error('Please set BANDSINTOWN_API_KEY environment variable to enable gig syncing')
      } else {
        console.error('Bandsintown API responded with', response.status)
      }
      return []
    }

    const data = await response.json()

    if (!Array.isArray(data)) {
      return []
    }

    return data.map((event: BandsintownApiEvent) => ({
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
    }))
  } catch (error) {
    console.error('Error fetching Bandsintown events:', error)
    return []
  }
}
