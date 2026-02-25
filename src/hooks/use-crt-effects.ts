import { useEffect } from 'react'
import { get } from '@/lib/config'

/**
 * Hook to apply CRT/Phosphor effect CSS variables dynamically
 * Updates CSS custom properties based on configuration values
 */
export function useCRTEffects() {
  useEffect(() => {
    const updateCSSVariables = () => {
      const root = document.documentElement

      // Phosphor Glow
      if (get('PHOSPHOR_GLOW_ENABLED')) {
        const innerBlur = get('PHOSPHOR_GLOW_INNER_BLUR_PX')
        const outerBlur = get('PHOSPHOR_GLOW_OUTER_BLUR_PX')
        const innerOpacity = get('PHOSPHOR_GLOW_INNER_OPACITY')
        const outerOpacity = get('PHOSPHOR_GLOW_OUTER_OPACITY')

        root.style.setProperty('--phosphor-inner-blur', `${innerBlur}px`)
        root.style.setProperty('--phosphor-outer-blur', `${outerBlur}px`)
        root.style.setProperty('--phosphor-inner-opacity', String(innerOpacity))
        root.style.setProperty('--phosphor-outer-opacity', String(outerOpacity))
      }

      // Scanline
      const scanlineHeight = get('SCANLINE_HEIGHT_PX')
      const scanlineDuration = get('SCANLINE_ANIMATION_DURATION_S')
      const scanlineOpacity = get('SCANLINE_OPACITY')

      root.style.setProperty('--scanline-height', `${scanlineHeight}px`)
      root.style.setProperty('--scanline-duration', `${scanlineDuration}s`)
      root.style.setProperty('--scanline-opacity', String(scanlineOpacity))
    }

    updateCSSVariables()
  }, [])
}
