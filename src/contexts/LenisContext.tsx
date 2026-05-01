/* eslint-disable react-refresh/only-export-components */
/**
 * LenisContext — Lenis smooth-scroll provider.
 *
 * Architecture:
 *   • One Lenis instance, managed via useRef (no re-renders on scroll)
 *   • RAF loop runs in a useEffect; cancelled on unmount
 *   • Scroll-position state (scrollY, velocityY) exposed for scroll-driven effects
 *   • Falls back to native scroll when device is in "lite mode"
 *     (prefers-reduced-motion, slow connection, low-end hardware)
 *
 * Extending for new scroll effects:
 *   • Subscribe in any component with: `const { lenis } = useLenisContext()`
 *     then `lenis?.on('scroll', cb)` / `lenis?.off('scroll', cb)`
 *   • Use `scrollY` / `velocityY` from context for value-based animations
 *   • For framer-motion scroll tracking, useScroll() continues to work because
 *     Lenis fires native scroll events on the document element.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react'
import type { ReactNode } from 'react'
import Lenis from 'lenis'
import { usePrefersReducedMotion, isSlowConnection, isLowEndHardware } from '@/lib/device-capability'

// ─────────────────────────────────────────────────────────────────────────────

export interface LenisScrollToOptions {
  /** Pixels to offset from the target (negative = scroll past the target). */
  offset?: number
  /** Skip the animation and jump immediately. */
  immediate?: boolean
  /** Override the default animation duration in seconds. */
  duration?: number
}

export interface LenisContextValue {
  /** The raw Lenis instance — use for advanced subscriptions (lenis.on/off). */
  lenis: Lenis | null
  /** Programmatically scroll to an element, selector string, or pixel value. */
  scrollTo: (
    target: HTMLElement | string | number,
    options?: LenisScrollToOptions,
  ) => void
  /** Current vertical scroll position in pixels. */
  scrollY: number
  /** Current scroll velocity (positive = scrolling down). */
  velocityY: number
  /** True when Lenis is disabled (lite mode) and native scroll is used. */
  isLiteMode: boolean
}

export const LenisContext = createContext<LenisContextValue>({
  lenis: null,
  scrollTo: () => {},
  scrollY: 0,
  velocityY: 0,
  isLiteMode: false,
})

// ─────────────────────────────────────────────────────────────────────────────

interface LenisProviderProps {
  children: ReactNode
  /**
   * Lenis easing — defaults to an ease-out-expo curve which feels natural for
   * most scroll interactions. Override for custom scroll feel.
   */
  easing?: (t: number) => number
  /** Scroll duration in seconds. Default: 1.2 */
  duration?: number
}

const defaultEasing = (t: number): number =>
  Math.min(1, 1.001 - Math.pow(2, -10 * t))

export function LenisProvider({
  children,
  easing = defaultEasing,
  duration = 1.2,
}: LenisProviderProps) {
  // Reactive reduced-motion preference — re-computes liteMode when the user
  // changes their OS/browser setting so Lenis is properly destroyed/created.
  const prefersReducedMotion = usePrefersReducedMotion()
  const liteMode = prefersReducedMotion || isSlowConnection() || isLowEndHardware()

  const lenisRef = useRef<Lenis | null>(null)
  const [lenisInstance, setLenisInstance] = useState<Lenis | null>(null)
  const [scrollY, setScrollY] = useState(0)
  const [velocityY, setVelocityY] = useState(0)

  // Use refs for easing and duration so changing them doesn't destroy/recreate
  // Lenis mid-scroll (which would cause a visible jump).
  const easingRef = useRef(easing)
  const durationRef = useRef(duration)
  useEffect(() => { easingRef.current = easing }, [easing])
  useEffect(() => { durationRef.current = duration }, [duration])

  // Main Lenis init effect only depends on liteMode so Lenis is never
  // recreated just because an easing function reference changed.
  useEffect(() => {
    if (liteMode) return

    let rafId: number
    let lenis: Lenis | null = null

    try {
      lenis = new Lenis({
        duration: durationRef.current,
        easing: (t: number) => easingRef.current(t),
        smoothWheel: true,
        wheelMultiplier: 1,
        touchMultiplier: 2,
      })

      lenisRef.current = lenis
      setLenisInstance(lenis)
      lenis.on('scroll', (e: { scroll: number; velocity: number }) => {
        setScrollY(e.scroll)
        setVelocityY(e.velocity)
      })

      // Drive Lenis with our own RAF loop so we control the timing
      function raf(time: number) {
        lenis?.raf(time)
        rafId = requestAnimationFrame(raf)
      }
      rafId = requestAnimationFrame(raf)
    } catch {
      // Lenis failed to initialize (e.g. SSR / jsdom) — fall back to native
      lenisRef.current = null
    }

    return () => {
      cancelAnimationFrame(rafId)
      lenis?.destroy()
      lenisRef.current = null
      setLenisInstance(null)
    }
  }, [liteMode])

  // Native scroll tracking — runs only in lite mode when Lenis is inactive.
  // Ensures scrollY stays current so scroll-driven effects (e.g. VideoBackground
  // scroll mode) work correctly even without Lenis.
  useEffect(() => {
    if (!liteMode) return
    const handleScroll = () => setScrollY(window.scrollY)
    window.addEventListener('scroll', handleScroll, { passive: true })
    // Set initial value in case the page loaded already scrolled
    handleScroll()
    return () => window.removeEventListener('scroll', handleScroll)
  }, [liteMode])

  const scrollTo = useCallback(
    (
      target: HTMLElement | string | number,
      options?: LenisScrollToOptions,
    ) => {
      const l = lenisRef.current
      if (l) {
        l.scrollTo(target, {
          offset: options?.offset ?? 0,
          immediate: options?.immediate ?? false,
          duration: options?.duration ?? duration,
        })
        return
      }

      // Native fallback (lite mode or Lenis not yet ready)
      const offset = options?.offset ?? 0
      if (typeof target === 'number') {
        window.scrollTo({ top: target + offset, behavior: 'smooth' })
      } else if (typeof target === 'string') {
        const el = document.getElementById(target.replace(/^#/, ''))
        if (el) {
          const y = el.getBoundingClientRect().top + window.scrollY + offset
          window.scrollTo({ top: y, behavior: 'smooth' })
        }
      } else if (target instanceof HTMLElement) {
        const y = target.getBoundingClientRect().top + window.scrollY + offset
        window.scrollTo({ top: y, behavior: 'smooth' })
      }
    },
    [duration],
  )

  return (
    <LenisContext.Provider
      value={{ lenis: lenisInstance, scrollTo, scrollY, velocityY, isLiteMode: liteMode }}
    >
      {children}
    </LenisContext.Provider>
  )
}

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Access the Lenis context.
 *
 * @example
 * ```tsx
 * const { scrollTo, scrollY, lenis } = useLenisContext()
 * // Scroll to a section with nav offset
 * scrollTo(element, { offset: -80 })
 * // Subscribe to raw scroll events for custom effects
 * useEffect(() => {
 *   lenis?.on('scroll', handler)
 *   return () => lenis?.off('scroll', handler)
 * }, [lenis])
 * ```
 */
export function useLenisContext(): LenisContextValue {
  return useContext(LenisContext)
}
