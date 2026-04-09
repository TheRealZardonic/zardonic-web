import type { ReactNode, CSSProperties } from 'react'

interface PageLayoutProps {
  /** Background layers — rendered behind all content (position: fixed) */
  backgroundLayers?: ReactNode
  /** Fixed navigation bar */
  nav: ReactNode
  /** Main page content (hero + sections) — wrapped in <main> with flex-1 */
  children: ReactNode
  /** Page footer — always at viewport bottom minimum */
  footer: ReactNode
  /** Global post-processing effects (CRT, vignette, noise) — pointer-events: none */
  globalEffects?: ReactNode
  /** Modal overlays, galleries, dialogs */
  overlays?: ReactNode
  /** System-level UI (loading screen, cookie consent, toasts) */
  system?: ReactNode
  /** Additional className for the content wrapper */
  contentClassName?: string
}

/**
 * PageLayout — Holy Grail flex layout for the application.
 *
 * Layer architecture (lowest → highest):
 *   backgroundLayers (--z-bg-*)  →  content (--z-content, flex col)
 *   →  globalEffects (--z-global-fx)  →  overlays (--z-overlay)
 *   →  system (--z-system)
 *
 * The content wrapper uses `min-h-screen flex flex-col` so the footer is
 * always pushed to the bottom even when page content is shorter than the
 * viewport. `<main>` gets `flex-1` to fill remaining space.
 */
export function PageLayout({
  backgroundLayers,
  nav,
  children,
  footer,
  globalEffects,
  overlays,
  system,
  contentClassName,
}: PageLayoutProps) {
  return (
    <>
      {/* Layer 0-2: Backgrounds (fixed, non-interactive) */}
      {backgroundLayers}

      {/* Layer 10: Content — Holy Grail flex column keeps footer at viewport bottom */}
      <div
        className={`relative min-h-screen flex flex-col${contentClassName ? ` ${contentClassName}` : ''}`}
        style={{ zIndex: 'var(--z-content)' } as CSSProperties}
      >
        {nav}
        <main className="flex-1 flex flex-col">
          {children}
        </main>
        {footer}
      </div>

      {/* Layer 40: Global FX (fixed, pointer-events: none) */}
      {globalEffects}

      {/* Layer 50: Overlays (interactive) */}
      {overlays}

      {/* Layer 60: System (toasts, loading, cookie consent) */}
      {system}
    </>
  )
}
