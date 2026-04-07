/**
 * OKLCH-native contrast validation utilities.
 *
 * Implements WCAG-inspired contrast ratio calculations directly in the OKLCH
 * colour space so that contrast can be evaluated without a browser DOM (e.g.
 * in SSR or test environments where `getComputedStyle` cannot resolve oklch()).
 *
 * Reference:
 *  - WCAG 2.1 relative-luminance formula (sRGB transfer function + matrix)
 *  - Oklab/OKLCH specification by Björn Ottosson
 *
 * OKLCH → OKLAB → linear-sRGB → sRGB luminance pipeline:
 *   OKLCH(L, C, H)
 *     a = C·cos(H°→rad)
 *     b = C·sin(H°→rad)
 *   OKLAB(L, a, b)
 *     [l, m, s] = M⁻¹ · [L, a, b]          (Oklab cube-root intermediate)
 *     [l³, m³, s³] → linear sRGB via sRGB matrix
 *   linear sRGB → WCAG luminance via gamma expansion + matrix
 */

// ─── OKLCH → linear sRGB ─────────────────────────────────────────────────────

/**
 * Parse an `oklch(L C H)` string into numeric components.
 * Accepts the canonical Oklab format: `oklch(0.75 0.18 142)` or
 * `oklch(0.75 0.18 142deg)`.  Returns `null` for any other format.
 *
 * Limitations:
 *  - L and C must be non-negative decimal numbers (no percentages).
 *  - H must be a non-negative decimal number in degrees (negative hue or
 *    scientific notation is not supported — both are extremely rare in practice).
 *  - Optional alpha channel (`/ 0.5`) is accepted but silently ignored.
 *  - All other CSS colour formats (hex, rgb, hsl, etc.) return `null`.
 */
export function parseOklch(value: string): { l: number; c: number; h: number } | null {
  const trimmed = value.trim()
  // Match: oklch( <number> <number> <number>[deg]? [/ <alpha>]? )
  const m = trimmed.match(
    /^oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:deg)?(?:\s*\/\s*[\d.%]+)?\s*\)$/i,
  )
  if (!m) return null
  return { l: parseFloat(m[1]), c: parseFloat(m[2]), h: parseFloat(m[3]) }
}

/**
 * Convert OKLCH to linear-sRGB [r, g, b] (each in [0, 1]).
 * Values outside [0, 1] are clamped.
 */
export function oklchToLinearSrgb(l: number, c: number, h: number): [number, number, number] {
  // Step 1: OKLCH → OKLAB
  const hRad = (h * Math.PI) / 180
  const a = c * Math.cos(hRad)
  const b = c * Math.sin(hRad)

  // Step 2: OKLAB → LMS (cube-root domain)
  // Inverse of the Oklab M1 matrix
  const l_ = l + 0.3963377774 * a + 0.2158037573 * b
  const m_ = l - 0.1055613458 * a - 0.0638541728 * b
  const s_ = l - 0.0894841775 * a - 1.2914855480 * b

  // Step 3: LMS (cube-root) → LMS (linear)
  const lL = l_ * l_ * l_
  const mL = m_ * m_ * m_
  const sL = s_ * s_ * s_

  // Step 4: LMS (linear) → linear sRGB
  // Inverse of the Oklab M2 matrix
  const r = +4.0767416621 * lL - 3.3077115913 * mL + 0.2309699292 * sL
  const g = -1.2684380046 * lL + 2.6097574011 * mL - 0.3413193965 * sL
  const bC = -0.0041960863 * lL - 0.7034186147 * mL + 1.7076147010 * sL

  // Clamp to [0, 1]
  return [Math.max(0, Math.min(1, r)), Math.max(0, Math.min(1, g)), Math.max(0, Math.min(1, bC))]
}

// ─── Relative luminance (WCAG 2.1) ───────────────────────────────────────────

/** WCAG 2.1 relative luminance from linear-sRGB components in [0, 1]. */
function linearToLuminance(r: number, g: number, b: number): number {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/** WCAG 2.1 relative luminance for an OKLCH colour.  Returns null on parse error. */
export function oklchLuminance(color: string): number | null {
  const parsed = parseOklch(color)
  if (!parsed) return null
  const [r, g, b] = oklchToLinearSrgb(parsed.l, parsed.c, parsed.h)
  return linearToLuminance(r, g, b)
}

/** WCAG contrast ratio between two luminance values (≥ 1.0). */
export function contrastRatioFromLuminance(l1: number, l2: number): number {
  const lighter = Math.max(l1, l2)
  const darker = Math.min(l1, l2)
  return (lighter + 0.05) / (darker + 0.05)
}

/**
 * Calculate the WCAG contrast ratio between two OKLCH colour strings.
 * Returns `null` when either colour cannot be parsed (non-OKLCH format).
 */
export function getOklchContrastRatio(color1: string, color2: string): number | null {
  const l1 = oklchLuminance(color1)
  const l2 = oklchLuminance(color2)
  if (l1 === null || l2 === null) return null
  return contrastRatioFromLuminance(l1, l2)
}

// ─── Preset-level contrast validation ────────────────────────────────────────

/** Minimum colour subset required for preset contrast validation. */
export interface ColorContrastInput {
  foreground: string
  background: string
  card: string
  mutedForeground: string
}

/** Result of a single colour pair check. */
export interface ColorContrastCheckResult {
  pair: string
  ratio: number | null
  passes: boolean
  /** True when the colour format could not be evaluated (non-OKLCH). */
  skipped: boolean
}

/** Full validation report for a colour preset. */
export interface ColorContrastReport {
  /**
   * `true`  — all evaluated pairs meet WCAG AA thresholds.
   * `false` — at least one evaluated pair fails.
   * `null`  — no pairs could be evaluated (non-OKLCH colours).
   */
  passes: boolean | null
  details: ColorContrastCheckResult[]
}

/**
 * Validate the contrast ratios of a colour preset against WCAG AA thresholds
 * using pure OKLCH math (no DOM required).
 *
 * Checks:
 *  - `foreground`      on `background`  ≥ 4.5 : 1  (normal text)
 *  - `foreground`      on `card`        ≥ 4.5 : 1  (card text)
 *  - `mutedForeground` on `background`  ≥ 3.0 : 1  (secondary text, large-text rule)
 *
 * Non-OKLCH colours are skipped (ratio = null, skipped = true) so the function
 * degrades gracefully when mixed colour formats are used.
 */
export function validateOklchPresetContrast(colors: ColorContrastInput): ColorContrastReport {
  const pairs: Array<{ label: string; fg: string; bg: string; threshold: number }> = [
    { label: 'foreground/background', fg: colors.foreground, bg: colors.background, threshold: 4.5 },
    { label: 'foreground/card', fg: colors.foreground, bg: colors.card, threshold: 4.5 },
    { label: 'mutedForeground/background', fg: colors.mutedForeground, bg: colors.background, threshold: 3.0 },
  ]

  const details: ColorContrastCheckResult[] = pairs.map(({ label, fg, bg, threshold }) => {
    const ratio = getOklchContrastRatio(fg, bg)
    if (ratio === null) {
      return { pair: label, ratio: null, passes: true, skipped: true }
    }
    return { pair: label, ratio, passes: ratio >= threshold, skipped: false }
  })

  const evaluated = details.filter(d => !d.skipped)
  if (evaluated.length === 0) return { passes: null, details }

  return { passes: evaluated.every(d => d.passes), details }
}
