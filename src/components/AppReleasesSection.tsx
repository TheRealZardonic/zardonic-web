import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import EditableHeading from '@/components/EditableHeading'
import ReleaseEditDialog from '@/components/ReleaseEditDialog'
import { ReleaseCard } from '@/components/releases/ReleaseCard'
import { ReleasesSwipeLayout } from '@/components/releases/ReleasesSwipeLayout'
import { Releases3DCarouselLayout } from '@/components/releases/Releases3DCarouselLayout'
import { MusicNote, CaretDown, CaretUp, Plus, ArrowsClockwise } from '@phosphor-icons/react'
import type { AdminSettings, SectionLabels, Release as FullRelease } from '@/lib/types'
import type { ReleaseCardVariant, ReleaseHoverEffect } from '@/components/releases/ReleaseCard'
import type { Release } from '@/lib/app-types'
import { useLocale } from '@/contexts/LocaleContext'

interface AppReleasesSectionProps {
  releases: Release[]
  sectionOrder: number
  visible: boolean
  editMode: boolean
  sectionLabel: string
  headingPrefix?: string
  adminSettings: AdminSettings | undefined
  iTunesFetching: boolean
  hasAutoLoaded: boolean
  syncProgress?: { current: number; total: number; currentTitle: string } | null
  sectionLabels?: SectionLabels
  onLabelChange?: (key: keyof SectionLabels, value: string) => void
  onReleaseClick: (release: Release) => void
  onUpdateRelease?: (release: FullRelease) => void
  onDeleteRelease?: (id: string) => void
  onAddRelease?: (release: FullRelease) => void
  onRefreshReleases?: () => void
}

/** Convert an app-types Release (streamingLinks array) to the richer types.ts Release for the edit dialog */
function toFullRelease(r: Release): FullRelease {
  const streamingLinks: Record<string, string> = {}
  for (const link of r.streamingLinks ?? []) {
    streamingLinks[link.platform] = link.url
  }
  return {
    id: r.id,
    title: r.title,
    artwork: r.artwork,
    year: r.year,
    releaseDate: r.releaseDate,
    type: r.type,
    description: r.description,
    featured: r.featured,
    tracks: r.tracks,
    customLinks: r.customLinks,
    manuallyEdited: r.manuallyEdited,
    streamingLinks: streamingLinks as FullRelease['streamingLinks'],
  }
}

export default function AppReleasesSection({ releases, sectionOrder, visible, editMode, sectionLabel, headingPrefix, adminSettings, iTunesFetching, hasAutoLoaded, syncProgress, sectionLabels, onLabelChange, onReleaseClick, onUpdateRelease, onDeleteRelease, onAddRelease, onRefreshReleases }: AppReleasesSectionProps) {
  const [showAllReleases, setShowAllReleases] = useState(false)
  const [editingRelease, setEditingRelease] = useState<FullRelease | null | 'new'>(null)
  const [activeFilter, setActiveFilter] = useState<'' | 'album' | 'ep' | 'single' | 'remix' | 'compilation'>('')
  const { t } = useLocale()

  // Read per-section style overrides
  const releaseOverrides = adminSettings?.sections?.styleOverrides?.['releases']
  const releaseLayout = releaseOverrides?.releaseLayout ?? 'grid'
  const releaseColumns = releaseOverrides?.releaseColumns ?? '4'
  const cardVariant: ReleaseCardVariant = (releaseOverrides?.releaseCardVariant as ReleaseCardVariant) ?? 'default'
  const hoverEffect: ReleaseHoverEffect = (releaseOverrides?.releaseHoverEffect as ReleaseHoverEffect) ?? 'default'

  const gridColsClass: Record<string, string> = {
    '2': 'grid-cols-2',
    '3': 'grid-cols-2 md:grid-cols-3',
    '4': 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4',
  }
  const columnsClass = gridColsClass[releaseColumns] ?? gridColsClass['4']

  const handleSetFilter = (f: '' | 'album' | 'ep' | 'single' | 'remix' | 'compilation') => {
    setActiveFilter(f)
    setShowAllReleases(false)
  }

  const loadingLabel = sectionLabels?.releasesLoadingLabel ?? '// LOADING.ITUNES.RELEASES'
  const syncingText = sectionLabels?.releasesSyncingText ?? 'SYNCING...'
  const fetchingText = sectionLabels?.releasesFetchingText ?? 'FETCHING DISCOGRAPHY + STREAMING LINKS'
  const emptyText = sectionLabels?.releasesEmptyText ?? 'Releases coming soon'
  const showAllText = sectionLabels?.releasesShowAllText ?? t('releases.showAll')
  const showLessText = sectionLabels?.releasesShowLessText ?? t('releases.showLess')

  if (!visible) return null

  const releasesBackgroundOpacity = adminSettings?.sections?.styleOverrides?.['releases']?.backgroundOpacity
  const releasesSectionStyle = releasesBackgroundOpacity !== undefined
    ? { backgroundColor: `color-mix(in srgb, var(--card) ${Math.round(releasesBackgroundOpacity * 100)}%, transparent)` }
    : undefined

  const handleSaveRelease = (release: FullRelease) => {
    if (editingRelease === 'new') {
      onAddRelease?.(release)
    } else {
      onUpdateRelease?.(release)
    }
    setEditingRelease(null)
  }

  /** Render a single release card with all edit-mode props wired */
  const renderCard = (release: Release, index: number) => (
    <ReleaseCard
      key={release.id}
      release={release}
      index={index}
      editMode={editMode}
      variant={cardVariant}
      hoverEffect={hoverEffect}
      syncingId={null}
      bulkSyncing={false}
      onReleaseClick={onReleaseClick}
      onEditRelease={onUpdateRelease ? (r) => setEditingRelease(toFullRelease(r)) : undefined}
      onDeleteRelease={onDeleteRelease}
    />
  )

  return (
    <div style={{ order: sectionOrder }}>
      <Separator className="bg-border" />
      <section id="releases" className={`py-24 px-4 scanline-effect${releasesBackgroundOpacity === undefined ? ' bg-card/50' : ''}`} style={releasesSectionStyle}>
        <div className="container mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0, x: -30, filter: 'blur(10px)', clipPath: 'polygon(0 0, 0 0, 0 100%, 0 100%)' }}
            whileInView={{ opacity: 1, x: 0, filter: 'blur(0px)', clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 100%)' }}
            viewport={{ once: true }}
            transition={{ duration: 1, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            <div className="flex items-center justify-between mb-12 flex-wrap gap-4">
              <h2 className="text-4xl md:text-6xl font-bold uppercase tracking-tighter text-foreground font-mono hover-chromatic hover-glitch cyber2077-scan-build cyber2077-crt-interference" data-text={`${headingPrefix ? headingPrefix + ' ' : ''}${sectionLabel || 'RELEASES'}`} data-theme-color="foreground primary">
                {headingPrefix && <span className="text-primary/70 mr-2">{headingPrefix}</span>}
                <EditableHeading
                  onChange={(v) => onLabelChange?.('releases', v)}
                  text={sectionLabel}
                  defaultText="RELEASES"
                  editMode={editMode && !!onLabelChange}
                  glitchEnabled={adminSettings?.terminal?.glitchText?.enabled !== false}
                  glitchIntervalMs={adminSettings?.terminal?.glitchText?.intervalMs}
                  glitchDurationMs={adminSettings?.terminal?.glitchText?.durationMs}
                />
                {adminSettings?.background?.blinkingCursor !== false && <span className="animate-pulse">_</span>}
              </h2>
              {editMode && (
                <div className="flex items-center gap-2 flex-wrap">
                  {onRefreshReleases && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onRefreshReleases()}
                      disabled={iTunesFetching}
                      className="gap-2 border-primary/30 font-mono tracking-wider text-xs shrink-0"
                    >
                      <ArrowsClockwise className={`w-4 h-4 ${iTunesFetching ? 'animate-spin' : ''}`} />
                      {t('releases.syncAndEnrich')}
                    </Button>
                  )}
                  {onAddRelease && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEditingRelease('new')}
                      className="gap-2 border-primary/30 font-mono tracking-wider text-xs shrink-0"
                    >
                      <Plus className="w-4 h-4" />
                      Add Release
                    </Button>
                  )}
                </div>
              )}
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
                      <span className="data-label" data-theme-color="data-label">{loadingLabel}</span>
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
                      <span className="ml-2">{fetchingText}</span>
                    </div>
                  </div>
                </div>
              </Card>
            ) : iTunesFetching && syncProgress && syncProgress.total > 0 ? (
              <Card className="p-8 bg-card/50 border-border">
                <div className="space-y-4 max-w-md mx-auto">
                  <div className="flex justify-between items-center">
                    <span className="font-mono text-xs text-muted-foreground uppercase tracking-wider">Enriching releases</span>
                    <span className="font-mono text-xs text-primary">{syncProgress.current}/{syncProgress.total}</span>
                  </div>
                  <div className="h-1.5 bg-border/30 relative overflow-hidden rounded-full">
                    <motion.div
                      className="absolute inset-y-0 left-0 bg-primary rounded-full"
                      animate={{ width: `${Math.round((syncProgress.current / syncProgress.total) * 100)}%` }}
                      transition={{ duration: 0.3, ease: 'easeOut' }}
                    />
                  </div>
                  <p className="font-mono text-xs text-muted-foreground truncate">
                    ▸ {syncProgress.currentTitle}
                  </p>
                </div>
              </Card>
            ) : releases.length === 0 ? (
              <Card className="p-12 text-center bg-card/50 border-border">
                <p className="text-xl text-muted-foreground uppercase tracking-wide font-mono">
                  {editMode && onLabelChange ? (
                    <input
                      className="bg-transparent border border-primary/30 px-2 py-1 font-mono w-full text-center focus:outline-none focus:border-primary/60"
                      value={emptyText}
                      onChange={e => onLabelChange('releasesEmptyText', e.target.value)}
                      aria-label="Releases empty state text"
                    />
                  ) : emptyText}
                </p>
              </Card>
            ) : (
              (() => {
                const sorted = [...releases].sort((a, b) => {
                  const yearA = a.releaseDate ? new Date(a.releaseDate).getTime() : parseInt(a.year) || 0
                  const yearB = b.releaseDate ? new Date(b.releaseDate).getTime() : parseInt(b.year) || 0
                  return yearB - yearA
                })
                const filtered = activeFilter
                  ? sorted.filter(r => r.type === activeFilter || (activeFilter === 'album' && !r.type))
                  : sorted
                const visibleReleases = releaseLayout === 'grid' && !showAllReleases ? filtered.slice(0, 8) : filtered
                return (
                  <>
                    <div className="flex gap-2 mb-6 flex-wrap">
                      {(['', 'album', 'ep', 'single', 'remix', 'compilation'] as const).map(f => (
                        <button
                          key={f}
                          onClick={() => handleSetFilter(f)}
                          className={`px-3 py-1 border font-mono text-xs uppercase tracking-wider transition-colors ${
                            activeFilter === f
                              ? 'border-primary bg-primary/10 text-primary'
                              : 'border-border text-muted-foreground hover:border-primary/40'
                          }`}
                        >
                          {f === '' ? 'All' : f === 'compilation' ? 'Appears On' : f}
                        </button>
                      ))}
                    </div>

                    {releaseLayout === 'swipe' ? (
                      <ReleasesSwipeLayout releases={filtered} renderCard={renderCard} />
                    ) : releaseLayout === 'carousel-3d' ? (
                      <Releases3DCarouselLayout releases={filtered} renderCard={renderCard} />
                    ) : (
                      <>
                        <div className={`grid ${columnsClass} gap-6`}>
                          {visibleReleases.map((release, index) => renderCard(release, index))}
                        </div>
                        {filtered.length > 8 && (
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
                                  {showLessText}
                                </>
                              ) : (
                                <>
                                  <CaretDown className="w-4 h-4" />
                                  {showAllText} ({filtered.length})
                                </>
                              )}
                            </Button>
                          </motion.div>
                        )}
                      </>
                    )}
                  </>
                )
              })()
            )}
          </motion.div>
        </div>
      </section>

      {editingRelease !== null && (
        <ReleaseEditDialog
          release={editingRelease === 'new' ? null : editingRelease}
          onSave={handleSaveRelease}
          onClose={() => setEditingRelease(null)}
        />
      )}
    </div>
  )
}
