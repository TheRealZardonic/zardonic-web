/**
 * Device capability detection utilities.
 *
 * Used by LenisContext (smooth scroll) and VideoBackground to decide whether
 * to enable computationally-expensive features on the current device.
 *
 * "Lite mode" means: use native scroll + static image instead of Lenis +
 * looping video background.
 */

import { useState, useEffect } from 'react'

/** Extended Navigator interface for non-standard connection properties. */
interface NavigatorWithExtras extends Navigator {
  readonly connection?: {
    readonly saveData?: boolean
    readonly effectiveType?: string
  }
  readonly deviceMemory?: number
}

/** True when the user has enabled "Reduce motion" in OS/browser settings. */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/** True when data-saving mode is enabled or the connection is very slow. */
export function isSlowConnection(): boolean {
  if (typeof navigator === 'undefined') return false
  const nav = navigator as NavigatorWithExtras
  if (nav.connection?.saveData) return true
  const type = nav.connection?.effectiveType
  return type === '2g' || type === 'slow-2g'
}

/** True when the device has <2 CPU cores or <2 GB RAM (likely low-end). */
export function isLowEndHardware(): boolean {
  if (typeof navigator === 'undefined') return false
  const nav = navigator as NavigatorWithExtras
  const cores = navigator.hardwareConcurrency
  const memory = nav.deviceMemory
  return (
    (typeof cores === 'number' && cores < 2) ||
    (typeof memory === 'number' && memory < 2)
  )
}

/**
 * Returns `true` when smooth scroll (Lenis) and video backgrounds should be
 * disabled in favour of native scroll / static image fallbacks.
 *
 * Conditions: prefers-reduced-motion OR slow connection OR low-end hardware.
 */
export function shouldUseLiteMode(): boolean {
  return prefersReducedMotion() || isSlowConnection() || isLowEndHardware()
}

/**
 * Returns true when video backgrounds should fall back to a static image.
 * Does NOT include prefers-reduced-motion — a video background is explicit
 * content, not a decorative animation. Only hardware/connectivity limits apply.
 */
export function shouldDisableVideoBackground(): boolean {
  return isSlowConnection() || isLowEndHardware()
}

/**
 * Reactive hook that returns the current `prefers-reduced-motion` value and
 * re-renders the component when the user changes their OS/browser setting.
 */
export function usePrefersReducedMotion(): boolean {
  const [value, setValue] = useState<boolean>(() => prefersReducedMotion())
  useEffect(() => {
    if (typeof window === 'undefined') return
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const handler = (e: MediaQueryListEvent) => setValue(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])
  return value
}
