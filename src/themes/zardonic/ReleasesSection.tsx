import React from 'react'
import { motion } from 'framer-motion'
import Card from './Card'

interface Release {
  id: string
  title: string
  artwork: string
  year: string
  type?: 'album' | 'ep' | 'single' | 'remix' | 'compilation'
  streamingLinks?: Array<{ platform: string; url: string }>
}

interface ReleasesSectionProps {
  title?: string
  releases?: Release[]
  onReleaseClick?: (release: Release) => void
}

const placeholderReleases: Release[] = [
  {
    id: '1',
    title: '{{ALBUM_TITLE_1}}',
    artwork: '{{ALBUM_ARTWORK_1}}',
    year: '{{RELEASE_YEAR_1}}'
  },
  {
    id: '2',
    title: '{{ALBUM_TITLE_2}}',
    artwork: '{{ALBUM_ARTWORK_2}}',
    year: '{{RELEASE_YEAR_2}}'
  },
  {
    id: '3',
    title: '{{ALBUM_TITLE_3}}',
    artwork: '{{ALBUM_ARTWORK_3}}',
    year: '{{RELEASE_YEAR_3}}'
  },
  {
    id: '4',
    title: '{{ALBUM_TITLE_4}}',
    artwork: '{{ALBUM_ARTWORK_4}}',
    year: '{{RELEASE_YEAR_4}}'
  },
]

function getPlatformLabel(platform: string): string {
  const labels: Record<string, string> = {
    appleMusic: 'Apple',
    amazonMusic: 'Amazon',
    soundcloud: 'SC',
  }
  if (!platform) return '?'
  return labels[platform] ?? platform.charAt(0).toUpperCase() + platform.slice(1)
}

export default function ReleasesSection({
  title = 'RELEASES',
  releases = placeholderReleases,
  onReleaseClick
}: ReleasesSectionProps) {
  return (
    <section id="releases" className="py-24 px-4 bg-card/50 zardonic-theme-scanline-effect">
      <div className="container mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, x: -30, filter: 'blur(10px)', clipPath: 'polygon(0 0, 0 0, 0 100%, 0 100%)' }}
          whileInView={{ opacity: 1, x: 0, filter: 'blur(0px)', clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 100%)' }}
          viewport={{ once: true }}
          transition={{ duration: 1, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          <h2 className="text-4xl md:text-6xl font-bold mb-12 uppercase tracking-tighter text-foreground zardonic-theme-hover-chromatic zardonic-theme-hover-glitch">
            {title}
          </h2>

          {releases.length === 0 ? (
            <Card variant="cyber" className="p-12 text-center">
              <p className="text-xl text-muted-foreground uppercase tracking-wide font-mono">
                Releases coming soon
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {releases.map((release, index) => (
                <motion.div
                  key={release.id}
                  initial={{ opacity: 0, clipPath: 'inset(0 0 100% 0)' }}
                  whileInView={{ opacity: 1, clipPath: 'inset(0 0 0% 0)' }}
                  viewport={{ once: true }}
                  transition={{ 
                    duration: 0.6,
                    delay: index * 0.08,
                    ease: [0.25, 0.46, 0.45, 0.94]
                  }}
                >
                  <Card 
                    variant="cyber"
                    animate={false}
                    onClick={() => onReleaseClick?.(release)}
                    className="overflow-hidden cursor-pointer"
                  >
                    <div className="zardonic-theme-data-label absolute top-2 left-2 text-[8px]" style={{ zIndex: 'var(--z-content)' } as React.CSSProperties}>// REL.{release.year}</div>
                    <div className="aspect-square bg-muted relative">
                      {release.artwork && (
                        <img 
                          src={release.artwork} 
                          alt={release.title} 
                          className="w-full h-full object-cover zardonic-theme-hover-chromatic-image" 
                        />
                      )}
                    </div>
                    <div className="p-4">
                      <h3 className="font-bold uppercase text-sm mb-1 truncate font-mono zardonic-theme-hover-chromatic">
                        {release.title}
                      </h3>
                      <p className="text-xs text-muted-foreground font-mono">{release.year}</p>
                      {release.type && (
                        <span className="inline-block mt-1 px-1.5 py-0.5 text-[10px] font-mono uppercase tracking-wider bg-primary/10 text-primary border border-primary/20">
                          {release.type}
                        </span>
                      )}
                      {release.streamingLinks && release.streamingLinks.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2" onClick={e => e.stopPropagation()}>
                          {release.streamingLinks.map(link => (
                            <a
                              key={link.platform}
                              href={link.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-1.5 py-0.5 text-[10px] font-mono uppercase tracking-wider border border-border text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors"
                              aria-label={`Listen on ${link.platform}`}
                            >
                              {getPlatformLabel(link.platform)}
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </section>
  )
}
