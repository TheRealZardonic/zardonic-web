import React from 'react'
import LanguageSwitcher from '@/components/LanguageSwitcher'
import { Lock } from '@phosphor-icons/react'
import { useLocale } from '@/contexts/LocaleContext'
import { CookiePreferencesButton } from '@/components/CookieConsent'

interface AppFooterProps {
  artistName: string
  isOwner: boolean
  hasPassword: boolean
  setShowLoginDialog: (v: boolean) => void
  setShowSetupDialog: (v: boolean) => void
  setCyberpunkOverlay: (overlay: { type: 'impressum' | 'privacy' | 'contact' } | null) => void
}

export default function AppFooter({
  artistName,
  isOwner,
  hasPassword,
  setShowLoginDialog,
  setShowSetupDialog,
  setCyberpunkOverlay,
}: AppFooterProps) {
  const { setLocale } = useLocale()
  return (
    <footer className="py-12 px-4 border-t border-border noise-effect" data-theme-color="border muted-foreground">
      <div className="container mx-auto text-center space-y-4">
        <div className="flex justify-center gap-6 flex-wrap">
          <button
            onClick={() => {
              setLocale('en')
              setCyberpunkOverlay({ type: 'impressum' })
            }}
            className="text-sm text-muted-foreground hover:text-primary transition-colors uppercase tracking-wide font-mono hover-chromatic cursor-pointer"
          >
            Impressum
          </button>
          <button
            onClick={() => {
              setLocale('en')
              setCyberpunkOverlay({ type: 'privacy' })
            }}
            className="text-sm text-muted-foreground hover:text-primary transition-colors uppercase tracking-wide font-mono hover-chromatic cursor-pointer"
          >
            Privacy Policy / Datenschutz-erklärung
          </button>
          <button
            onClick={() => setCyberpunkOverlay({ type: 'contact' })}
            className="text-sm text-muted-foreground hover:text-primary transition-colors uppercase tracking-wide font-mono hover-chromatic cursor-pointer"
          >
            Contact
          </button>
          {/* GDPR revocation link — users must be able to change consent at any time */}
          <CookiePreferencesButton
            onOpenPrivacyPolicy={() => setCyberpunkOverlay({ type: 'privacy' })}
          />
          {!isOwner && (
            <button
              onClick={() => hasPassword ? setShowLoginDialog(true) : setShowSetupDialog(true)}
              className="text-sm text-muted-foreground/40 hover:text-primary/60 transition-colors font-mono cursor-pointer"
              title="Admin"
            >
              <Lock size={14} />
            </button>
          )}
          <LanguageSwitcher />
        </div>
        <p className="text-sm text-muted-foreground uppercase tracking-wide font-mono hover-chromatic">
          © {new Date().getFullYear()} {artistName}
        </p>
      </div>
    </footer>
  )
}
