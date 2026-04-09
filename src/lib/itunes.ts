export interface ITunesRelease {
  id: string
  title: string
  artwork: string
  releaseDate?: string
  appleMusic?: string
  spotify?: string
  soundcloud?: string
  youtube?: string
  bandcamp?: string
  deezer?: string
  tidal?: string
  amazonMusic?: string
  type?: '' | 'album' | 'ep' | 'single' | 'remix' | 'compilation'
  streamingLinks?: {
    spotify?: string
    soundcloud?: string
    youtube?: string
    bandcamp?: string
    appleMusic?: string
    deezer?: string
    tidal?: string
    amazonMusic?: string
    beatport?: string
  }
}

const ARTIST_NAME = 'Zardonic'

/** Shape of a single result from the iTunes Search API */
interface ITunesApiTrack {
  collectionId?: number
  collectionName?: string
  artistName?: string
  collectionArtistName?: string
  artworkUrl100?: string
  artworkUrl60?: string
  releaseDate?: string
  collectionViewUrl?: string
  trackViewUrl?: string
}

export async function fetchITunesReleases(): Promise<ITunesRelease[]> {
  try {
    const [songsRes, albumsRes] = await Promise.all([
      fetch(
        `/api/itunes?term=${encodeURIComponent(ARTIST_NAME)}&entity=song&limit=200`
      ),
      fetch(
        `/api/itunes?term=${encodeURIComponent(ARTIST_NAME)}&entity=album&limit=200`
      ),
    ])

    if (songsRes.status === 429 || albumsRes.status === 429) {
      console.warn('iTunes rate limited (429), falling back to Spotify')
      const { fetchSpotifyReleases } = await import('./spotify-releases')
      return fetchSpotifyReleases()
    }

    if (!songsRes.ok) throw new Error(`iTunes songs API responded with ${songsRes.status}`)
    if (!albumsRes.ok) throw new Error(`iTunes albums API responded with ${albumsRes.status}`)

    const [songsData, albumsData] = await Promise.all([songsRes.json(), albumsRes.json()])

    const results = [...(songsData.results || []), ...(albumsData.results || [])]

    const releasesMap = new Map<string, ITunesRelease>()

    results.forEach((track: ITunesApiTrack) => {
      if (!track.collectionId || !track.collectionName) return

      // Filter to only results where the artist matches Zardonic
      const artistName = (track.artistName || '').toLowerCase()
      const collectionArtist = (track.collectionArtistName || '').toLowerCase()
      if (!artistName.includes('zardonic') && !collectionArtist.includes('zardonic')) return

      const collectionId = track.collectionId.toString()

      if (!releasesMap.has(collectionId)) {
        releasesMap.set(collectionId, {
          id: `itunes-${collectionId}`,
          title: track.collectionName,
          artwork:
            track.artworkUrl100?.replace('100x100bb', '600x600bb') ||
            track.artworkUrl60?.replace('60x60bb', '600x600bb') ||
            '',
          releaseDate: track.releaseDate
            ? new Date(track.releaseDate).toISOString().split('T')[0]
            : undefined,
          appleMusic: track.collectionViewUrl || track.trackViewUrl,
        })
      }
    })

    const releases = Array.from(releasesMap.values())

    // Sort newest first
    releases.sort((a, b) => {
      if (!a.releaseDate && !b.releaseDate) return 0
      if (!a.releaseDate) return 1
      if (!b.releaseDate) return -1
      return new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime()
    })

    return releases
  } catch (error) {
    console.error('Error fetching iTunes releases:', error)
    return []
  }
}
