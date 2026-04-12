import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { SpotifyLogo, YoutubeLogo, ApplePodcastsLogo } from '@phosphor-icons/react'
import type { Release } from '@/lib/app-types'
import type { SectionLabels } from '@/lib/types'
import { formatReleaseDate } from '@/lib/format-release-date'

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
 * Build a display string for a track's artists.
 * Main artist is returned first; featured artists follow.
 * If only the main artist is present, returns undefined (no need to display).
 */
function buildTrackArtistLine(
  trackArtist: string | undefined,
  featuredArtists: string[] | undefined,
  mainArtistName: string,
): string[] | undefined {
  const artists: string[] = []

  if (trackArtist) {
    // Put main artist first if it differs from the track artist
    const isMain = trackArtist.trim().toLowerCase() === mainArtistName.trim().toLowerCase()
    if (!isMain && mainArtistName) artists.push(mainArtistName)
    artists.push(trackArtist)
  } else if (mainArtistName) {
    artists.push(mainArtistName)
  }

  if (featuredArtists && featuredArtists.length > 0) {
    for (const fa of featuredArtists) {
      if (!artists.some(a => a.trim().toLowerCase() === fa.trim().toLowerCase())) {
        artists.push(fa)
      }
    }
  }

  // Only show artist line if there's more than just the main artist alone
  if (artists.length <= 1) return undefined
  return artists
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
          className="aspect-square bg-muted relative cyber-card"
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

        <div className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="data-label mb-2">{infoLabel}</div>
            <h2 className="text-3xl md:text-4xl font-bold uppercase font-mono mb-2 hover-chromatic crt-flash-in" data-text={data.title}>
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
                {data.type}
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
                    <SpotifyLogo className="w-5 h-5 mr-2" weight="fill" />
                    <span className="hover-chromatic">Spotify</span>
                  </a>
                </Button>
              )}
              {getLink('youtube') && (
                <Button asChild variant="outline" className="font-mono">
                  <a href={getLink('youtube')} target="_blank" rel="noopener noreferrer">
                    <YoutubeLogo className="w-5 h-5 mr-2" weight="fill" />
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
                    <ApplePodcastsLogo className="w-5 h-5 mr-2" weight="fill" />
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
                {data.tracks.map((track, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm font-mono text-foreground/80">
                    <span className="text-primary/50 w-5 text-right shrink-0 mt-0.5">{i + 1}.</span>
                    <div className="flex-1 min-w-0">
                      <span className="block">{track.title}</span>
                      {(() => {
                        const artistLine = buildTrackArtistLine(track.artist, track.featuredArtists, mainArtistName)
                        if (!artistLine) return null
                        return (
                          <span className="flex flex-wrap gap-x-0.5 text-xs mt-0.5">
                            {artistLine.map((artist, ai) => (
                              <span key={artist}>
                                {ai === 0 ? (
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
                ))}
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

