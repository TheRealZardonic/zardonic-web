import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import type { Release } from '@/lib/app-types'
import type { SectionLabels } from '@/lib/types'
import { formatReleaseDate } from '@/lib/format-release-date'
import { parseTrackTitle } from '@/lib/track-parser'
import { displayReleaseType } from '@/lib/release-type'

interface ReleaseOverlayContentProps {
  data: Release
  sectionLabels?: SectionLabels
  mainArtistName?: string
}

/**
 * Parse the release artists from the description field.
 * description = "ft. OtherArtist" means the release involves OtherArtist.
 * Returns an array of artists with mainArtistName always first (if provided).
 */
function parseReleaseArtists(description: string | undefined, mainArtistName: string): string[] {
  if (!mainArtistName) return []
  if (!description?.startsWith('ft.')) return [mainArtistName]
  const featured = description.slice(3).trim()
  if (!featured) return [mainArtistName]
  return [mainArtistName, featured]
}

/**
 * Splits a compound artist string (e.g. "Artist A & Artist B") into individual names.
 */
function splitTrackArtist(artist: string): string[] {
  return artist
    .split(/\s*,\s*|\s*&\s*|\s+and\s+/i)
    .map(s => s.trim())
    .filter(s => s.length > 0)
}

/**
 * Build the ordered artist list for a single track row.
 *
 * Rules:
 * - If the main artist IS listed on the track, they appear first (highlighted).
 * - If the main artist is NOT listed on the track, they are omitted entirely.
 * - `trackArtist` may be a compound string ("A & B") — it is split before comparison.
 * - `featuredArtists` (extracted from the title) are appended after, de-duplicated.
 * - Returns `undefined` when the result contains only the main artist alone (no line needed).
 */
function buildTrackArtistLine(
  trackArtist: string | undefined,
  featuredArtists: string[] | undefined,
  mainArtistName: string,
): string[] | undefined {
  const mainNorm = mainArtistName.trim().toLowerCase()

  // Split the compound track-artist field into individual names.
  const trackParts = trackArtist ? splitTrackArtist(trackArtist) : []

  // Determine whether the main artist is explicitly credited on this track.
  // When trackArtist is absent we assume the track belongs to the main artist.
  const trackHasMain =
    !trackArtist || trackParts.some(p => p.trim().toLowerCase() === mainNorm)

  const allArtists: string[] = []

  // Prepend main artist only when they are actually on this track
  if (mainArtistName && trackHasMain) {
    allArtists.push(mainArtistName)
  }

  // Add individual track artists that are not the main artist
  for (const part of trackParts) {
    const norm = part.toLowerCase()
    if (norm !== mainNorm && !allArtists.some(a => a.trim().toLowerCase() === norm)) {
      allArtists.push(part)
    }
  }

  // Append featured artists (from title extraction) not already in the list
  for (const fa of (featuredArtists ?? [])) {
    const norm = fa.trim().toLowerCase()
    if (!allArtists.some(a => a.trim().toLowerCase() === norm)) {
      allArtists.push(fa)
    }
  }

  // Suppress the artist line when it contains only the main artist (no extra info)
  if (allArtists.length === 0) return undefined
  if (allArtists.length === 1 && allArtists[0].trim().toLowerCase() === mainNorm) return undefined
  return allArtists
}

export function ReleaseOverlayContent({ data, sectionLabels, mainArtistName = '' }: ReleaseOverlayContentProps) {
  const showType = sectionLabels?.releaseShowType !== false
  const showYear = sectionLabels?.releaseShowYear !== false
  const showDescription = sectionLabels?.releaseShowDescription !== false
  const showTracks = sectionLabels?.releaseShowTracks !== false
  const streamLabel = sectionLabels?.releaseStreamLabel ?? 'Stream & Download'
  const infoLabel = sectionLabels?.releaseInfoLabel ?? '// RELEASE.INFO.STREAM'
  const tracksLabel = sectionLabels?.releaseTracksLabel ?? 'Tracklist'
  const statusLabel = sectionLabels?.releaseStatusLabel ?? '// MEDIA.STATUS: [AVAILABLE]'

  const getLink = (platform: string) =>
    data.streamingLinks?.find(l => l.platform === platform)?.url

  const releaseArtists = parseReleaseArtists(data.description, mainArtistName)
  const showReleaseArtists = releaseArtists.length > 1

  return (
    <motion.div
      data-theme-color="card border accent"
      className="mt-8"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.3 }}
    >
      <div className="grid md:grid-cols-[300px_1fr] gap-8">
        <motion.div
          className="aspect-square bg-muted relative cyber-card border border-primary/30"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          {data.artwork && (
            <img
              src={data.artwork}
              alt={data.title}
              className="w-full h-full object-cover glitch-image"
            />
          )}
        </motion.div>

        <div className="space-y-6 min-w-0">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="data-label mb-2">{infoLabel}</div>
            <h2 className="text-3xl md:text-4xl font-bold uppercase font-mono mb-2 hover-chromatic crt-flash-in break-words" data-text={data.title}>
              {data.title}
            </h2>
            {showReleaseArtists && (
              <p className="text-sm font-mono mt-1">
                {releaseArtists.map((artist, i) => (
                  <span key={artist}>
                    {i === 0 ? (
                      <span className="text-primary font-bold">{artist}</span>
                    ) : (
                      <span className="text-muted-foreground">{artist}</span>
                    )}
                    {i < releaseArtists.length - 1 && <span className="text-muted-foreground">, </span>}
                  </span>
                ))}
              </p>
            )}
            {showYear && (
              <p className="text-xl text-muted-foreground font-mono">
                {formatReleaseDate(data.releaseDate, data.year)}
              </p>
            )}
            {showType && data.type && (
              <span className="inline-block mt-1 px-2 py-0.5 text-xs font-mono uppercase tracking-wider bg-primary/10 text-primary border border-primary/20">
                {displayReleaseType(data.type)}
              </span>
            )}
          </motion.div>

          {showDescription && data.description && !showReleaseArtists && (
            <motion.div
              className="cyber-grid p-4"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.25 }}
            >
              <p className="text-sm text-foreground/80 font-mono">{data.description}</p>
            </motion.div>
          )}

          <motion.div
            className="cyber-grid p-4"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            <div className="data-label mb-3">{streamLabel}</div>
            <div className="flex flex-wrap gap-4">
              {getLink('spotify') && (
                <Button asChild variant="outline" className="font-mono">
                  <a href={getLink('spotify')} target="_blank" rel="noopener noreferrer">
                    <span className="hover-chromatic">Spotify</span>
                  </a>
                </Button>
              )}
              {getLink('youtube') && (
                <Button asChild variant="outline" className="font-mono">
                  <a href={getLink('youtube')} target="_blank" rel="noopener noreferrer">
                    <span className="hover-chromatic">YouTube</span>
                  </a>
                </Button>
              )}
              {getLink('soundcloud') && (
                <Button asChild variant="outline" className="font-mono">
                  <a href={getLink('soundcloud')} target="_blank" rel="noopener noreferrer">
                    <span className="hover-chromatic">SoundCloud</span>
                  </a>
                </Button>
              )}
              {getLink('bandcamp') && (
                <Button asChild variant="outline" className="font-mono">
                  <a href={getLink('bandcamp')} target="_blank" rel="noopener noreferrer">
                    <span className="hover-chromatic">Bandcamp</span>
                  </a>
                </Button>
              )}
              {getLink('appleMusic') && (
                <Button asChild variant="outline" className="font-mono">
                  <a href={getLink('appleMusic')} target="_blank" rel="noopener noreferrer">
                    <span className="hover-chromatic">Apple Music</span>
                  </a>
                </Button>
              )}
              {getLink('deezer') && (
                <Button asChild variant="outline" className="font-mono">
                  <a href={getLink('deezer')} target="_blank" rel="noopener noreferrer">
                    <span className="hover-chromatic">Deezer</span>
                  </a>
                </Button>
              )}
              {getLink('tidal') && (
                <Button asChild variant="outline" className="font-mono">
                  <a href={getLink('tidal')} target="_blank" rel="noopener noreferrer">
                    <span className="hover-chromatic">Tidal</span>
                  </a>
                </Button>
              )}
              {getLink('amazonMusic') && (
                <Button asChild variant="outline" className="font-mono">
                  <a href={getLink('amazonMusic')} target="_blank" rel="noopener noreferrer">
                    <span className="hover-chromatic">Amazon Music</span>
                  </a>
                </Button>
              )}
            </div>
          </motion.div>

          {data.customLinks && data.customLinks.length > 0 && (
            <motion.div
              className="cyber-grid p-4"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.33 }}
            >
              <div className="data-label mb-3">// BUY.PHYSICAL</div>
              <div className="flex flex-wrap gap-4">
                {data.customLinks.map((link, i) => (
                  <Button key={i} asChild variant="outline" className="font-mono">
                    <a href={link.url} target="_blank" rel="noopener noreferrer">
                      <span className="hover-chromatic">{link.label}</span>
                    </a>
                  </Button>
                ))}
              </div>
            </motion.div>
          )}

          {showTracks && data.tracks && data.tracks.length > 0 && (
            <motion.div
              className="cyber-grid p-4"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.35 }}
            >
              <div className="data-label mb-3">{tracksLabel}</div>
              <ol className="space-y-1">
                {data.tracks.map((track, i) => {
                  const { cleanTitle, extractedArtists } = parseTrackTitle(track.title)
                  const allFeaturedArtists = [...(track.featuredArtists || []), ...extractedArtists]

                  return (
                  <li key={i} className="flex items-start gap-3 text-sm font-mono text-foreground/80">
                    <span className="text-primary/50 w-5 text-right shrink-0 mt-0.5">{i + 1}.</span>
                    <div className="flex-1 min-w-0">
                      <span className="block">{cleanTitle}</span>
                      {(() => {
                        const artistLine = buildTrackArtistLine(track.artist, allFeaturedArtists, mainArtistName)
                        if (!artistLine || artistLine.length === 0) return null
                        return (
                          <span className="flex flex-wrap gap-x-0.5 text-xs mt-0.5">
                            {artistLine.map((artist, ai) => (
                              <span key={artist}>
                                {artist.trim().toLowerCase() === mainArtistName.trim().toLowerCase() ? (
                                  <span className="text-primary font-semibold">{artist}</span>
                                ) : (
                                  <span className="text-muted-foreground">{artist}</span>
                                )}
                                {ai < artistLine.length - 1 && <span className="text-muted-foreground">, </span>}
                              </span>
                            ))}
                          </span>
                        )
                      })()}
                    </div>
                    {track.duration && (
                      <span className="text-muted-foreground text-xs shrink-0 mt-0.5">{track.duration}</span>
                    )}
                  </li>
                  )
                })}
              </ol>
            </motion.div>
          )}

          <motion.div
            className="pt-4 border-t border-border"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            <div className="data-label">{statusLabel}</div>
          </motion.div>
        </div>
      </div>
    </motion.div>
  )
}

