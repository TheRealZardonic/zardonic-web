/**
 * Shared color conversion utilities.
 *
 * Provides oklch ↔ hex conversion via the browser's CSS engine.
 * Previously duplicated in ThemeCustomizerDialog and SetupWizard.
 */

import { cssColorToRgb } from './contrast'

/**
 * Convert any CSS color value (oklch, hsl, rgb, named, …) to a hex string.
 * Falls back to `#ff3333` when the color cannot be resolved.
 */
export function oklchToHex(oklch: string): string {
  const rgb = cssColorToRgb(oklch)
  if (rgb) {
    return `#${rgb.r.toString(16).padStart(2, '0')}${rgb.g.toString(16).padStart(2, '0')}${rgb.b.toString(16).padStart(2, '0')}`
  }
  return '#ff3333'
}

/**
 * Convert a hex color value to an approximate oklch() string.
 *
 * NOTE: This is a simplified approximation that uses sRGB relative luminance
 * and HSV-derived chroma/hue rather than true perceptual OKLCH values.
 * It is sufficient for color-picker round-tripping but may not produce
 * accurate results for highly saturated colors.
 *
 * Falls back to `oklch(0.50 0.22 25)` when the color cannot be resolved.
 */
/**
 * Ensure a given foreground color is readable against a given background color.
 * Works by parsing the lightness `L` value of `oklch(L C H)` strings.
 * If the color cannot be parsed as OKLCH, returns the original color.
 */
export function ensureContrast(fgOklch: string, bgOklch: string): string {
  const fgMatch = fgOklch.match(/oklch\(\s*([\d.]+)/)
  const bgMatch = bgOklch.match(/oklch\(\s*([\d.]+)/)

  if (fgMatch && bgMatch) {
    const fgL = parseFloat(fgMatch[1])
    const bgL = parseFloat(bgMatch[1])

    // Background is light (L > 0.6)
    if (bgL > 0.6) {
      // Foreground is also light (L > 0.5) -> unreadable, make foreground dark
      if (fgL > 0.5) {
        return 'oklch(0.15 0 0)' // Dark
      }
    }
    // Background is dark (L <= 0.6)
    else {
      // Foreground is also dark (L < 0.5) -> unreadable, make foreground light
      if (fgL < 0.5) {
        return 'oklch(0.95 0 0)' // Light
      }
    }
  }

  return fgOklch
}

export function hexToOklch(hex: string): string {
  const rgb = cssColorToRgb(hex)
  if (rgb) {
    const r = rgb.r / 255
    const g = rgb.g / 255
    const b = rgb.b / 255
    // Approximate lightness via sRGB relative luminance
    const l = 0.2126 * r + 0.7152 * g + 0.0722 * b
    const max = Math.max(r, g, b)
    const min = Math.min(r, g, b)
    const c = max - min
    // Approximate hue from HSV hue (not true OKLCH hue space)
    let h = 0
    if (c > 0) {
      if (max === r) h = ((g - b) / c + 6) % 6 * 60
      else if (max === g) h = ((b - r) / c + 2) * 60
      else h = ((r - g) / c + 4) * 60
    }
    return `oklch(${l.toFixed(2)} ${(c * 0.4).toFixed(2)} ${Math.round(h)})`
  }
  return 'oklch(0.50 0.22 25)'
}
