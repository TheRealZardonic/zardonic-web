import { describe, it, expect } from 'vitest'
import { parseTrackTitle } from '../lib/track-parser'

describe('parseTrackTitle', () => {
  it('extracts "feat." correctly', () => {
    const result = parseTrackTitle("Song Name (feat. Artist B)")
    expect(result.cleanTitle).toBe("Song Name")
    expect(result.extractedArtists).toEqual(["Artist B"])
  })

  it('extracts "ft." correctly', () => {
    const result = parseTrackTitle("Song Name (ft. Artist C)")
    expect(result.cleanTitle).toBe("Song Name")
    expect(result.extractedArtists).toEqual(["Artist C"])
  })

  it('handles multiple artists separated by commas', () => {
    const result = parseTrackTitle("Song Name (feat. Artist B, Artist C)")
    expect(result.cleanTitle).toBe("Song Name")
    expect(result.extractedArtists).toEqual(["Artist B", "Artist C"])
  })

  it('handles multiple artists separated by & or and', () => {
    const result = parseTrackTitle("Song Name (feat. Artist B & Artist C and Artist D)")
    expect(result.cleanTitle).toBe("Song Name")
    expect(result.extractedArtists).toEqual(["Artist B", "Artist C", "Artist D"])
  })

  it('returns original title if no feat/ft found', () => {
    const result = parseTrackTitle("Song Name")
    expect(result.cleanTitle).toBe("Song Name")
    expect(result.extractedArtists).toEqual([])
  })

  it('handles case insensitive feat/ft', () => {
    const result = parseTrackTitle("Song Name (FEAT. Artist D)")
    expect(result.cleanTitle).toBe("Song Name")
    expect(result.extractedArtists).toEqual(["Artist D"])
  })

  it('extracts artists when (feat. X) is followed by [Remix] suffix', () => {
    const result = parseTrackTitle("Kernel Breaker (feat. Noisesmith, Roel Peijs & Kylee Brielle) [Remix]")
    expect(result.cleanTitle).toBe("Kernel Breaker [Remix]")
    expect(result.extractedArtists).toEqual(["Noisesmith", "Roel Peijs", "Kylee Brielle"])
  })

  it('preserves (Zardonic Remix) suffix', () => {
    const result = parseTrackTitle("Song (Zardonic Remix)")
    expect(result.cleanTitle).toBe("Song (Zardonic Remix)")
    expect(result.extractedArtists).toEqual([])
  })

  it('preserves [Remix] suffix', () => {
    const result = parseTrackTitle("Song [Remix]")
    expect(result.cleanTitle).toBe("Song [Remix]")
    expect(result.extractedArtists).toEqual([])
  })

  it('handles [feat. X] square bracket pattern', () => {
    const result = parseTrackTitle("Song Name [feat. Guest]")
    expect(result.cleanTitle).toBe("Song Name")
    expect(result.extractedArtists).toEqual(["Guest"])
  })

  it('handles "featuring" keyword', () => {
    const result = parseTrackTitle("Song Name (featuring Artist E)")
    expect(result.cleanTitle).toBe("Song Name")
    expect(result.extractedArtists).toEqual(["Artist E"])
  })

  it('handles trailing feat. without brackets', () => {
    const result = parseTrackTitle("Song Name feat. Someone")
    expect(result.cleanTitle).toBe("Song Name")
    expect(result.extractedArtists).toEqual(["Someone"])
  })

  it('handles (with X) pattern', () => {
    const result = parseTrackTitle("Song Name (with Collaborator)")
    expect(result.cleanTitle).toBe("Song Name")
    expect(result.extractedArtists).toEqual(["Collaborator"])
  })
})
