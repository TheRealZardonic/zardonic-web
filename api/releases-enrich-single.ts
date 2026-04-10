/**
 * POST /api/releases-enrich-single
 *
 * Manually trigger an Odesli enrichment for a single release by ID.
 * This endpoint bypasses the `isEnriched` flag so the admin can force
 * a re-sync even for releases that have already been processed.
 *
 * Request body: { id: string }
 * Requires a valid admin session.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getRedisOrNull, isRedisConfigured } from './_redis.js'
import { fetchWithRetry } from './_fetch-retry.js'
import { validateSession } from './auth.js'

const BAND_DATA_KEY = 'band-data'
const ODESLI_CACHE_TTL = 86400 // 24 h

interface StreamingLinks {
  spotify?: string
  soundcloud?: string
  youtube?: string
  bandcamp?: string
  appleMusic?: string
  deezer?: string
  tidal?: string
  amazonMusic?: string
}

interface OdesliLink {
  url: string
}

interface OdesliResponse {
  entityUniqueId?: string
  entitiesByUniqueId?: Record<string, { id: string; type: string }>
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
  tracks?: Array<{ title: string; duration?: string }>
  trackCount?: number
  isEnriched?: boolean
}

interface SiteData {
  releases: Release[]
  [key: string]: unknown
}

function odesliCacheKey(url: string): string {
  return `odesli:links:${url.replace(/^https?:\/\//, '').replace(/[^a-zA-Z0-9._/-]/g, '_').slice(0, 200)}`
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method === 'OPTIONS') { res.status(200).end(); return }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return }

  const sessionValid = await validateSession(req)
  if (!sessionValid) { res.status(401).json({ error: 'Unauthorized' }); return }

  if (!isRedisConfigured()) {
    res.status(503).json({ error: 'Redis not configured' }); return
  }

  const { id } = req.body ?? {}
  if (!id || typeof id !== 'string') {
    res.status(400).json({ error: 'Missing release id' }); return
  }

  const redis = getRedisOrNull()!

  try {
    const existing = await redis.get<SiteData>(BAND_DATA_KEY)
    const releases: Release[] = existing?.releases ?? []
    const release = releases.find(r => r.id === id)

    if (!release) {
      res.status(404).json({ error: 'Release not found' }); return
    }

    if (!release.appleMusic) {
      res.status(422).json({ error: 'Release has no Apple Music URL to look up via Odesli' }); return
    }

    // Bypass cache — delete existing cached entry so we fetch fresh data
    const cacheKey = odesliCacheKey(release.appleMusic)
    try { await redis.del(cacheKey) } catch { /* non-fatal */ }

    // Call Odesli
    const response = await fetchWithRetry(
      `https://api.song.link/v1-alpha.1/links?url=${encodeURIComponent(release.appleMusic)}&userCountry=US`,
    )
    if (!response.ok) {
      res.status(502).json({ error: `Odesli returned ${response.status}` }); return
    }

    const data: OdesliResponse = await response.json()

    // Cache fresh result
    try { await redis.set(cacheKey, data, { ex: ODESLI_CACHE_TTL }) } catch { /* non-fatal */ }

    const p = data.linksByPlatform ?? {}
    const links: StreamingLinks = {
      spotify: p.spotify?.url,
      appleMusic: p.appleMusic?.url,
      soundcloud: p.soundcloud?.url,
      youtube: p.youtube?.url,
      bandcamp: p.bandcamp?.url,
      deezer: p.deezer?.url,
      tidal: p.tidal?.url,
      amazonMusic: p.amazon?.url,
    }

    // Merge links into the release (never overwrite with undefined)
    const updated: Release = { ...release, isEnriched: true }
    if (links.spotify) updated.spotify = links.spotify
    if (links.soundcloud) updated.soundcloud = links.soundcloud
    if (links.youtube) updated.youtube = links.youtube
    if (links.bandcamp) updated.bandcamp = links.bandcamp
    if (links.deezer) updated.deezer = links.deezer
    if (links.tidal) updated.tidal = links.tidal
    if (links.amazonMusic) updated.amazonMusic = links.amazonMusic
    if (links.appleMusic) updated.appleMusic = links.appleMusic

    // Persist back to Redis
    const updatedReleases = releases.map(r => (r.id === id ? updated : r))
    await redis.set(BAND_DATA_KEY, { ...(existing ?? {}), releases: updatedReleases })

    res.status(200).json({ ok: true, links })
  } catch (error) {
    console.error('[releases-enrich-single] Unexpected error:', error)
    res.status(500).json({ error: 'Failed to enrich release' })
  }
}
