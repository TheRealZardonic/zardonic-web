/**
 * Adapters between the storage format (flat streaming fields, `app-types.ts` Release)
 * and the display/edit format (nested streamingLinks, `types.ts` Release).
 *
 * The split exists because SiteData is persisted to KV in the flat format while
 * ReleasesSection / ReleaseEditDialog use the richer `types.ts` Release interface.
 * Using these helpers removes the inline field-mapping blocks from App.tsx.
 */
import type { Release as StoredRelease } from '@/lib/app-types'
import type { Release as FullRelease } from '@/lib/types'

/** Convert a `types.ts` Release (with streamingLinks) to the persisted flat format. */
export function fullReleaseToStored(release: FullRelease): StoredRelease {
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
    isEnriched: release.isEnriched,
    spotify: release.streamingLinks?.spotify,
    soundcloud: release.streamingLinks?.soundcloud,
    youtube: release.streamingLinks?.youtube,
    bandcamp: release.streamingLinks?.bandcamp,
    appleMusic: release.streamingLinks?.appleMusic,
    deezer: release.streamingLinks?.deezer,
    tidal: release.streamingLinks?.tidal,
    amazonMusic: release.streamingLinks?.amazonMusic,
  }
}

/**
 * Merge an updated `types.ts` Release back into an existing stored Release.
 * Existing flat fields are used as fallback when the updated release has no value
 * for that streaming service.
 */
export function mergeFullReleaseIntoStored(
  updated: FullRelease,
  existing: StoredRelease,
): StoredRelease {
  return {
    ...existing,
    title: updated.title,
    artwork: updated.artwork ?? existing.artwork,
    year: updated.releaseDate
      ? new Date(updated.releaseDate).getFullYear().toString()
      : (updated.year ?? existing.year),
    releaseDate: updated.releaseDate,
    type: updated.type ?? existing.type,
    tracks: updated.tracks ?? existing.tracks,
    isEnriched: updated.isEnriched ?? existing.isEnriched,
    spotify: updated.streamingLinks?.spotify || existing.spotify,
    soundcloud: updated.streamingLinks?.soundcloud || existing.soundcloud,
    youtube: updated.streamingLinks?.youtube || existing.youtube,
    bandcamp: updated.streamingLinks?.bandcamp || existing.bandcamp,
    appleMusic: updated.streamingLinks?.appleMusic || existing.appleMusic,
    deezer: updated.streamingLinks?.deezer || existing.deezer,
    tidal: updated.streamingLinks?.tidal || existing.tidal,
    amazonMusic: updated.streamingLinks?.amazonMusic || existing.amazonMusic,
  }
}
