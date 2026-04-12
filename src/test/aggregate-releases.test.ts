/**
 * Unit tests for aggregateReleases() and normTitle() in api/releases-enrich.ts
 *
 * aggregateReleases is the best-of-breed merge function that combines releases
 * from iTunes and Discogs using normalised title matching and quality rules:
 *
 *  - iTunes releases take precedence for artwork, date, and ID
 *  - Discogs-only releases are appended
 *  - Duplicate titles (by normalised key) are merged, not doubled
 *  - Streaming links from both sources are unioned
 */
import { describe, it, expect } from 'vitest'
import { aggregateReleases } from '../../api/releases-enrich.js'

// Minimal Release type matching what releases-enrich.ts uses internally
interface StreamingLink { platform: string; url: string }
interface Release {
  id: string
  title: string
  artwork: string
  year: string
  releaseDate?: string
  streamingLinks?: StreamingLink[]
  description?: string
}

function makeRelease(overrides: Partial<Release> & { id: string; title: string }): Release {
  return {
    artwork: '',
    year: '2023',
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// aggregateReleases
// ---------------------------------------------------------------------------
describe('aggregateReleases', () => {
  it('returns iTunes releases as-is when Discogs list is empty', () => {
    const itunes = [makeRelease({ id: 'itunes-1', title: 'Antikythera' })]
    const result = aggregateReleases(itunes, [])
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('itunes-1')
  })

  it('returns Discogs releases when iTunes list is empty', () => {
    const discogs = [makeRelease({ id: 'discogs-1', title: 'Antikythera' })]
    const result = aggregateReleases([], discogs)
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('discogs-1')
  })

  it('deduplicates when iTunes and Discogs have the same title', () => {
    const itunes = [makeRelease({ id: 'itunes-1', title: 'Antikythera' })]
    const discogs = [makeRelease({ id: 'discogs-1', title: 'Antikythera' })]
    const result = aggregateReleases(itunes, discogs)
    expect(result).toHaveLength(1)
  })

  it('prefers iTunes id when titles match', () => {
    const itunes = [makeRelease({ id: 'itunes-1', title: 'Antikythera' })]
    const discogs = [makeRelease({ id: 'discogs-1', title: 'Antikythera' })]
    const result = aggregateReleases(itunes, discogs)
    expect(result[0].id).toBe('itunes-1')
  })

  it('prefers iTunes hi-res artwork over Discogs thumbnail', () => {
    const itunes = [makeRelease({ id: 'itunes-1', title: 'Antikythera', artwork: 'https://a1.mzstatic.com/600x600bb.jpg' })]
    const discogs = [makeRelease({ id: 'discogs-1', title: 'Antikythera', artwork: 'https://img.discogs.com/thumb.jpg' })]
    const result = aggregateReleases(itunes, discogs)
    expect(result[0].artwork).toBe('https://a1.mzstatic.com/600x600bb.jpg')
  })

  it('prefers iTunes full ISO date over Discogs year-only date', () => {
    const itunes = [makeRelease({ id: 'itunes-1', title: 'Antikythera', releaseDate: '2015-03-20', year: '2015' })]
    const discogs = [makeRelease({ id: 'discogs-1', title: 'Antikythera', releaseDate: '2015-01-01', year: '2015' })]
    const result = aggregateReleases(itunes, discogs)
    expect(result[0].releaseDate).toBe('2015-03-20')
  })

  it('appends Discogs-only releases that have no iTunes counterpart', () => {
    const itunes = [makeRelease({ id: 'itunes-1', title: 'Antikythera' })]
    const discogs = [
      makeRelease({ id: 'discogs-1', title: 'Antikythera' }),
      makeRelease({ id: 'discogs-2', title: 'Redeemer' }),
    ]
    const result = aggregateReleases(itunes, discogs)
    expect(result).toHaveLength(2)
    const ids = result.map(r => r.id)
    expect(ids).toContain('itunes-1')
    expect(ids).toContain('discogs-2')
  })

  it('unions streaming links from both sources', () => {
    const itunes = [makeRelease({
      id: 'itunes-1',
      title: 'Antikythera',
      streamingLinks: [{ platform: 'appleMusic', url: 'https://music.apple.com/album/1' }],
    })]
    const discogs = [makeRelease({
      id: 'discogs-1',
      title: 'Antikythera',
      streamingLinks: [{ platform: 'spotify', url: 'https://open.spotify.com/album/x' }],
    })]
    const result = aggregateReleases(itunes, discogs)
    const platforms = result[0].streamingLinks?.map(l => l.platform) ?? []
    expect(platforms).toContain('appleMusic')
    expect(platforms).toContain('spotify')
  })

  it('does not duplicate streaming links when both sources have the same platform', () => {
    const link = { platform: 'appleMusic', url: 'https://music.apple.com/album/1' }
    const itunes = [makeRelease({ id: 'itunes-1', title: 'Antikythera', streamingLinks: [link] })]
    const discogs = [makeRelease({ id: 'discogs-1', title: 'Antikythera', streamingLinks: [link] })]
    const result = aggregateReleases(itunes, discogs)
    const apple = result[0].streamingLinks?.filter(l => l.platform === 'appleMusic') ?? []
    expect(apple).toHaveLength(1)
  })

  it('deduplicates by normalised title — strips edition suffixes', () => {
    // "Antikythera (Deluxe Edition)" and "Antikythera" should match
    const itunes = [makeRelease({ id: 'itunes-1', title: 'Antikythera (Deluxe Edition)' })]
    const discogs = [makeRelease({ id: 'discogs-1', title: 'Antikythera' })]
    const result = aggregateReleases(itunes, discogs)
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('itunes-1')
  })

  it('deduplicates by normalised title — strips [Explicit]', () => {
    const itunes = [makeRelease({ id: 'itunes-1', title: 'Antikythera [Explicit]' })]
    const discogs = [makeRelease({ id: 'discogs-1', title: 'Antikythera' })]
    const result = aggregateReleases(itunes, discogs)
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('itunes-1')
  })

  it('deduplicates by normalised title — strips (Remastered)', () => {
    const itunes = [makeRelease({ id: 'itunes-1', title: 'Antikythera (Remastered 2020)' })]
    const discogs = [makeRelease({ id: 'discogs-1', title: 'Antikythera' })]
    const result = aggregateReleases(itunes, discogs)
    expect(result).toHaveLength(1)
  })

  it('deduplicates by normalised title — normalises diacritics', () => {
    const itunes = [makeRelease({ id: 'itunes-1', title: 'Résistance' })]
    const discogs = [makeRelease({ id: 'discogs-1', title: 'Resistance' })]
    const result = aggregateReleases(itunes, discogs)
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('itunes-1')
  })

  it('returns an empty array when both sources are empty', () => {
    const result = aggregateReleases([], [])
    expect(result).toHaveLength(0)
  })

  it('does not add the same Discogs release twice (paranoia dedup)', () => {
    const discogs = [
      makeRelease({ id: 'discogs-1', title: 'Antikythera' }),
      makeRelease({ id: 'discogs-2', title: 'Antikythera' }),
    ]
    const result = aggregateReleases([], discogs)
    expect(result).toHaveLength(1)
  })
})
