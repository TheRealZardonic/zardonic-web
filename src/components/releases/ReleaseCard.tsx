import React from 'react'
import { motion } from 'framer-motion'
import { Card } from '@/components/ui/card'
import { ArrowsClockwise, PencilSimple, Trash } from '@phosphor-icons/react'
import type { Release } from '@/lib/app-types'

export type ReleaseCardVariant = 'default' | 'square-minimal' | 'square-titled' | 'compact'
export type ReleaseHoverEffect = 'default' | 'zoom' | 'glow' | 'lift' | 'scan' | 'chromatic' | 'flip'

interface ReleaseCardProps {
  release: Release
  index: number
  editMode: boolean
  variant: ReleaseCardVariant
  hoverEffect: ReleaseHoverEffect
  syncingId: string | null
  bulkSyncing: boolean
  onReleaseClick: (release: Release) => void
  onSyncRelease?: (id: string) => void
  onEditRelease?: (release: Release) => void
  onDeleteRelease?: (id: string) => void
}

function getHoverClasses(effect: ReleaseHoverEffect): string {
  switch (effect) {
    case 'zoom': return 'release-hover-zoom'
    case 'glow': return 'release-hover-glow'
    case 'lift': return 'release-hover-lift'
    case 'scan': return 'hover-scan'
    case 'chromatic': return ''
    case 'flip': return 'release-hover-flip'
    default: return 'hover-noise cyber-card'
  }
}

function EditButtons({
  release,
  syncingId,
  bulkSyncing,
  onSyncRelease,
  onEditRelease,
  onDeleteRelease,
}: {
  release: Release
  syncingId: string | null
  bulkSyncing: boolean
  onSyncRelease?: (id: string) => void
  onEditRelease?: (release: Release) => void
  onDeleteRelease?: (id: string) => void
}) {
  const isSyncing = syncingId === release.id
  return (
    <div className="absolute top-2 right-2 z-10 flex gap-1">
      {onSyncRelease && (
        <button
          onClick={(e) => { e.stopPropagation(); onSyncRelease(release.id) }}
          disabled={isSyncing || bulkSyncing}
          className="p-1 bg-black/60 hover:bg-accent/80 text-foreground hover:text-accent-foreground rounded transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label={`Sync ${release.title}`}
          title="Sync with MusicBrainz + Odesli"
        >
          <ArrowsClockwise className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
        </button>
      )}
      {onEditRelease && (
        <button
          onClick={(e) => { e.stopPropagation(); onEditRelease(release) }}
          className="p-1 bg-black/60 hover:bg-primary/80 text-foreground hover:text-primary-foreground rounded transition-colors"
          aria-label={`Edit ${release.title}`}
        >
          <PencilSimple className="w-3.5 h-3.5" />
        </button>
      )}
      {onDeleteRelease && (
        <button
          onClick={(e) => { e.stopPropagation(); onDeleteRelease(release.id) }}
          className="p-1 bg-black/60 hover:bg-destructive/80 text-foreground hover:text-destructive-foreground rounded transition-colors"
          aria-label={`Delete ${release.title}`}
        >
          <Trash className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  )
}

function SyncBar({ isSyncing }: { isSyncing: boolean }) {
  if (!isSyncing) return null
  return (
    <div
      className="absolute top-0 left-0 right-0 h-1 bg-border/30 overflow-hidden"
      style={{ zIndex: 'var(--z-hud)' } as React.CSSProperties}
    >
      <motion.div
        className="absolute inset-y-0 left-0 bg-primary"
        animate={{ x: ['-100%', '100%'] }}
        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        style={{ width: '50%' }}
      />
    </div>
  )
}

function DefaultCard({
  release,
  editMode,
  hoverEffect,
  syncingId,
  bulkSyncing,
  onReleaseClick,
  onSyncRelease,
  onEditRelease,
  onDeleteRelease,
}: ReleaseCardProps) {
  const isSyncing = syncingId === release.id
  const hoverClass = getHoverClasses(hoverEffect)
  const imageClass = hoverEffect === 'chromatic' ? 'glitch-image hover-chromatic-image' : 'glitch-image'

  return (
    <Card
      className={`overflow-hidden bg-card border-border hover:border-primary/50 transition-all cursor-pointer relative ${hoverClass}`}
      onClick={() => !editMode && onReleaseClick(release)}
    >
      <SyncBar isSyncing={isSyncing} />
      {hoverEffect === 'scan' && <div className="scan-line" aria-hidden="true" />}
      <div className="data-label absolute top-2 left-2 z-10" data-theme-color="data-label">// REL.{release.year}</div>
      {editMode && (
        <EditButtons
          release={release}
          syncingId={syncingId}
          bulkSyncing={bulkSyncing}
          onSyncRelease={onSyncRelease}
          onEditRelease={onEditRelease}
          onDeleteRelease={onDeleteRelease}
        />
      )}
      <div className="aspect-square bg-muted relative">
        {release.artwork && (
          <img src={release.artwork} alt={release.title} className={`w-full h-full object-cover ${imageClass}`} loading="lazy" decoding="async" />
        )}
      </div>
      <div className="p-4">
        <h3 className="font-bold uppercase text-sm mb-1 truncate font-mono hover-chromatic">{release.title}</h3>
        <p className="text-xs text-muted-foreground mb-3 font-mono">{release.year}</p>
      </div>
    </Card>
  )
}

function SquareMinimalCard({
  release,
  editMode,
  hoverEffect,
  syncingId,
  bulkSyncing,
  onReleaseClick,
  onSyncRelease,
  onEditRelease,
  onDeleteRelease,
}: ReleaseCardProps) {
  const isSyncing = syncingId === release.id
  const hoverClass = getHoverClasses(hoverEffect)
  const imageClass = hoverEffect === 'chromatic' ? 'glitch-image hover-chromatic-image' : 'glitch-image'

  return (
    <Card
      className={`overflow-hidden bg-card border-border hover:border-primary/50 transition-all cursor-pointer relative ${hoverClass}`}
      onClick={() => !editMode && onReleaseClick(release)}
    >
      <SyncBar isSyncing={isSyncing} />
      {hoverEffect === 'scan' && <div className="scan-line" aria-hidden="true" />}
      <div className="data-label absolute top-2 left-2 z-10" data-theme-color="data-label">// REL.{release.year}</div>
      {editMode && (
        <EditButtons
          release={release}
          syncingId={syncingId}
          bulkSyncing={bulkSyncing}
          onSyncRelease={onSyncRelease}
          onEditRelease={onEditRelease}
          onDeleteRelease={onDeleteRelease}
        />
      )}
      <div className="aspect-square bg-muted relative">
        {release.artwork ? (
          <img src={release.artwork} alt={release.title} className={`w-full h-full object-cover ${imageClass}`} loading="lazy" decoding="async" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="font-mono text-xs text-muted-foreground uppercase tracking-wider truncate px-2 text-center">{release.title}</span>
          </div>
        )}
      </div>
    </Card>
  )
}

function SquareTitledCard({
  release,
  editMode,
  hoverEffect,
  syncingId,
  bulkSyncing,
  onReleaseClick,
  onSyncRelease,
  onEditRelease,
  onDeleteRelease,
}: ReleaseCardProps) {
  const isSyncing = syncingId === release.id
  const hoverClass = getHoverClasses(hoverEffect)
  const imageClass = hoverEffect === 'chromatic' ? 'glitch-image hover-chromatic-image' : 'glitch-image'

  return (
    <Card
      className={`overflow-hidden bg-card border-border hover:border-primary/50 transition-all cursor-pointer relative ${hoverClass}`}
      onClick={() => !editMode && onReleaseClick(release)}
    >
      <SyncBar isSyncing={isSyncing} />
      {hoverEffect === 'scan' && <div className="scan-line" aria-hidden="true" />}
      {editMode && (
        <EditButtons
          release={release}
          syncingId={syncingId}
          bulkSyncing={bulkSyncing}
          onSyncRelease={onSyncRelease}
          onEditRelease={onEditRelease}
          onDeleteRelease={onDeleteRelease}
        />
      )}
      <div className="aspect-square bg-muted relative">
        {release.artwork && (
          <img src={release.artwork} alt={release.title} className={`w-full h-full object-cover ${imageClass}`} loading="lazy" decoding="async" />
        )}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-3">
          <h3 className="font-bold uppercase text-xs truncate font-mono text-white leading-tight">{release.title}</h3>
          <p className="text-xs text-white/60 font-mono">{release.year}</p>
        </div>
      </div>
    </Card>
  )
}

function CompactCard({
  release,
  editMode,
  hoverEffect,
  syncingId,
  bulkSyncing,
  onReleaseClick,
  onSyncRelease,
  onEditRelease,
  onDeleteRelease,
}: ReleaseCardProps) {
  const isSyncing = syncingId === release.id
  const hoverClass = getHoverClasses(hoverEffect)
  const imageClass = hoverEffect === 'chromatic' ? 'glitch-image hover-chromatic-image' : 'glitch-image'

  return (
    <Card
      className={`overflow-hidden bg-card border-border hover:border-primary/50 transition-all cursor-pointer relative ${hoverClass}`}
      onClick={() => !editMode && onReleaseClick(release)}
    >
      <SyncBar isSyncing={isSyncing} />
      {hoverEffect === 'scan' && <div className="scan-line" aria-hidden="true" />}
      {editMode && (
        <EditButtons
          release={release}
          syncingId={syncingId}
          bulkSyncing={bulkSyncing}
          onSyncRelease={onSyncRelease}
          onEditRelease={onEditRelease}
          onDeleteRelease={onDeleteRelease}
        />
      )}
      <div className="flex items-stretch">
        <div className="w-16 h-16 shrink-0 bg-muted">
          {release.artwork && (
            <img src={release.artwork} alt={release.title} className={`w-full h-full object-cover ${imageClass}`} loading="lazy" decoding="async" />
          )}
        </div>
        <div className="px-3 py-2 flex flex-col justify-center min-w-0">
          <h3 className="font-bold uppercase text-xs truncate font-mono leading-tight">{release.title}</h3>
          <p className="text-xs text-muted-foreground font-mono">{release.year}</p>
          {release.type && <p className="text-xs text-primary/70 font-mono uppercase">{release.type}</p>}
        </div>
      </div>
    </Card>
  )
}

function FlipCard({
  release,
  editMode,
  syncingId,
  bulkSyncing,
  onReleaseClick,
  onSyncRelease,
  onEditRelease,
  onDeleteRelease,
}: ReleaseCardProps) {
  const isSyncing = syncingId === release.id

  const streamingPlatforms = release.streamingLinks?.map(link => link.platform) ?? []

  return (
    <div
      className="release-hover-flip cursor-pointer relative"
      style={{ aspectRatio: '3/4' }}
      onClick={() => !editMode && onReleaseClick(release)}
    >
      <SyncBar isSyncing={isSyncing} />
      {editMode && (
        <EditButtons
          release={release}
          syncingId={syncingId}
          bulkSyncing={bulkSyncing}
          onSyncRelease={onSyncRelease}
          onEditRelease={onEditRelease}
          onDeleteRelease={onDeleteRelease}
        />
      )}
      <div className="flip-inner">
        {/* Front */}
        <div className="flip-front rounded-sm border border-border bg-card overflow-hidden">
          <div className="h-3/4 bg-muted relative">
            {release.artwork && (
              <img src={release.artwork} alt={release.title} className="w-full h-full object-cover glitch-image" loading="lazy" decoding="async" />
            )}
          </div>
          <div className="p-3 h-1/4 flex flex-col justify-center">
            <h3 className="font-bold uppercase text-xs truncate font-mono">{release.title}</h3>
            <p className="text-xs text-muted-foreground font-mono">{release.year}</p>
          </div>
        </div>
        {/* Back */}
        <div className="flip-back rounded-sm border border-primary/40 bg-card/95 p-4 flex flex-col justify-center gap-2">
          <div className="data-label mb-1" data-theme-color="data-label">// REL.INFO</div>
          <h3 className="font-bold uppercase text-sm font-mono leading-tight mb-1">{release.title}</h3>
          <p className="font-mono text-xs text-primary">{release.year}</p>
          {release.type && (
            <p className="font-mono text-xs text-muted-foreground uppercase tracking-wider">{release.type}</p>
          )}
          {streamingPlatforms.length > 0 && (
            <div className="mt-2">
              <p className="font-mono text-xs text-muted-foreground uppercase tracking-wider mb-1">Available on:</p>
              <div className="flex flex-wrap gap-1">
                {streamingPlatforms.slice(0, 4).map(platform => (
                  <span key={platform} className="font-mono text-xs border border-primary/30 px-1.5 py-0.5 text-primary/80 uppercase tracking-wide">
                    {platform}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export function ReleaseCard(props: ReleaseCardProps) {
  const { variant, hoverEffect } = props

  if (hoverEffect === 'flip') {
    return (
      <motion.div
        initial={{ opacity: 0, clipPath: 'inset(0 0 100% 0)' }}
        whileInView={{ opacity: 1, clipPath: 'inset(0 0 0% 0)' }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, delay: props.index * 0.08, ease: [0.25, 0.46, 0.45, 0.94] }}
      >
        <FlipCard {...props} />
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, clipPath: 'inset(0 0 100% 0)' }}
      whileInView={{ opacity: 1, clipPath: 'inset(0 0 0% 0)' }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, delay: props.index * 0.08, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      {variant === 'square-minimal' && <SquareMinimalCard {...props} />}
      {variant === 'square-titled' && <SquareTitledCard {...props} />}
      {variant === 'compact' && <CompactCard {...props} />}
      {(variant === 'default' || !variant) && <DefaultCard {...props} />}
    </motion.div>
  )
}

export default ReleaseCard
