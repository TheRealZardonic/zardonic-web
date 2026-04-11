/**
 * POST /api/releases-enrich-single
 *
 * Odesli-first enrichment for a single release.
 *
 * Workflow:
 *  1. Fetch the release from Redis by ID.
 *  2. Call Odesli immediately with the Apple Music URL that iTunes provides
 *     directly — no waiting for MusicBrainz. Collect ALL streaming links
 *     that Odesli returns (every platform key is preserved).
 *     - force=true: invalidate the Odesli cache before the call.
 *     - auto-invalidation: if the cached response is missing ≥3 important
 *       platforms (spotify, youtube, appleMusic), invalidate and re-fetch.
 *  3. Spotify fallback: if Odesli returned no Spotify link, search the
 *     Spotify API directly and add the first matching album link.
 *  4. MusicBrainz Artist ID: if artistName is set but artistMbid is missing,
 *     look up the MBID once and store it. Then refresh artist data daily.
 *  5. Search MusicBrainz for the release (title + artistName) to obtain:
 *       - Canonical release type (Album / EP / Single / …)
 *       - Precise release date
 *       - Full tracklist with per-track durations
 *  6. Type fallback via inferTypeFromTitle if MusicBrainz has no match.
 *  7. Merge metadata + links into the release, persist back to Redis.
 *  8. Return the enriched release + a detailed status message.
 *
 * Requires a valid admin session.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getRedisOrNull, isRedisConfigured } from './_redis.js'
import { validateSession } from './auth.js'
import {
  msToTime,
  mbTypeToReleaseType,
  inferTypeFromTitle,
  searchMusicBrainz,
  fetchMusicBrainzRelease,
  lookupArtistMbid,
  MB_USER_AGENT,
} from './_musicbrainz.js'
import {
  cleanAppleMusicUrl,
  fetchOdesliLinks,
  odesliCacheKey,
  type StreamingLink,
} from './_odesli.js'
import { getSpotifyAccessToken } from './_spotify-client.js'
import { fetchWithRetry } from './_fetch-retry.js'

const BAND_DATA_KEY = 'band-data'

interface Track {
  title: string
  duration?: string
  artist?: string
  featuredArtists?: string[]
}

export interface Release {
  id: string
  title: string
  artwork: string
  year: string
  releaseDate?: string
  streamingLinks?: StreamingLink[]
  type?: '' | 'album' | 'ep' | 'single' | 'remix' | 'compilation'
  description?: string
  tracks?: Track[]
  trackCount?: number
  artistName?: string
  artistMbid?: string
  manuallyEdited?: boolean
  customLinks?: Array<{ label: string; url: string }>
}

interface SiteData {
  releases: Release[]
  [key: string]: unknown
}

interface SpotifySearchAlbum {
  name: string
  external_urls?: { spotify?: string }
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  res.setHeader('Access-Control-Allow-Origin', 'https://zardonic.com')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') { res.status(200).end(); return }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return }

  const sessionValid = await validateSession(req)
  if (!sessionValid) { res.status(401).json({ error: 'Unauthorized' }); return }

  if (!isRedisConfigured()) {
    res.status(503).json({ error: 'Redis not configured' }); return
  }

  const { id, force } = (req.body ?? {}) as { id?: string; force?: boolean }
  if (!id || typeof id !== 'string') {
    res.status(400).json({ error: 'Missing release id' }); return
  }

  const redis = getRedisOrNull()!

  try {
    const existing = await redis.get<SiteData>(BAND_DATA_KEY)
    const releases: Release[] = existing?.releases ?? []
    const release = releases.find(r => r.id === id)
    if (!release) { res.status(404).json({ error: 'Release not found' }); return }

    const updated: Release = { ...release }
    const steps: string[] = []

    const existingAppleUrl = release.streamingLinks?.find(l => l.platform === 'appleMusic')?.url
    // Clean any affiliate query params and geo redirect domains (geo.music.apple.com → music.apple.com)
    // from the Apple Music URL before passing to Odesli AND before writing back to Redis, so that
    // dirty URLs stored in older Redis entries are always fixed on the next single-enrich call.
    const cleanedAppleUrl = existingAppleUrl ? cleanAppleMusicUrl(existingAppleUrl) : undefined

    // Immediately write the cleaned Apple Music URL back into updated.streamingLinks so that
    // even if Odesli returns no results the stored release no longer contains the dirty URL.
    if (cleanedAppleUrl && cleanedAppleUrl !== existingAppleUrl) {
      updated.streamingLinks = (updated.streamingLinks ?? []).map(l =>
        l.platform === 'appleMusic' ? { ...l, url: cleanedAppleUrl } : l
      )
    }

    // ── Step 1: Odesli — use Apple Music URL from iTunes immediately ──
    if (cleanedAppleUrl) {
      const cacheKey = odesliCacheKey(cleanedAppleUrl)

      // force=true: wipe the cache so a fresh API call is made
      if (force) {
        try { await redis.del(cacheKey) } catch { /* non-fatal */ }
        steps.push('Cache invalidiert (force=true)')
      }

      let { links: newLinks, fromCache } = await fetchOdesliLinks(cleanedAppleUrl, redis)

      // Auto-invalidation: if we got a stale cached response that is missing
      // important platforms, wipe it and re-fetch immediately.
      const IMPORTANT = ['spotify', 'youtube', 'appleMusic']
      const importantCount = newLinks.filter(l => IMPORTANT.includes(l.platform)).length
      if (!force && fromCache && importantCount < 3) {
        try { await redis.del(cacheKey) } catch { /* non-fatal */ }
        steps.push('Cache invalidiert (unvollständige Plattformen)')
        const fresh = await fetchOdesliLinks(cleanedAppleUrl, redis)
        newLinks = fresh.links
        fromCache = fresh.fromCache
      }

      if (newLinks.length > 0) {
        updated.streamingLinks = newLinks
        steps.push(`Odesli: ${newLinks.length} Plattformen gefunden`)
      } else {
        steps.push('Odesli: keine Links erhalten')
      }
    } else {
      steps.push('Odesli: übersprungen — keine Apple Music URL vorhanden')
    }

    // ── Step 2: Spotify fallback — search API when Odesli has no Spotify link ──
    const hasSpotify = updated.streamingLinks?.some(l => l.platform === 'spotify')
    if (!hasSpotify) {
      if (!process.env.SPOTIFY_CLIENT_ID || !process.env.SPOTIFY_CLIENT_SECRET) {
        steps.push('Spotify: übersprungen (keine Credentials)')
      } else {
        try {
          const token = await getSpotifyAccessToken()
          if (!token) {
            steps.push('Spotify: kein Treffer')
          } else {
            const artistForSearch = updated.artistName ?? 'Zardonic'
            const q = encodeURIComponent(`${release.title} ${artistForSearch}`)
            const searchUrl = `https://api.spotify.com/v1/search?q=${q}&type=album&limit=5&market=US`
            const searchRes = await fetchWithRetry(searchUrl, {
              headers: { 'Authorization': `Bearer ${token}` },
            })
            if (searchRes.ok) {
              const searchData = await searchRes.json() as { albums?: { items?: SpotifySearchAlbum[] } }
              const titleLower = release.title.toLowerCase()
              const match = searchData.albums?.items?.find(item => {
                const nameLower = item.name.toLowerCase()
                return nameLower.includes(titleLower) || titleLower.includes(nameLower)
              })
              if (match?.external_urls?.spotify) {
                updated.streamingLinks = [
                  ...(updated.streamingLinks ?? []),
                  { platform: 'spotify', url: match.external_urls.spotify },
                ]
                steps.push('Spotify: gefunden via API')
              } else {
                steps.push('Spotify: kein Treffer')
              }
            } else {
              steps.push('Spotify: kein Treffer')
            }
          }
        } catch {
          steps.push('Spotify: kein Treffer')
        }
      }
    }

    // ── Step 3: MusicBrainz Artist ID — look up once if missing ──
    if (updated.artistName && !updated.artistMbid) {
      try {
        const mbid = await lookupArtistMbid(updated.artistName)
        if (mbid) {
          updated.artistMbid = mbid
          steps.push(`MusicBrainz Artist ID: ${mbid}`)
        } else {
          steps.push('MusicBrainz Artist ID: nicht gefunden')
        }
      } catch {
        steps.push('MusicBrainz Artist ID: nicht gefunden')
      }
    }

    // ── Step 4: Artist data refresh — at most once every 24 h ──
    if (updated.artistMbid) {
      const refreshKey = `mb:artist:refresh:${updated.artistMbid}`
      try {
        const alreadyFresh = await redis.get(refreshKey)
        if (!alreadyFresh) {
          const artistUrl = `https://musicbrainz.org/ws/2/artist/${updated.artistMbid}?inc=aliases+url-rels&fmt=json`
          const artistRes = await fetchWithRetry(artistUrl, { headers: { 'User-Agent': MB_USER_AGENT } })
          if (artistRes.ok) {
            const artistData: unknown = await artistRes.json()
            await redis.set(`mb:artist:${updated.artistMbid}`, artistData, { ex: 86400 })
            await redis.set(refreshKey, 1, { ex: 86400 })
            steps.push('Artist-Daten gecacht')
          }
        } else {
          steps.push('Artist-Daten frisch')
        }
      } catch { /* non-fatal */ }
    }

    // ── Step 5: MusicBrainz — for type, date and tracklist only ──
    const mbSearch = await searchMusicBrainz(release.title, updated.artistName)
    if (mbSearch) {
      steps.push(`MusicBrainz: found "${mbSearch.title}"`)
      const mbFull = await fetchMusicBrainzRelease(mbSearch.id)
      if (mbFull) {
        const detectedType = mbTypeToReleaseType(mbFull['primary-type'], mbFull['secondary-types'])
        if (detectedType) {
          updated.type = detectedType
          steps.push(`Type: ${detectedType}`)
        } else {
          const fromTitle = inferTypeFromTitle(release.title)
          if (fromTitle) { updated.type = fromTitle; steps.push(`Type (title heuristic): ${fromTitle}`) }
        }
        if (mbFull.date) {
          updated.releaseDate = mbFull.date.length === 4 ? `${mbFull.date}-01-01` : mbFull.date
          updated.year = mbFull.date.slice(0, 4)
          steps.push(`Date: ${updated.releaseDate}`)
        }
        const allTracks: Track[] = []
        for (const medium of mbFull.media ?? []) {
          for (const t of medium.tracks ?? []) {
            allTracks.push({ title: t.title, duration: t.length ? msToTime(t.length) : undefined })
          }
        }
        if (allTracks.length > 0) {
          updated.tracks = allTracks
          updated.trackCount = allTracks.length
          steps.push(`Tracks: ${allTracks.length}`)
        }
      }
    } else {
      steps.push('MusicBrainz: keine Treffer gefunden')
      const fromTitle = inferTypeFromTitle(release.title)
      if (fromTitle && !updated.type) {
        updated.type = fromTitle
        steps.push(`Type (title heuristic): ${fromTitle}`)
      }
    }

    const legacyFlat = updated as unknown as Record<string, unknown>
    delete legacyFlat.spotify
    delete legacyFlat.soundcloud
    delete legacyFlat.youtube
    delete legacyFlat.bandcamp
    delete legacyFlat.appleMusic
    delete legacyFlat.deezer
    delete legacyFlat.tidal
    delete legacyFlat.amazonMusic

    const updatedReleases = releases.map(r => (r.id === id ? updated : r))
    await redis.set(BAND_DATA_KEY, { ...(existing ?? {}), releases: updatedReleases })

    res.status(200).json({ ok: true, release: updated, steps })
  } catch (error) {
    console.error('[releases-enrich-single] Unexpected error:', error)
    res.status(500).json({ error: 'Failed to enrich release' })
  }
}
