import React, { useState, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CaretLeft, CaretRight } from '@phosphor-icons/react'
import type { Release } from '@/lib/app-types'

interface Releases3DCarouselLayoutProps {
  releases: Release[]
  renderCard: (release: Release, index: number) => React.ReactNode
}

const VISIBLE_SIDE = 2 // cards visible on each side of center

function getCardStyle(offset: number): React.CSSProperties {
  const absOffset = Math.abs(offset)
  if (absOffset > VISIBLE_SIDE) {
    return { opacity: 0, pointerEvents: 'none' as const, zIndex: 0 }
  }
  const rotateY = offset * 38
  const translateX = offset * 55
  const translateZ = -absOffset * 120
  const scale = 1 - absOffset * 0.15
  const opacity = 1 - absOffset * 0.25
  return {
    transform: `perspective(900px) translateX(${translateX}%) translateZ(${translateZ}px) rotateY(${rotateY}deg) scale(${scale})`,
    opacity,
    zIndex: VISIBLE_SIDE - absOffset,
    transition: 'transform 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94), opacity 0.5s ease',
  }
}

export function Releases3DCarouselLayout({ releases, renderCard }: Releases3DCarouselLayoutProps) {
  const [activeIndex, setActiveIndex] = useState(0)
  const total = releases.length

  const prev = useCallback(() => {
    setActiveIndex(i => (i - 1 + total) % total)
  }, [total])

  const next = useCallback(() => {
    setActiveIndex(i => (i + 1) % total)
  }, [total])

  // Keyboard navigation
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') prev()
      else if (e.key === 'ArrowRight') next()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [prev, next])

  if (total === 0) return null

  return (
    <div
      className="relative w-full select-none"
      role="region"
      aria-roledescription="3D carousel"
      aria-label="Releases"
    >
      {/* Stage */}
      <div className="relative h-[300px] md:h-[360px] flex items-center justify-center overflow-hidden">
        {releases.map((release, i) => {
          const offset = ((i - activeIndex + total) % total + total) % total
          // Double-modulo normalizes to [0, total), then shift to [-total/2, total/2)
          // so cards on either side of center get a correctly signed offset.
          const normalizedOffset = offset > total / 2 ? offset - total : offset
          const isCenter = normalizedOffset === 0
          return (
            <div
              key={release.id}
              className="absolute w-[160px] md:w-[200px]"
              style={getCardStyle(normalizedOffset)}
            >
              <AnimatePresence>
                <motion.div
                  style={{ outline: isCenter ? '1px solid var(--primary)' : 'none' }}
                  className={isCenter ? 'ring-1 ring-primary/60' : ''}
                  onClick={() => {
                    if (normalizedOffset !== 0) {
                      setActiveIndex(i)
                    }
                  }}
                  aria-roledescription="slide"
                  aria-label={`${release.title} (${release.year})`}
                >
                  {renderCard(release, i)}
                </motion.div>
              </AnimatePresence>
            </div>
          )
        })}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-center gap-4 mt-6">
        <button
          onClick={prev}
          className="p-2 border border-border text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors font-mono"
          aria-label="Previous release"
        >
          <CaretLeft className="w-5 h-5" />
        </button>

        {/* Dot indicators */}
        <div className="flex gap-1.5 max-w-xs overflow-hidden">
          {releases.map((_, i) => (
            <button
              key={i}
              onClick={() => setActiveIndex(i)}
              className={`w-1.5 h-1.5 rounded-full transition-all ${
                i === activeIndex ? 'bg-primary w-3' : 'bg-border hover:bg-primary/50'
              }`}
              aria-label={`Go to release ${i + 1}`}
            />
          ))}
        </div>

        <button
          onClick={next}
          className="p-2 border border-border text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors font-mono"
          aria-label="Next release"
        >
          <CaretRight className="w-5 h-5" />
        </button>
      </div>

      {/* Current release label */}
      <div className="text-center mt-3">
        <p className="font-mono text-xs text-muted-foreground uppercase tracking-wider">
          {activeIndex + 1} / {total} — {releases[activeIndex]?.title}
        </p>
      </div>
    </div>
  )
}

export default Releases3DCarouselLayout
