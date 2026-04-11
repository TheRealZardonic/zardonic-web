import { describe, it, expect } from 'vitest'
import { formatReleaseDate } from '@/lib/format-release-date'

describe('formatReleaseDate', () => {
  it('formats a full date as "14 Jul 2023"', () => {
    expect(formatReleaseDate('2023-07-14', '2023')).toBe('14 Jul 2023')
  })

  it('returns year only for XXXX-01-01 (heuristic)', () => {
    expect(formatReleaseDate('2023-01-01', '2023')).toBe('2023')
  })

  it('returns year when releaseDate is undefined', () => {
    expect(formatReleaseDate(undefined, '2023')).toBe('2023')
  })

  it('returns year when releaseDate is empty string', () => {
    expect(formatReleaseDate('', '2023')).toBe('2023')
  })

  it('returns empty string when both are undefined', () => {
    expect(formatReleaseDate(undefined, undefined)).toBe('')
  })

  it('formats another full date "15 Mar 2020"', () => {
    expect(formatReleaseDate('2020-03-15', '2020')).toBe('15 Mar 2020')
  })

  it('returns year for invalid date string', () => {
    expect(formatReleaseDate('not-a-date', '2022')).toBe('2022')
  })

  it('handles year with no releaseDate gracefully', () => {
    expect(formatReleaseDate(undefined, '2021')).toBe('2021')
  })

  it('returns empty string when year is also empty/undefined', () => {
    expect(formatReleaseDate('', '')).toBe('')
  })
})
