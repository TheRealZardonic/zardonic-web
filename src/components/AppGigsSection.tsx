import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import EditableHeading from '@/components/EditableHeading'
import { ArrowsClockwise, MapPin, CalendarBlank, CaretDown, CaretUp } from '@phosphor-icons/react'
import type { AdminSettings, SectionLabels } from '@/lib/types'
import type { Gig } from '@/lib/app-types'
import { parseGigDate } from '@/lib/utils'
import { useLocale } from '@/contexts/LocaleContext'

/** Format the event identifier as DDMMYYYY-LAT-LON when coordinates are available,
 * falling back to the raw gig id. */
function formatEventBitz(gig: Gig): string {
  let datePart: string | null = null
  if (gig.date) {
    const d = gig.date.replace(/-/g, '')
    datePart = d.slice(6, 8) + d.slice(4, 6) + d.slice(0, 4)
  }
  if (datePart && gig.latitude && gig.longitude) {
    const latNum = parseFloat(gig.latitude)
    const lonNum = parseFloat(gig.longitude)
    if (!isNaN(latNum) && !isNaN(lonNum)) {
      return `${datePart}-${latNum.toFixed(4)}-${lonNum.toFixed(4)}`
    }
  }
  if (datePart) return datePart
  return gig.id
}

const INITIAL_VISIBLE = 3

interface AppGigsSectionProps {
  gigs: Gig[]
  sectionOrder: number
  visible: boolean
  editMode: boolean
  sectionLabel: string
  headingPrefix?: string
  adminSettings: AdminSettings | undefined
  bandsintownFetching: boolean
  sectionLabels?: SectionLabels
  onLabelChange?: (key: keyof SectionLabels, value: string) => void
  onGigClick: (gig: Gig) => void
  onRefresh?: () => void
}

export default function AppGigsSection({ gigs, sectionOrder, visible, editMode, sectionLabel, headingPrefix, adminSettings, bandsintownFetching, sectionLabels, onLabelChange, onGigClick, onRefresh }: AppGigsSectionProps) {
  const [showAll, setShowAll] = useState(false)
  const { t } = useLocale()

  // Only show future gigs (date >= today) — memoized so it only recomputes when gigs change
  const upcomingGigs = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return gigs.filter(gig => {
      if (!gig.date) return false
      return parseGigDate(gig.date) >= today
    })
  }, [gigs])

  if (!visible) return null

  const loadingLabel = sectionLabels?.gigsLoadingLabel ?? '// LOADING.BANDSINTOWN.EVENTS'
  const syncingText = sectionLabels?.gigsSyncingText ?? 'SYNCING...'
  const fetchingText = sectionLabels?.gigsFetchingText ?? 'FETCHING LIVE EVENT DATA'
  const noShowsText = sectionLabels?.gigsNoShowsText ?? 'No upcoming shows - Check back soon'

  const visibleGigs = showAll ? upcomingGigs : upcomingGigs.slice(0, INITIAL_VISIBLE)

  return (
    <div style={{ order: sectionOrder }}>
      <Separator className="bg-border" />
      <section id="gigs" className="py-24 px-4 noise-effect crt-effect">
        <div className="container mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0, x: -30, filter: 'blur(10px)', clipPath: 'polygon(0 0, 0 0, 0 100%, 0 100%)' }}
            animate={{ opacity: 1, x: 0, filter: 'blur(0px)', clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 100%)' }}
            transition={{ duration: 1, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            <div className="flex items-center justify-between mb-12 flex-wrap gap-4">
              <h2 className="text-4xl md:text-6xl font-bold uppercase tracking-tighter text-foreground font-mono hover-chromatic hover-glitch cyber2077-scan-build cyber2077-data-corrupt" data-text={`${headingPrefix ? headingPrefix + ' ' : ''}${sectionLabel || 'UPCOMING GIGS'}`}>
                {headingPrefix && <span className="text-primary/70 mr-2">{headingPrefix}</span>}
                <EditableHeading
                  onChange={(v) => onLabelChange?.('upcomingGigs', v)}
                  text={sectionLabel}
                  defaultText="UPCOMING GIGS"
                  editMode={editMode && !!onLabelChange}
                  glitchEnabled={adminSettings?.glitchTextSettings?.enabled !== false}
                  glitchIntervalMs={adminSettings?.glitchTextSettings?.intervalMs}
                  glitchDurationMs={adminSettings?.glitchTextSettings?.durationMs}
                />
                {adminSettings?.animations?.blinkingCursor !== false && <span className="animate-pulse">_</span>}
              </h2>
              {editMode && onRefresh && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onRefresh()}
                  disabled={bandsintownFetching}
                  className="gap-2 border-primary/30 font-mono tracking-wider text-xs shrink-0"
                >
                  <ArrowsClockwise className={`w-4 h-4 ${bandsintownFetching ? 'animate-spin' : ''}`} />
                  {t('gigs.sync')}
                </Button>
              )}
            </div>

            {bandsintownFetching && upcomingGigs.length === 0 ? (
              <Card className="p-12 bg-card/50 border-border relative overflow-hidden">
                <div className="flex flex-col items-center justify-center space-y-6">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                  >
                    <ArrowsClockwise className="w-12 h-12 text-primary" />
                  </motion.div>
                  <div className="w-full max-w-md space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="data-label">{loadingLabel}</span>
                      <motion.span
                        className="font-mono text-sm text-primary"
                        animate={{ opacity: [0.4, 1, 0.4] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                      >
                        {syncingText}
                      </motion.span>
                    </div>
                    <div className="h-1 bg-border/30 relative overflow-hidden">
                      <motion.div
                        className="absolute inset-0 bg-primary"
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: [0, 0.6, 0.8, 1] }}
                        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
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
                      <span className="ml-2">{fetchingText}</span>
                    </div>
                  </div>
                </div>
              </Card>
            ) : upcomingGigs.length === 0 ? (
              <Card className="p-12 text-center bg-card/50 border-border">
                <p className="text-xl text-muted-foreground uppercase tracking-wide font-mono">
                  {editMode && onLabelChange ? (
                    <input
                      className="bg-transparent border border-primary/30 px-2 py-1 font-mono w-full text-center focus:outline-none focus:border-primary/60"
                      value={noShowsText}
                      onChange={e => onLabelChange('gigsNoShowsText', e.target.value)}
                      aria-label="No shows text"
                    />
                  ) : noShowsText}
                </p>
              </Card>
            ) : (
              <div className="space-y-4">
                {visibleGigs.map((gig, index) => (
                  <motion.div
                    key={gig.id}
                    initial={{ opacity: 0, x: -50, clipPath: 'polygon(0 0, 0 0, 0 100%, 0 100%)' }}
                    animate={{ opacity: 1, x: 0, clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 100%)' }}
                    transition={{
                      duration: 0.8,
                      delay: index * 0.1,
                      ease: [0.25, 0.46, 0.45, 0.94]
                    }}
                  >
                    <Card
                      className="p-6 bg-card border-border hover:border-primary/50 transition-colors cursor-pointer cyber-card hover-scan hover-noise relative"
                      onClick={() => !editMode && onGigClick(gig)}
                    >
                      <div className="scan-line"></div>
                      <div className="data-label mb-2">// EVENT.{formatEventBitz(gig)}</div>
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="space-y-2">
                          <h3 className="text-xl font-bold uppercase font-mono hover-chromatic">{gig.venue}</h3>
                          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground font-mono">
                            <span className="flex items-center gap-2">
                              <MapPin className="w-4 h-4" />
                              {gig.location}
                            </span>
                            <span className="flex items-center gap-2">
                              <CalendarBlank className="w-4 h-4" />
                              {new Date(gig.date).toLocaleDateString('en-US', {
                                weekday: 'short',
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric'
                              })}
                            </span>
                          </div>
                          {gig.support && (
                            <p className="text-sm text-muted-foreground font-mono">
                              {t('gigs.support')} {gig.support}
                            </p>
                          )}
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                ))}
                {upcomingGigs.length > INITIAL_VISIBLE && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex justify-center pt-4"
                  >
                    <Button
                      variant="outline"
                      onClick={() => setShowAll(prev => !prev)}
                      className="gap-2 border-primary/30 font-mono tracking-wider text-xs uppercase hover:border-primary/60"
                    >
                      {showAll ? (
                        <>
                          <CaretUp className="w-4 h-4" />
                          {t('gigs.showLess')}
                        </>
                      ) : (
                        <>
                          <CaretDown className="w-4 h-4" />
                          {t('gigs.seeMore')} ({upcomingGigs.length - INITIAL_VISIBLE} more)
                        </>
                      )}
                    </Button>
                  </motion.div>
                )}
              </div>
            )}
          </motion.div>
        </div>
      </section>
    </div>
  )
}
