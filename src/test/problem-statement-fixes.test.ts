/**
 * Tests for problem-statement bug fixes:
 *   1. Track artist editing – fullReleaseToStored now preserves description & featured
 *   2. Custom links cleared correctly (undefined-safe merge)
 *   3. description & featured round-trip through toFullRelease → save → merge
 *   4. Contact subjects – ContactSettings.contactSubjects type exists
 *   5. Hero images – SiteData.heroImages type exists
 *   6. Gallery – instagramFeed combined with gallery (type-level)
 */

import { describe, it, expect } from 'vitest'
import { fullReleaseToStored, mergeFullReleaseIntoStored } from '@/lib/release-adapters'
import type { Release as FullRelease } from '@/lib/types'
import type { Release as StoredRelease } from '@/lib/app-types'
import type { ContactSettings } from '@/lib/types'
import type { SiteData } from '@/lib/app-types'

// ── helpers ──────────────────────────────────────────────────────────────────

function makeStoredRelease(overrides: Partial<StoredRelease> = {}): StoredRelease {
  return {
    id: 'test-1',
    title: 'Test Release',
    artwork: 'https://example.com/art.jpg',
    year: '2023',
    ...overrides,
  }
}

function makeFullRelease(overrides: Partial<FullRelease> = {}): FullRelease {
  return {
    id: 'test-1',
    title: 'Test Release',
    year: '2023',
    ...overrides,
  }
}

// ── 1. description is preserved through fullReleaseToStored ──────────────────

describe('fullReleaseToStored', () => {
  it('preserves description', () => {
    const full = makeFullRelease({ description: 'A dark industrial album.' })
    const stored = fullReleaseToStored(full)
    expect(stored.description).toBe('A dark industrial album.')
  })

  it('preserves featured flag', () => {
    const full = makeFullRelease({ featured: true })
    const stored = fullReleaseToStored(full)
    expect(stored.featured).toBe(true)
  })

  it('persists featured: false explicitly', () => {
    const full = makeFullRelease({ featured: false })
    const stored = fullReleaseToStored(full)
    expect(stored.featured).toBe(false)
  })

  it('preserves customLinks', () => {
    const links = [{ label: 'CD', url: 'https://shop.example.com' }]
    const full = makeFullRelease({ customLinks: links })
    const stored = fullReleaseToStored(full)
    expect(stored.customLinks).toEqual(links)
  })
})

// ── 2. mergeFullReleaseIntoStored – description & featured updating ────────────

describe('mergeFullReleaseIntoStored', () => {
  it('overwrites description when user changes it', () => {
    const updated = makeFullRelease({ description: 'Updated description' })
    const existing = makeStoredRelease({ description: 'Old description' })
    const result = mergeFullReleaseIntoStored(updated, existing)
    expect(result.description).toBe('Updated description')
  })

  it('preserves existing description when new release has no description', () => {
    const updated = makeFullRelease({ description: undefined })
    const existing = makeStoredRelease({ description: 'Original description' })
    const result = mergeFullReleaseIntoStored(updated, existing)
    expect(result.description).toBe('Original description')
  })

  it('overwrites featured when user changes it', () => {
    const updated = makeFullRelease({ featured: true })
    const existing = makeStoredRelease({ featured: false })
    const result = mergeFullReleaseIntoStored(updated, existing)
    expect(result.featured).toBe(true)
  })

  it('clears featured when user explicitly sets it to false', () => {
    const updated = makeFullRelease({ featured: false })
    const existing = makeStoredRelease({ featured: true })
    const result = mergeFullReleaseIntoStored(updated, existing)
    expect(result.featured).toBe(false)
  })

  it('preserves existing featured when not set in updated', () => {
    const updated = makeFullRelease({ featured: undefined })
    const existing = makeStoredRelease({ featured: true })
    const result = mergeFullReleaseIntoStored(updated, existing)
    expect(result.featured).toBe(true)
  })
})

// ── 3. Custom links can be cleared (empty array removes them) ─────────────────

describe('mergeFullReleaseIntoStored – custom links clearing', () => {
  it('stores empty customLinks array when user removes all links', () => {
    const updated = makeFullRelease({ customLinks: [] })
    const existing = makeStoredRelease({
      customLinks: [{ label: 'CD', url: 'https://shop.example.com/cd' }],
    })
    const result = mergeFullReleaseIntoStored(updated, existing)
    // An empty array from the user should clear existing links (stored.customLinks = [])
    expect(result.customLinks).toEqual([])
  })

  it('preserves existing customLinks when new release has undefined customLinks', () => {
    const updated = makeFullRelease({ customLinks: undefined })
    const existing = makeStoredRelease({
      customLinks: [{ label: 'Vinyl', url: 'https://shop.example.com/vinyl' }],
    })
    const result = mergeFullReleaseIntoStored(updated, existing)
    expect(result.customLinks).toHaveLength(1)
    expect(result.customLinks?.[0].label).toBe('Vinyl')
  })

  it('adds new customLinks to a release that had none', () => {
    const updated = makeFullRelease({
      customLinks: [{ label: 'Free Download', url: 'https://example.com/dl' }],
    })
    const existing = makeStoredRelease({ customLinks: undefined })
    const result = mergeFullReleaseIntoStored(updated, existing)
    expect(result.customLinks).toHaveLength(1)
    expect(result.customLinks?.[0].label).toBe('Free Download')
  })
})

// ── 4. ContactSettings has contactSubjects field ──────────────────────────────

describe('ContactSettings type', () => {
  it('accepts contactSubjects array', () => {
    const s: ContactSettings = {
      contactSubjects: [
        'Booking Request',
        'Remix Request',
        'Mix & Master Request',
      ],
    }
    expect(s.contactSubjects).toHaveLength(3)
    expect(s.contactSubjects?.[0]).toBe('Booking Request')
  })

  it('contactSubjects is optional', () => {
    const s: ContactSettings = { emailForwardTo: 'info@example.com' }
    expect(s.contactSubjects).toBeUndefined()
  })
})

// ── 5. SiteData has heroImages field ─────────────────────────────────────────

describe('SiteData type', () => {
  it('accepts heroImages array', () => {
    const data: Partial<SiteData> = {
      heroImage: 'https://example.com/hero.jpg',
      heroImages: [
        'https://example.com/hero2.jpg',
        'https://example.com/hero3.jpg',
      ],
    }
    expect(data.heroImages).toHaveLength(2)
  })

  it('heroImages is optional', () => {
    const data: Partial<SiteData> = { heroImage: 'https://example.com/hero.jpg' }
    expect(data.heroImages).toBeUndefined()
  })
})

// ── 6. StoredRelease has featured and description fields ──────────────────────

describe('StoredRelease (app-types Release)', () => {
  it('accepts featured and description fields', () => {
    const r: StoredRelease = {
      id: 'x',
      title: 'My Release',
      artwork: '',
      year: '2024',
      featured: true,
      description: 'A description.',
    }
    expect(r.featured).toBe(true)
    expect(r.description).toBe('A description.')
  })
})
