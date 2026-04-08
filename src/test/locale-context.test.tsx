import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { LocaleProvider, useLocale } from '@/contexts/LocaleContext'
import type { Locale } from '@/lib/i18n'

function TestConsumer() {
  const { locale, setLocale, t } = useLocale()
  return (
    <div>
      <span data-testid="locale">{locale}</span>
      <span data-testid="translated">{t('footer.admin')}</span>
      <button onClick={() => setLocale('de')} data-testid="switch-de">DE</button>
      <button onClick={() => setLocale('en')} data-testid="switch-en">EN</button>
      <button onClick={() => setLocale('ru')} data-testid="switch-ru">RU</button>
      <button onClick={() => setLocale('ja')} data-testid="switch-ja">JA</button>
      <button onClick={() => setLocale('ko')} data-testid="switch-ko">KO</button>
    </div>
  )
}

function CustomTranslationConsumer() {
  const { t } = useLocale()
  return <span data-testid="custom">{t('footer.admin')}</span>
}

describe('LocaleContext', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('should provide default locale (en)', () => {
    render(
      <LocaleProvider>
        <TestConsumer />
      </LocaleProvider>
    )
    expect(screen.getByTestId('locale').textContent).toBe('en')
  })

  it('should translate strings via t()', () => {
    render(
      <LocaleProvider>
        <TestConsumer />
      </LocaleProvider>
    )
    expect(screen.getByTestId('translated').textContent).toBe('ADMIN')
  })

  it('should switch locale to German', () => {
    render(
      <LocaleProvider>
        <TestConsumer />
      </LocaleProvider>
    )

    fireEvent.click(screen.getByTestId('switch-de'))
    expect(screen.getByTestId('locale').textContent).toBe('de')
    expect(screen.getByTestId('translated').textContent).toBe('ADMIN')
  })

  it('should persist locale in localStorage', () => {
    render(
      <LocaleProvider>
        <TestConsumer />
      </LocaleProvider>
    )

    fireEvent.click(screen.getByTestId('switch-de'))
    expect(localStorage.getItem('zd-locale')).toBe('de')
  })

  it('should restore locale from localStorage', () => {
    localStorage.setItem('zd-locale', 'de')
    render(
      <LocaleProvider>
        <TestConsumer />
      </LocaleProvider>
    )
    expect(screen.getByTestId('locale').textContent).toBe('de')
  })

  it('should throw when useLocale is used outside provider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    try {
      expect(() => render(<TestConsumer />)).toThrow(
        'useLocale must be used within a LocaleProvider'
      )
    } finally {
      spy.mockRestore()
    }
  })

  it('should switch to all 8 locales', () => {
    const locales: Locale[] = ['en', 'de', 'ru', 'it', 'es', 'pt', 'ja', 'ko']
    for (const locale of locales) {
      localStorage.setItem('zd-locale', locale)
      const { unmount } = render(
        <LocaleProvider>
          <TestConsumer />
        </LocaleProvider>
      )
      expect(screen.getByTestId('locale').textContent).toBe(locale)
      unmount()
    }
  })

  it('should restore all supported locales from localStorage', () => {
    const locales: Locale[] = ['en', 'de', 'ru', 'it', 'es', 'pt', 'ja', 'ko']
    for (const locale of locales) {
      localStorage.setItem('zd-locale', locale)
      const { unmount } = render(
        <LocaleProvider>
          <TestConsumer />
        </LocaleProvider>
      )
      expect(screen.getByTestId('locale').textContent).toBe(locale)
      unmount()
    }
  })

  it('should use customTranslations override', () => {
    const customTranslations = { 'footer.admin': { en: 'CUSTOM_ADMIN' } }
    render(
      <LocaleProvider customTranslations={customTranslations}>
        <CustomTranslationConsumer />
      </LocaleProvider>
    )
    expect(screen.getByTestId('custom').textContent).toBe('CUSTOM_ADMIN')
  })

  it('should fall back to default translation when customTranslations has no entry for key', () => {
    const customTranslations = { 'other.key': { en: 'OTHER' } }
    render(
      <LocaleProvider customTranslations={customTranslations}>
        <CustomTranslationConsumer />
      </LocaleProvider>
    )
    expect(screen.getByTestId('custom').textContent).toBe('ADMIN')
  })
})
