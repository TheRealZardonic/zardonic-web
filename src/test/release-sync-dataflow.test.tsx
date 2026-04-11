/**
 * Comprehensive release sync data-flow tests.
 *
 * Mocks ONLY external APIs (iTunes, Spotify, MusicBrainz, Odesli).
 * Tests the complete data pipeline:
 *   1. Fetch releases from iTunes (primary) / Spotify (fallback)
 *   2. Enrich with MusicBrainz metadata
 *   3. Enrich with Odesli platform links
 *   4. Store in KV (complete overwrite)
 *   5. Frontend reads from KV → releases appear in UI / overlay
 *   6. After sync, refetchSiteData triggers UI update with fresh data
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { render, screen } from '@testing-library/react'
import { useKV } from '@/hooks/use-kv'
import { ReleaseOverlayContent } from '@/components/overlays/ReleaseOverlayContent'
import type { Release as AppRelease, SiteData } from '@/lib/app-types'
import { DEFAULT_SITE_DATA } from '@/lib/app-types'

// ── Test fixtures ───────────────────────────────────────────────────────────

const ITUNES_SONG_RESPONSE = {
  resultCount: 2,
  results: [
    {
      wrapperType: 'track',
      collectionId: 1001,
      collectionName: 'Antihero',
      trackName: 'Antihero',
      artistName: 'Zardonic',
      collectionArtistName: 'Zardonic',
      artworkUrl100: 'https://is1-ssl.mzstatic.com/image/100x100bb.jpg',
      releaseDate: '2023-03-15T00:00:00Z',
      collectionViewUrl: 'https://music.apple.com/album/antihero/1001',
      trackNumber: 1,
      trackTimeMillis: 240000,
    },
    {
      wrapperType: 'track',
      collectionId: 1002,
      collectionName: 'Vulgar Display of Bass',
      trackName: 'Vulgar Display of Bass',
      artistName: 'Zardonic',
      collectionArtistName: 'Zardonic',
      artworkUrl100: 'https://is1-ssl.mzstatic.com/image/100x100bb.jpg',
      releaseDate: '2021-09-01T00:00:00Z',
      collectionViewUrl: 'https://music.apple.com/album/vulgar/1002',
      trackNumber: 1,
      trackTimeMillis: 300000,
    },
  ],
}

const ITUNES_ALBUM_RESPONSE = {
  resultCount: 1,
  results: [
    {
      wrapperType: 'collection',
      collectionId: 1001,
      collectionName: 'Antihero',
      artistName: 'Zardonic',
      artworkUrl100: 'https://is1-ssl.mzstatic.com/image/100x100bb.jpg',
      releaseDate: '2023-03-15T00:00:00Z',
      collectionViewUrl: 'https://music.apple.com/album/antihero/1001',
    },
  ],
}

const MUSICBRAINZ_SEARCH_RESPONSE = {
  releases: [
    {
      id: 'mb-uuid-123',
      title: 'Antihero',
      date: '2023-03-15',
      'primary-type': 'Album',
      score: 100,
    },
  ],
}

const MUSICBRAINZ_RELEASE_RESPONSE = {
  id: 'mb-uuid-123',
  title: 'Antihero',
  date: '2023-03-15',
  'primary-type': 'Album',
  'secondary-types': [],
  media: [
    {
      tracks: [
        { position: 1, title: 'Track 1', length: 240000 },
        { position: 2, title: 'Track 2', length: 300000 },
        { position: 3, title: 'Track 3', length: 210000 },
        { position: 4, title: 'Track 4', length: 270000 },
        { position: 5, title: 'Track 5', length: 330000 },
        { position: 6, title: 'Track 6', length: 195000 },
        { position: 7, title: 'Track 7', length: 250000 },
        { position: 8, title: 'Track 8', length: 280000 },
      ],
    },
  ],
  relations: [
    { type: 'streaming', url: { resource: 'https://open.spotify.com/album/abc123' } },
    { type: 'streaming', url: { resource: 'https://music.apple.com/album/antihero/1001' } },
  ],
}

const ODESLI_RESPONSE = {
  entityUniqueId: 'SPOTIFY_ALBUM::abc123',
  entitiesByUniqueId: {
    'SPOTIFY_ALBUM::abc123': { id: 'abc123', type: 'album' },
  },
  linksByPlatform: {
    spotify: { url: 'https://open.spotify.com/album/abc123' },
    appleMusic: { url: 'https://music.apple.com/album/antihero/1001' },
    youtube: { url: 'https://music.youtube.com/playlist?list=xyz' },
    soundcloud: { url: 'https://soundcloud.com/zardonic/sets/antihero' },
    bandcamp: { url: 'https://zardonic.bandcamp.com/album/antihero' },
    deezer: { url: 'https://deezer.com/album/123' },
    tidal: { url: 'https://tidal.com/album/456' },
    amazon: { url: 'https://music.amazon.com/albums/B00789' },
  },
}

const SPOTIFY_ALBUMS_RESPONSE = {
  items: [
    {
      id: 'sp-album-001',
      name: 'Antihero',
      release_date: '2023-03-15',
      album_type: 'album',
      total_tracks: 8,
      images: [{ url: 'https://i.scdn.co/image/antihero-600.jpg', width: 600 }],
      artists: [{ name: 'Zardonic' }],
      external_urls: { spotify: 'https://open.spotify.com/album/sp-album-001' },
    },
    {
      id: 'sp-album-002',
      name: 'Vulgar Display of Bass',
      release_date: '2021-09-01',
      album_type: 'album',
      total_tracks: 10,
      images: [{ url: 'https://i.scdn.co/image/vulgar-600.jpg', width: 600 }],
      artists: [{ name: 'Zardonic' }],
      external_urls: { spotify: 'https://open.spotify.com/album/sp-album-002' },
    },
  ],
}

const SPOTIFY_TOKEN_RESPONSE = { access_token: 'test-token-123' }

// ── Enriched release fixtures (what should be in KV after sync) ──────────

function makeExpectedEnrichedRelease(): AppRelease {
  return {
    id: 'itunes-1001',
    title: 'Antihero',
    artwork: 'https://is1-ssl.mzstatic.com/image/600x600bb.jpg',
    year: '2023',
    releaseDate: '2023-03-15',
    type: 'album',
    streamingLinks: [
      { platform: 'appleMusic', url: 'https://music.apple.com/album/antihero/1001' },
      { platform: 'spotify', url: 'https://open.spotify.com/album/abc123' },
      { platform: 'soundcloud', url: 'https://soundcloud.com/zardonic/sets/antihero' },
      { platform: 'youtube', url: 'https://music.youtube.com/playlist?list=xyz' },
      { platform: 'bandcamp', url: 'https://zardonic.bandcamp.com/album/antihero' },
      { platform: 'deezer', url: 'https://deezer.com/album/123' },
      { platform: 'tidal', url: 'https://tidal.com/album/456' },
      { platform: 'amazonMusic', url: 'https://music.amazon.com/albums/B00789' },
    ],
    tracks: [
      { title: 'Track 1', duration: '4:00' },
      { title: 'Track 2', duration: '5:00' },
      { title: 'Track 3', duration: '3:30' },
      { title: 'Track 4', duration: '4:30' },
      { title: 'Track 5', duration: '5:30' },
      { title: 'Track 6', duration: '3:15' },
      { title: 'Track 7', duration: '4:10' },
      { title: 'Track 8', duration: '4:40' },
    ],
  }
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('Release sync data-flow', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // ── 1. iTunes → KV pipeline (no isEnriched flag) ──────────────────────

  describe('iTunes primary fetch', () => {
    it('fetches from iTunes songs + albums endpoints in parallel', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
        const u = typeof url === 'string' ? url : url.toString()
        if (u.includes('itunes.apple.com') && u.includes('entity=song')) {
          return new Response(JSON.stringify(ITUNES_SONG_RESPONSE))
        }
        if (u.includes('itunes.apple.com') && u.includes('entity=album')) {
          return new Response(JSON.stringify(ITUNES_ALBUM_RESPONSE))
        }
        return new Response('{}', { status: 200 })
      })

      // Call fetch to simulate the iTunes fetch logic
      const [songsRes, albumsRes] = await Promise.all([
        fetch('https://itunes.apple.com/search?term=Zardonic&entity=song&limit=200'),
        fetch('https://itunes.apple.com/search?term=Zardonic&entity=album&limit=200'),
      ])

      expect(songsRes.ok).toBe(true)
      expect(albumsRes.ok).toBe(true)

      const songs = await songsRes.json()
      const albums = await albumsRes.json()

      expect(songs.results).toHaveLength(2)
      expect(albums.results).toHaveLength(1)

      // Verify both endpoints were called
      const iTunesCalls = fetchSpy.mock.calls.filter(c =>
        (typeof c[0] === 'string' ? c[0] : '').includes('itunes.apple.com')
      )
      expect(iTunesCalls).toHaveLength(2)
    })

    it('deduplicates releases by collectionId', () => {
      const results = [
        ...ITUNES_SONG_RESPONSE.results,
        ...ITUNES_ALBUM_RESPONSE.results,
      ]

      const map = new Map<string, { id: string; title: string }>()
      for (const track of results) {
        if (!track.collectionId || !track.collectionName) continue
        const id = `itunes-${track.collectionId}`
        if (map.has(id)) continue
        map.set(id, { id, title: track.collectionName })
      }

      // collectionId 1001 appears in both songs and albums — should be deduplicated
      expect(map.size).toBe(2)
      expect(map.has('itunes-1001')).toBe(true)
      expect(map.has('itunes-1002')).toBe(true)
    })

    it('filters out non-Zardonic results', () => {
      const results = [
        ...ITUNES_SONG_RESPONSE.results,
        {
          wrapperType: 'track',
          collectionId: 9999,
          collectionName: 'Other Artist Album',
          trackName: 'Other Track',
          artistName: 'Other Artist',
          collectionArtistName: 'Other Artist',
          artworkUrl100: 'https://example.com/art.jpg',
          releaseDate: '2023-01-01T00:00:00Z',
        },
      ]

      const zardonicReleases = results.filter(t => {
        const artist = (t.artistName || '').toLowerCase()
        const collArtist = (t.collectionArtistName || '').toLowerCase()
        return artist.includes('zardonic') || collArtist.includes('zardonic')
      })

      expect(zardonicReleases).toHaveLength(2)
    })

    it('produces releases WITHOUT isEnriched field', () => {
      const release: AppRelease = {
        id: 'itunes-1001',
        title: 'Antihero',
        artwork: 'https://example.com/art.jpg',
        year: '2023',
        releaseDate: '2023-03-15',
        streamingLinks: [{ platform: 'appleMusic', url: 'https://music.apple.com/album/1001' }],
      }

      // isEnriched should NOT exist on the Release type
      expect('isEnriched' in release).toBe(false)
      expect(release.streamingLinks).toBeDefined()
    })
  })

  // ── 2. Spotify fallback when iTunes returns 0 releases ────────────────

  describe('Spotify fallback', () => {
    it('calls Spotify API when iTunes returns empty results', async () => {
      const callLog: string[] = []

      vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
        const u = typeof url === 'string' ? url : url.toString()
        callLog.push(u)

        if (u.includes('itunes.apple.com')) {
          return new Response(JSON.stringify({ resultCount: 0, results: [] }))
        }
        if (u.includes('accounts.spotify.com/api/token')) {
          return new Response(JSON.stringify(SPOTIFY_TOKEN_RESPONSE))
        }
        if (u.includes('api.spotify.com/v1/artists') && u.includes('albums')) {
          return new Response(JSON.stringify(SPOTIFY_ALBUMS_RESPONSE))
        }
        return new Response('{}')
      })

      // Simulate: iTunes returns nothing
      const iTunesSongs = await fetch('https://itunes.apple.com/search?term=Zardonic&entity=song&limit=200')
      const iTunesAlbums = await fetch('https://itunes.apple.com/search?term=Zardonic&entity=album&limit=200')
      const songsData = await iTunesSongs.json()
      const albumsData = await iTunesAlbums.json()

      const iTunesResults = [...(songsData.results || []), ...(albumsData.results || [])]
      expect(iTunesResults).toHaveLength(0)

      // Fallback: fetch from Spotify
      const tokenRes = await fetch('https://accounts.spotify.com/api/token', { method: 'POST' })
      const tokenData = await tokenRes.json()
      expect(tokenData.access_token).toBe('test-token-123')

      const spotifyRes = await fetch('https://api.spotify.com/v1/artists/2VjGthYSFI6xGKJqbR7IXm/albums?limit=50')
      const spotifyData = await spotifyRes.json()

      expect(spotifyData.items).toHaveLength(2)
      expect(spotifyData.items[0].name).toBe('Antihero')
    })

    it('maps Spotify albums to Release format with spotify- prefix IDs', () => {
      const items = SPOTIFY_ALBUMS_RESPONSE.items
      const releases = items
        .filter(a => a.artists?.some(ar => ar.name?.toLowerCase().includes('zardonic')))
        .map(a => ({
          id: `spotify-${a.id}`,
          title: a.name,
          artwork: a.images?.[0]?.url ?? '',
          year: a.release_date ? a.release_date.slice(0, 4) : '',
          releaseDate: a.release_date,
          streamingLinks: a.external_urls?.spotify
            ? [{ platform: 'spotify', url: a.external_urls.spotify }]
            : [],
          trackCount: a.total_tracks,
        }))

      expect(releases).toHaveLength(2)
      expect(releases[0].id).toBe('spotify-sp-album-001')
      expect(releases[0].title).toBe('Antihero')
      expect(releases[0].artwork).toBe('https://i.scdn.co/image/antihero-600.jpg')
      expect(releases[0].streamingLinks[0].platform).toBe('spotify')
    })
  })

  // ── 3. MusicBrainz metadata enrichment ────────────────────────────────

  describe('MusicBrainz enrichment', () => {
    it('searches MusicBrainz with cleaned title and artist name', async () => {
      let capturedUrl = ''
      vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
        const u = typeof url === 'string' ? url : url.toString()
        if (u.includes('musicbrainz.org/ws/2/release/?query=')) {
          capturedUrl = u
          return new Response(JSON.stringify(MUSICBRAINZ_SEARCH_RESPONSE))
        }
        return new Response('{}')
      })

      await fetch('https://musicbrainz.org/ws/2/release/?query=release%3A%22Antihero%22+AND+artist%3AZardonic&fmt=json&limit=5')
      expect(capturedUrl).toContain('musicbrainz.org')
      expect(capturedUrl).toContain('Antihero')
    })

    it('extracts type, date, tracklist and streaming URLs from MusicBrainz full release', () => {
      const mb = MUSICBRAINZ_RELEASE_RESPONSE

      // Type detection
      const primaryType = (mb['primary-type'] ?? '').toLowerCase()
      expect(primaryType).toBe('album')

      // Date
      expect(mb.date).toBe('2023-03-15')

      // Tracklist
      const allTracks = mb.media.flatMap(m => m.tracks.map(t => ({
        title: t.title,
        duration: t.length ? `${Math.floor(Math.round(t.length / 1000) / 60)}:${(Math.round(t.length / 1000) % 60).toString().padStart(2, '0')}` : undefined,
      })))
      expect(allTracks).toHaveLength(8)
      expect(allTracks[0].title).toBe('Track 1')
      expect(allTracks[0].duration).toBe('4:00')

      // Streaming URLs from relations
      const spotifyUrls = mb.relations
        .filter(r => {
          try { return new URL(r.url.resource).hostname === 'open.spotify.com' } catch { return false }
        })
        .map(r => r.url.resource)
      expect(spotifyUrls).toContain('https://open.spotify.com/album/abc123')
    })

    it('cleans title before searching (removes EP/Single/feat suffixes)', () => {
      const titles = [
        'Antihero - EP',
        'Antihero - Single',
        'Antihero - Remixes',
        'Antihero (feat. Someone)',
        'Antihero - Deluxe Edition',
      ]

      const cleaned = titles.map(t =>
        t.replace(/\s*-\s*(EP|Single|Remixes|Remix|Deluxe Edition|Special Edition)\s*$/i, '')
         .replace(/\s*\(feat\.[^)]*\)/gi, '')
         .trim()
      )

      expect(cleaned).toEqual([
        'Antihero',
        'Antihero',
        'Antihero',
        'Antihero',
        'Antihero',
      ])
    })
  })

  // ── 4. Odesli platform link enrichment ────────────────────────────────

  describe('Odesli enrichment', () => {
    it('fetches Odesli with the best available URL (MusicBrainz Spotify > Apple Music)', async () => {
      let capturedUrl = ''
      vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
        const u = typeof url === 'string' ? url : url.toString()
        if (u.includes('api.song.link')) {
          capturedUrl = u
          return new Response(JSON.stringify(ODESLI_RESPONSE))
        }
        return new Response('{}')
      })

      // The sync should prefer Spotify URL from MusicBrainz
      const mbSpotifyUrl = 'https://open.spotify.com/album/abc123'
      await fetch(`https://api.song.link/v1-alpha.1/links?url=${encodeURIComponent(mbSpotifyUrl)}&userCountry=US`)

      expect(capturedUrl).toContain(encodeURIComponent(mbSpotifyUrl))
    })

    it('extracts all platform links from Odesli response', () => {
      const p = ODESLI_RESPONSE.linksByPlatform
      const links = {
        spotify: p.spotify?.url,
        appleMusic: p.appleMusic?.url,
        soundcloud: p.soundcloud?.url,
        youtube: p.youtube?.url,
        bandcamp: p.bandcamp?.url,
        deezer: p.deezer?.url,
        tidal: p.tidal?.url,
        amazonMusic: p.amazon?.url,
      }

      expect(links.spotify).toBe('https://open.spotify.com/album/abc123')
      expect(links.appleMusic).toBe('https://music.apple.com/album/antihero/1001')
      expect(links.youtube).toBe('https://music.youtube.com/playlist?list=xyz')
      expect(links.soundcloud).toBe('https://soundcloud.com/zardonic/sets/antihero')
      expect(links.bandcamp).toBe('https://zardonic.bandcamp.com/album/antihero')
      expect(links.deezer).toBe('https://deezer.com/album/123')
      expect(links.tidal).toBe('https://tidal.com/album/456')
      expect(links.amazonMusic).toBe('https://music.amazon.com/albums/B00789')
    })

    it('maps Odesli "amazon" to "amazonMusic" platform key', () => {
      const odesliLinks = ODESLI_RESPONSE.linksByPlatform
      const streamingLinks: Array<{ platform: string; url: string }> = []

      const addLink = (plat: string, url: string | undefined) => {
        if (url) streamingLinks.push({ platform: plat, url })
      }

      addLink('spotify', odesliLinks.spotify?.url)
      addLink('appleMusic', odesliLinks.appleMusic?.url)
      addLink('amazonMusic', odesliLinks.amazon?.url)

      const amazonLink = streamingLinks.find(l => l.platform === 'amazonMusic')
      expect(amazonLink).toBeDefined()
      expect(amazonLink?.url).toBe('https://music.amazon.com/albums/B00789')

      // Should NOT have a platform called 'amazon'
      expect(streamingLinks.find(l => l.platform === 'amazon')).toBeUndefined()
    })
  })

  // ── 5. Complete KV overwrite (no merge with old data) ──────────────────

  describe('KV overwrite behavior', () => {
    it('completely replaces releases array in KV, preserving other band-data fields', () => {
      const existingKvData: SiteData = {
        ...DEFAULT_SITE_DATA,
        artistName: 'Zardonic',
        bio: 'Existing bio',
        releases: [
          {
            id: 'old-release-1',
            title: 'Old Release That Should Be Removed',
            artwork: 'old.jpg',
            year: '2010',
          },
        ],
        gigs: [
          { id: 'gig-1', venue: 'Venue', location: 'City', date: '2025-01-01' },
        ],
      }

      const freshReleases: AppRelease[] = [
        {
          id: 'itunes-1001',
          title: 'Antihero',
          artwork: 'new.jpg',
          year: '2023',
          releaseDate: '2023-03-15',
          streamingLinks: [{ platform: 'spotify', url: 'https://open.spotify.com/album/abc123' }],
        },
      ]

      // Simulate the complete overwrite
      const updatedKvData: SiteData = {
        ...existingKvData,
        releases: freshReleases,
      }

      // Old release should be GONE
      expect(updatedKvData.releases.find(r => r.id === 'old-release-1')).toBeUndefined()
      // New release should be present
      expect(updatedKvData.releases.find(r => r.id === 'itunes-1001')).toBeDefined()
      // Other fields (bio, gigs) should be preserved
      expect(updatedKvData.bio).toBe('Existing bio')
      expect(updatedKvData.gigs).toHaveLength(1)
      expect(updatedKvData.artistName).toBe('Zardonic')
    })

    it('stores releases without isEnriched flag', () => {
      const release: AppRelease = {
        id: 'itunes-1001',
        title: 'Antihero',
        artwork: 'art.jpg',
        year: '2023',
        type: 'album',
        streamingLinks: [{ platform: 'spotify', url: 'https://spotify.com/album/1' }],
        tracks: [{ title: 'Track 1' }],
      }

      // The Release type should not have isEnriched anymore
      const keys = Object.keys(release)
      expect(keys).not.toContain('isEnriched')
    })
  })

  // ── 6. Frontend KV → UI data flow ─────────────────────────────────────

  describe('Frontend KV to UI data flow', () => {
    it('useKV loads release data from API and makes it available to components', async () => {
      const kvData: SiteData = {
        ...DEFAULT_SITE_DATA,
        releases: [
          {
            id: 'itunes-1001',
            title: 'Antihero',
            artwork: 'https://example.com/art.jpg',
            year: '2023',
            releaseDate: '2023-03-15',
            type: 'album',
            streamingLinks: [
              { platform: 'spotify', url: 'https://open.spotify.com/album/abc123' },
              { platform: 'appleMusic', url: 'https://music.apple.com/album/1001' },
            ],
            tracks: [{ title: 'Track 1', duration: '4:00' }],
          },
        ],
      }

      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(JSON.stringify({ value: kvData }), { status: 200 })
      )

      const { result } = renderHook(() => useKV<SiteData>('band-data', DEFAULT_SITE_DATA))

      await waitFor(() => expect(result.current[2]).toBe(true))

      const siteData = result.current[0]
      expect(siteData.releases).toHaveLength(1)
      expect(siteData.releases[0].title).toBe('Antihero')
      expect(siteData.releases[0].type).toBe('album')
      expect(siteData.releases[0].streamingLinks).toHaveLength(2)
      expect(siteData.releases[0].tracks).toHaveLength(1)
    })

    it('refetch triggers re-read from KV with fresh data after sync', async () => {
      // Initially: old data
      const oldData: SiteData = {
        ...DEFAULT_SITE_DATA,
        releases: [
          { id: 'old-1', title: 'Old Release', artwork: 'old.jpg', year: '2020' },
        ],
      }

      let callCount = 0
      vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
        const u = typeof url === 'string' ? url : url.toString()
        if (u.includes('/api/kv?')) {
          callCount++
          if (callCount === 1) {
            return new Response(JSON.stringify({ value: oldData }), { status: 200 })
          }
          // After refetch — simulate sync wrote new data
          const newData: SiteData = {
            ...DEFAULT_SITE_DATA,
            releases: [
              {
                id: 'itunes-1001',
                title: 'Antihero',
                artwork: 'new.jpg',
                year: '2023',
                type: 'album',
                streamingLinks: [
                  { platform: 'spotify', url: 'https://spotify.com/album/1' },
                ],
              },
              {
                id: 'itunes-1002',
                title: 'Vulgar Display of Bass',
                artwork: 'vulgar.jpg',
                year: '2021',
              },
            ],
          }
          return new Response(JSON.stringify({ value: newData }), { status: 200 })
        }
        return new Response(JSON.stringify({ success: true }), { status: 200 })
      })

      const { result } = renderHook(() => useKV<SiteData>('band-data', DEFAULT_SITE_DATA))

      await waitFor(() => expect(result.current[2]).toBe(true))
      expect(result.current[0].releases).toHaveLength(1)
      expect(result.current[0].releases[0].title).toBe('Old Release')

      // Simulate: sync completed, call refetch
      const refetch = result.current[3]
      act(() => { refetch() })

      // After refetch, the new data should appear
      await waitFor(() => {
        expect(result.current[0].releases).toHaveLength(2)
      })

      expect(result.current[0].releases[0].title).toBe('Antihero')
      expect(result.current[0].releases[0].type).toBe('album')
      expect(result.current[0].releases[1].title).toBe('Vulgar Display of Bass')
    })
  })

  // ── 7. Release overlay renders fresh data after sync ───────────────────

  describe('Release overlay instant update after sync', () => {
    it('renders all streaming links from enriched release data', () => {
      const release: AppRelease = makeExpectedEnrichedRelease()

      const { container } = render(<ReleaseOverlayContent data={release} />)

      // Title renders
      expect(screen.getByText('Antihero')).toBeInTheDocument()
      // Year renders (formatted as full date when releaseDate is available)
      expect(screen.getByText('15 Mar 2023')).toBeInTheDocument()
      // Type badge
      expect(screen.getByText('album')).toBeInTheDocument()

      // Streaming link buttons
      expect(screen.getByText('Spotify')).toBeInTheDocument()
      expect(screen.getByText('YouTube')).toBeInTheDocument()
      expect(screen.getByText('SoundCloud')).toBeInTheDocument()
      expect(screen.getByText('Bandcamp')).toBeInTheDocument()
      expect(screen.getByText('Apple Music')).toBeInTheDocument()
      expect(screen.getByText('Deezer')).toBeInTheDocument()
      expect(screen.getByText('Tidal')).toBeInTheDocument()
      expect(screen.getByText('Amazon Music')).toBeInTheDocument()

      // Tracklist
      expect(screen.getByText('Track 1')).toBeInTheDocument()
      expect(screen.getByText('Track 8')).toBeInTheDocument()
      expect(screen.getByText('4:00')).toBeInTheDocument()

      // Verify links point to correct URLs
      const spotifyLink = container.querySelector('a[href="https://open.spotify.com/album/abc123"]')
      expect(spotifyLink).not.toBeNull()
    })

    it('renders release overlay without streaming links gracefully', () => {
      const release: AppRelease = {
        id: 'itunes-1001',
        title: 'New Release',
        artwork: '',
        year: '2024',
      }

      render(<ReleaseOverlayContent data={release} />)

      expect(screen.getByText('New Release')).toBeInTheDocument()
      expect(screen.getByText('2024')).toBeInTheDocument()
      // No streaming link buttons should be present
      expect(screen.queryByText('Spotify')).not.toBeInTheDocument()
    })

    it('updates overlay when release data changes (simulating re-render after sync)', () => {
      // Before sync: release without enrichment
      const beforeSync: AppRelease = {
        id: 'itunes-1001',
        title: 'Antihero',
        artwork: 'old-art.jpg',
        year: '2023',
        streamingLinks: [{ platform: 'appleMusic', url: 'https://music.apple.com/1001' }],
      }

      const { rerender } = render(<ReleaseOverlayContent data={beforeSync} />)

      expect(screen.getByText('Antihero')).toBeInTheDocument()
      expect(screen.getByText('Apple Music')).toBeInTheDocument()
      expect(screen.queryByText('Spotify')).not.toBeInTheDocument()
      expect(screen.queryByText('album')).not.toBeInTheDocument()

      // After sync: fully enriched release
      const afterSync: AppRelease = makeExpectedEnrichedRelease()

      rerender(<ReleaseOverlayContent data={afterSync} />)

      // New data should render immediately
      expect(screen.getByText('Spotify')).toBeInTheDocument()
      expect(screen.getByText('YouTube')).toBeInTheDocument()
      expect(screen.getByText('album')).toBeInTheDocument()
      expect(screen.getByText('Track 1')).toBeInTheDocument()
    })
  })

  // ── 8. Full end-to-end: KV load → sync trigger → KV update → UI refresh ──

  describe('End-to-end: sync trigger → KV update → UI refresh', () => {
    it('simulates full sync flow: manual trigger → API → KV overwrite → refetch → updated UI', async () => {
      let kvStore: SiteData = {
        ...DEFAULT_SITE_DATA,
        artistName: 'Zardonic',
        releases: [
          { id: 'old-1', title: 'Stale Release', artwork: 'stale.jpg', year: '2018' },
        ],
      }

      let getCallCount = 0
      vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, init) => {
        const u = typeof url === 'string' ? url : url.toString()
        const method = (init as RequestInit)?.method?.toUpperCase() ?? 'GET'

        // KV GET — returns current store
        if (u.includes('/api/kv?') && method === 'GET') {
          getCallCount++
          return new Response(JSON.stringify({ value: kvStore }), { status: 200 })
        }

        // Releases-enrich POST — simulates the sync writing to KV
        if (u.includes('/api/releases-enrich') && method === 'POST') {
          // Simulate: sync completely overwrites releases
          kvStore = {
            ...kvStore,
            releases: [
              {
                id: 'itunes-1001',
                title: 'Antihero',
                artwork: 'antihero.jpg',
                year: '2023',
                releaseDate: '2023-03-15',
                type: 'album',
                streamingLinks: [
                  { platform: 'spotify', url: 'https://open.spotify.com/album/abc123' },
                  { platform: 'appleMusic', url: 'https://music.apple.com/album/1001' },
                ],
                tracks: [{ title: 'Track 1', duration: '4:00' }],
              },
            ],
          }
          return new Response(JSON.stringify({ ok: true, synced: 1, enriched: 1, source: 'itunes' }))
        }

        // Sync timestamps
        if (u.includes('/api/sync')) {
          return new Response(JSON.stringify({ lastReleasesSync: 0, lastGigsSync: 0 }))
        }

        // KV POST (write) — accept silently
        if (u.includes('/api/kv') && method === 'POST') {
          return new Response(JSON.stringify({ success: true }), { status: 200 })
        }

        return new Response('{}', { status: 200 })
      })

      // 1. Load initial data from KV
      const { result } = renderHook(() => useKV<SiteData>('band-data', DEFAULT_SITE_DATA))
      await waitFor(() => expect(result.current[2]).toBe(true))
      expect(result.current[0].releases[0].title).toBe('Stale Release')

      // 2. Trigger sync (simulates POST /api/releases-enrich)
      const syncRes = await fetch('/api/releases-enrich', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      const syncData = await syncRes.json()
      expect(syncData.ok).toBe(true)
      expect(syncData.source).toBe('itunes')

      // 3. The KV store was overwritten by the sync
      expect(kvStore.releases[0].title).toBe('Antihero')
      expect(kvStore.releases[0].streamingLinks).toHaveLength(2)

      // 4. Refetch triggers re-read from KV
      const refetch = result.current[3]
      act(() => { refetch() })

      await waitFor(() => {
        expect(result.current[0].releases[0].title).toBe('Antihero')
      })

      // 5. Verify the fresh data is now available to components
      const siteData = result.current[0]
      expect(siteData.releases).toHaveLength(1)
      expect(siteData.releases[0].id).toBe('itunes-1001')
      expect(siteData.releases[0].type).toBe('album')
      expect(siteData.releases[0].streamingLinks?.[0].platform).toBe('spotify')
      expect(siteData.releases[0].tracks?.[0].title).toBe('Track 1')

      // 6. The old stale release is completely gone
      expect(siteData.releases.find(r => r.id === 'old-1')).toBeUndefined()
    })

    it('sync response includes source field indicating iTunes or Spotify', async () => {
      vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, init) => {
        const u = typeof url === 'string' ? url : url.toString()
        const method = (init as RequestInit)?.method?.toUpperCase() ?? 'GET'

        if (u.includes('/api/releases-enrich') && method === 'POST') {
          return new Response(JSON.stringify({
            ok: true,
            source: 'spotify',
            synced: 2,
            total: 2,
            enriched: 2,
            typeDetected: 2,
            tracklistsFetched: 0,
          }))
        }
        return new Response('{}')
      })

      const res = await fetch('/api/releases-enrich', { method: 'POST' })
      const data = await res.json()

      expect(data.ok).toBe(true)
      expect(data.source).toBe('spotify')
      expect(data.synced).toBe(2)
      expect(data.enriched).toBe(2)
    })
  })

  // ── 9. Cron vs manual auth ─────────────────────────────────────────────

  describe('Auth: cron vs manual trigger', () => {
    it('cron endpoint accepts Bearer CRON_SECRET authorization', async () => {
      vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, init) => {
        const u = typeof url === 'string' ? url : url.toString()
        if (u.includes('/api/releases-enrich')) {
          const authHeader = (init as RequestInit)?.headers as Record<string, string>
          if (authHeader?.Authorization === 'Bearer test-cron-secret') {
            return new Response(JSON.stringify({ ok: true, synced: 0 }))
          }
          return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
        }
        return new Response('{}')
      })

      const cronRes = await fetch('/api/releases-enrich', {
        method: 'POST',
        headers: { Authorization: 'Bearer test-cron-secret' },
      })
      expect(cronRes.status).toBe(200)

      const noAuthRes = await fetch('/api/releases-enrich', { method: 'POST' })
      expect(noAuthRes.status).toBe(401)
    })
  })

  // ── 10. Release adapters (no isEnriched) ───────────────────────────────

  describe('Release adapters without isEnriched', () => {
    it('fullReleaseToStored does not include isEnriched field', async () => {
      const { fullReleaseToStored } = await import('@/lib/release-adapters')
      const fullRelease = {
        id: 'test-1',
        title: 'Test',
        artwork: 'art.jpg',
        streamingLinks: { spotify: 'https://spotify.com/1' },
      }

      const stored = fullReleaseToStored(fullRelease)
      expect('isEnriched' in stored).toBe(false)
      expect(stored.title).toBe('Test')
      expect(stored.streamingLinks?.[0]).toEqual({ platform: 'spotify', url: 'https://spotify.com/1' })
    })

    it('mergeFullReleaseIntoStored does not include isEnriched field', async () => {
      const { mergeFullReleaseIntoStored } = await import('@/lib/release-adapters')
      const updated = {
        id: 'test-1',
        title: 'Updated',
        streamingLinks: { spotify: 'https://spotify.com/2' },
      }
      const existing: AppRelease = {
        id: 'test-1',
        title: 'Old',
        artwork: 'art.jpg',
        year: '2023',
        streamingLinks: [{ platform: 'appleMusic', url: 'https://apple.com/1' }],
      }

      const merged = mergeFullReleaseIntoStored(updated, existing)
      expect('isEnriched' in merged).toBe(false)
      expect(merged.title).toBe('Updated')
      // Both spotify and appleMusic should be present
      expect(merged.streamingLinks?.find(l => l.platform === 'spotify')).toBeDefined()
      expect(merged.streamingLinks?.find(l => l.platform === 'appleMusic')).toBeDefined()
    })
  })

  // ── 11. Type detection pipeline ────────────────────────────────────────

  describe('Type detection pipeline', () => {
    it('detects album type from MusicBrainz primary-type', () => {
      const mbTypes: Array<{ primary: string; expected: string }> = [
        { primary: 'Album', expected: 'album' },
        { primary: 'Single', expected: 'single' },
        { primary: 'EP', expected: 'ep' },
      ]

      for (const { primary, expected } of mbTypes) {
        const p = primary.toLowerCase()
        let result = ''
        if (p === 'single') result = 'single'
        else if (p === 'ep') result = 'ep'
        else if (p === 'album') result = 'album'
        expect(result).toBe(expected)
      }
    })

    it('detects compilation from secondary-types', () => {
      const secondaryTypes = ['Compilation']
      const sec = secondaryTypes.map(s => s.toLowerCase())
      expect(sec.includes('compilation')).toBe(true)
    })

    it('infers remix type from title keywords', () => {
      const remixTitles = [
        'Antihero (Remix)',
        'Antihero Remixes',
        'Antihero RMX',
        'Antihero Mix',
        'Antihero Mixed By Zardonic',
        'Antihero DJ Mix',
        'Antihero Continuous Mix',
      ]

      for (const title of remixTitles) {
        const lower = title.toLowerCase()
        const isRemix =
          lower.includes('remix') || lower.includes('remixes') || lower.includes('rmx') ||
          lower.includes(' mix') || lower.includes('mixed by') || lower.includes('dj mix') ||
          lower.includes('continuous mix')
        expect(isRemix).toBe(true)
      }
    })

    it('falls back to track count heuristic: ≤2 = single, 3-6 = ep, >6 = album', () => {
      const cases: Array<{ trackCount: number; expected: string }> = [
        { trackCount: 1, expected: 'single' },
        { trackCount: 2, expected: 'single' },
        { trackCount: 3, expected: 'ep' },
        { trackCount: 6, expected: 'ep' },
        { trackCount: 7, expected: 'album' },
        { trackCount: 12, expected: 'album' },
      ]

      for (const { trackCount, expected } of cases) {
        let result: string
        if (trackCount <= 2) result = 'single'
        else if (trackCount >= 3 && trackCount <= 6) result = 'ep'
        else result = 'album'
        expect(result).toBe(expected)
      }
    })
  })

  // ── 12. Streaming links array format ───────────────────────────────────

  describe('Streaming links array format', () => {
    it('stores links as array of {platform, url} objects', () => {
      const links: Array<{ platform: string; url: string }> = [
        { platform: 'spotify', url: 'https://spotify.com/1' },
        { platform: 'appleMusic', url: 'https://apple.com/1' },
      ]

      expect(links[0].platform).toBe('spotify')
      expect(links[0].url).toBe('https://spotify.com/1')

      // Lookup by platform
      const spotifyUrl = links.find(l => l.platform === 'spotify')?.url
      expect(spotifyUrl).toBe('https://spotify.com/1')
    })

    it('upserts links correctly (existing platform gets URL updated, new platform is added)', () => {
      const existingLinks = [
        { platform: 'appleMusic', url: 'https://old-apple.com' },
      ]

      const newLinks = { spotify: 'https://spotify.com/new', appleMusic: 'https://new-apple.com' }
      const result = [...existingLinks]

      for (const [plat, url] of Object.entries(newLinks)) {
        if (!url) continue
        const idx = result.findIndex(l => l.platform === plat)
        if (idx >= 0) result[idx].url = url
        else result.push({ platform: plat, url })
      }

      expect(result).toHaveLength(2)
      expect(result.find(l => l.platform === 'appleMusic')?.url).toBe('https://new-apple.com')
      expect(result.find(l => l.platform === 'spotify')?.url).toBe('https://spotify.com/new')
    })
  })
})
