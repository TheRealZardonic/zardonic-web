import { describe, it, expect } from 'vitest'
import { mergeWithExistingReleases, type MergeableRelease } from '../../api/_release-merge.js'

function makeRelease(overrides: Partial<MergeableRelease> & { id: string }): MergeableRelease {
  return {
    title: `Release ${overrides.id}`,
    artwork: '',
    year: '2023',
    ...overrides,
  }
}

describe('customLinks preservation through merge', () => {
  it('customLinks are preserved in manuallyEdited release after merge', () => {
    const fetched = [makeRelease({
      id: 'itunes-1',
      title: 'Updated from iTunes',
      streamingLinks: [{ platform: 'spotify', url: 'https://spotify.com/new' }],
    })]
    const existing = [makeRelease({
      id: 'itunes-1',
      title: 'My Custom Title',
      manuallyEdited: true,
      customLinks: [
        { label: 'CD', url: 'https://shop.example.com/cd' },
        { label: 'Vinyl', url: 'https://shop.example.com/vinyl' },
      ],
    })]

    const result = mergeWithExistingReleases(fetched, existing)
    const merged = result.find(r => r.id === 'itunes-1')!

    expect(merged.customLinks).toHaveLength(2)
    expect(merged.customLinks?.[0].label).toBe('CD')
    expect(merged.customLinks?.[1].label).toBe('Vinyl')
  })

  it('customLinks are NOT overwritten by cron (manuallyEdited)', () => {
    const fetched = [makeRelease({
      id: 'itunes-1',
      customLinks: undefined, // cron has no custom links
    })]
    const existing = [makeRelease({
      id: 'itunes-1',
      manuallyEdited: true,
      customLinks: [{ label: 'CD', url: 'https://shop.example.com/cd' }],
    })]

    const result = mergeWithExistingReleases(fetched, existing)
    const merged = result.find(r => r.id === 'itunes-1')!

    expect(merged.customLinks).toBeDefined()
    expect(merged.customLinks?.[0].label).toBe('CD')
  })

  it('customLinks can be set on a new release', () => {
    const fetched: MergeableRelease[] = []
    const existing = [makeRelease({
      id: 'manual-new',
      title: 'Physical Only Release',
      customLinks: [{ label: 'Bandcamp Physical', url: 'https://bandcamp.com/physical' }],
    })]

    const result = mergeWithExistingReleases(fetched, existing)
    expect(result).toHaveLength(1)
    expect(result[0].customLinks?.[0].label).toBe('Bandcamp Physical')
  })

  it('manuallyEdited flag is preserved through merge', () => {
    const fetched = [makeRelease({ id: 'itunes-1' })]
    const existing = [makeRelease({ id: 'itunes-1', manuallyEdited: true })]

    const result = mergeWithExistingReleases(fetched, existing)
    expect(result[0].manuallyEdited).toBe(true)
  })
})
