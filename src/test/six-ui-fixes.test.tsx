/**
 * six-ui-fixes.test.tsx
 *
 * Tests covering the 6 UI fixes:
 * 1. Biography line breaks (whitespace-pre-wrap)
 * 2. Logo brightness adjustable (CreditHighlights / Sponsoring)
 * 3. Logo brightness registry fields present
 * 4. Manual track artist editing in ReleaseEditDialog
 * 5. Section background opacity per section
 * 6. Release artwork border (cyber-card class on release cards)
 */
import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import React from 'react'
import { SECTION_REGISTRY } from '@/lib/sections-registry'
import type { SectionStyleOverride } from '@/lib/types'

// ── Shared mocks ──────────────────────────────────────────────────────────────

vi.mock('framer-motion', async () => {
  const actual = await vi.importActual<typeof import('framer-motion')>('framer-motion')
  return {
    ...actual,
    motion: new Proxy(
      {},
      {
        get: (_target, tag: string) =>
          React.forwardRef(
            ({ children, initial: _i, whileInView: _wiv, viewport: _vp, transition: _tr, animate: _a, exit: _ex, whileHover: _wh, ...props }: React.HTMLAttributes<HTMLElement> & Record<string, unknown>, ref: React.Ref<HTMLElement>) =>
              React.createElement(tag as string, { ...props, ref }, children)
          ),
      }
    ),
    AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    useInView: () => true,
  }
})

// ── 1 & 2: Bio line breaks & background opacity are covered in bio-section-font.test.tsx
// ── 3: Registry fields ────────────────────────────────────────────────────────

describe('SECTION_REGISTRY — new fields', () => {
  it('creditHighlights has a logoBrightness slider field', () => {
    const entry = SECTION_REGISTRY.find(e => e.id === 'creditHighlights')
    const field = entry?.configFields.find(f => f.path === 'sections.styleOverrides.creditHighlights.logoBrightness')
    expect(field).toBeDefined()
    expect(field?.type).toBe('slider')
    expect(field?.min).toBe(0)
    expect(field?.max).toBeGreaterThan(1)
    expect(field?.defaultValue).toBe(1)
    expect(field?.disclosure).toBe('basic')
  })

  it('sponsoring has a logoBrightness slider field', () => {
    const entry = SECTION_REGISTRY.find(e => e.id === 'sponsoring')
    const field = entry?.configFields.find(f => f.path === 'sections.styleOverrides.sponsoring.logoBrightness')
    expect(field).toBeDefined()
    expect(field?.type).toBe('slider')
    expect(field?.min).toBe(0)
    expect(field?.max).toBeGreaterThan(1)
    expect(field?.defaultValue).toBe(1)
  })

  it('bio has a backgroundOpacity slider field', () => {
    const entry = SECTION_REGISTRY.find(e => e.id === 'bio')
    const field = entry?.configFields.find(f => f.path === 'sections.styleOverrides.bio.backgroundOpacity')
    expect(field).toBeDefined()
    expect(field?.type).toBe('slider')
    expect(field?.min).toBe(0)
    expect(field?.max).toBe(1)
    expect(field?.step).toBe(0.05)
  })

  it('gigs has a backgroundOpacity slider field', () => {
    const entry = SECTION_REGISTRY.find(e => e.id === 'gigs')
    const field = entry?.configFields.find(f => f.path === 'sections.styleOverrides.gigs.backgroundOpacity')
    expect(field).toBeDefined()
    expect(field?.type).toBe('slider')
    expect(field?.min).toBe(0)
    expect(field?.max).toBe(1)
  })

  it('releases has a backgroundOpacity slider field', () => {
    const entry = SECTION_REGISTRY.find(e => e.id === 'releases')
    const field = entry?.configFields.find(f => f.path === 'sections.styleOverrides.releases.backgroundOpacity')
    expect(field).toBeDefined()
    expect(field?.type).toBe('slider')
    expect(field?.min).toBe(0)
    expect(field?.max).toBe(1)
  })
})

// ── 4: Track artist editing ───────────────────────────────────────────────────

describe('ReleaseEditDialog — track artist field', () => {
  it('renders artist input for new track', async () => {
    const { default: ReleaseEditDialog } = await import('@/components/ReleaseEditDialog')

    const release = {
      id: 'r1',
      title: 'Test Album',
      artwork: '',
      year: '2024',
      tracks: [],
    }

    render(
      <ReleaseEditDialog
        release={release as Parameters<typeof ReleaseEditDialog>[0]['release']}
        onClose={vi.fn()}
        onSave={vi.fn()}
      />
    )

    // Artist input should exist in the new-track form row
    const artistInputs = await screen.findAllByPlaceholderText('Artist')
    expect(artistInputs.length).toBeGreaterThan(0)
  })

  it('pre-fills existing track artist values from the release data', async () => {
    const { default: ReleaseEditDialog } = await import('@/components/ReleaseEditDialog')

    const release = {
      id: 'r2',
      title: 'Collab Album',
      artwork: '',
      year: '2024',
      tracks: [{ title: 'Collab Track', duration: '4:00', artist: 'Guest Artist' }],
    }

    render(
      <ReleaseEditDialog
        release={release as Parameters<typeof ReleaseEditDialog>[0]['release']}
        onClose={vi.fn()}
        onSave={vi.fn()}
      />
    )

    // The dialog renders in a Radix portal — use screen to search the full document.
    // Wait for the useEffect to update the tracks state and render the disabled input.
    await waitFor(() => {
      // screen.getAllByDisplayValue searches all inputs in the document
      const inputs = screen.getAllByDisplayValue('Guest Artist')
      expect(inputs.length).toBeGreaterThan(0)
    })
  })
})

// ── 5: SectionStyleOverride type has new fields ───────────────────────────────

describe('SectionStyleOverride type — new fields', () => {
  it('accepts logoBrightness without TS errors', () => {
    const override: SectionStyleOverride = { logoBrightness: 1.2 }
    expect(override.logoBrightness).toBe(1.2)
  })

  it('accepts backgroundOpacity without TS errors', () => {
    const override: SectionStyleOverride = { backgroundOpacity: 0.5 }
    expect(override.backgroundOpacity).toBe(0.5)
  })

  it('both fields are optional — empty override is valid', () => {
    const override: SectionStyleOverride = {}
    expect(override.logoBrightness).toBeUndefined()
    expect(override.backgroundOpacity).toBeUndefined()
  })
})

// ── 6: Release card cyber-card class ─────────────────────────────────────────

describe('ReleaseCard — cyber-card border class', () => {
  const baseRelease = {
    id: 'r1',
    title: 'Test Release',
    artwork: 'https://example.com/art.jpg',
    year: '2024',
    type: 'album' as const,
  }
  const noop = vi.fn()

  const variants = ['default', 'square-minimal', 'square-titled', 'compact', 'square-cover'] as const

  for (const variant of variants) {
    it(`${variant} card has cyber-card class on the card element`, async () => {
      const { default: ReleaseCard } = await import('@/components/releases/ReleaseCard')
      const { container } = render(
        <ReleaseCard
          release={baseRelease}
          index={0}
          editMode={false}
          variant={variant}
          hoverEffect="default"
          syncingId={null}
          bulkSyncing={false}
          onReleaseClick={noop}
        />
      )
      // The ReleaseCard wraps its content in a motion.div (no className);
      // the actual Card element inside must carry cyber-card.
      const cyberCardEl = container.querySelector('.cyber-card')
      expect(cyberCardEl).not.toBeNull()
    })
  }
})
