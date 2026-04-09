import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { SpotifyLogo, YoutubeLogo, ApplePodcastsLogo } from '@phosphor-icons/react'
import type { Release } from '@/lib/app-types'

interface ReleaseOverlayContentProps {
  data: Release
}

export function ReleaseOverlayContent({ data }: ReleaseOverlayContentProps) {
  return (
    <motion.div
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
            <div className="data-label mb-2">// RELEASE.INFO.STREAM</div>
            <h2 className="text-3xl md:text-4xl font-bold uppercase font-mono mb-2 hover-chromatic crt-flash-in" data-text={data.title}>
              {data.title}
            </h2>
            <p className="text-xl text-muted-foreground font-mono">{data.year}</p>
          </motion.div>

          <motion.div
            className="cyber-grid p-4"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            <div className="data-label mb-3">Stream &amp; Download</div>
            <div className="flex flex-wrap gap-4">
              {data.spotify && (
                <Button asChild variant="outline" className="font-mono">
                  <a href={data.spotify} target="_blank" rel="noopener noreferrer">
                    <SpotifyLogo className="w-5 h-5 mr-2" weight="fill" />
                    <span className="hover-chromatic">Spotify</span>
                  </a>
                </Button>
              )}
              {data.youtube && (
                <Button asChild variant="outline" className="font-mono">
                  <a href={data.youtube} target="_blank" rel="noopener noreferrer">
                    <YoutubeLogo className="w-5 h-5 mr-2" weight="fill" />
                    <span className="hover-chromatic">YouTube</span>
                  </a>
                </Button>
              )}
              {data.soundcloud && (
                <Button asChild variant="outline" className="font-mono">
                  <a href={data.soundcloud} target="_blank" rel="noopener noreferrer">
                    <span className="hover-chromatic">SoundCloud</span>
                  </a>
                </Button>
              )}
              {data.bandcamp && (
                <Button asChild variant="outline" className="font-mono">
                  <a href={data.bandcamp} target="_blank" rel="noopener noreferrer">
                    <span className="hover-chromatic">Bandcamp</span>
                  </a>
                </Button>
              )}
              {data.appleMusic && (
                <Button asChild variant="outline" className="font-mono">
                  <a href={data.appleMusic} target="_blank" rel="noopener noreferrer">
                    <ApplePodcastsLogo className="w-5 h-5 mr-2" weight="fill" />
                    <span className="hover-chromatic">Apple Music</span>
                  </a>
                </Button>
              )}
              {data.deezer && (
                <Button asChild variant="outline" className="font-mono">
                  <a href={data.deezer} target="_blank" rel="noopener noreferrer">
                    <span className="hover-chromatic">Deezer</span>
                  </a>
                </Button>
              )}
              {data.tidal && (
                <Button asChild variant="outline" className="font-mono">
                  <a href={data.tidal} target="_blank" rel="noopener noreferrer">
                    <span className="hover-chromatic">Tidal</span>
                  </a>
                </Button>
              )}
              {data.amazonMusic && (
                <Button asChild variant="outline" className="font-mono">
                  <a href={data.amazonMusic} target="_blank" rel="noopener noreferrer">
                    <span className="hover-chromatic">Amazon Music</span>
                  </a>
                </Button>
              )}
            </div>
          </motion.div>

          <motion.div
            className="pt-4 border-t border-border"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            <div className="data-label">// MEDIA.STATUS: [AVAILABLE]</div>
          </motion.div>
        </div>
      </div>
    </motion.div>
  )
}
