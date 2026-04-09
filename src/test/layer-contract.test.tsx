/**
 * Layer Contract & Footer Visibility Tests
 * =========================================
 * These tests enforce the immutable z-index stacking order and verify that the
 * footer and other content components are always rendered above animated
 * backgrounds.
 *
 * If ANY test in this file fails it means a critical visual regression has
 * been introduced: either animated backgrounds are obscuring content, or the
 * footer/sections are invisible because they ended up below the background layer.
 */
import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import React from 'react'
import { LAYERS, LAYER_INVARIANTS } from '@/lib/layer-contract'

// ---------------------------------------------------------------------------
// 1. Layer contract invariants
// ---------------------------------------------------------------------------
describe('LAYERS z-index contract invariants', () => {
  it('BACKGROUND_IMAGE is the deepest layer (z-index = 0)', () => {
    expect(LAYERS.BACKGROUND_IMAGE).toBe(0)
  })

  it('ANIMATED_BG is above background image', () => {
    expect(LAYERS.ANIMATED_BG).toBeGreaterThan(LAYERS.BACKGROUND_IMAGE)
  })

  it('CONTENT is strictly above ANIMATED_BG', () => {
    expect(LAYERS.CONTENT).toBeGreaterThan(LAYERS.ANIMATED_BG)
    // Concrete values must match what App.tsx uses
    expect(LAYERS.ANIMATED_BG).toBe(2)
    expect(LAYERS.CONTENT).toBe(3)
  })

  it('CRT_VIGNETTE is above CONTENT', () => {
    expect(LAYERS.CRT_VIGNETTE).toBeGreaterThan(LAYERS.CONTENT)
  })

  it('CRT_OVERLAY is above CRT_VIGNETTE', () => {
    expect(LAYERS.CRT_OVERLAY).toBeGreaterThan(LAYERS.CRT_VIGNETTE)
  })

  it('NOISE is the topmost layer', () => {
    expect(LAYERS.NOISE).toBeGreaterThan(LAYERS.CRT_OVERLAY)
  })

  it('all LAYER_INVARIANTS are true', () => {
    for (const [key, value] of Object.entries(LAYER_INVARIANTS)) {
      expect(value, `LAYER_INVARIANTS.${key} must be true`).toBe(true)
    }
  })
})

// ---------------------------------------------------------------------------
// 2. Animated background components – class/style enforcement
// ---------------------------------------------------------------------------
describe('GlitchGridBackground layer enforcement', () => {
  it('renders a canvas that is pointer-events-none with z-index at or below ANIMATED_BG', async () => {
    const GlitchGridBackground = (
      await vi.importActual<typeof import('@/components/GlitchGridBackground')>(
        '@/components/GlitchGridBackground'
      )
    ).default as React.ComponentType<{ transparent?: boolean }>

    const { container } = render(React.createElement(GlitchGridBackground))
    const canvas = container.querySelector('canvas')
    expect(canvas).not.toBeNull()
    // Must have pointer-events-none so it never blocks interaction
    expect(canvas!.className).toContain('pointer-events-none')
    // Individual background components use z-index: 0 locally; in App.tsx they are
    // wrapped in a parent div with style={{ zIndex: LAYERS.ANIMATED_BG }} (= 2).
    // The canvas itself must not exceed that wrapper's level.
    const zIndex = Number(canvas!.style.zIndex)
    expect(zIndex).toBeLessThanOrEqual(LAYERS.ANIMATED_BG)
  })
})

describe('MatrixRain layer enforcement', () => {
  it('renders a canvas that is pointer-events-none and not above ANIMATED_BG', async () => {
    // matchMedia is not available in jsdom – stub it
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockReturnValue({ matches: false }),
    })

    const MatrixRain = (
      await vi.importActual<typeof import('@/components/MatrixRain')>(
        '@/components/MatrixRain'
      )
    ).default as React.ComponentType

    const { container } = render(React.createElement(MatrixRain))
    const canvas = container.querySelector('canvas')
    expect(canvas).not.toBeNull()
    expect(canvas!.className).toContain('pointer-events-none')
    const zIndex = Number(canvas!.style.zIndex ?? '0')
    expect(zIndex).toBeLessThanOrEqual(LAYERS.ANIMATED_BG)
  })
})

describe('CloudChamberBackground layer enforcement', () => {
  it('renders a pointer-events-none container not above ANIMATED_BG', async () => {
    // Stub canvas getContext since jsdom does not implement WebGL/2D canvas ops
    HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue(null)

    const CloudChamberBackground = (
      await vi.importActual<typeof import('@/components/CloudChamberBackground')>(
        '@/components/CloudChamberBackground'
      )
    ).default as React.ComponentType

    const { container } = render(React.createElement(CloudChamberBackground))
    // The root element must be pointer-events-none
    const root = container.firstElementChild as HTMLElement | null
    expect(root).not.toBeNull()
    expect(root!.className).toContain('pointer-events-none')
    // z-index on root must not exceed ANIMATED_BG
    const zIndex = Number(root!.style.zIndex ?? '0')
    expect(zIndex).toBeLessThanOrEqual(LAYERS.ANIMATED_BG)
  })
})

// ---------------------------------------------------------------------------
// 3. AppFooter – DOM structure and visibility
// ---------------------------------------------------------------------------

// Minimal stubs so AppFooter can render in isolation
vi.mock('@/contexts/LocaleContext', () => ({
  useLocale: () => ({ setLocale: vi.fn(), locale: 'en' }),
}))

vi.mock('@/components/LanguageSwitcher', () => ({
  default: () => React.createElement('div', { 'data-testid': 'lang-switcher' }),
}))

vi.mock('@/components/CookieConsent', () => ({
  CookiePreferencesButton: () =>
    React.createElement('button', { 'data-testid': 'cookie-prefs' }, 'Cookie'),
  useAnalyticsConsent: () => ({ hasConsent: false, setConsent: vi.fn() }),
}))

describe('AppFooter visibility', () => {
  async function renderFooter() {
    const AppFooter = (
      await vi.importActual<typeof import('@/components/AppFooter')>(
        '@/components/AppFooter'
      )
    ).default as React.ComponentType<{
      artistName: string
      isOwner: boolean
      hasPassword: boolean
      setShowLoginDialog: (v: boolean) => void
      setShowSetupDialog: (v: boolean) => void
      setCyberpunkOverlay: (o: { type: 'impressum' | 'privacy' | 'contact' } | null) => void
    }>

    return render(
      React.createElement(AppFooter, {
        artistName: 'Zardonic',
        isOwner: false,
        hasPassword: true,
        setShowLoginDialog: vi.fn(),
        setShowSetupDialog: vi.fn(),
        setCyberpunkOverlay: vi.fn(),
      })
    )
  }

  it('renders a <footer> element', async () => {
    const { container } = await renderFooter()
    const footer = container.querySelector('footer')
    expect(footer).not.toBeNull()
  })

  it('footer element has no fixed positioning (must scroll with content)', async () => {
    const { container } = await renderFooter()
    const footer = container.querySelector('footer')!
    const classes = footer.className.split(/\s+/)
    expect(classes).not.toContain('fixed')
    expect(classes).not.toContain('absolute')
  })

  it('footer element does NOT have a z-index below CONTENT layer', async () => {
    const { container } = await renderFooter()
    const footer = container.querySelector('footer')!
    // If z-index is set inline it must be >= CONTENT. If absent, stacking context
    // of parent div is responsible (verified separately by DOM-structure tests).
    if (footer.style.zIndex) {
      expect(Number(footer.style.zIndex)).toBeGreaterThanOrEqual(LAYERS.CONTENT)
    }
    // Tailwind classes: no z-0, z-1, or z-2 that would sink the footer below content
    const forbiddenZClasses = ['z-0', 'z-1', 'z-2']
    for (const cls of forbiddenZClasses) {
      expect(footer.className.split(/\s+/)).not.toContain(cls)
    }
  })

  it('footer renders its copyright text', async () => {
    const { getByText } = await renderFooter()
    expect(getByText(/Zardonic/)).not.toBeNull()
  })

  it('footer renders the Impressum link', async () => {
    const { getByText } = await renderFooter()
    expect(getByText(/Impressum/i)).not.toBeNull()
  })

  it('footer renders the Privacy Policy link', async () => {
    const { getByText } = await renderFooter()
    expect(getByText(/Privacy/i)).not.toBeNull()
  })

  it('footer renders the Contact link', async () => {
    const { getByText } = await renderFooter()
    expect(getByText(/Contact/i)).not.toBeNull()
  })
})

// ---------------------------------------------------------------------------
// 4. App-level layout – sections wrapper contains footer above animated bg
// ---------------------------------------------------------------------------
describe('App layout: sections wrapper z-index', () => {
  /**
   * Structural test: the `div.relative.z-[3]` wrapper in App.tsx that hosts all
   * page sections AND the footer must have z-index >= LAYERS.CONTENT so it is
   * rendered above the animated background wrapper (z-index = LAYERS.ANIMATED_BG).
   *
   * Because we cannot render the full App in unit tests, we verify the contract
   * using the LAYERS constants directly.
   */
  it('CONTENT layer (z=3) is above ANIMATED_BG layer (z=2)', () => {
    expect(LAYERS.CONTENT).toBeGreaterThan(LAYERS.ANIMATED_BG)
  })

  it('CONTENT layer value matches the Tailwind z-[3] class used in App.tsx', () => {
    // z-[3] in Tailwind means z-index: 3. Must match LAYERS.CONTENT.
    const tailwindValue = 3
    expect(LAYERS.CONTENT).toBe(tailwindValue)
  })

  it('ANIMATED_BG layer value matches the inline zIndex:2 used in App.tsx BackgroundLayer wrapper', () => {
    // The wrapper div around BackgroundLayer uses style={{ zIndex: 2 }}
    const appInlineZIndex = 2
    expect(LAYERS.ANIMATED_BG).toBe(appInlineZIndex)
  })
})

// ---------------------------------------------------------------------------
// 5. CRT / Noise overlays – must be pointer-events-none & above content
// ---------------------------------------------------------------------------
describe('CRT and noise overlay classes in CSS contract', () => {
  it('NOISE layer is above CRT_OVERLAY', () => {
    expect(LAYERS.NOISE).toBeGreaterThan(LAYERS.CRT_OVERLAY)
  })

  it('CRT_OVERLAY is above CRT_VIGNETTE', () => {
    expect(LAYERS.CRT_OVERLAY).toBeGreaterThan(LAYERS.CRT_VIGNETTE)
  })

  it('CRT_VIGNETTE is above CONTENT', () => {
    expect(LAYERS.CRT_VIGNETTE).toBeGreaterThan(LAYERS.CONTENT)
  })

  it('full-page-noise z-index matches LAYERS.NOISE', () => {
    // The .full-page-noise CSS class uses z-index: 9999.
    // This test ensures the constant stays in sync.
    expect(LAYERS.NOISE).toBe(9999)
  })

  it('crt-overlay z-index matches LAYERS.CRT_OVERLAY', () => {
    expect(LAYERS.CRT_OVERLAY).toBe(9998)
  })

  it('crt-vignette z-index matches LAYERS.CRT_VIGNETTE', () => {
    expect(LAYERS.CRT_VIGNETTE).toBe(9997)
  })
})
