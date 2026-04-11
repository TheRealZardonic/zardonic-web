/**
 * Shared Odesli helper — single source of truth for all Odesli API interactions.
 *
 * Exports:
 *  - cleanAppleMusicUrl          — normalises geo.music.apple.com redirects and
 *                                   strips affiliate params from Apple Music URLs
 *  - extractStreamingLinksFromOdesli — converts a raw OdesliResponse into a typed
 *                                   StreamingLink[] (cleanAppleMusicUrl is applied
 *                                   to the Apple Music URL here, exactly once)
 *  - fetchOdesliLinks            — Redis-cached Odesli API call; returns
 *                                   StreamingLink[] + optional entityType + fromCache
 *
 * Both releases-enrich.ts (bulk pipeline) and releases-enrich-single.ts
 * (single-release pipeline) MUST import from this file. Having one
 * implementation prevents the two pipelines from diverging.
 */
import type { Redis } from '@upstash/redis'
import { fetchWithRetry } from './_fetch-retry.js'

const ODESLI_CACHE_TTL = 86_400 // 24 hours

// ─── Shared types ────────────────────────────────────────────────────────────

export interface StreamingLink {
  platform: string
  url: string
}

export interface OdesliLink {
  url: string
}

export interface OdesliEntity {
  id: string
  type: string
  title?: string
  artistName?: string
  thumbnailUrl?: string
  apiProvider?: string
}

export interface OdesliResponse {
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

export interface OdesliResult {
  links: StreamingLink[]
  /** Odesli entity type (e.g. 'album', 'song') — used by the bulk pipeline for type detection. */
  entityType?: string
  fromCache: boolean
}

// ─── URL normalisation ───────────────────────────────────────────────────────

/**
 * Strip affiliate query parameters and normalise geo-redirect domains on
 * Apple Music / iTunes URLs.
 *
 * Odesli returns geo.music.apple.com URLs in linksByPlatform.appleMusic.
 * iTunes search results may contain affiliate-decorated URLs with uo=4, at=…
 * query parameters.  This function removes both so that every URL stored in
 * Redis is a canonical https://music.apple.com/…/… URL.
 *
 * MUST be called on EVERY Apple Music URL before it is stored — whether the
 * URL originates from iTunes directly or from an Odesli response.
 */
export function cleanAppleMusicUrl(url: string): string {
  if (!url) return url
  try {
    const u = new URL(url)
    if (u.hostname === 'geo.music.apple.com' || u.hostname.endsWith('.music.apple.com')) {
      u.hostname = 'music.apple.com'
    }
    // Strip all query params (affiliate noise: uo=4, at=..., ct=..., etc.)
    return `${u.origin}${u.pathname}`
  } catch { return url }
}

// ─── Cache key ───────────────────────────────────────────────────────────────

export function odesliCacheKey(url: string): string {
  return `odesli:links:${url.replace(/^https?:\/\//, '').replace(/[^a-zA-Z0-9._/-]/g, '_').slice(0, 200)}`
}

// ─── Response parsing ────────────────────────────────────────────────────────

/**
 * Convert a raw OdesliResponse into a typed StreamingLink[].
 *
 * cleanAppleMusicUrl is applied to the Apple Music URL here — exactly once,
 * in exactly one place — so neither pipeline can accidentally store a dirty URL.
 *
 * Also extracts the Odesli entity type (album / song / …) when available,
 * which the bulk pipeline uses for release-type detection.
 */
export function extractStreamingLinksFromOdesli(
  data: OdesliResponse,
): { links: StreamingLink[]; entityType?: string } {
  const p = data.linksByPlatform
  if (!p) return { links: [] }

  let entityType: string | undefined
  if (data.entityUniqueId && data.entitiesByUniqueId) {
    entityType = data.entitiesByUniqueId[data.entityUniqueId]?.type
  }

  const links: StreamingLink[] = []
  if (p.spotify?.url)    links.push({ platform: 'spotify',     url: p.spotify.url })
  if (p.appleMusic?.url) links.push({ platform: 'appleMusic',  url: cleanAppleMusicUrl(p.appleMusic.url) })
  if (p.soundcloud?.url) links.push({ platform: 'soundcloud',  url: p.soundcloud.url })
  if (p.youtube?.url)    links.push({ platform: 'youtube',     url: p.youtube.url })
  if (p.bandcamp?.url)   links.push({ platform: 'bandcamp',    url: p.bandcamp.url })
  if (p.deezer?.url)     links.push({ platform: 'deezer',      url: p.deezer.url })
  if (p.tidal?.url)      links.push({ platform: 'tidal',       url: p.tidal.url })
  if (p.amazon?.url)     links.push({ platform: 'amazonMusic', url: p.amazon.url })

  return { links, entityType }
}

// ─── Redis-cached Odesli fetch ───────────────────────────────────────────────

/**
 * Fetch Odesli platform links for a URL, using Redis as a 24-hour cache.
 *
 * Single source of truth for all Odesli API calls in the enrichment pipelines:
 *  1. Check Redis for a cached OdesliResponse.
 *  2. Call api.song.link if not cached.
 *  3. Cache non-empty responses for ODESLI_CACHE_TTL seconds.
 *  4. Return { links, entityType?, fromCache }.
 *
 * The caller is responsible for rate-limiting delays when fromCache === false.
 */
export async function fetchOdesliLinks(
  lookupUrl: string,
  redis: Redis,
): Promise<OdesliResult> {
  if (!lookupUrl) return { links: [], fromCache: false }

  const cacheKey = odesliCacheKey(lookupUrl)

  try {
    const cached = await redis.get<OdesliResponse>(cacheKey)
    if (cached) {
      const { links, entityType } = extractStreamingLinksFromOdesli(cached)
      return { links, entityType, fromCache: true }
    }
  } catch { /* cache miss is non-fatal */ }

  const apiUrl = `https://api.song.link/v1-alpha.1/links?url=${encodeURIComponent(lookupUrl)}&userCountry=US`
  const response = await fetchWithRetry(apiUrl)
  if (!response.ok) return { links: [], fromCache: false }

  const data: OdesliResponse = await response.json()

  // Only cache non-empty responses to avoid persisting failures for 24 h
  const hasLinks = data.linksByPlatform && Object.keys(data.linksByPlatform).length > 0
  if (hasLinks) {
    try { await redis.set(cacheKey, data, { ex: ODESLI_CACHE_TTL }) } catch { /* non-fatal */ }
  }

  const { links, entityType } = extractStreamingLinksFromOdesli(data)
  return { links, entityType, fromCache: false }
}
