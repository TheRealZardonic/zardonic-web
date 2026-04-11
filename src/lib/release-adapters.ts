/**
 * Adapters between the storage format (streamingLinks array, `app-types.ts` Release)
 * and the display/edit format (streamingLinks object, `types.ts` Release).
 *
 * The split exists because SiteData is persisted to KV with `streamingLinks` as an
 * array of `{ platform, url }` entries (matching the CMS schema), while
 * ReleasesSection / ReleaseEditDialog use the richer `types.ts` Release interface
 * which has `streamingLinks` as a named-key object.
 * Using these helpers removes the inline field-mapping blocks from App.tsx.
 */
import type { Release as StoredRelease } from '@/lib/app-types'
import type { Release as FullRelease } from '@/lib/types'

/**
 * Normalize a release loaded from KV into the canonical StoredRelease format.
 *
 * Older releases persisted to KV may have `streamingLinks` stored as a plain
 * object (`{ spotify: "url", youtube: "url" }`) instead of the current array
 * format (`[{ platform: "spotify", url: "url" }]`).  Calling `.find()` on an
 * object throws a TypeError at runtime, which crashes the Releases section.
 * This function converts the legacy object shape to the array shape so all
 * downstream code can safely call `Array.prototype.find` / `.map` etc.
 */
export function normalizeStoredRelease(r: StoredRelease): StoredRelease {
  const links = r.streamingLinks
  if (!links || Array.isArray(links)) return r
  // Legacy object format → convert to array
  const arr: Array<{ platform: string; url: string }> = []
  for (const [platform, url] of Object.entries(links as Record<string, unknown>)) {
    if (typeof url === 'string' && url) arr.push({ platform, url })
  }
  return { ...r, streamingLinks: arr }
}

/** Convert a `types.ts` Release (streamingLinks object) to the persisted array format. */
export function fullReleaseToStored(release: FullRelease): StoredRelease {
  const links = release.streamingLinks ?? {}
  const streamingLinks: Array<{ platform: string; url: string }> = []
  if (links.spotify)      streamingLinks.push({ platform: 'spotify',      url: links.spotify })
  if (links.soundcloud)   streamingLinks.push({ platform: 'soundcloud',   url: links.soundcloud })
  if (links.youtube)      streamingLinks.push({ platform: 'youtube',      url: links.youtube })
  if (links.bandcamp)     streamingLinks.push({ platform: 'bandcamp',     url: links.bandcamp })
  if (links.appleMusic)   streamingLinks.push({ platform: 'appleMusic',   url: links.appleMusic })
  if (links.beatport)     streamingLinks.push({ platform: 'beatport',     url: links.beatport })
  if (links.deezer)       streamingLinks.push({ platform: 'deezer',       url: links.deezer })
  if (links.tidal)        streamingLinks.push({ platform: 'tidal',        url: links.tidal })
  if (links.amazonMusic)  streamingLinks.push({ platform: 'amazonMusic',  url: links.amazonMusic })

  return {
    id: release.id,
    title: release.title,
    artwork: release.artwork ?? '',
    year: release.releaseDate
      ? new Date(release.releaseDate).getFullYear().toString()
      : (release.year ?? ''),
    releaseDate: release.releaseDate,
    type: release.type,
    tracks: release.tracks,
    streamingLinks: streamingLinks.length > 0 ? streamingLinks : undefined,
    customLinks: release.customLinks,
    manuallyEdited: release.manuallyEdited,
  }
}

/**
 * Merge an updated `types.ts` Release back into an existing stored Release.
 * Existing array entries are used as fallback for platforms not present in the
 * updated release.
 */
export function mergeFullReleaseIntoStored(
  updated: FullRelease,
  existing: StoredRelease,
): StoredRelease {
  const stored = fullReleaseToStored(updated)

  // Merge streamingLinks: updated platforms win; existing platforms fill the gaps.
  const updatedLinks = stored.streamingLinks ?? []
  const updatedPlatforms = new Set(updatedLinks.map(l => l.platform))
  const existingLinks = (existing.streamingLinks ?? []).filter(l => !updatedPlatforms.has(l.platform))
  const mergedLinks = [...updatedLinks, ...existingLinks]

  return {
    ...existing,
    title: stored.title,
    artwork: stored.artwork ?? existing.artwork,
    year: stored.year ?? existing.year,
    releaseDate: stored.releaseDate,
    type: stored.type ?? existing.type,
    tracks: stored.tracks ?? existing.tracks,
    streamingLinks: mergedLinks.length > 0 ? mergedLinks : existing.streamingLinks,
    customLinks: stored.customLinks ?? existing.customLinks,
    manuallyEdited: stored.manuallyEdited ?? existing.manuallyEdited,
  }
}
