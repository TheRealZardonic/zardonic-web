interface GlobalEffectsProps {
  crtEnabled?: boolean
  scanlineEnabled?: boolean
  noiseEnabled?: boolean
}

/**
 * GlobalEffects — consolidates all full-screen post-processing overlays.
 *
 * All elements use `z-index: var(--z-global-fx)` (= 40) and are
 * `pointer-events: none` so they never block user interaction.
 *
 * Included effects (all optional, controlled by admin settings):
 * - CRT scanline overlay (.crt-overlay)
 * - CRT vignette (.crt-vignette)
 * - Background CRT scanline (.crt-scanline-bg)
 * - Full-page noise grain (.full-page-noise)
 */
export function GlobalEffects({
  crtEnabled = true,
  scanlineEnabled = true,
  noiseEnabled = true,
}: GlobalEffectsProps) {
  return (
    <>
      {crtEnabled && <div className="crt-overlay" />}
      {crtEnabled && <div className="crt-vignette" />}
      {scanlineEnabled && <div className="crt-scanline-bg" />}
      {noiseEnabled && <div className="full-page-noise periodic-noise-glitch" />}
    </>
  )
}
