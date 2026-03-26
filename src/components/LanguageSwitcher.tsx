import { useLocale } from '@/contexts/LocaleContext'

export default function LanguageSwitcher({ className }: { className?: string }) {
  const { locale, setLocale } = useLocale()

  return (
    <button
      onClick={() => setLocale(locale === 'en' ? 'de' : 'en')}
      className={`inline-flex items-center gap-1 text-xs md:text-xs text-muted-foreground/50 hover:text-primary/80 transition-colors font-mono uppercase tracking-wider ${className ?? ''}`}
      aria-label={locale === 'en' ? 'Switch to German' : 'Auf Englisch wechseln'}
      title={locale === 'en' ? 'Deutsch' : 'English'}
    >
      <span className={locale === 'en' ? 'text-primary' : 'opacity-50'}>EN</span>
      <span className="text-muted-foreground/30">/</span>
      <span className={locale === 'de' ? 'text-primary' : 'opacity-50'}>DE</span>
    </button>
  )
}
