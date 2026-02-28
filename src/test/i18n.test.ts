import { describe, it, expect } from 'vitest'
import { t, type Locale } from '@/lib/i18n'

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

  it('should handle all locales as Locale type', () => {
    const locales: Locale[] = ['en', 'de']
    for (const locale of locales) {
      expect(typeof t('footer.admin', locale)).toBe('string')
    }
  })
})
