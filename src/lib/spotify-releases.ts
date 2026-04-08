import type { ITunesRelease } from './itunes'

const ARTIST_NAME = 'Zardonic'

interface SpotifyAlbumItem {
  id: string
  name: string
  release_date?: string
  images?: { url: string }[]
  artists?: { name: string }[]
  external_urls?: { spotify?: string }
}

interface SpotifySearchResponse {
  albums?: { items?: SpotifyAlbumItem[] }
  singles?: { items?: SpotifyAlbumItem[] }
  items?: SpotifyAlbumItem[]
}

/** Fetch all Zardonic albums/singles from the Spotify search API proxy */
export async function fetchSpotifyReleases(): Promise<ITunesRelease[]> {
  try {
    const [albumsRes, singlesRes] = await Promise.all([
      fetch(`/api/spotify?action=search&query=${encodeURIComponent(ARTIST_NAME)}&type=album`),
      fetch(`/api/spotify?action=search&query=${encodeURIComponent(ARTIST_NAME)}&type=single`),
    ])

    const releases: ITunesRelease[] = []

    for (const res of [albumsRes, singlesRes]) {
      if (!res.ok) continue
      const data = await res.json() as SpotifySearchResponse
      const items =
        data?.albums?.items ??
        data?.singles?.items ??
        (Array.isArray(data?.items) ? (data as { items: SpotifyAlbumItem[] }).items : [])
      for (const item of items) {
        if (!item?.id || !item?.name) continue
        const artistMatch = item.artists?.some((a) =>
          a.name?.toLowerCase().includes('zardonic')
        )
        if (!artistMatch) continue
        releases.push({
          id: `spotify-${item.id}`,
          title: item.name,
          artwork: item.images?.[0]?.url ?? '',
          releaseDate: item.release_date,
          spotify: item.external_urls?.spotify,
          streamingLinks: {
            spotify: item.external_urls?.spotify,
          },
        })
      }
    }

    // Deduplicate by title
    const seen = new Set<string>()
    return releases.filter(r => {
      const key = r.title.toLowerCase()
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  } catch (err) {
    console.error('Spotify releases fallback error:', err)
    return []
  }
}
