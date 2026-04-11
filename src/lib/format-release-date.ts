/**
 * Formats a release date for display.
 *
 * Heuristic: if releaseDate is XXXX-01-01 (January 1st), treat it as a year-only
 * date (MusicBrainz often stores year-only releases as XXXX-01-01).
 */
export function formatReleaseDate(
  releaseDate: string | undefined,
  year: string | undefined,
): string {
  if (releaseDate && releaseDate.trim()) {
    const trimmed = releaseDate.trim()

    // Validate: must be a parseable date
    const date = new Date(trimmed)
    if (isNaN(date.getTime())) {
      // Invalid date string — fall back to year
      return year?.trim() ?? ''
    }

    // Heuristic: XXXX-01-01 → year only (MusicBrainz year-only releases)
    if (/^\d{4}-01-01$/.test(trimmed)) {
      return trimmed.slice(0, 4)
    }

    // Full date: format as "14 Jul 2023"
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      timeZone: 'UTC',
    })
  }

  return year?.trim() ?? ''
}
