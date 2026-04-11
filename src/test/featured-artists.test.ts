import { describe, it, expect } from 'vitest'
import {
  parseFeaturedArtists,
  cleanTrackTitle,
  isMainArtist,
  inferReleaseDescription,
  parseTrackArtists,
} from '../../api/_featured-artists.js'

const MAIN = 'Zardonic'

describe('parseFeaturedArtists', () => {
  it('parses (feat. X)', () => {
    expect(parseFeaturedArtists('Song (feat. Ill Bill)', MAIN)).toEqual(['Ill Bill'])
  })

  it('parses (ft. A, B & C)', () => {
    expect(parseFeaturedArtists('Song (ft. A, B & C)', MAIN)).toEqual(['A', 'B', 'C'])
  })

  it('parses [feat. X]', () => {
    expect(parseFeaturedArtists('Song [feat. X]', MAIN)).toEqual(['X'])
  })

  it('parses (with Someone)', () => {
    expect(parseFeaturedArtists('Song (with Someone)', MAIN)).toEqual(['Someone'])
  })

  it('filters out mainArtist (exact case)', () => {
    expect(parseFeaturedArtists('Song feat. Zardonic', MAIN)).toEqual([])
  })

  it('filters out mainArtist case-insensitively', () => {
    expect(parseFeaturedArtists('Song feat. ZARDONIC', MAIN)).toEqual([])
  })

  it('returns [] when nothing after keyword', () => {
    // "feat." with no artists
    expect(parseFeaturedArtists('Song feat. ', MAIN)).toEqual([])
  })

  it('returns [] for empty string', () => {
    expect(parseFeaturedArtists('', MAIN)).toEqual([])
  })

  it('parses trailing feat. A and B', () => {
    expect(parseFeaturedArtists('Song feat. A and B', MAIN)).toEqual(['A', 'B'])
  })

  it('parses first feat. marker only (bracket wins over trailing)', () => {
    expect(parseFeaturedArtists('Song (feat. Alpha) feat. Beta', MAIN)).toEqual(['Alpha'])
  })

  it('filters mainArtist and keeps others: feat. Zardonic, Ill Bill', () => {
    expect(parseFeaturedArtists('Song feat. Zardonic, Ill Bill', MAIN)).toEqual(['Ill Bill'])
  })

  it('parses featuring (full word)', () => {
    expect(parseFeaturedArtists('Song featuring Somebody', MAIN)).toEqual(['Somebody'])
  })

  it('splits with / separator', () => {
    expect(parseFeaturedArtists('Song (feat. A / B)', MAIN)).toEqual(['A', 'B'])
  })

  it('returns [] when title has no feat pattern', () => {
    expect(parseFeaturedArtists('Just A Song Title', MAIN)).toEqual([])
  })
})

describe('cleanTrackTitle', () => {
  it('removes (feat. X) from end', () => {
    expect(cleanTrackTitle('Song (feat. Ill Bill)')).toBe('Song')
  })

  it('removes [ft. X] from end', () => {
    expect(cleanTrackTitle('Song [ft. X]')).toBe('Song')
  })

  it('removes trailing feat. X without brackets', () => {
    expect(cleanTrackTitle('Song feat. X')).toBe('Song')
  })

  it('does not remove content that follows a bracket block', () => {
    // "feat. someone (title)" - the (title) part is after, so the whole string is preserved
    // because the feat. at the start is not at the end
    const result = cleanTrackTitle('feat. someone (title)')
    // The bracket (title) is not a feat. pattern, so no stripping happens
    // Only the trailing "feat. X" pattern applies, which requires SPACE before feat.
    // "feat. someone (title)" - there's no trailing pattern at end because "(title)" follows
    expect(result).toBe('feat. someone (title)')
  })

  it('returns unchanged title with no feat pattern', () => {
    expect(cleanTrackTitle('Song')).toBe('Song')
  })

  it('removes (with X)', () => {
    expect(cleanTrackTitle('Song (with Artist)')).toBe('Song')
  })

  it('handles [featuring X]', () => {
    expect(cleanTrackTitle('Title [featuring Guest]')).toBe('Title')
  })
})

describe('isMainArtist', () => {
  it('matches exactly (same case)', () => {
    expect(isMainArtist('Zardonic', 'Zardonic')).toBe(true)
  })

  it('matches case-insensitively', () => {
    expect(isMainArtist('Zardonic', 'zardonic')).toBe(true)
  })

  it('trims whitespace', () => {
    expect(isMainArtist(' Zardonic ', 'Zardonic')).toBe(true)
  })

  it('returns false for different artist', () => {
    expect(isMainArtist('Other', 'Zardonic')).toBe(false)
  })

  it('all-caps matches', () => {
    expect(isMainArtist('ZARDONIC', 'Zardonic')).toBe(true)
  })
})

describe('inferReleaseDescription', () => {
  it('returns undefined when collectionArtist IS the mainArtist', () => {
    expect(inferReleaseDescription('Zardonic', MAIN)).toBeUndefined()
  })

  it('returns undefined case-insensitively', () => {
    expect(inferReleaseDescription('ZARDONIC', MAIN)).toBeUndefined()
  })

  it('returns "ft. Uzzardonic" for a different artist whose name contains mainArtist as substring but not word', () => {
    expect(inferReleaseDescription('Uzzardonic', MAIN)).toBe('ft. Uzzardonic')
  })

  it('returns undefined when collectionArtist contains mainArtist as a word', () => {
    expect(inferReleaseDescription('Zardonic feat. Ill Bill', MAIN)).toBeUndefined()
  })

  it('returns undefined when collectionArtist is "Some Label feat. Zardonic" (contains mainArtist as word)', () => {
    expect(inferReleaseDescription('Some Label feat. Zardonic', MAIN)).toBeUndefined()
  })

  it('returns "ft. Other Artist" for a completely different artist', () => {
    expect(inferReleaseDescription('Other Artist', MAIN)).toBe('ft. Other Artist')
  })

  it('returns undefined for empty collectionArtistName', () => {
    expect(inferReleaseDescription('', MAIN)).toBeUndefined()
  })

  it('returns undefined for empty mainArtist', () => {
    expect(inferReleaseDescription('Some Artist', '')).toBeUndefined()
  })

  it('trims the result', () => {
    expect(inferReleaseDescription('  Ill Bill  ', MAIN)).toBe('ft. Ill Bill')
  })
})

describe('parseTrackArtists', () => {
  it('parses "Zardonic feat. Ill Bill"', () => {
    expect(parseTrackArtists('Zardonic feat. Ill Bill', MAIN)).toEqual({
      artist: 'Zardonic',
      featuredArtists: ['Ill Bill'],
    })
  })

  it('filters mainArtist out of featuredArtists: "Other feat. Zardonic"', () => {
    expect(parseTrackArtists('Other feat. Zardonic', MAIN)).toEqual({
      artist: 'Other',
      featuredArtists: [],
    })
  })

  it('returns base artist with no featured artists when no feat. pattern', () => {
    expect(parseTrackArtists('Zardonic', MAIN)).toEqual({
      artist: 'Zardonic',
      featuredArtists: [],
    })
  })

  it('handles ft. shorthand', () => {
    expect(parseTrackArtists('Zardonic ft. Someone', MAIN)).toEqual({
      artist: 'Zardonic',
      featuredArtists: ['Someone'],
    })
  })

  it('handles featuring keyword', () => {
    expect(parseTrackArtists('Zardonic featuring Guest', MAIN)).toEqual({
      artist: 'Zardonic',
      featuredArtists: ['Guest'],
    })
  })

  it('returns mainArtist as artist for empty iTunesArtistName', () => {
    expect(parseTrackArtists('', MAIN)).toEqual({
      artist: MAIN,
      featuredArtists: [],
    })
  })

  it('splits multiple featured artists', () => {
    expect(parseTrackArtists('Zardonic feat. A, B & C', MAIN)).toEqual({
      artist: 'Zardonic',
      featuredArtists: ['A', 'B', 'C'],
    })
  })
})
