import { describe, it, expect } from 'vitest'
import { t, getTranslations, LOCALES, type Locale } from '@/lib/i18n'

describe('i18n translation utility', () => {
  it('should return English translation for known key', () => {
    expect(t('footer.admin', 'en')).toBe('ADMIN')
  })

  it('should return German translation for known key', () => {
    expect(t('footer.admin', 'de')).toBe('ADMIN')
  })

  it('should return English for footer.datenschutz', () => {
    expect(t('footer.datenschutz', 'en')).toBe('PRIVACY POLICY')
  })

  it('should return German for footer.datenschutz', () => {
    expect(t('footer.datenschutz', 'de')).toBe('DATENSCHUTZ')
  })

  it('should return the key itself for an unknown key', () => {
    expect(t('nonexistent.key', 'en')).toBe('nonexistent.key')
  })

  it('should fall back to English when German translation is missing for unknown key', () => {
    expect(t('nonexistent.key', 'de')).toBe('nonexistent.key')
  })

  it('should translate contact section keys', () => {
    expect(t('contact.defaultTitle', 'en')).toBe('CONTACT')
    expect(t('contact.defaultTitle', 'de')).toBe('KONTAKT')
    expect(t('contact.send', 'en')).toBe('SEND MESSAGE')
    expect(t('contact.send', 'de')).toBe('NACHRICHT SENDEN')
  })

  it('should translate navigation keys', () => {
    expect(t('nav.home', 'en')).toBe('HOME')
    expect(t('nav.home', 'de')).toBe('STARTSEITE')
    expect(t('nav.gigs', 'en')).toBe('GIGS')
    expect(t('nav.gigs', 'de')).toBe('AUFTRITTE')
  })

  it('should translate cookie banner keys', () => {
    expect(t('cookie.accept', 'en')).toBe('ACCEPT')
    expect(t('cookie.accept', 'de')).toBe('AKZEPTIEREN')
    expect(t('cookie.decline', 'en')).toBe('DECLINE')
    expect(t('cookie.decline', 'de')).toBe('ABLEHNEN')
  })

  it('should translate newsletter keys', () => {
    expect(t('newsletter.subscribe', 'en')).toBe('SUBSCRIBE')
    expect(t('newsletter.subscribe', 'de')).toBe('ABONNIEREN')
  })

  it('should translate edit controls keys', () => {
    expect(t('edit.inbox', 'en')).toBe('INBOX')
    expect(t('edit.inbox', 'de')).toBe('POSTFACH')
    expect(t('edit.subscribers', 'en')).toBe('SUBSCRIBERS')
    expect(t('edit.subscribers', 'de')).toBe('ABONNENTEN')
  })

  it('should handle all 8 locales as Locale type', () => {
    const locales: Locale[] = ['en', 'de', 'ru', 'it', 'es', 'pt', 'ja', 'ko']
    for (const locale of locales) {
      expect(typeof t('footer.admin', locale)).toBe('string')
    }
  })

  it('should have footer.admin translation for all 8 locales', () => {
    const locales: Locale[] = ['en', 'de', 'ru', 'it', 'es', 'pt', 'ja', 'ko']
    for (const locale of locales) {
      const result = t('footer.admin', locale)
      expect(result).toBeTruthy()
      expect(result).not.toBe('footer.admin')
    }
  })

  it('should have non-empty translations for all keys in all locales', () => {
    const all = getTranslations()
    const locales: Locale[] = ['en', 'de', 'ru', 'it', 'es', 'pt', 'ja', 'ko']
    for (const [key, langs] of Object.entries(all)) {
      for (const locale of locales) {
        const val = langs[locale]
        expect(val, `key "${key}" missing for locale "${locale}"`).toBeTruthy()
        expect(typeof val).toBe('string')
      }
    }
  })

  it('should translate new gigs keys', () => {
    expect(t('gigs.sync', 'en')).toBe('Sync Gigs')
    expect(t('gigs.showLess', 'en')).toBe('Show Less')
    expect(t('gigs.seeMore', 'en')).toBe('See More')
    expect(t('gigs.support', 'en')).toBe('Support:')
  })

  it('should translate new releases keys', () => {
    expect(t('releases.syncAndEnrich', 'en')).toBe('Sync & Enrich')
    expect(t('releases.showLess', 'en')).toBe('Show Less')
    expect(t('releases.showAll', 'en')).toBe('Show All')
  })

  it('should translate new cookie keys', () => {
    expect(t('cookie.title', 'en')).toBe('🍪 PRIVACY & DATA')
    expect(t('cookie.acceptAll', 'en')).toBe('Accept All')
    expect(t('cookie.essentialOnly', 'en')).toBe('Essential Only')
  })

  it('getTranslations() should return all keys', () => {
    const all = getTranslations()
    expect(typeof all).toBe('object')
    expect(Object.keys(all).length).toBeGreaterThan(130)
    expect(all['footer.admin']).toBeDefined()
    expect(all['footer.admin']['en']).toBe('ADMIN')
  })

  it('getTranslations() should return a deep copy', () => {
    const a = getTranslations()
    const b = getTranslations()
    expect(a).not.toBe(b)
    a['footer.admin']['en'] = 'MUTATED'
    expect(b['footer.admin']['en']).toBe('ADMIN')
  })

  it('LOCALES should contain 8 entries', () => {
    expect(LOCALES.length).toBe(8)
    const codes = LOCALES.map(l => l.code)
    expect(codes).toContain('en')
    expect(codes).toContain('de')
    expect(codes).toContain('ru')
    expect(codes).toContain('ja')
    expect(codes).toContain('ko')
  })
})
