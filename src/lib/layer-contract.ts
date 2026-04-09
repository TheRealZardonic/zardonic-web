/**
 * Z-INDEX LAYER CONTRACT
 * ======================
 * TypeScript mirror of the CSS custom properties defined in `src/layers.css`.
 * Both files MUST be kept in sync. The CSS tokens are the source of truth for
 * runtime styling; these constants allow compile-time invariant checking in tests.
 *
 * Layer architecture (lowest → highest):
 *   BACKGROUND_IMAGE (0) → ANIMATED_BG (1) → BG_SCANLINE (2)
 *   → CONTENT (10) → SECTION_FX (15) → HUD (20) → NAV (30)
 *   → GLOBAL_FX (40) → OVERLAY (50) → SYSTEM (60)
 *
 * Rules:
 * - Raw z-index numbers are FORBIDDEN. Use these constants in TS/TSX and
 *   `var(--z-*)` custom properties in CSS.
 * - Any element with section-local z-index effects MUST have
 *   `isolation: isolate` on the container to prevent z-index leakage.
 * - CRT/noise global FX use GLOBAL_FX (40) and MUST be `pointer-events: none`.
 * - New backgrounds → BackgroundStack, new effects → GlobalEffects,
 *   new modals → overlays slot of PageLayout.
 */

export const LAYERS = {
  /** Fixed background image – deepest layer, always below everything. */
  BACKGROUND_IMAGE: 0,
  /** Animated overlay effects (MatrixRain, CircuitBackground, etc.).
   *  MUST be above BACKGROUND_IMAGE, MUST be below CONTENT.
   *  MUST NOT paint an opaque background fill when in transparent/overlay mode. */
  ANIMATED_BG: 1,
  /** Background CRT scanline – sits above animated background, below content. */
  BG_SCANLINE: 2,
  /** All UI content: sections, footer.
   *  MUST be strictly above ANIMATED_BG. */
  CONTENT: 10,
  /** Section-local effects — MUST use `isolation: isolate` on the container. */
  SECTION_FX: 15,
  /** SystemMonitorHUD floating readouts. */
  HUD: 20,
  /** AppNavBar – always accessible, above all content and HUD. */
  NAV: 30,
  /** Global post-processing FX (CRT overlay, vignette, noise).
   *  MUST be pointer-events: none. All three share this layer since they are
   *  decorative and DOM order determines their paint order. */
  GLOBAL_FX: 40,
  /** Interactive overlays – modals, dialogs, galleries. */
  OVERLAY: 50,
  /** System-level UI – loading screen, cookie consent, toasts. */
  SYSTEM: 60,
} as const

export type LayerKey = keyof typeof LAYERS
export type LayerValue = (typeof LAYERS)[LayerKey]

/** Invariants the test suite enforces. Any violation breaks the build. */
export const LAYER_INVARIANTS = {
  /** Animated background must always be below content. */
  ANIMATED_BG_BELOW_CONTENT: LAYERS.ANIMATED_BG < LAYERS.CONTENT,
  /** Background image must always be the deepest layer. */
  BG_IMAGE_DEEPEST: LAYERS.BACKGROUND_IMAGE < LAYERS.ANIMATED_BG,
  /** Global FX effects must always be above content. */
  GLOBAL_FX_ABOVE_CONTENT: LAYERS.GLOBAL_FX > LAYERS.CONTENT,
  /** Navigation must be above content and HUD. */
  NAV_ABOVE_HUD: LAYERS.NAV > LAYERS.HUD,
  /** Overlays must be above global FX. */
  OVERLAY_ABOVE_GLOBAL_FX: LAYERS.OVERLAY > LAYERS.GLOBAL_FX,
  /** System is the topmost layer. */
  SYSTEM_TOPMOST: LAYERS.SYSTEM > LAYERS.OVERLAY,
} as const
