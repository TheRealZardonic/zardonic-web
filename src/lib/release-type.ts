/** Client-side heuristic to infer a release type from its title. */

type ReleaseType = 'remix' | 'compilation' | 'ep' | 'single'

/**
 * Infers a release type from the given title string using keyword matching.
 * Returns undefined when no recognisable keyword is found — callers should
 * NOT fall back to 'album'; that requires track-count data only available
 * on the server.
 */
export function inferReleaseTypeFromTitle(title: string): ReleaseType | undefined {
  const lower = title.toLowerCase()

  if (
    lower.includes('remix') ||
    lower.includes('remixed') ||
    lower.includes('remixes') ||
    lower.includes('rmx')
  ) {
    return 'remix'
  }

  if (
    lower.includes('compilation') ||
    lower.includes('best of') ||
    lower.includes('greatest hits')
  ) {
    return 'compilation'
  }

  if (
    lower.includes(' ep') ||
    lower.includes('(ep)') ||
    lower.includes('- ep')
  ) {
    return 'ep'
  }

  if (lower.includes('single')) {
    return 'single'
  }

  return undefined
}
