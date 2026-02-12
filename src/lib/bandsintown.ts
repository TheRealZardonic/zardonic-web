export interface BandsintownEvent {
  id: string
  venue: string
  location: string
  date: string
  ticketUrl?: string
  lineup?: string[]
}

const ARTIST_NAME = 'Zardonic'
const APP_ID = 'zardonic-industrial-website'

export async function fetchBandsintownEvents(): Promise<BandsintownEvent[]> {
  try {
    const response = await fetch(
      `https://rest.bandsintown.com/artists/${encodeURIComponent(ARTIST_NAME)}/events?app_id=${APP_ID}`
    )

    if (!response.ok) {
      console.error('Bandsintown API responded with', response.status)
      return []
    }

    const data = await response.json()

    if (!Array.isArray(data)) {
      return []
    }

    return data.map((event: any) => ({
      id: `bit-${event.id}`,
      venue: event.venue?.name || 'TBA',
      location: [event.venue?.city, event.venue?.region, event.venue?.country]
        .filter(Boolean)
        .join(', '),
      date: event.datetime
        ? new Date(event.datetime).toISOString().split('T')[0]
        : '',
      ticketUrl: event.url || undefined,
      lineup: event.lineup || [],
    }))
  } catch (error) {
    console.error('Error fetching Bandsintown events:', error)
    return []
  }
}
