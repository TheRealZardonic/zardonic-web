/**
 * Merge utility for release lists — protects manually-edited releases
 * from being overwritten by the cron/iTunes sync pipeline.
 */

interface StreamingLink {
  platform: string
  url: string
}

export interface MergeableRelease {
  id: string
  title: string
  artwork: string
  year: string
  releaseDate?: string
  streamingLinks?: StreamingLink[]
  type?: '' | 'album' | 'ep' | 'single' | 'remix' | 'compilation'
  description?: string
  tracks?: Array<{ title: string; duration?: string; artist?: string; featuredArtists?: string[] }>
  trackCount?: number
  manuallyEdited?: boolean
  customLinks?: Array<{ label: string; url: string }>
}

/**
 * Merges new streaming links from `source` into `target`,
 * adding only links for platforms not already present in `target`.
 */
function mergeStreamingLinks(
  primary: StreamingLink[] | undefined,
  secondary: StreamingLink[] | undefined,
): StreamingLink[] | undefined {
  if (!primary && !secondary) return undefined
  const primaryArr = primary ?? []
  const secondaryArr = secondary ?? []
  const primaryPlatforms = new Set(primaryArr.map(l => l.platform))
  const addedFromSecondary = secondaryArr.filter(l => !primaryPlatforms.has(l.platform))
  const merged = [...primaryArr, ...addedFromSecondary]
  return merged.length > 0 ? merged : undefined
}

/**
 * Merges freshly-fetched releases with existing stored releases.
 *
 * Rules:
 * - `manuallyEdited: true` existing releases → keep existing content, only add new streaming links
 * - Manually-added releases (in existing but NOT in fetched) → always preserved at end
 * - New releases from fetched → added normally
 * - Releases in both without manuallyEdited → overwritten with fetched version (streaming links merged)
 * - Empty existing → returns fetched as-is
 * - Empty fetched → returns existing as-is
 */
export function mergeWithExistingReleases<T extends MergeableRelease>(
  fetched: T[],
  existing: T[],
): T[] {
  if (!existing || existing.length === 0) return [...fetched]
  if (!fetched || fetched.length === 0) return [...existing]

  const existingMap = new Map<string, T>(existing.map(r => [r.id, r]))
  const fetchedIds = new Set(fetched.map(r => r.id))

  const result: T[] = []

  // Process fetched releases (maintain fetched order first)
  for (const fetchedRelease of fetched) {
    const existingRelease = existingMap.get(fetchedRelease.id)

    if (!existingRelease) {
      // New release from fetched source → add as-is
      result.push(fetchedRelease)
    } else if (existingRelease.manuallyEdited) {
      // manuallyEdited: keep existing content, merge in new streaming links (add-only)
      const mergedLinks = mergeStreamingLinks(
        existingRelease.streamingLinks,
        fetchedRelease.streamingLinks,
      )
      result.push({ ...existingRelease, streamingLinks: mergedLinks })
    } else {
      // Normal update: overwrite with fetched, merge streaming links
      const mergedLinks = mergeStreamingLinks(
        fetchedRelease.streamingLinks,
        existingRelease.streamingLinks,
      )
      result.push({ ...fetchedRelease, streamingLinks: mergedLinks })
    }
  }

  // Append manually-added releases (exist in existing but NOT in fetched)
  for (const existingRelease of existing) {
    if (!fetchedIds.has(existingRelease.id)) {
      result.push(existingRelease)
    }
  }

  return result
}
