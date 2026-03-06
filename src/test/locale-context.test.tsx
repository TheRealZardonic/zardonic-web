import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { LocaleProvider, useLocale } from '@/contexts/LocaleContext'

function TestConsumer() {
  const { locale, setLocale, t } = useLocale()
  return (
    <div>
      <span data-testid="locale">{locale}</span>
      <span data-testid="translated">{t('footer.admin')}</span>
      <button onClick={() => setLocale('de')} data-testid="switch-de">DE</button>
      <button onClick={() => setLocale('en')} data-testid="switch-en">EN</button>
    </div>
  )
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
})
