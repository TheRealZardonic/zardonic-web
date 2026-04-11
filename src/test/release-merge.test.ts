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

describe('mergeWithExistingReleases', () => {
  it('returns fetched as-is when existing is empty', () => {
    const fetched = [makeRelease({ id: '1', title: 'New' })]
    const result = mergeWithExistingReleases(fetched, [])
    expect(result).toEqual(fetched)
  })

  it('returns existing as-is when fetched is empty', () => {
    const existing = [makeRelease({ id: '1', title: 'Manual' })]
    const result = mergeWithExistingReleases([], existing)
    expect(result).toEqual(existing)
  })

  it('adds new release from fetched that is not in existing', () => {
    const fetched = [makeRelease({ id: 'new-1', title: 'Brand New Release' })]
    const existing = [makeRelease({ id: 'old-1', title: 'Old Release' })]
    const result = mergeWithExistingReleases(fetched, existing)
    // new-1 is added, old-1 is preserved at end as manually-added
    expect(result.find(r => r.id === 'new-1')).toBeTruthy()
    expect(result.find(r => r.id === 'old-1')).toBeTruthy()
  })

  it('preserves manually-added release (exists in existing but not in fetched)', () => {
    const fetched = [makeRelease({ id: 'itunes-1', title: 'iTunes Release' })]
    const existing = [
      makeRelease({ id: 'itunes-1', title: 'iTunes Release' }),
      makeRelease({ id: 'manual-xyz', title: 'My Custom Release' }),
    ]
    const result = mergeWithExistingReleases(fetched, existing)
    expect(result.find(r => r.id === 'manual-xyz')).toBeTruthy()
    expect(result[result.length - 1].id).toBe('manual-xyz')
  })

  it('manuallyEdited release keeps existing title and description', () => {
    const fetched = [makeRelease({
      id: 'itunes-1',
      title: 'Updated Title From iTunes',
      description: 'iTunes Description',
    })]
    const existing = [makeRelease({
      id: 'itunes-1',
      title: 'My Custom Title',
      description: 'My Custom Description',
      manuallyEdited: true,
    })]
    const result = mergeWithExistingReleases(fetched, existing)
    const merged = result.find(r => r.id === 'itunes-1')!
    expect(merged.title).toBe('My Custom Title')
    expect(merged.description).toBe('My Custom Description')
    expect(merged.manuallyEdited).toBe(true)
  })

  it('manuallyEdited release gets new streaming links merged in', () => {
    const fetched = [makeRelease({
      id: 'itunes-1',
      streamingLinks: [
        { platform: 'spotify', url: 'https://spotify.com/new' },
        { platform: 'tidal', url: 'https://tidal.com/new' },
      ],
    })]
    const existing = [makeRelease({
      id: 'itunes-1',
      manuallyEdited: true,
      streamingLinks: [
        { platform: 'spotify', url: 'https://spotify.com/existing' },
        { platform: 'bandcamp', url: 'https://bandcamp.com/existing' },
      ],
    })]
    const result = mergeWithExistingReleases(fetched, existing)
    const merged = result.find(r => r.id === 'itunes-1')!
    const links = merged.streamingLinks ?? []
    // Existing spotify URL is kept (not overwritten)
    const spotify = links.find(l => l.platform === 'spotify')
    expect(spotify?.url).toBe('https://spotify.com/existing')
    // New tidal link is added
    const tidal = links.find(l => l.platform === 'tidal')
    expect(tidal?.url).toBe('https://tidal.com/new')
    // Existing bandcamp is preserved
    const bandcamp = links.find(l => l.platform === 'bandcamp')
    expect(bandcamp?.url).toBe('https://bandcamp.com/existing')
  })

  it('manuallyEdited release: does NOT remove existing streaming links', () => {
    const fetched = [makeRelease({
      id: 'itunes-1',
      streamingLinks: [{ platform: 'spotify', url: 'https://spotify.com' }],
    })]
    const existing = [makeRelease({
      id: 'itunes-1',
      manuallyEdited: true,
      streamingLinks: [
        { platform: 'spotify', url: 'https://spotify.com/existing' },
        { platform: 'bandcamp', url: 'https://bandcamp.com/existing' },
        { platform: 'beatport', url: 'https://beatport.com/existing' },
      ],
    })]
    const result = mergeWithExistingReleases(fetched, existing)
    const merged = result.find(r => r.id === 'itunes-1')!
    const platforms = (merged.streamingLinks ?? []).map(l => l.platform)
    expect(platforms).toContain('spotify')
    expect(platforms).toContain('bandcamp')
    expect(platforms).toContain('beatport')
  })

  it('non-manuallyEdited release in both: overwritten with fetched version', () => {
    const fetched = [makeRelease({
      id: 'itunes-1',
      title: 'Fetched Title',
      description: 'Fetched Description',
    })]
    const existing = [makeRelease({
      id: 'itunes-1',
      title: 'Old Title',
      description: 'Old Description',
    })]
    const result = mergeWithExistingReleases(fetched, existing)
    const merged = result.find(r => r.id === 'itunes-1')!
    expect(merged.title).toBe('Fetched Title')
    expect(merged.description).toBe('Fetched Description')
  })

  it('fetched order comes first, manual-only releases appended at end', () => {
    const fetched = [
      makeRelease({ id: 'itunes-3', title: 'C' }),
      makeRelease({ id: 'itunes-1', title: 'A' }),
      makeRelease({ id: 'itunes-2', title: 'B' }),
    ]
    const existing = [
      makeRelease({ id: 'itunes-1', title: 'A old' }),
      makeRelease({ id: 'manual-x', title: 'Manual X' }),
    ]
    const result = mergeWithExistingReleases(fetched, existing)
    // fetched order preserved at front
    expect(result[0].id).toBe('itunes-3')
    expect(result[1].id).toBe('itunes-1')
    expect(result[2].id).toBe('itunes-2')
    // manual-only at end
    expect(result[3].id).toBe('manual-x')
  })
})
