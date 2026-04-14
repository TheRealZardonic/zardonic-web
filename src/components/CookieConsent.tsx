/**
 * Cookie Consent Banner
 * GDPR/ePrivacy-compliant consent management.
 *
 * Design principles:
 * - Consent is stored in localStorage ONLY (no server-side call needed to check consent)
 * - Analytics tracking is blocked until explicit consent is given
 * - "Reject All" and "Accept All" have equal visual prominence (no dark patterns)
 * - Analytics is NOT pre-checked (opt-in, not opt-out)
 * - Consent is versioned; bumping CONSENT_VERSION will re-show the banner
 * - Users can revoke/change consent at any time via footer link
 */

import { useState, useEffect, useCallback } from 'react'
import type { CSSProperties } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { X, Shield } from '@phosphor-icons/react'
import { useLocale } from '@/contexts/LocaleContext'
import {
  CONSENT_VERSION,
  type ConsentPreferences,
  readStoredConsent,
  writeStoredConsent,
  removeStoredConsent,
  getAnalyticsConsentSync,
  dispatchConsentEvent,
  useAnalyticsConsent,
  getConsentPreferencesAsync,
} from '@/lib/consent'

// Re-export for consumers that import directly from this module
export type { ConsentPreferences }
// eslint-disable-next-line react-refresh/only-export-components
export { getAnalyticsConsentSync, dispatchConsentEvent, useAnalyticsConsent, getConsentPreferencesAsync }

interface CookieConsentProps {
  onPreferencesChange?: (preferences: ConsentPreferences) => void
  /** Called when user clicks the Privacy Policy link */
  onOpenPrivacyPolicy?: () => void
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CookieConsent({ onPreferencesChange, onOpenPrivacyPolicy }: CookieConsentProps) {
  const { t } = useLocale()
  const [showBanner, setShowBanner] = useState(false)
  const [showDetails, setShowDetails] = useState(false)
  // Analytics starts UNCHECKED — opt-in, never opt-out
  const [analyticsChecked, setAnalyticsChecked] = useState(false)

  useEffect(() => {
    const stored = readStoredConsent()
    if (stored) {
      onPreferencesChange?.(stored)
      dispatchConsentEvent(stored)
    } else {
      // Show banner after a short delay so the page can render first
      const timer = setTimeout(() => setShowBanner(true), 800)
      return () => clearTimeout(timer)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const saveConsent = useCallback((prefs: ConsentPreferences) => {
    writeStoredConsent(prefs)
    setShowBanner(false)
    setShowDetails(false)
    onPreferencesChange?.(prefs)
    dispatchConsentEvent(prefs)
  }, [onPreferencesChange])

  const handleAcceptAll = useCallback(() => {
    saveConsent({ essential: true, analytics: true, timestamp: Date.now(), version: CONSENT_VERSION })
  }, [saveConsent])

  const handleRejectAll = useCallback(() => {
    saveConsent({ essential: true, analytics: false, timestamp: Date.now(), version: CONSENT_VERSION })
  }, [saveConsent])

  const handleSaveCustom = useCallback(() => {
    saveConsent({ essential: true, analytics: analyticsChecked, timestamp: Date.now(), version: CONSENT_VERSION })
  }, [saveConsent, analyticsChecked])

  return (
    <AnimatePresence>
      {showBanner && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-labelledby="cookie-banner-title"
          className="fixed bottom-0 left-0 right-0 bg-background/98 backdrop-blur-lg border-t-2 border-primary/30 p-4 md:p-6 shadow-2xl"
          style={{ zIndex: 'var(--z-system)' } as CSSProperties}
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="container mx-auto max-w-5xl">
            {!showDetails ? (
              // ── Simple banner ──────────────────────────────────────────────
              <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <Shield size={20} className="text-primary shrink-0 mt-0.5" weight="bold" />
                  <div className="space-y-1 min-w-0">
                    <h3 id="cookie-banner-title" className="text-sm font-bold text-primary font-mono">
                      {t('cookie.title')}
                    </h3>
                    <p className="text-xs text-muted-foreground font-mono leading-relaxed">
                      {t('cookie.bannerText')}{' '}
                      {onOpenPrivacyPolicy && (
                        <button
                          onClick={onOpenPrivacyPolicy}
                          className="text-primary hover:underline focus:underline focus:outline-none"
                        >
                          {t('cookie.privacyPolicyLink')}
                        </button>
                      )}
                    </p>
                  </div>
                </div>
                {/* Buttons: Reject (outline) and Accept (filled) have equal size — no dark patterns */}
                <div className="flex flex-wrap gap-2 shrink-0">
                  <Button
                    onClick={handleRejectAll}
                    variant="outline"
                    size="sm"
                    className="font-mono"
                  >
                    {t('cookie.rejectAll')}
                  </Button>
                  <Button
                    onClick={() => setShowDetails(true)}
                    variant="ghost"
                    size="sm"
                    className="font-mono"
                  >
                    {t('cookie.customize')}
                  </Button>
                  <Button
                    onClick={handleAcceptAll}
                    size="sm"
                    className="font-mono"
                  >
                    {t('cookie.acceptAll')}
                  </Button>
                </div>
              </div>
            ) : (
              // ── Detailed preferences ───────────────────────────────────────
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 id="cookie-banner-title" className="text-base font-bold text-primary font-mono">
                    {t('cookie.privacyPrefs')}
                  </h3>
                  <button
                    onClick={() => setShowDetails(false)}
                    className="text-primary/60 hover:text-primary focus:outline-none focus:text-primary"
                    aria-label={t('cookie.closeDetails')}
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="space-y-3">
                  {/* Essential — always enabled, no toggle */}
                  <div className="bg-card border border-primary/20 p-4 rounded">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <h4 className="font-bold text-foreground mb-1 font-mono text-sm">
                          {t('cookie.essentialLabel')}
                        </h4>
                        <p className="text-xs text-muted-foreground font-mono">
                          {t('cookie.essentialDesc')}
                        </p>
                      </div>
                      <span className="text-xs text-primary font-mono font-bold shrink-0" aria-label="Always enabled">
                        {t('cookie.alwaysOn')}
                      </span>
                    </div>
                  </div>

                  {/* Analytics — opt-in, starts unchecked */}
                  <div className="bg-card border border-primary/20 p-4 rounded">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <h4 className="font-bold text-foreground mb-1 font-mono text-sm">
                          {t('cookie.analyticsLabel')}
                        </h4>
                        <p className="text-xs text-muted-foreground font-mono">
                          {t('cookie.analyticsDesc')}
                        </p>
                        <p className="text-xs text-muted-foreground/60 font-mono mt-1">
                          {t('cookie.analyticsBasis')}
                        </p>
                      </div>
                      <label className="flex items-center gap-2 cursor-pointer shrink-0">
                        <input
                          type="checkbox"
                          checked={analyticsChecked}
                          onChange={(e) => setAnalyticsChecked(e.target.checked)}
                          className="w-4 h-4 rounded border-primary/30 bg-background text-primary focus:ring-2 focus:ring-primary cursor-pointer"
                          aria-label={t('cookie.analyticsLabel')}
                        />
                        <span className="text-xs font-mono select-none">
                          {analyticsChecked ? t('cookie.on') : t('cookie.off')}
                        </span>
                      </label>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                  <p className="text-xs text-muted-foreground font-mono">
                    {onOpenPrivacyPolicy && (
                      <button
                        onClick={onOpenPrivacyPolicy}
                        className="text-primary hover:underline focus:underline focus:outline-none"
                      >
                        {t('cookie.privacyPolicyLink')}
                      </button>
                    )}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button onClick={handleRejectAll} variant="ghost" size="sm" className="font-mono">
                      {t('cookie.rejectAll')}
                    </Button>
                    <Button onClick={handleSaveCustom} variant="outline" size="sm" className="font-mono">
                      {t('cookie.savePrefs')}
                    </Button>
                    <Button onClick={handleAcceptAll} size="sm" className="font-mono">
                      {t('cookie.acceptAll')}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ─── Revoke banner ────────────────────────────────────────────────────────────

interface CookiePreferencesButtonProps {
  onPreferencesChange?: (preferences: ConsentPreferences) => void
  onOpenPrivacyPolicy?: () => void
  className?: string
}

/**
 * Small button that re-opens the cookie preferences banner.
 * Place in footer for GDPR revocation requirement.
 */
export function CookiePreferencesButton({ onPreferencesChange, onOpenPrivacyPolicy, className }: CookiePreferencesButtonProps) {
  const { t } = useLocale()
  const [showBanner, setShowBanner] = useState(false)

  const handleOpen = useCallback(() => {
    removeStoredConsent()
    setShowBanner(true)
  }, [])

  return (
    <>
      <button
        onClick={handleOpen}
        className={className ?? 'text-sm text-muted-foreground hover:text-primary transition-colors uppercase tracking-wide font-mono hover-chromatic cursor-pointer'}
      >
        {t('cookie.managePrefs')}
      </button>
      {showBanner && (
        <CookieConsent
          onPreferencesChange={(prefs) => {
            setShowBanner(false)
            onPreferencesChange?.(prefs)
          }}
          onOpenPrivacyPolicy={onOpenPrivacyPolicy}
        />
      )}
    </>
  )
}
