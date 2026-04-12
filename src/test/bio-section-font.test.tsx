/**
 * bio-section-font.test.tsx
 *
 * TDD tests verifying that AppBioSection correctly binds ALL font settings
 * exclusively to CSS custom properties (--font-body, --font-heading) that are
 * controlled by use-app-theme.ts / the admin menu.
 *
 * Design contract:
 *  1. Bio text must always use `fontFamily: 'var(--font-body)'` in its inline
 *     style — never hardcode a literal font stack from adminSettings.
 *  2. Bio section heading (h2) must NOT carry a hardcoded `font-mono` Tailwind
 *     class. The `index.css` unlayered rule `h2 { font-family: var(--font-heading) }`
 *     is responsible for the heading font.
 *  3. Bio text font class (size) must reflect `sections.styleOverrides.bio.bodyFontSize`
 *     from adminSettings (via getBioBodyFontSize helper).
 */
import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import React from 'react'
import type { AdminSettings } from '@/lib/types'

// Mock framer-motion to avoid IntersectionObserver requirement in jsdom.
// The motion.div / motion.section components render as plain divs so we
// can still query DOM attributes and class names.
vi.mock('framer-motion', async () => {
  const actual = await vi.importActual<typeof import('framer-motion')>('framer-motion')
  return {
    ...actual,
    motion: new Proxy(
      {},
      {
        get: (_target, tag: string) =>
          React.forwardRef(({ children, ...props }: any, ref: any) =>
            React.createElement(tag, { ...props, ref }, children)
          ),
      }
    ),
  }
})

const noop = vi.fn()

async function renderBioSection(adminSettings?: AdminSettings) {
  const { default: AppBioSection } = await import('@/components/AppBioSection')
  return render(
    <AppBioSection
      bio="Artist biography text here."
      sectionOrder={1}
      visible
      editMode={false}
      sectionLabel="BIOGRAPHY"
      adminSettings={adminSettings}
      onUpdate={noop}
    />,
  )
}

describe('AppBioSection — font binding', () => {
  it('bio text uses var(--font-body) as inline fontFamily — never a literal font stack', async () => {
    const adminSettings: AdminSettings = {
      design: {
        theme: {
          fontBody: "'Inter', sans-serif",
        },
      },
    }
    const { container } = await renderBioSection(adminSettings)

    // Find the bio text wrapper that has the fontFamily inline style
    const bioText = container.querySelector('[style*="font-family"]')
    expect(bioText).not.toBeNull()
    // Must use the CSS variable, not the raw font stack value from adminSettings
    expect(bioText!.getAttribute('style')).toContain('var(--font-body)')
    // Must NOT embed the literal font stack directly in the style attribute
    expect(bioText!.getAttribute('style')).not.toMatch(/font-family:\s*['"]?Inter/)
  })

  it('bio text uses var(--font-body) even when adminSettings fontBody is undefined', async () => {
    const { container } = await renderBioSection(undefined)

    const bioText = container.querySelector('[style*="font-family"]')
    expect(bioText).not.toBeNull()
    expect(bioText!.getAttribute('style')).toContain('var(--font-body)')
  })

  it('bio section h2 heading does NOT hardcode font-mono class', async () => {
    const { container } = await renderBioSection()
    const heading = container.querySelector('h2')
    expect(heading).not.toBeNull()
    // font-mono hardcodes the mono typeface and ignores the admin heading font
    expect(heading!.classList.contains('font-mono')).toBe(false)
  })

  it('bio text font size class reflects adminSettings bodyFontSize', async () => {
    const adminSettings: AdminSettings = {
      sections: {
        styleOverrides: {
          bio: {
            bodyFontSize: 'text-xl',
          },
        },
      },
    }
    const { container } = await renderBioSection(adminSettings)
    // The bio text div should carry the configured Tailwind text-size class
    const bioText = container.querySelector('.text-xl')
    expect(bioText).not.toBeNull()
  })

  it('bio text font size defaults to text-lg when bodyFontSize is not set', async () => {
    const { container } = await renderBioSection(undefined)
    const bioText = container.querySelector('.text-lg')
    expect(bioText).not.toBeNull()
  })
  it('bio section h2 provides fallback classes when adminSettings typography is unset', async () => {
    const { container } = await renderBioSection(undefined)
    const heading = container.querySelector('h2')
    expect(heading).not.toBeNull()
    expect(heading!.classList.contains('text-4xl')).toBe(true)
    expect(heading!.classList.contains('md:text-6xl')).toBe(true)
    expect(heading!.classList.contains('font-bold')).toBe(true)
    expect(heading!.classList.contains('tracking-tighter')).toBe(true)
  })

  it('bio section h2 removes fallback sizing classes when headingFontSize is configured', async () => {
    const { container } = await renderBioSection({
      design: { typography: { headingFontSize: '5rem' } }
    })
    const heading = container.querySelector('h2')
    expect(heading!.classList.contains('text-4xl')).toBe(false)
    expect(heading!.classList.contains('md:text-6xl')).toBe(false)
  })

  it('bio section h2 removes fallback font-weight when headingFontWeight is configured', async () => {
    const { container } = await renderBioSection({
      design: { typography: { headingFontWeight: '300' } }
    })
    const heading = container.querySelector('h2')
    expect(heading!.classList.contains('font-bold')).toBe(false)
  })

  it('bio text provides fallback classes when adminSettings typography is unset', async () => {
    const { container } = await renderBioSection(undefined)
    const bioText = container.querySelector('[style*="font-family"]')
    expect(bioText!.classList.contains('font-light')).toBe(true)
    expect(bioText!.classList.contains('leading-relaxed')).toBe(true)
  })

  it('bio text removes fallback leading-relaxed class when bodyLineHeight is configured', async () => {
    const { container } = await renderBioSection({
      design: { typography: { bodyLineHeight: '2.0' } }
    })
    const bioText = container.querySelector('[style*="font-family"]')
    expect(bioText!.classList.contains('leading-relaxed')).toBe(false)
  })

})
