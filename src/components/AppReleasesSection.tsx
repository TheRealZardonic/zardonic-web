import { useState } from 'react'
import { motion } from 'framer-motion'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import EditableHeading from '@/components/EditableHeading'
import { MusicNote, CaretDown, CaretUp } from '@phosphor-icons/react'
import type { AdminSettings } from '@/lib/types'
import type { Release } from '@/lib/app-types'

interface AppReleasesSectionProps {
  releases: Release[]
  sectionOrder: number
  visible: boolean
  editMode: boolean
  sectionLabel: string
  adminSettings: AdminSettings | undefined
  iTunesFetching: boolean
  hasAutoLoaded: boolean
  onReleaseClick: (release: Release) => void
}

export default function AppReleasesSection({ releases, sectionOrder, visible, editMode, sectionLabel, adminSettings, iTunesFetching, hasAutoLoaded, onReleaseClick }: AppReleasesSectionProps) {
  const [showAllReleases, setShowAllReleases] = useState(false)

  if (!visible) return null

  return (
    <div style={{ order: sectionOrder }}>
      <Separator className="bg-border" />
      <section id="releases" className="py-24 px-4 bg-card/50 scanline-effect crt-effect">
        <div className="container mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0, x: -30, filter: 'blur(10px)', clipPath: 'polygon(0 0, 0 0, 0 100%, 0 100%)' }}
            whileInView={{ opacity: 1, x: 0, filter: 'blur(0px)', clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 100%)' }}
            viewport={{ once: true }}
            transition={{ duration: 1, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            <div className="flex items-center justify-between mb-12 flex-wrap gap-4">
              <h2 className="text-4xl md:text-6xl font-bold uppercase tracking-tighter text-foreground font-mono hover-chromatic hover-glitch cyber2077-scan-build cyber2077-crt-interference" data-text="RELEASES">
                <EditableHeading onChange={() => {}}
                  text={sectionLabel}
                  defaultText="RELEASES"
                  editMode={editMode}
                  glitchEnabled={adminSettings?.glitchTextSettings?.enabled !== false}
                  glitchIntervalMs={adminSettings?.glitchTextSettings?.intervalMs}
                  glitchDurationMs={adminSettings?.glitchTextSettings?.durationMs}
                />
              </h2>
            </div>

            {(iTunesFetching || !hasAutoLoaded) && releases.length === 0 ? (
              <Card className="p-12 bg-card/50 border-border relative overflow-hidden">
                <div className="flex flex-col items-center justify-center space-y-6">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                  >
                    <MusicNote className="w-12 h-12 text-primary" />
                  </motion.div>
                  <div className="w-full max-w-md space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="data-label">// LOADING.ITUNES.RELEASES</span>
                      <motion.span
                        className="font-mono text-sm text-primary"
                        animate={{ opacity: [0.4, 1, 0.4] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                      >
                        SYNCING...
                      </motion.span>
                    </div>
                    <div className="h-1 bg-border/30 relative overflow-hidden">
                      <motion.div
                        className="absolute inset-0 bg-primary"
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: [0, 0.5, 0.7, 1] }}
                        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                        style={{ transformOrigin: 'left' }}
                      />
                      <motion.div
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-primary-foreground/20 to-transparent"
                        animate={{ x: ['-100%', '200%'] }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      />
                    </div>
                    <div className="flex gap-2 font-mono text-xs text-muted-foreground">
                      <motion.span animate={{ opacity: [0, 1, 0] }} transition={{ duration: 0.8, repeat: Infinity, delay: 0 }}>▸</motion.span>
                      <motion.span animate={{ opacity: [0, 1, 0] }} transition={{ duration: 0.8, repeat: Infinity, delay: 0.2 }}>▸</motion.span>
                      <motion.span animate={{ opacity: [0, 1, 0] }} transition={{ duration: 0.8, repeat: Infinity, delay: 0.4 }}>▸</motion.span>
                      <span className="ml-2">FETCHING DISCOGRAPHY + STREAMING LINKS</span>
                    </div>
                  </div>
                </div>
              </Card>
            ) : releases.length === 0 ? (
              <Card className="p-12 text-center bg-card/50 border-border">
                <p className="text-xl text-muted-foreground uppercase tracking-wide font-mono">
                  Releases coming soon
                </p>
              </Card>
            ) : (
              <>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                  {(() => {
                    const sorted = [...releases].sort((a, b) => {
                      const yearA = a.releaseDate ? new Date(a.releaseDate).getTime() : parseInt(a.year) || 0
                      const yearB = b.releaseDate ? new Date(b.releaseDate).getTime() : parseInt(b.year) || 0
                      return yearB - yearA
                    })
                    const visibleReleases = showAllReleases ? sorted : sorted.slice(0, 6)
                    return visibleReleases.map((release, index) => (
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
                          className="overflow-hidden bg-card border-border hover:border-primary/50 transition-all cursor-pointer cyber-card hover-noise relative"
                          onClick={() => !editMode && onReleaseClick(release)}
                        >
                          <div className="data-label absolute top-2 left-2 z-10">// REL.{release.year}</div>
                          <div className="aspect-square bg-muted relative">
                            {release.artwork && (
                              <img src={release.artwork} alt={release.title} className="w-full h-full object-cover glitch-image hover-chromatic-image" loading="lazy" decoding="async" />
                            )}
                          </div>
                          <div className="p-4">
                            <h3 className="font-bold uppercase text-sm mb-1 truncate font-mono hover-chromatic">{release.title}</h3>
                            <p className="text-xs text-muted-foreground mb-3 font-mono">{release.year}</p>
                          </div>
                        </Card>
                      </motion.div>
                    ))
                  })()}
                </div>
                {releases.length > 6 && (
                  <motion.div
                    className="flex justify-center mt-8"
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                  >
                    <Button
                      variant="outline"
                      size="lg"
                      onClick={() => setShowAllReleases(!showAllReleases)}
                      className="gap-2 uppercase font-mono cyber-border hover-glitch"
                    >
                      {showAllReleases ? (
                        <>
                          <CaretUp className="w-4 h-4" />
                          Show Less
                        </>
                      ) : (
                        <>
                          <CaretDown className="w-4 h-4" />
                          Show All ({releases.length})
                        </>
                      )}
                    </Button>
                  </motion.div>
                )}
              </>
            )}
          </motion.div>
        </div>
      </section>
    </div>
  )
}
