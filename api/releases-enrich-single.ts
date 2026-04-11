/**
 * POST /api/releases-enrich-single
 *
 * Odesli-first enrichment for a single release.
 *
 * Workflow:
 *  1. Fetch the release from Redis by ID.
 *  2. Call Odesli immediately with the Apple Music URL that iTunes provides
 *     directly — no waiting for MusicBrainz. Collect all streaming links
 *     (Spotify, YouTube, Bandcamp, SoundCloud, Deezer, Tidal, Amazon Music).
 *  3. Search MusicBrainz for the release (title + "Zardonic") to obtain:
 *       - Canonical release type (Album / EP / Single / …)
 *       - Precise release date
 *       - Full tracklist with per-track durations
 *  4. Type fallback via inferTypeFromTitle if MusicBrainz has no match.
 *  5. Merge metadata + links into the release, persist back to Redis.
 *  6. Return the enriched release + a detailed status message.
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
} from './_musicbrainz.js'
import {
  cleanAppleMusicUrl,
  fetchOdesliLinks,
  type StreamingLink,
} from './_odesli.js'

const BAND_DATA_KEY = 'band-data'

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
  streamingLinks?: StreamingLink[]
  type?: '' | 'album' | 'ep' | 'single' | 'remix' | 'compilation'
  description?: string
  tracks?: Track[]
  trackCount?: number
}

interface SiteData {
  releases: Release[]
  [key: string]: unknown
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
    // iTunes always provides a collectionViewUrl; no need to wait for MusicBrainz.
    if (cleanedAppleUrl) {
      const { links: newLinks } = await fetchOdesliLinks(cleanedAppleUrl, redis)
      if (newLinks.length > 0) {
        updated.streamingLinks = newLinks
        steps.push(`Odesli: ${newLinks.length} Plattformen gefunden`)
      } else {
        steps.push('Odesli: keine Links erhalten')
      }
    } else {
      steps.push('Odesli: übersprungen — keine Apple Music URL vorhanden')
    }

    // ── Step 2: MusicBrainz — for type, date and tracklist only ──
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
