/**
 * Pure utility functions for parsing featured artists from track/release titles.
 * No external dependencies — suitable for use in both API and test contexts.
 */

/** Escapes special regex characters in a string. */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Splits a string of multiple artists by common delimiters: `,`, `&`, `and`, `/`.
 */
function splitArtists(str: string): string[] {
  return str
    .split(/\s*,\s*|\s*&\s*|\s+and\s+|\s*\/\s*/i)
    .map(s => s.trim())
    .filter(s => s.length > 0)
}

/**
 * Parses featured artists from a track/release title.
 * Supports patterns: `feat.` / `ft.` / `featuring` / `(with X)` / `[feat. X]`
 * Splits multi-artist strings by `,`, `&`, `and`, `/`.
 * Always filters out `mainArtist` (case-insensitive, trimmed).
 * Returns `[]` for empty/broken inputs or if all parsed artists equal mainArtist.
 */
export function parseFeaturedArtists(title: string, mainArtist: string): string[] {
  if (!title || !title.trim()) return []

  const main = mainArtist.trim().toLowerCase()

  const patterns = [
    // [feat. X] or [ft. X] or [featuring X]
    /\[\s*(?:feat\.|ft\.|featuring)\s+([^\]]+)\]/i,
    // (feat. X) or (ft. X) or (featuring X)
    /\(\s*(?:feat\.|ft\.|featuring)\s+([^)]+)\)/i,
    // (with X)
    /\(\s*with\s+([^)]+)\)/i,
    // [with X]
    /\[\s*with\s+([^\]]+)\]/i,
    // trailing: feat. X / ft. X / featuring X (without brackets)
    /\s+(?:feat\.|ft\.|featuring)\s+(.+)$/i,
  ]

  for (const pattern of patterns) {
    const match = title.match(pattern)
    if (match) {
      const artistsStr = match[1].trim()
      if (!artistsStr) continue

      const artists = splitArtists(artistsStr)
      const filtered = artists.filter(a => a.trim().toLowerCase() !== main)
      return filtered
    }
  }

  return []
}

/**
 * Removes `(feat. X)`, `[ft. X]`, ` feat. X` etc. from a title.
 * Only strips patterns at or near the end — does NOT strip content in the middle.
 */
export function cleanTrackTitle(title: string): string {
  if (!title || !title.trim()) return title

  return title
    // Remove (feat. X), [ft. X], (with X), [with X] bracket patterns
    .replace(/\s*\(\s*(?:feat\.|ft\.|featuring|with)\s+[^)]*\)/gi, '')
    .replace(/\s*\[\s*(?:feat\.|ft\.|featuring|with)\s+[^\]]*\]/gi, '')
    // Remove trailing: feat. X / ft. X / featuring X (not followed by other content)
    .replace(/\s+(?:feat\.|ft\.|featuring)\s+[^([]+$/i, '')
    .trim()
}

/**
 * Case-insensitive, trimmed comparison of an artist name against a main artist.
 */
export function isMainArtist(name: string, mainArtist: string): boolean {
  return name.trim().toLowerCase() === mainArtist.trim().toLowerCase()
}

/**
 * Infers a release description from the collection artist name.
 * Returns `undefined` if `collectionArtistName` IS the main artist (case-insensitive)
 * or CONTAINS the main artist as a whole word.
 * Returns `"ft. <collectionArtistName>"` otherwise.
 *
 * Critical: must NEVER return `"ft. Zardonic"` when Zardonic IS the main artist.
 */
export function inferReleaseDescription(
  collectionArtistName: string,
  mainArtist: string,
): string | undefined {
  if (!collectionArtistName || !mainArtist) return undefined

  const trimmedMain = mainArtist.trim()
  const trimmedColl = collectionArtistName.trim()

  // Use word-boundary regex so "Uzzardonic" doesn't match "Zardonic"
  const mainWordBoundary = new RegExp('\\b' + escapeRegex(trimmedMain) + '\\b', 'i')

  if (mainWordBoundary.test(trimmedColl)) return undefined

  return `ft. ${trimmedColl}`
}

/**
 * Parses an iTunes `artistName` field (e.g. `"Zardonic feat. Ill Bill"`) into
 * a base artist and an array of featured artists.
 * Filters `mainArtist` out of the featuredArtists array.
 */
export function parseTrackArtists(
  iTunesArtistName: string,
  mainArtist: string,
): { artist: string; featuredArtists: string[] } {
  if (!iTunesArtistName || !iTunesArtistName.trim()) {
    return { artist: mainArtist, featuredArtists: [] }
  }

  const main = mainArtist.trim().toLowerCase()

  const featMatch = iTunesArtistName.match(/^(.+?)\s+(?:feat\.|ft\.|featuring)\s+(.+)$/i)
  if (!featMatch) {
    return { artist: iTunesArtistName.trim(), featuredArtists: [] }
  }

  const baseArtist = featMatch[1].trim()
  const featuredStr = featMatch[2].trim()
  const featuredArtists = splitArtists(featuredStr).filter(
    a => a.trim().toLowerCase() !== main,
  )

  return { artist: baseArtist, featuredArtists }
}
