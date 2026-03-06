import { describe, it, expect } from 'vitest'
import type { Release } from '@/lib/types'

/**
 * Pure-logic test for the release sorting algorithm used in ReleasesSection.
 * Releases without a releaseDate are treated as upcoming/future and shown first.
 */
function sortReleases(releases: Release[]): Release[] {
  return [...releases].sort((a, b) => {
    if (!a.releaseDate && !b.releaseDate) return 0
    if (!a.releaseDate) return -1
    if (!b.releaseDate) return 1
    return new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime()
  })
}

describe('Release sorting', () => {
  it('puts releases without dates at the top', () => {
    const releases: Release[] = [
      { id: '1', title: 'Old Release', releaseDate: '2020-01-01', streamingLinks: {} },
      { id: '2', title: 'Upcoming', streamingLinks: {} },
      { id: '3', title: 'Recent', releaseDate: '2024-06-15', streamingLinks: {} },
    ]

    const sorted = sortReleases(releases)
    expect(sorted[0].title).toBe('Upcoming')
    expect(sorted[1].title).toBe('Recent')
    expect(sorted[2].title).toBe('Old Release')
  })

  it('keeps multiple upcoming releases at the top', () => {
    const releases: Release[] = [
      { id: '1', title: 'Known Date', releaseDate: '2025-01-01', streamingLinks: {} },
      { id: '2', title: 'Future A', streamingLinks: {} },
      { id: '3', title: 'Future B', streamingLinks: {} },
    ]

    const sorted = sortReleases(releases)
    expect(sorted[0].releaseDate).toBeUndefined()
    expect(sorted[1].releaseDate).toBeUndefined()
    expect(sorted[2].title).toBe('Known Date')
  })

  it('sorts dated releases newest first', () => {
    const releases: Release[] = [
      { id: '1', title: 'Jan', releaseDate: '2024-01-15', streamingLinks: {} },
      { id: '2', title: 'Mar', releaseDate: '2024-03-01', streamingLinks: {} },
      { id: '3', title: 'Feb', releaseDate: '2024-02-10', streamingLinks: {} },
    ]

    const sorted = sortReleases(releases)
    expect(sorted.map(r => r.title)).toEqual(['Mar', 'Feb', 'Jan'])
  })

  it('handles empty array', () => {
    expect(sortReleases([])).toEqual([])
  })

  it('handles single release without date', () => {
    const releases: Release[] = [
      { id: '1', title: 'Solo', streamingLinks: {} },
    ]
    const sorted = sortReleases(releases)
    expect(sorted).toHaveLength(1)
    expect(sorted[0].title).toBe('Solo')
  })
})
