import { describe, it, expect } from 'vitest'
import type { DecorativeTexts, AdminSettings } from '@/lib/types'

describe('DecorativeTexts type', () => {
  it('can be constructed with all overlay fields', () => {
    const texts: DecorativeTexts = {
      overlaySystemLabel: '// SYSTEM.NET',
      gigDataStreamLabel: '// EVENT.DATA',
      gigStatusPrefix: '// STATUS:',
      contactStreamLabel: '// CONTACT',
      contactFormLabel: '// FORM',
      contactStatusLabel: '// ACTIVE',
      privacyStreamLabel: '// PRIVACY',
      privacyStatusLabel: '// ACTIVE',
      impressumStreamLabel: '// LEGAL',
      impressumStatusLabel: '// ACTIVE',
      memberProfileLabel: '// PROFILE',
    }
    expect(texts.overlaySystemLabel).toBe('// SYSTEM.NET')
    expect(texts.memberProfileLabel).toBe('// PROFILE')
  })

  it('can be constructed with HUD fields', () => {
    const texts: DecorativeTexts = {
      hudTimeLabel: 'TIME:',
      hudSessionLabel: 'SID:',
      hudUptimeLabel: 'UP:',
      hudSectorLabel: 'ZONE:',
      hudDataRateLabel: 'RATE:',
    }
    expect(texts.hudTimeLabel).toBe('TIME:')
    expect(texts.hudDataRateLabel).toBe('RATE:')
  })

  it('can be constructed with loader fields', () => {
    const texts: DecorativeTexts = {
      loaderBuildInfo: 'BUILD: {session.build}',
      loaderPlatformInfo: 'PLATFORM: {session.platform}',
      loaderConnectionStatus: '{session.connection}',
    }
    expect(texts.loaderBuildInfo).toBe('BUILD: {session.build}')
  })

  it('is optional on AdminSettings', () => {
    const settings: AdminSettings = {}
    expect(settings.decorativeTexts).toBeUndefined()
  })

  it('can be set on AdminSettings', () => {
    const settings: AdminSettings = {
      decorativeTexts: {
        overlaySystemLabel: '// TEST',
        hudTimeLabel: 'CLOCK:',
      },
    }
    expect(settings.decorativeTexts?.overlaySystemLabel).toBe('// TEST')
    expect(settings.decorativeTexts?.hudTimeLabel).toBe('CLOCK:')
  })
})
