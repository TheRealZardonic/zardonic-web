/**
 * Splits a string of multiple artist names by common delimiters: `,`, `&`, `and`, `/`.
 */
function splitArtistNames(str: string): string[] {
  return str
    .split(/\s*,\s*|\s*&\s*|\s+and\s+|\s*\/\s*/i)
    .map(s => s.trim())
    .filter(s => s.length > 0)
}

/**
 * Parses a track title, extracting any featured artist names and returning a
 * clean display title. Supports `feat.` / `ft.` / `featuring` / `with` in both
 * round and square brackets as well as trailing (unbracketed) patterns.
 *
 * Bracket blocks that are **not** a feat./with pattern (e.g. `[Remix]`,
 * `(Zardonic Remix)`) are preserved in the returned `cleanTitle`.
 */
export function parseTrackTitle(title: string): { cleanTitle: string; extractedArtists: string[] } {
  if (!title || !title.trim()) return { cleanTitle: title, extractedArtists: [] }

  const extractedArtists: string[] = []

  // Patterns to strip (in order). Each captures the artists string in group 1.
  const patterns: RegExp[] = [
    // [feat. X], [ft. X], [featuring X], [with X]
    /\[\s*(?:feat\.|ft\.|featuring|with)\s+([^\]]+)\]/gi,
    // (feat. X), (ft. X), (featuring X), (with X)
    /\(\s*(?:feat\.|ft\.|featuring|with)\s+([^)]+)\)/gi,
    // trailing: feat. X / ft. X / featuring X (not inside brackets)
    /\s+(?:feat\.|ft\.|featuring)\s+([^([]+)$/gi,
  ]

  let cleanTitle = title
  for (const pattern of patterns) {
    cleanTitle = cleanTitle.replace(pattern, (_, artistsStr: string) => {
      if (artistsStr?.trim()) {
        for (const name of splitArtistNames(artistsStr.trim())) {
          if (!extractedArtists.some(x => x.toLowerCase() === name.toLowerCase())) {
            extractedArtists.push(name)
          }
        }
      }
      return ''
    })
  }

  return { cleanTitle: cleanTitle.replace(/\s{2,}/g, ' ').trim(), extractedArtists }
}
