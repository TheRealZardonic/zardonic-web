import { describe, it, expect } from 'vitest'
import type { ThemeSettings, OverlayEffects, OverlayEffect } from '@/lib/types'

describe('ThemeSettings overlay effects types', () => {
  it('supports borderRadius in ThemeSettings', () => {
    const theme: ThemeSettings = {
      primary: 'oklch(0.50 0.22 25)',
      borderRadius: 0.5,
    }
    expect(theme.borderRadius).toBe(0.5)
  })

  it('supports default borderRadius value', () => {
    const theme: ThemeSettings = {}
    expect(theme.borderRadius).toBeUndefined()
  })

  it('supports overlay effects configuration', () => {
    const effects: OverlayEffects = {
      dotMatrix: { enabled: true, intensity: 0.5 },
      scanlines: { enabled: false, intensity: 0.3 },
      crt: { enabled: true, intensity: 0.8 },
      noise: { enabled: false, intensity: 0 },
      vignette: { enabled: true, intensity: 1 },
      chromatic: { enabled: false, intensity: 0.2 },
    }

    const theme: ThemeSettings = {
      overlayEffects: effects,
    }

    expect(theme.overlayEffects?.dotMatrix?.enabled).toBe(true)
    expect(theme.overlayEffects?.dotMatrix?.intensity).toBe(0.5)
    expect(theme.overlayEffects?.scanlines?.enabled).toBe(false)
    expect(theme.overlayEffects?.crt?.intensity).toBe(0.8)
  })

  it('allows partial overlay effects', () => {
    const theme: ThemeSettings = {
      overlayEffects: {
        dotMatrix: { enabled: true, intensity: 0.5 },
      },
    }
    expect(theme.overlayEffects?.dotMatrix?.enabled).toBe(true)
    expect(theme.overlayEffects?.scanlines).toBeUndefined()
  })

  it('OverlayEffect has required enabled and intensity fields', () => {
    const effect: OverlayEffect = { enabled: true, intensity: 0.75 }
    expect(effect.enabled).toBe(true)
    expect(effect.intensity).toBe(0.75)
  })
})
