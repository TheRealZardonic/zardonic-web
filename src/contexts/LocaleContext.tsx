import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react'
import { type Locale, t as translate } from '@/lib/i18n'

interface LocaleContextValue {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: (key: string) => string
}

const LocaleContext = createContext<LocaleContextValue | null>(null)

const STORAGE_KEY = 'nk-locale'

function detectLocale(): Locale {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'en' || stored === 'de') return stored
  } catch {
    // localStorage unavailable
  }

  if (typeof navigator !== 'undefined' && navigator.language?.startsWith('de')) {
    return 'de'
  }

  return 'en'
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(detectLocale)

  useEffect(() => {
    document.documentElement.lang = locale
  }, [locale])

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale)
    try {
      localStorage.setItem(STORAGE_KEY, newLocale)
    } catch {
      // localStorage unavailable
    }
  }, [])

  const t = useCallback(
    (key: string) => translate(key, locale),
    [locale],
  )

  return (
    <LocaleContext value={{ locale, setLocale, t }}>
      {children}
    </LocaleContext>
  )
}

export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext)
  if (!ctx) throw new Error('useLocale must be used within a LocaleProvider')
  return ctx
}
