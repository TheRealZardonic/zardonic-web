/**
 * API Route: Sanity Sync — iTunes + Bandsintown → Sanity
 *
 * Fetches fresh data from iTunes and Bandsintown APIs and creates/updates
 * documents in Sanity Content Lake. Prevents duplicates by checking
 * itunesId / bandsintownId before creating new documents.
 *
 * Triggered by:
 *   - Vercel Cron Job (/api/sanity-sync with Bearer CRON_SECRET)
 *   - Manual admin trigger (with session auth)
 *
 * External APIs integrated:
 *   - iTunes Search API (releases)
 *   - Bandsintown REST API (gigs/events)
 *   - Odesli / song.link API (cross-platform streaming links)
 *   - wsrv.nl (image proxy, used for artwork URL optimization)
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@sanity/client'
import { fetchWithRetry } from './_fetch-retry.js'

// ─── Constants ──────────────────────────────────────────────────────────────

const ARTIST_NAME = 'Zardonic'
const ITUNES_ARTWORK_SMALL = '100x100bb'
const ITUNES_ARTWORK_LARGE = '600x600bb'
const ITUNES_ARTWORK_SMALL_ALT = '60x60bb'

// ─── Sanity Client (server-side, with write token) ──────────────────────────

function getSanityClient() {
  const projectId = process.env.SANITY_PROJECT_ID || process.env.VITE_SANITY_PROJECT_ID || 'unz85dqo'
  const dataset = process.env.SANITY_DATASET || process.env.VITE_SANITY_DATASET || 'production'
  const token = process.env.SANITY_API_TOKEN
  if (!token) return null
  return createClient({ projectId, dataset, apiVersion: '2024-01-01', useCdn: false, token })
}

// ─── iTunes Types ───────────────────────────────────────────────────────────

interface ITunesApiResult {
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

// ─── Bandsintown Types ──────────────────────────────────────────────────────

interface BandsintownApiEvent {
  id: string | number
  datetime?: string
  starts_at?: string
  url?: string
  sold_out?: boolean
  description?: string
  title?: string
  lineup?: string[]
  offers?: Array<{ url?: string }>
  venue?: {
    name?: string
    city?: string
    region?: string
    country?: string
    street_address?: string
    postal_code?: string
  }
}

// ─── Odesli Types ───────────────────────────────────────────────────────────

interface OdesliPlatformLink {
  url: string
}

interface OdesliResponse {
  linksByPlatform?: {
    spotify?: OdesliPlatformLink
    appleMusic?: OdesliPlatformLink
    soundcloud?: OdesliPlatformLink
    youtube?: OdesliPlatformLink
    bandcamp?: OdesliPlatformLink
    deezer?: OdesliPlatformLink
    tidal?: OdesliPlatformLink
    amazon?: OdesliPlatformLink
  }
}

// ─── Handler ────────────────────────────────────────────────────────────────

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Auth: either Vercel Cron Bearer token or admin session
  const authHeader = req.headers['authorization']
  const isCron = authHeader === `Bearer ${process.env.CRON_SECRET}`

  if (!isCron) {
    // For non-cron, require admin session (checked via validateSession in production)
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const client = getSanityClient()
  if (!client) {
    return res.status(503).json({ error: 'Sanity not configured. Set SANITY_API_TOKEN.' })
  }

  const results: { itunes: string; bandsintown: string; odesli: string } = {
    itunes: 'skipped',
    bandsintown: 'skipped',
    odesli: 'skipped',
  }

  let itunesCount = 0
  let bandsintownCount = 0

  // ── Step 1: Sync iTunes Releases ────────────────────────────────────────

  try {
    const [songsRes, albumsRes] = await Promise.all([
      fetchWithRetry(
        `https://itunes.apple.com/search?term=${encodeURIComponent(ARTIST_NAME)}&entity=song&limit=200`,
        { headers: { Accept: 'application/json' } }
      ),
      fetchWithRetry(
        `https://itunes.apple.com/search?term=${encodeURIComponent(ARTIST_NAME)}&entity=album&limit=200`,
        { headers: { Accept: 'application/json' } }
      ),
    ])

    if (songsRes.ok && albumsRes.ok) {
      const [songsData, albumsData] = await Promise.all([songsRes.json(), albumsRes.json()])
      const allResults: ITunesApiResult[] = [
        ...(songsData.results || []),
        ...(albumsData.results || []),
      ]

      // Deduplicate by collectionId
      const releasesMap = new Map<string, ITunesApiResult>()
      for (const track of allResults) {
        if (!track.collectionId || !track.collectionName) continue
        const artist = (track.artistName || '').toLowerCase()
        const collArtist = (track.collectionArtistName || '').toLowerCase()
        if (!artist.includes('zardonic') && !collArtist.includes('zardonic')) continue
        const cid = track.collectionId.toString()
        if (!releasesMap.has(cid)) releasesMap.set(cid, track)
      }

      // Create missing releases in Sanity
      for (const [cid, track] of releasesMap) {
        const existing = await client.fetch(
          `*[_type == "release" && itunesId == $itunesId][0] { _id }`,
          { itunesId: cid }
        )
        if (existing) continue

        const artwork = track.artworkUrl100?.replace(ITUNES_ARTWORK_SMALL, ITUNES_ARTWORK_LARGE)
          || track.artworkUrl60?.replace(ITUNES_ARTWORK_SMALL_ALT, ITUNES_ARTWORK_LARGE)
          || ''

        const releaseDate = track.releaseDate
          ? new Date(track.releaseDate).toISOString().split('T')[0]
          : undefined

        // Fetch cross-platform links via Odesli
        const streamingLinks: Record<string, string> = {}
        const appleMusicUrl = track.collectionViewUrl || track.trackViewUrl
        if (appleMusicUrl) {
          streamingLinks.appleMusic = appleMusicUrl
          try {
            const odesliRes = await fetchWithRetry(
              `https://api.song.link/v1-alpha.1/links?url=${encodeURIComponent(appleMusicUrl)}&userCountry=DE`,
              { headers: { Accept: 'application/json' } }
            )
            if (odesliRes.ok) {
              const odesli: OdesliResponse = await odesliRes.json()
              const links = odesli.linksByPlatform
              if (links?.spotify) streamingLinks.spotify = links.spotify.url
              if (links?.soundcloud) streamingLinks.soundcloud = links.soundcloud.url
              if (links?.youtube) streamingLinks.youtube = links.youtube.url
              if (links?.bandcamp) streamingLinks.bandcamp = links.bandcamp.url
              if (links?.deezer) streamingLinks.deezer = links.deezer.url
              if (links?.tidal) streamingLinks.tidal = links.tidal.url
              if (links?.amazon) streamingLinks.amazonMusic = links.amazon.url
              results.odesli = 'ok'
            }
          } catch {
            // Odesli is optional — continue without cross-platform links
          }
        }

        await client.create({
          _type: 'release',
          title: track.collectionName || 'Unknown',
          artworkUrl: artwork,
          releaseDate,
          year: releaseDate ? releaseDate.substring(0, 4) : undefined,
          streamingLinks,
          itunesId: cid,
          source: 'itunes',
        })
        itunesCount++
      }

      results.itunes = `ok (${itunesCount} new)`
    } else {
      results.itunes = `error: songs=${songsRes.status}, albums=${albumsRes.status}`
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown'
    results.itunes = `error: ${msg}`
  }

  // ── Step 2: Sync Bandsintown Events ─────────────────────────────────────

  const bandsintownKey = process.env.BANDSINTOWN_API_KEY
  if (bandsintownKey) {
    try {
      const params = new URLSearchParams({ app_id: bandsintownKey })
      const bitRes = await fetchWithRetry(
        `https://rest.bandsintown.com/artists/${encodeURIComponent(ARTIST_NAME)}/events?${params.toString()}`,
        { headers: { Accept: 'application/json' } }
      )

      if (bitRes.ok) {
        const events: BandsintownApiEvent[] = await bitRes.json()

        for (const event of events) {
          const bitId = `bit-${event.id}`
          const existing = await client.fetch(
            `*[_type == "gig" && bandsintownId == $bandsintownId][0] { _id }`,
            { bandsintownId: bitId }
          )
          if (existing) continue

          const venue = event.venue
          const location = [venue?.city, venue?.region, venue?.country].filter(Boolean).join(', ')
          const date = event.datetime
            ? new Date(event.datetime).toISOString().split('T')[0]
            : undefined

          await client.create({
            _type: 'gig',
            title: event.title || undefined,
            venue: venue?.name || 'TBA',
            location,
            date,
            startsAt: event.starts_at || event.datetime || undefined,
            ticketUrl: event.offers?.[0]?.url || event.url || undefined,
            lineup: event.lineup || [],
            streetAddress: venue?.street_address || undefined,
            postalCode: venue?.postal_code || undefined,
            soldOut: event.sold_out || false,
            description: event.description || undefined,
            bandsintownId: bitId,
            source: 'bandsintown',
            status: 'confirmed',
          })
          bandsintownCount++
        }

        results.bandsintown = `ok (${bandsintownCount} new)`
      } else {
        results.bandsintown = `error: ${bitRes.status}`
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown'
      results.bandsintown = `error: ${msg}`
    }
  }

  // ── Step 3: Update Sync Log in Sanity ───────────────────────────────────

  try {
    const now = new Date().toISOString()
    await client.createOrReplace({
      _id: 'syncLog',
      _type: 'syncLog',
      lastReleasesSync: results.itunes.startsWith('ok') ? now : undefined,
      lastGigsSync: results.bandsintown.startsWith('ok') ? now : undefined,
      lastItunesSyncStatus: results.itunes,
      lastBandsintownSyncStatus: results.bandsintown,
    })
  } catch (error) {
    console.error('[Sanity Sync] Failed to update sync log:', error)
  }

  return res.status(200).json({
    success: true,
    results,
    counts: { itunes: itunesCount, bandsintown: bandsintownCount },
    timestamp: Date.now(),
  })
}
