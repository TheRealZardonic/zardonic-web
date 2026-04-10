/**
 * POST /api/releases-enrich
 *
 * Server-side cron job that:
 * 1. Fetches the latest releases from iTunes
 * 2. Merges them into the persisted band-data in Redis
 * 3. Enriches each release that lacks Odesli streaming links,
 *    waiting ODESLI_DELAY_MS between requests to stay under rate limits.
 *
 * Cron calls must supply `Authorization: Bearer <CRON_SECRET>`.
 * Admin can also trigger it manually (requires valid session).
 */
/**
 * POST /api/releases-enrich
 *
 * Server-side cron job that:
 * 1. Fetches the latest releases from iTunes
 * 2. Merges them into the persisted band-data in Redis
 * 3. Enriches each release that lacks Odesli streaming links,
 * waiting ODESLI_DELAY_MS between requests to stay under rate limits.
 *
 * Cron calls must supply `Authorization: Bearer <CRON_SECRET>`.
 * Admin can also trigger it manually (requires valid session).
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getRedisOrNull, isRedisConfigured } from './_redis.js'
import { fetchWithRetry } from './_fetch-retry.js'
import { validateSession } from './auth.js'
import { timingSafeEqual } from 'node:crypto'
import {
  msToTime,
  isTrustedHost,
  mbTypeToReleaseType,
  searchMusicBrainz,
  fetchMusicBrainzRelease,
} from './_musicbrainz.js'

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

const ARTIST_NAME = 'Zardonic'
const BAND_DATA_KEY = 'band-data'
const ODESLI_DELAY_MS = 3000
const ODESLI_CACHE_TTL = 86400

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
  tracks?: Array<{ title: string; duration?: string }>
  trackCount?: number
  isEnriched?: boolean
}

interface SiteData {
  releases: Release[]
  [key: string]: unknown
}

interface ITunesTrack {
  collectionId?: number
  collectionName?: string
  trackName?: string
  trackNumber?: number
  trackTimeMillis?: number
  wrapperType?: string
  kind?: string
  artistName?: string
  collectionArtistName?: string
  artworkUrl100?: string
  artworkUrl60?: string
  releaseDate?: string
  collectionViewUrl?: string
  trackViewUrl?: string
  collectionExplicitness?: string
  trackExplicitness?: string
}

interface OdesliLink {
  url: string
}

interface OdesliEntity {
  id: string
  type: string
  title?: string
  artistName?: string
  thumbnailUrl?: string
  apiProvider?: string
}

interface OdesliResponse {
  entityUniqueId?: string
  entitiesByUniqueId?: Record<string, OdesliEntity>
  linksByPlatform?: {
    spotify?: OdesliLink
    appleMusic?: OdesliLink
    soundcloud?: OdesliLink
    youtube?: OdesliLink
    bandcamp?: OdesliLink
    deezer?: OdesliLink
    tidal?: OdesliLink
    amazon?: OdesliLink
  }
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function odesliCacheKey(url: string): string {
  return `odesli:links:${url.replace(/^https?:\/\//, '').replace(/[^a-zA-Z0-9._/-]/g, '_').slice(0, 200)}`
}

function inferTypeFromTitle(title: string): '' | 'album' | 'ep' | 'single' | 'remix' | 'compilation' {
  const lower = title.toLowerCase()
  if (lower.includes('compilation') || lower.includes('best of') || lower.includes('greatest hits')) return 'compilation'
  if (lower.includes('remix') || lower.includes('remixed') || lower.includes('remixes') || lower.includes('rmx')) return 'remix'
  if (lower.includes(' mix') || lower.includes('mixed by') || lower.includes('dj mix') || lower.includes('continuous mix')) return 'remix'
  return ''
}

function detectReleaseType(
  title: string,
  trackCount: number,
  entityType: string | undefined,
  artistName: string,
): '' | 'album' | 'ep' | 'single' | 'remix' | 'compilation' {
  const fromTitle = inferTypeFromTitle(title)
  if (fromTitle === 'remix' || fromTitle === 'compilation') return fromTitle

  if (entityType === 'song' || trackCount <= 2) return 'single'
  if (trackCount >= 3 && trackCount <= 6) return 'ep'
  const isMainArtist = artistName.toLowerCase().includes(ARTIST_NAME.toLowerCase())
  return isMainArtist ? 'album' : 'compilation'
}

async function fetchITunesTracklist(collectionId: string): Promise<Array<{ title: string; duration?: string }>> {
  try {
    const id = collectionId.replace(/^itunes-/, '')
    const res = await fetchWithRetry(
      `https://itunes.apple.com/lookup?id=${encodeURIComponent(id)}&entity=song&sort=trackNumber`
    )
    if (!res.ok) return []
    const data = await res.json()
    const results: ITunesTrack[] = data.results || []
    return results
      .filter(t => t.wrapperType === 'track' && t.trackName)
      .sort((a, b) => (a.trackNumber ?? 0) - (b.trackNumber ?? 0))
      .map(t => ({
        title: t.trackName ?? '',
        duration: t.trackTimeMillis ? msToTime(t.trackTimeMillis) : undefined,
      }))
  } catch {
    return []
  }
}

async function fetchITunesTrackCount(collectionId: string): Promise<number> {
  const tracks = await fetchITunesTracklist(collectionId)
  return tracks.length
}

async function fetchITunesReleases(): Promise<Release[]> {
  const [songsRes, albumsRes] = await Promise.all([
    fetchWithRetry(
      `https://itunes.apple.com/search?term=${encodeURIComponent(ARTIST_NAME)}&entity=song&limit=200`,
    ),
    fetchWithRetry(
      `https://itunes.apple.com/search?term=${encodeURIComponent(ARTIST_NAME)}&entity=album&limit=200`,
    ),
  ])

  if (!songsRes.ok || !albumsRes.ok) {
    throw new Error(`iTunes API error: songs=${songsRes.status} albums=${albumsRes.status}`)
  }

  const [songsData, albumsData] = await Promise.all([songsRes.json(), albumsRes.json()])
  const results: ITunesTrack[] = [
    ...(songsData.results || []),
    ...(albumsData.results || []),
  ]

  const map = new Map<string, Release>()
  for (const track of results) {
    if (!track.collectionId || !track.collectionName) continue
    const artist = (track.artistName || '').toLowerCase()
    const collArtist = (track.collectionArtistName || '').toLowerCase()
    if (!artist.includes('zardonic') && !collArtist.includes('zardonic')) continue

    const id = `itunes-${track.collectionId}`
    if (map.has(id)) continue

    const mainArtist = track.collectionArtistName || track.artistName || ARTIST_NAME
    const appleUrl = track.collectionViewUrl || track.trackViewUrl || ''
    const streamingLinks: StreamingLink[] = appleUrl ? [{ platform: 'appleMusic', url: appleUrl }] : []

    map.set(id, {
      id,
      title: track.collectionName,
      artwork: (track.artworkUrl100 || '').replace('100x100bb', '600x600bb') ||
               (track.artworkUrl60 || '').replace('60x60bb', '600x600bb') || '',
      year: track.releaseDate ? new Date(track.releaseDate).getFullYear().toString() : '',
      releaseDate: track.releaseDate
        ? new Date(track.releaseDate).toISOString().split('T')[0]
        : undefined,
      streamingLinks,
      description: mainArtist !== ARTIST_NAME ? `ft. ${mainArtist}` : undefined,
    })
  }

  const releases = Array.from(map.values())
  releases.sort((a, b) => {
    if (!a.releaseDate && !b.releaseDate) return 0
    if (!a.releaseDate) return 1
    if (!b.releaseDate) return -1
    return new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime()
  })
  return releases
}

interface OdesliEnrichedLinks {
  links: Record<string, string | undefined>
  entityType?: string
}

async function enrichWithOdesli(
  url: string,
  redis: NonNullable<ReturnType<typeof getRedisOrNull>>,
): Promise<OdesliEnrichedLinks> {
  if (!url) return { links: {} }

  const cacheKey = odesliCacheKey(url)

  try {
    const cached = await redis.get<OdesliResponse>(cacheKey)
    if (cached) return extractLinks(cached)
  } catch (e) {}

  const response = await fetchWithRetry(
    `https://api.song.link/v1-alpha.1/links?url=${encodeURIComponent(url)}&userCountry=US`,
  )
  if (!response.ok) {
    return { links: {} }
  }

  const data: OdesliResponse = await response.json()

  try { await redis.set(cacheKey, data, { ex: ODESLI_CACHE_TTL }) } catch { }

  return extractLinks(data)
}

function extractLinks(data: OdesliResponse): OdesliEnrichedLinks {
  const p = data.linksByPlatform
  if (!p) return { links: {} }

  let entityType: string | undefined
  if (data.entityUniqueId && data.entitiesByUniqueId) {
    entityType = data.entitiesByUniqueId[data.entityUniqueId]?.type
  }

  return {
    links: {
      spotify: p.spotify?.url,
      appleMusic: p.appleMusic?.url,
      soundcloud: p.soundcloud?.url,
      youtube: p.youtube?.url,
      bandcamp: p.bandcamp?.url,
      deezer: p.deezer?.url,
      tidal: p.tidal?.url,
      amazonMusic: p.amazon?.url,
    },
    entityType,
  }
}

function needsEnrichment(r: Release): boolean {
  return !r.isEnriched
}

function needsTypeDetection(r: Release): boolean {
  return !r.type
}

function needsTracklist(r: Release): boolean {
  return (r.type === 'album' || r.type === 'compilation' || r.type === 'ep' || r.type === 'single') && (!r.tracks || r.tracks.length === 0)
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method === 'OPTIONS') { res.status(200).end(); return }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return }

  const authHeader = req.headers.authorization ?? ''
  const isCron = authHeader.startsWith('Bearer ') && verifyCronSecret(authHeader.slice(7))

  if (!isCron) {
    const sessionValid = await validateSession(req)
    if (!sessionValid) { res.status(401).json({ error: 'Unauthorized' }); return }
  }

  if (!isRedisConfigured()) {
    res.status(503).json({ error: 'Redis not configured' }); return
  }

  const redis = getRedisOrNull()!

  try {
    const iTunesReleases = await fetchITunesReleases()
    if (iTunesReleases.length === 0) {
      res.status(200).json({ ok: true, message: 'No releases found from iTunes', synced: 0, enriched: 0 })
      return
    }

    const existing = await redis.get<SiteData>(BAND_DATA_KEY)
    
    const existingReleases: Release[] = (existing?.releases ?? []).map(r => {
      const updatedR = { ...r }
      const links: StreamingLink[] = updatedR.streamingLinks || []
      
      const addLink = (platform: string, url: any) => {
        if (url && typeof url === 'string' && !links.find(l => l.platform === platform)) {
          links.push({ platform, url })
        }
      }

      addLink('spotify', (updatedR as any).spotify)
      addLink('appleMusic', (updatedR as any).appleMusic)
      addLink('soundcloud', (updatedR as any).soundcloud)
      addLink('youtube', (updatedR as any).youtube)
      addLink('bandcamp', (updatedR as any).bandcamp)
      addLink('deezer', (updatedR as any).deezer)
      addLink('tidal', (updatedR as any).tidal)
      addLink('amazonMusic', (updatedR as any).amazonMusic)

      updatedR.streamingLinks = links
      
      delete (updatedR as any).spotify
      delete (updatedR as any).appleMusic
      delete (updatedR as any).soundcloud
      delete (updatedR as any).youtube
      delete (updatedR as any).bandcamp
      delete (updatedR as any).deezer
      delete (updatedR as any).tidal
      delete (updatedR as any).amazonMusic

      return updatedR
    })

    const existingById = new Map(existingReleases.map(r => [r.id, r]))

    for (const fresh of iTunesReleases) {
      const current = existingById.get(fresh.id)
      if (current) {
        const freshAppleUrl = fresh.streamingLinks?.find(l => l.platform === 'appleMusic')?.url
        const mergedLinks = current.streamingLinks || []
        
        if (freshAppleUrl) {
          const idx = mergedLinks.findIndex(l => l.platform === 'appleMusic')
          if (idx >= 0) mergedLinks[idx].url = freshAppleUrl
          else mergedLinks.push({ platform: 'appleMusic', url: freshAppleUrl })
        }

        existingById.set(fresh.id, {
          ...current,
          artwork: fresh.artwork || current.artwork,
          year: current.year || fresh.year,
          releaseDate: current.releaseDate || fresh.releaseDate,
          streamingLinks: mergedLinks
        })
      } else {
        existingById.set(fresh.id, fresh)
      }
    }

    let enriched = 0
    let typeDetected = 0
    let tracklistsFetched = 0
    let enrichCount = 0
    const MAX_ENRICH_PER_RUN = Number(process.env.MAX_ENRICH_PER_RUN) || 10
    const MB_DELAY_MS = 1500

    const releasesArray = Array.from(existingById.values())
    for (const release of releasesArray) {
      const shouldEnrich = needsEnrichment(release)
      const shouldDetectType = needsTypeDetection(release)

      if (!shouldEnrich && !shouldDetectType) continue

      try {
        const updated: Release = { ...release }
        let odesliEntityType: string | undefined

        if (shouldEnrich) {
          if (enrichCount >= MAX_ENRICH_PER_RUN) continue

          let mbSpotifyUrl: string | undefined
          let mbAppleMusicUrl: string | undefined

          try {
            const cleanedTitle = release.title
              .replace(/\s*-\s*(EP|Single|Remixes|Remix|Deluxe Edition|Special Edition)\s*$/i, '')
              .replace(/\s*\(feat\.[^)]*\)/gi, '')
              .trim()

            const mbSearch = await searchMusicBrainz(cleanedTitle, ARTIST_NAME)
            if (mbSearch) {
              const mbFull = await fetchMusicBrainzRelease(mbSearch.id)
              if (mbFull) {
                const detectedType = mbTypeToReleaseType(mbFull['primary-type'], mbFull['secondary-types'])
                if (detectedType) updated.type = detectedType

                if (mbFull.date) {
                  updated.releaseDate = mbFull.date.length === 4 ? `${mbFull.date}-01-01` : mbFull.date
                  updated.year = mbFull.date.slice(0, 4)
                }

                const allTracks: Array<{ title: string; duration?: string }> = []
                for (const medium of mbFull.media ?? []) {
                  for (const t of medium.tracks ?? []) {
                    allTracks.push({ title: t.title, duration: t.length ? msToTime(t.length) : undefined })
                  }
                }
                if (allTracks.length > 0) {
                  updated.tracks = allTracks
                  updated.trackCount = allTracks.length
                }

                for (const rel of mbFull.relations ?? []) {
                  const u = rel.url?.resource ?? ''
                  if (!mbSpotifyUrl && isTrustedHost(u, 'open.spotify.com'))  mbSpotifyUrl = u
                  if (!mbAppleMusicUrl && isTrustedHost(u, 'music.apple.com')) mbAppleMusicUrl = u
                }
              }
            }
          } catch (mbErr) {
            await delay(MB_DELAY_MS)
          }
          await delay(MB_DELAY_MS)

          const currentAppleUrl = release.streamingLinks?.find(l => l.platform === 'appleMusic')?.url
          const odesliLookupUrl = mbSpotifyUrl ?? mbAppleMusicUrl ?? currentAppleUrl ?? ''

          const { links, entityType } = await enrichWithOdesli(odesliLookupUrl, redis)
          odesliEntityType = entityType

          const newLinks = [...(updated.streamingLinks || [])]
          const updateLink = (plat: string, url: string | undefined) => {
            if (!url) return
            const idx = newLinks.findIndex(l => l.platform === plat)
            if (idx >= 0) newLinks[idx].url = url
            else newLinks.push({ platform: plat, url })
          }

          updateLink('spotify', links.spotify)
          updateLink('soundcloud', links.soundcloud)
          updateLink('youtube', links.youtube)
          updateLink('bandcamp', links.bandcamp)
          updateLink('deezer', links.deezer)
          updateLink('tidal', links.tidal)
          updateLink('amazonMusic', links.amazonMusic)
          updateLink('appleMusic', links.appleMusic)

          updated.streamingLinks = newLinks
          updated.isEnriched = true
          enriched++
          enrichCount++

          await delay(ODESLI_DELAY_MS)
        }

        if (shouldDetectType && !updated.type) {
          const trackCount = updated.trackCount ?? await fetchITunesTrackCount(release.id)
          updated.trackCount = trackCount
          const detectedType = detectReleaseType(
            release.title,
            trackCount,
            odesliEntityType,
            ARTIST_NAME,
          )
          if (detectedType) {
            updated.type = detectedType
            typeDetected++
          }
        } else if (shouldDetectType && updated.type) {
          typeDetected++
        }

        existingById.set(release.id, updated)

        if (shouldEnrich) {
          const checkpoint: SiteData = {
            ...(existing ?? {}),
            releases: Array.from(existingById.values()),
          }
          await redis.set(BAND_DATA_KEY, checkpoint)
        }
      } catch (e) {
      }
    }

    const releasesAfterEnrich = Array.from(existingById.values())
    for (const release of releasesAfterEnrich) {
      if (!needsTracklist(release)) continue
      try {
        const tracks = await fetchITunesTracklist(release.id)
        if (tracks.length > 0) {
          existingById.set(release.id, { ...release, tracks })
          tracklistsFetched++
        }
        await delay(500)
      } catch (e) {
      }
    }

    const updatedSiteData: SiteData = {
      ...(existing ?? {}),
      releases: Array.from(existingById.values()),
    }
    await redis.set(BAND_DATA_KEY, updatedSiteData)

    res.status(200).json({
      ok: true,
      synced: iTunesReleases.length,
      total: existingById.size,
      enriched,
      typeDetected,
      tracklistsFetched,
    })
  } catch (error) {
    res.status(500).json({ error: 'Failed to enrich releases' })
  }
}
