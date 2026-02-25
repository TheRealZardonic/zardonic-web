import { motion, AnimatePresence } from 'framer-motion'
import { useState, useEffect, useCallback } from 'react'

/** Number of glitch elements per pattern */
const ELEMENT_COUNT = 8

/** Cyberpunk 2077-style glitch transition patterns */
const patterns = [
  // Pattern 0: Glitch blocks — random horizontal slices with chromatic shift
  {
    elementStyle: (i: number, total: number) => {
      const h = 100 / total
      return {
        position: 'absolute' as const,
        left: 0,
        right: 0,
        height: `${h + 2}%`,
        top: `${i * h}%`,
        background: 'var(--primary, oklch(0.50 0.22 25))',
        mixBlendMode: 'screen' as const,
      }
    },
    animate: (i: number) => {
      const dir = i % 2 === 0 ? 1 : -1
      const shift = (5 + (i % 3) * 8) * dir
      return {
        x: [0, shift, -shift * 0.6, shift * 0.3, 0],
        opacity: [0, 0.7, 0.5, 0.8, 0],
        scaleX: [1, 1.3, 0.8, 1.1, 1],
      }
    },
    transition: (i: number) => ({
      duration: 0.35,
      delay: i * 0.02,
      ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
    }),
  },
  // Pattern 1: Digital noise burst — scattered glitch rectangles
  {
    elementStyle: (i: number, total: number) => {
      const seed = ((i * 7 + 3) % total) / total
      return {
        position: 'absolute' as const,
        left: `${seed * 70}%`,
        top: `${((i * 13 + 5) % total) / total * 80}%`,
        width: `${20 + seed * 40}%`,
        height: `${3 + (i % 3) * 4}%`,
        background: 'var(--primary, oklch(0.50 0.22 25))',
        mixBlendMode: 'screen' as const,
      }
    },
    animate: (i: number) => ({
      opacity: [0, 0.9, 0, 0.6, 0],
      scaleX: [0.5, 1.5, 0.8, 1.2, 0],
      x: [0, i % 2 === 0 ? 15 : -15, 0],
    }),
    transition: (i: number) => ({
      duration: 0.3,
      delay: i * 0.025,
      ease: 'easeOut' as const,
    }),
  },
  // Pattern 2: Chromatic split — two-color offset flash
  {
    elementStyle: (i: number, total: number) => {
      const isRed = i < total / 2
      return {
        position: 'absolute' as const,
        inset: 0,
        background: isRed
          ? 'var(--primary, oklch(0.50 0.22 25))'
          : 'oklch(0.50 0.22 250)',
        mixBlendMode: 'screen' as const,
      }
    },
    animate: (i: number, total: number) => {
      const isRed = i < total / 2
      const offset = isRed ? -4 : 4
      return {
        x: [0, offset, -offset * 0.5, 0],
        opacity: [0, 0.4, 0.2, 0],
        clipPath: [
          'inset(0 100% 0 0)',
          `inset(${(i % 4) * 25}% 0 ${100 - ((i % 4) + 1) * 25}% 0)`,
          `inset(${(i % 3) * 33}% 10% ${100 - ((i % 3) + 1) * 33}% 0)`,
          'inset(0 0 0 100%)',
        ],
      }
    },
    transition: (i: number) => ({
      duration: 0.4,
      delay: i * 0.015,
      ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number],
    }),
  },
]

interface OverlayTransitionProps {
  /** Whether the overlay is visible */
  show: boolean
  /** Callback when the entry animation is complete */
  onComplete?: () => void
}

/** Total duration of the transition effect in milliseconds.
 *  Covers the longest pattern: 0.4s base + 7×0.015s stagger ≈ 505ms. */
const TRANSITION_DURATION_MS = 500

/**
 * Cyberpunk 2077-style glitch transition played when an overlay opens.
 * Randomly selects one of three visual patterns: glitch blocks,
 * digital noise burst, or chromatic split effect.
 */
export default function OverlayTransition({ show, onComplete }: OverlayTransitionProps) {
  const [patternIdx] = useState(() => Math.floor(Math.random() * patterns.length))
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (show) {
      setVisible(true)
      const timeout = setTimeout(() => {
        setVisible(false)
        onComplete?.()
      }, TRANSITION_DURATION_MS)
      return () => clearTimeout(timeout)
    }
  }, [show, onComplete])

  const pattern = patterns[patternIdx]

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed inset-0 z-[99999] pointer-events-none overflow-hidden"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.12 }}
        >
          {Array.from({ length: ELEMENT_COUNT }).map((_, i) => (
            <motion.div
              key={i}
              style={pattern.elementStyle(i, ELEMENT_COUNT)}
              animate={pattern.animate(i, ELEMENT_COUNT)}
              transition={pattern.transition(i)}
            />
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/** Hook that provides a trigger function and the transition element */
export function useOverlayTransition() {
  const [active, setActive] = useState(false)

  const trigger = useCallback(() => {
    setActive(true)
  }, [])

  const handleComplete = useCallback(() => {
    setActive(false)
  }, [])

  const element = <OverlayTransition show={active} onComplete={handleComplete} />

  return { trigger, element }
}
