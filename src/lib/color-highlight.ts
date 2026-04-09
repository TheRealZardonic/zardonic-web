import type { ThemeCustomization } from '@/lib/types'

/**
 * Maps admin ThemeCustomization keys to the CSS custom property names they control.
 * Used by the color-highlight feature in AppearanceTab to show which elements
 * are affected when hovering over a color picker.
 */
export const COLOR_TO_CSS_VAR: Partial<Record<keyof ThemeCustomization, string>> = {
  primaryColor: 'primary',
  primaryForegroundColor: 'primary-foreground',
  accentColor: 'accent',
  accentForegroundColor: 'accent-foreground',
  backgroundColor: 'background',
  foregroundColor: 'foreground',
  cardColor: 'card',
  cardForegroundColor: 'card-foreground',
  popoverColor: 'popover',
  popoverForegroundColor: 'popover-foreground',
  borderColor: 'border',
  inputColor: 'input',
  ringColor: 'ring',
  hoverColor: 'hover',
  secondaryColor: 'secondary',
  secondaryForegroundColor: 'secondary-foreground',
  mutedColor: 'muted',
  mutedForegroundColor: 'muted-foreground',
  destructiveColor: 'destructive',
  destructiveForegroundColor: 'destructive-foreground',
  dataLabelColor: 'data-label',
  modalGlowColor: 'modal-glow',
}

/**
 * Set or clear the global color-highlight state.
 * When colorName is non-null, adds a `data-highlight-color` attribute to <html>
 * which triggers CSS-based highlight animations on matching `[data-theme-color]` elements.
 */
export function setHighlightColor(colorName: string | null): void {
  if (colorName) {
    document.documentElement.setAttribute('data-highlight-color', colorName)
  } else {
    document.documentElement.removeAttribute('data-highlight-color')
  }
}
