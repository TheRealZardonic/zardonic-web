import { useLocale } from '@/contexts/LocaleContext'
import { LOCALES } from '@/lib/i18n'
import type { Locale } from '@/lib/i18n'

export default function LanguageSwitcher({ className }: { className?: string }) {
  const { locale, setLocale } = useLocale()

  return (
    <select
      value={locale}
      onChange={e => setLocale(e.target.value as Locale)}
      className={`bg-transparent border border-border/40 rounded px-1 py-0.5 font-mono text-xs text-muted-foreground hover:text-primary hover:border-primary/60 transition-colors cursor-pointer ${className ?? ''}`}
      aria-label="Select language"
    >
      {LOCALES.map(l => (
        <option key={l.code} value={l.code}>{l.flag} {l.label}</option>
      ))}
    </select>
  )
}
