import { describe, it, expect } from 'vitest'
import {
  isSectionVisible,
  getSectionOrder,
  getDisclosureLevel,
  getSectionStyle,
  getAdminValue,
  setAdminValue,
} from '../admin-settings'
import { DEFAULT_SECTION_ORDER } from '../config'
import type { AdminSettings } from '../types'

describe('isSectionVisible', () => {
  it('returns true when settings is undefined (default visible)', () => {
    expect(isSectionVisible(undefined, 'bio')).toBe(true)
  })

  it('returns true when settings is null', () => {
    expect(isSectionVisible(null, 'bio')).toBe(true)
  })

  it('returns true when visibility record is not set', () => {
    const settings: AdminSettings = {}
    expect(isSectionVisible(settings, 'bio')).toBe(true)
  })

  it('returns false when section is explicitly hidden', () => {
    const settings: AdminSettings = {
      sections: { visibility: { bio: false } },
    }
    expect(isSectionVisible(settings, 'bio')).toBe(false)
  })

  it('returns true when section is explicitly visible', () => {
    const settings: AdminSettings = {
      sections: { visibility: { bio: true } },
    }
    expect(isSectionVisible(settings, 'bio')).toBe(true)
  })

  it('returns true for unknown section (not in visibility map)', () => {
    const settings: AdminSettings = {
      sections: { visibility: { bio: false } },
    }
    expect(isSectionVisible(settings, 'releases')).toBe(true)
  })
})

describe('getSectionOrder', () => {
  it('returns DEFAULT_SECTION_ORDER when settings is undefined', () => {
    expect(getSectionOrder(undefined)).toEqual([...DEFAULT_SECTION_ORDER])
  })

  it('returns DEFAULT_SECTION_ORDER when no order is set', () => {
    const settings: AdminSettings = {}
    expect(getSectionOrder(settings)).toEqual([...DEFAULT_SECTION_ORDER])
  })

  it('returns custom order when set', () => {
    const custom = ['releases', 'bio', 'gigs']
    const settings: AdminSettings = { sections: { order: custom } }
    expect(getSectionOrder(settings)).toEqual(custom)
  })
})

describe('getDisclosureLevel', () => {
  it('returns basic when settings is undefined', () => {
    expect(getDisclosureLevel(undefined)).toBe('basic')
  })

  it('returns basic when ui is not set', () => {
    const settings: AdminSettings = {}
    expect(getDisclosureLevel(settings)).toBe('basic')
  })

  it('returns expert when set to expert', () => {
    const settings: AdminSettings = { ui: { disclosureLevel: 'expert' } }
    expect(getDisclosureLevel(settings)).toBe('expert')
  })

  it('returns advanced when set to advanced', () => {
    const settings: AdminSettings = { ui: { disclosureLevel: 'advanced' } }
    expect(getDisclosureLevel(settings)).toBe('advanced')
  })
})

describe('getSectionStyle', () => {
  it('returns empty object when settings is undefined', () => {
    expect(getSectionStyle(undefined, 'bio')).toEqual({})
  })

  it('returns empty object when no styleOverrides', () => {
    const settings: AdminSettings = {}
    expect(getSectionStyle(settings, 'bio')).toEqual({})
  })

  it('returns the override for a specific section', () => {
    const settings: AdminSettings = {
      sections: {
        styleOverrides: {
          bio: { bodyFontSize: 'text-xl', primaryColor: 'red' },
        },
      },
    }
    expect(getSectionStyle(settings, 'bio')).toEqual({ bodyFontSize: 'text-xl', primaryColor: 'red' })
  })

  it('returns empty object when section has no override', () => {
    const settings: AdminSettings = {
      sections: {
        styleOverrides: { bio: { bodyFontSize: 'text-xl' } },
      },
    }
    expect(getSectionStyle(settings, 'releases')).toEqual({})
  })
})

describe('getAdminValue', () => {
  it('returns undefined when settings is undefined', () => {
    expect(getAdminValue(undefined, 'labels.biography')).toBeUndefined()
  })

  it('retrieves a deeply nested value', () => {
    const settings: AdminSettings = { labels: { biography: 'MY BIO' } }
    expect(getAdminValue(settings, 'labels.biography')).toBe('MY BIO')
  })

  it('returns undefined for a missing path', () => {
    const settings: AdminSettings = {}
    expect(getAdminValue(settings, 'labels.biography')).toBeUndefined()
  })

  it('handles null settings', () => {
    expect(getAdminValue(null, 'labels.biography')).toBeUndefined()
  })

  it('retrieves triple-nested value', () => {
    const settings: AdminSettings = {
      design: { typography: { headingFontSize: '2rem' } },
    }
    expect(getAdminValue(settings, 'design.typography.headingFontSize')).toBe('2rem')
  })

  it('returns undefined when intermediate key is missing', () => {
    const settings: AdminSettings = {}
    expect(getAdminValue(settings, 'design.typography.headingFontSize')).toBeUndefined()
  })

  it('retrieves boolean value', () => {
    const settings: AdminSettings = { labels: { releaseShowType: true } }
    expect(getAdminValue(settings, 'labels.releaseShowType')).toBe(true)
  })

  it('retrieves numeric value', () => {
    const settings: AdminSettings = { sound: { backgroundMusicVolume: 0.7 } }
    expect(getAdminValue(settings, 'sound.backgroundMusicVolume')).toBe(0.7)
  })
})

describe('setAdminValue', () => {
  it('creates nested structure when setting a deeply nested path', () => {
    const result = setAdminValue(undefined, 'labels.biography', 'BIOGRAPHY')
    expect(result.labels?.biography).toBe('BIOGRAPHY')
  })

  it('merges with existing values', () => {
    const existing: AdminSettings = { labels: { releases: 'RELEASES' } }
    const result = setAdminValue(existing, 'labels.biography', 'BIO')
    expect(result.labels?.biography).toBe('BIO')
    expect(result.labels?.releases).toBe('RELEASES')
  })

  it('sets triple-nested value', () => {
    const result = setAdminValue(undefined, 'design.typography.headingFontSize', '3rem')
    expect(result.design?.typography?.headingFontSize).toBe('3rem')
  })

  it('preserves siblings when setting a nested value', () => {
    const existing: AdminSettings = {
      design: { typography: { headingFontSize: '2rem', bodyFontSize: '1rem' } },
    }
    const result = setAdminValue(existing, 'design.typography.headingFontSize', '3rem')
    expect(result.design?.typography?.headingFontSize).toBe('3rem')
    expect(result.design?.typography?.bodyFontSize).toBe('1rem')
  })

  it('creates intermediate objects as needed', () => {
    const result = setAdminValue(undefined, 'sound.backgroundMusicVolume', 0.5)
    expect(result.sound?.backgroundMusicVolume).toBe(0.5)
  })

  it('sets analytics enabled flag', () => {
    const result = setAdminValue(undefined, 'analytics.enabled', false)
    expect(result.analytics?.enabled).toBe(false)
  })

  it('does not mutate the original settings', () => {
    const original: AdminSettings = { labels: { biography: 'OLD' } }
    setAdminValue(original, 'labels.biography', 'NEW')
    expect(original.labels?.biography).toBe('OLD')
  })
})
