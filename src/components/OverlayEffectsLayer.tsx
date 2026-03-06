import type { OverlayEffects } from '@/lib/types'

interface OverlayEffectsLayerProps {
  effects?: OverlayEffects
}

/**
 * Renders configurable visual overlay effects (dot matrix, scanlines, CRT, noise, vignette, chromatic).
 * Each effect is rendered as a fixed overlay div with CSS-variable-driven intensity.
 */
export default function OverlayEffectsLayer({ effects }: OverlayEffectsLayerProps) {
  if (!effects) return null

  return (
    <>
      {effects.dotMatrix?.enabled && <div className="overlay-dot-matrix" aria-hidden="true" />}
      {effects.scanlines?.enabled && <div className="overlay-scanlines" aria-hidden="true" />}
      {effects.crt?.enabled && <div className="overlay-crt" aria-hidden="true" />}
      {effects.noise?.enabled && <div className="overlay-noise" aria-hidden="true" />}
      {effects.vignette?.enabled && <div className="overlay-vignette" aria-hidden="true" />}
      {effects.chromatic?.enabled && <div className="overlay-chromatic" aria-hidden="true" />}
    </>
  )
}
