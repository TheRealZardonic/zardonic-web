import type React from 'react'
import { useMemo } from 'react'
import type { AdminSettings } from '@/lib/types'
import { getSectionStyle } from '@/lib/admin-settings'

/**
 * Merges global theme defaults with per-section style overrides.
 * Returns a CSS custom property object ready for inline `style={}`.
 */
export function useSectionStyle(
  adminSettings: AdminSettings | undefined,
  sectionId: string,
): React.CSSProperties {
  return useMemo(() => {
    const override = getSectionStyle(adminSettings, sectionId)
    const styles: React.CSSProperties = {}

    if (override.backgroundColor) {
      // Use type assertion since CSS custom properties are valid but not typed
      ;(styles as Record<string, string>)['--section-bg'] = override.backgroundColor
    }
    if (override.primaryColor) {
      ;(styles as Record<string, string>)['--section-primary'] = override.primaryColor
    }
    if (override.borderColor) {
      ;(styles as Record<string, string>)['--section-border'] = override.borderColor
    }
    if (override.paddingY) {
      ;(styles as Record<string, string>)['--section-py'] = override.paddingY
    }
    if (override.paddingX) {
      ;(styles as Record<string, string>)['--section-px'] = override.paddingX
    }
    if (override.maxWidth) {
      ;(styles as Record<string, string>)['--section-max-width'] = override.maxWidth
    }

    return styles
  }, [adminSettings, sectionId])
}
