import { describe, it, expect } from 'vitest'
import { COLOR_TO_CSS_VAR } from '@/lib/color-highlight'

describe('color-highlight', () => {
  describe('COLOR_TO_CSS_VAR mapping', () => {
    it('maps primaryColor to primary', () => {
      expect(COLOR_TO_CSS_VAR.primaryColor).toBe('primary')
    })

    it('maps accentColor to accent', () => {
      expect(COLOR_TO_CSS_VAR.accentColor).toBe('accent')
    })

    it('maps backgroundColor to background', () => {
      expect(COLOR_TO_CSS_VAR.backgroundColor).toBe('background')
    })

    it('maps all expected color keys', () => {
      const expectedKeys = [
        'primaryColor',
        'accentColor',
        'backgroundColor',
        'foregroundColor',
        'cardColor',
        'borderColor',
        'secondaryColor',
        'mutedColor',
        'destructiveColor',
        'dataLabelColor',
        'modalGlowColor',
      ]
      for (const key of expectedKeys) {
        expect(COLOR_TO_CSS_VAR[key as keyof typeof COLOR_TO_CSS_VAR]).toBeDefined()
      }
    })

    it('does not map non-color keys', () => {
      // fontHeading is not a color — should be undefined
      expect(COLOR_TO_CSS_VAR['fontHeading' as keyof typeof COLOR_TO_CSS_VAR]).toBeUndefined()
    })
  })
})
