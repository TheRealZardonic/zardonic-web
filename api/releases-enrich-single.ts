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

const BAND_DATA_KEY = 'band-data'
const ARTIST_NAME = 'Zardonic'
const ODESLI_CACHE_TTL = 86_400
const MB_USER_AGENT = 'ZardonicWebsite/1.0 (https://zardonic.com)'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Track {
  title: string
  duration?: string
}

interface Release {
  id: string
  title: string
  artwork: string
  year: string
  releaseDate?: string
  spotify?: string
  soundcloud?: string
  youtube?: string
  bandcamp?: string
  appleMusic?: string
  deezer?: string
  tidal?: string
  amazonMusic?: string
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

interface MbSearchRelease {
  id: string
  title: string
  date?: string
  'primary-type'?: string
  'secondary-types'?: string[]
  score?: number
}

interface MbSearchResponse {
  releases?: MbSearchRelease[]
}

interface MbTrack {
  position: number
  title: string
  length?: number
}

interface MbMedium {
  tracks?: MbTrack[]
}

interface MbRelation {
  type: string
  url?: { resource: string }
}

interface MbFullRelease {
  id: string
  title: string
  date?: string
  'primary-type'?: string
  'secondary-types'?: string[]
  media?: MbMedium[]
  relations?: MbRelation[]
}

interface OdesliLink { url: string }

interface OdesliResponse {
  entityUniqueId?: string
  entitiesByUniqueId?: Record<string, { id: string; type: string }>
  linksByPlatform?: {
    spotify?:    OdesliLink
    appleMusic?: OdesliLink
    soundcloud?: OdesliLink
    youtube?:    OdesliLink
    bandcamp?:   OdesliLink
    deezer?:     OdesliLink
    tidal?:      OdesliLink
    amazon?:     OdesliLink
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function msToTime(ms: number): string {
  const s = Math.round(ms / 1000)
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`
}

function odesliCacheKey(url: string): string {
  return `odesli:links:${url.replace(/^https?:\/\//, '').replace(/[^a-zA-Z0-9._/-]/g, '_').slice(0, 200)}`
}

/**
 * Check whether a URL's hostname exactly matches `host` or is a subdomain of it.
 * Guards against URLs like "https://evil.com/open.spotify.com" or
 * "https://open.spotify.com.evil.com" that would otherwise pass a naive .includes() check.
 */
function isTrustedHost(url: string, host: string): boolean {
  try {
    const h = new URL(url).hostname.toLowerCase()
    return h === host || h.endsWith(`.${host}`)
  } catch { return false }
}

function mbTypeToReleaseType(
  primary?: string,
  secondary?: string[],
): '' | 'album' | 'ep' | 'single' | 'remix' | 'compilation' {
  const sec = (secondary ?? []).map(s => s.toLowerCase())
  if (sec.includes('compilation'))       return 'compilation'
  if (sec.includes('remix'))             return 'remix'
  if (sec.includes('mixtape/street'))    return 'compilation'
  const p = (primary ?? '').toLowerCase()
  if (p === 'single') return 'single'
  if (p === 'ep')     return 'ep'
  if (p === 'album')  return 'album'
  return ''
}

function inferTypeFromTitle(title: string): '' | 'album' | 'ep' | 'single' | 'remix' | 'compilation' {
  const l = title.toLowerCase()
  if (l.includes('compilation') || l.includes('best of') || l.includes('greatest hits')) return 'compilation'
  if (l.includes('remix') || l.includes('remixes') || l.includes('rmx') || l.includes(' mix')) return 'remix'
  return ''
}

async function searchMusicBrainz(title: string): Promise<MbSearchRelease | null> {
  const query = `release:"${title}" AND artist:${ARTIST_NAME}`
  const url = `https://musicbrainz.org/ws/2/release/?query=${encodeURIComponent(query)}&fmt=json&limit=5`
  const res = await fetchWithRetry(url, { headers: { 'User-Agent': MB_USER_AGENT } })
  if (!res.ok) return null
  const data: MbSearchResponse = await res.json()
  return data.releases?.[0] ?? null
}

async function fetchMusicBrainzRelease(mbid: string): Promise<MbFullRelease | null> {
  const url = `https://musicbrainz.org/ws/2/release/${mbid}?inc=recordings+url-rels&fmt=json`
  const res = await fetchWithRetry(url, { headers: { 'User-Agent': MB_USER_AGENT } })
  if (!res.ok) return null
  return res.json() as Promise<MbFullRelease>
}

async function fetchOdesliLinks(
  lookupUrl: string,
  redis: NonNullable<ReturnType<typeof getRedisOrNull>>,
): Promise<OdesliResponse | null> {
  const cacheKey = odesliCacheKey(lookupUrl)
  try {
    const cached = await redis.get<OdesliResponse>(cacheKey)
    if (cached) return cached
  } catch { /* cache miss */ }
  const apiUrl = `https://api.song.link/v1-alpha.1/links?url=${encodeURIComponent(lookupUrl)}&userCountry=US`
  const res = await fetchWithRetry(apiUrl)
  if (!res.ok) return null
  const data: OdesliResponse = await res.json()
  try { await redis.set(cacheKey, data, { ex: ODESLI_CACHE_TTL }) } catch { /* non-fatal */ }
  return data
}

// ─── Handler ──────────────────────────────────────────────────────────────────

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

    // ── Step 1: MusicBrainz ───────────────────────────────────────────────────
    let mbSpotifyUrl: string | undefined
    let mbAppleMusicUrl: string | undefined

    const mbSearch = await searchMusicBrainz(release.title)
    if (mbSearch) {
      steps.push(`MusicBrainz: found "${mbSearch.title}" (score ${mbSearch.score ?? '?'})`)
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
        if (mbSpotifyUrl)    steps.push('MusicBrainz Spotify URL found')
        if (mbAppleMusicUrl) steps.push('MusicBrainz Apple Music URL found')
      }
    } else {
      steps.push('MusicBrainz: no match — using title heuristics')
      const fromTitle = inferTypeFromTitle(release.title)
      if (fromTitle && !updated.type) updated.type = fromTitle
    }

    // ── Step 2: Odesli ────────────────────────────────────────────────────────
    const odesliLookupUrl = mbSpotifyUrl ?? mbAppleMusicUrl ?? release.appleMusic
    if (odesliLookupUrl) {
      const odesli = await fetchOdesliLinks(odesliLookupUrl, redis)
      if (odesli?.linksByPlatform) {
        const p = odesli.linksByPlatform
        if (p.spotify?.url)    updated.spotify     = p.spotify.url
        if (p.soundcloud?.url) updated.soundcloud  = p.soundcloud.url
        if (p.youtube?.url)    updated.youtube     = p.youtube.url
        if (p.bandcamp?.url)   updated.bandcamp    = p.bandcamp.url
        if (p.deezer?.url)     updated.deezer      = p.deezer.url
        if (p.tidal?.url)      updated.tidal       = p.tidal.url
        if (p.amazon?.url)     updated.amazonMusic = p.amazon.url
        if (p.appleMusic?.url) updated.appleMusic  = p.appleMusic.url
        steps.push(`Odesli: ${Object.values(p).filter(Boolean).length} platform(s) found`)
      } else {
        steps.push('Odesli: no links returned')
      }
    } else {
      steps.push('Odesli: skipped (no lookup URL)')
    }

    // ── Persist ───────────────────────────────────────────────────────────────
    updated.isEnriched = true
    const updatedReleases = releases.map(r => (r.id === id ? updated : r))
    await redis.set(BAND_DATA_KEY, { ...(existing ?? {}), releases: updatedReleases })

    res.status(200).json({ ok: true, release: updated, steps })
  } catch (error) {
    console.error('[releases-enrich-single] Unexpected error:', error)
    res.status(500).json({ error: 'Failed to enrich release' })
  }
}
