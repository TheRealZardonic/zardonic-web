/**
 * POST /api/releases-enrich-single
 *
 * Hybrid MusicBrainz + Odesli enrichment for a single release.
 *
 * Workflow:
 *  1. Fetch the release from Redis by ID.
 *  2. Search MusicBrainz for the release (title + "Zardonic").
 *  3. Load the full MusicBrainz release (recordings + url-rels) to get:
 *       - Canonical release type (Album / EP / Single / …)
 *       - Precise release date
 *       - Full tracklist with per-track durations
 *       - Any existing Spotify / Apple Music URL from MusicBrainz relations
 *  4. Pass the best available URL to Odesli (MusicBrainz Spotify >
 *     MusicBrainz Apple Music > existing Apple Music on release) to
 *     collect all streaming links.
 *  5. Merge metadata + links into the release, set isEnriched = true,
 *     persist back to Redis.
 *  6. Return the enriched release + a detailed status message.
 *
 * Bypasses the isEnriched flag so admins can force a re-sync.
 * Requires a valid admin session.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getRedisOrNull, isRedisConfigured } from './_redis.js'
import { fetchWithRetry } from './_fetch-retry.js'
import { validateSession } from './auth.js'
import {
  msToTime,
  isTrustedHost,
  mbTypeToReleaseType,
  inferTypeFromTitle,
  searchMusicBrainz,
  fetchMusicBrainzRelease,
} from './_musicbrainz.js'

const BAND_DATA_KEY = 'band-data'
const ODESLI_CACHE_TTL = 86_400

interface Track {
  title: string
  duration?: string
}

interface StreamingLink {
  platform: string
  url: string
}

interface Release {
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
  isEnriched?: boolean
}

interface SiteData {
  releases: Release[]
  [key: string]: unknown
}

interface OdesliLink { url: string }

interface OdesliResponse {
  linksByPlatform?: Record<string, OdesliLink>
}

function odesliCacheKey(url: string): string {
  return `odesli:links:${url.replace(/^https?:\/\//, '').replace(/[^a-zA-Z0-9._/-]/g, '_').slice(0, 200)}`
}

async function fetchOdesliLinks(
  lookupUrl: string,
  redis: NonNullable<ReturnType<typeof getRedisOrNull>>,
): Promise<OdesliResponse | null> {
  const cacheKey = odesliCacheKey(lookupUrl)
  try {
    const cached = await redis.get<OdesliResponse>(cacheKey)
    if (cached) return cached
  } catch { }
  const apiUrl = `https://api.song.link/v1-alpha.1/links?url=${encodeURIComponent(lookupUrl)}&userCountry=US`
  const res = await fetchWithRetry(apiUrl)
  if (!res.ok) return null
  const data: OdesliResponse = await res.json()
  try { await redis.set(cacheKey, data, { ex: ODESLI_CACHE_TTL }) } catch { }
  return data
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method === 'OPTIONS') { res.status(200).end(); return }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return }

  const sessionValid = await validateSession(req)
  if (!sessionValid) { res.status(401).json({ error: 'Unauthorized' }); return }

  if (!isRedisConfigured()) {
    res.status(503).json({ error: 'Redis not configured' }); return
  }

  const { id } = (req.body ?? {}) as { id?: string }
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

    let mbSpotifyUrl: string | undefined
    let mbAppleMusicUrl: string | undefined
    
    const existingAppleUrl = release.streamingLinks?.find(l => l.platform === 'appleMusic')?.url

    const mbSearch = await searchMusicBrainz(release.title)
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
        for (const rel of mbFull.relations ?? []) {
          const u = rel.url?.resource ?? ''
          if (!mbSpotifyUrl && isTrustedHost(u, 'open.spotify.com'))  mbSpotifyUrl = u
          if (!mbAppleMusicUrl && isTrustedHost(u, 'music.apple.com')) mbAppleMusicUrl = u
        }
      }
    } else {
      steps.push('MusicBrainz: keine Treffer gefunden')
      const fromTitle = inferTypeFromTitle(release.title)
      if (fromTitle && !updated.type) updated.type = fromTitle
    }

    const odesliLookupUrl = mbSpotifyUrl ?? mbAppleMusicUrl ?? existingAppleUrl
    if (odesliLookupUrl) {
      const odesli = await fetchOdesliLinks(odesliLookupUrl, redis)
      if (odesli?.linksByPlatform) {
        const p = odesli.linksByPlatform
        const newLinks: StreamingLink[] = []
        
        if (p.spotify?.url) newLinks.push({ platform: 'spotify', url: p.spotify.url })
        if (p.appleMusic?.url) newLinks.push({ platform: 'appleMusic', url: p.appleMusic.url })
        if (p.soundcloud?.url) newLinks.push({ platform: 'soundcloud', url: p.soundcloud.url })
        if (p.youtube?.url) newLinks.push({ platform: 'youtube', url: p.youtube.url })
        if (p.bandcamp?.url) newLinks.push({ platform: 'bandcamp', url: p.bandcamp.url })
        if (p.deezer?.url) newLinks.push({ platform: 'deezer', url: p.deezer.url })
        if (p.tidal?.url) newLinks.push({ platform: 'tidal', url: p.tidal.url })
        if (p.amazon?.url) newLinks.push({ platform: 'amazonMusic', url: p.amazon.url })
        
        updated.streamingLinks = newLinks
        steps.push(`Odesli: ${newLinks.length} Plattformen gefunden`)
      } else {
        steps.push('Odesli: keine Links erhalten')
      }
    } else {
      steps.push('Odesli: übersprungen wegen fehlender Quell-URL')
    }

    delete (updated as any).spotify
    delete (updated as any).soundcloud
    delete (updated as any).youtube
    delete (updated as any).bandcamp
    delete (updated as any).appleMusic
    delete (updated as any).deezer
    delete (updated as any).tidal
    delete (updated as any).amazonMusic

    updated.isEnriched = true
    const updatedReleases = releases.map(r => (r.id === id ? updated : r))
    await redis.set(BAND_DATA_KEY, { ...(existing ?? {}), releases: updatedReleases })

    res.status(200).json({ ok: true, release: updated, steps })
  } catch (error) {
    console.error('[releases-enrich-single] Unexpected error:', error)
    res.status(500).json({ error: 'Failed to enrich release' })
  }
}
