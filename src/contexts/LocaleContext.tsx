import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react'
import { type Locale, t as translate, LOCALES } from '@/lib/i18n'

export type { Locale }
export { LOCALES }

interface LocaleContextValue {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: (key: string) => string
}

const LocaleContext = createContext<LocaleContextValue | null>(null)

const STORAGE_KEY = 'zd-locale'

function detectLocale(): Locale {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    const supported = LOCALES.map(l => l.code)
    if (stored && (supported as string[]).includes(stored)) return stored as Locale
  } catch {
    // localStorage unavailable
  }
  return 'en'
}

export function LocaleProvider({
  children,
  customTranslations,
}: {
  children: ReactNode
  customTranslations?: Record<string, Record<string, string>>
}) {
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
    (key: string) => {
      const custom = customTranslations?.[key]?.[locale]
      if (custom !== undefined && custom !== '') return custom
      return translate(key, locale)
    },
    [locale, customTranslations],
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
