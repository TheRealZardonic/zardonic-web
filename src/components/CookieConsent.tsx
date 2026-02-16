/**
 * Cookie Consent Banner
 * GDPR-compliant consent management
 */

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { X } from '@phosphor-icons/react'

const CONSENT_KEY = 'zardonic-cookie-consent'

interface ConsentPreferences {
  essential: boolean // Always true, can't be disabled
  analytics: boolean
  timestamp: number
}

interface CookieConsentProps {
  onPreferencesChange?: (preferences: ConsentPreferences) => void
}

export function CookieConsent({ onPreferencesChange }: CookieConsentProps) {
  const [showBanner, setShowBanner] = useState(false)
  const [showDetails, setShowDetails] = useState(false)
  const [preferences, setPreferences] = useState<ConsentPreferences>({
    essential: true,
    analytics: true,
    timestamp: Date.now(),
  })

  useEffect(() => {
    // Check if user has already consented
    const stored = localStorage.getItem(CONSENT_KEY)
    if (!stored) {
      // Show banner after a short delay
      setTimeout(() => setShowBanner(true), 1000)
    } else {
      try {
        const prefs = JSON.parse(stored) as ConsentPreferences
        setPreferences(prefs)
        onPreferencesChange?.(prefs)
      } catch {
        // Invalid stored data, show banner
        setShowBanner(true)
      }
    }
  }, [onPreferencesChange])

  const saveConsent = (prefs: ConsentPreferences) => {
    localStorage.setItem(CONSENT_KEY, JSON.stringify(prefs))
    setPreferences(prefs)
    setShowBanner(false)
    setShowDetails(false)
    onPreferencesChange?.(prefs)
  }

  const acceptAll = () => {
    saveConsent({
      essential: true,
      analytics: true,
      timestamp: Date.now(),
    })
  }

  const rejectOptional = () => {
    saveConsent({
      essential: true,
      analytics: false,
      timestamp: Date.now(),
    })
  }

  const saveCustom = () => {
    saveConsent({
      ...preferences,
      timestamp: Date.now(),
    })
  }

  return (
    <AnimatePresence>
      {showBanner && (
        <motion.div
          className="fixed bottom-0 left-0 right-0 z-[9999] bg-background/98 backdrop-blur-lg border-t-2 border-primary/30 p-4 md:p-6"
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="container mx-auto max-w-6xl">
            {!showDetails ? (
              // Simple banner
              <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
                <div className="flex-1 space-y-2">
                  <h3 className="text-lg font-bold text-primary font-mono">
                    🍪 COOKIE & DATA NOTICE
                  </h3>
                  <p className="text-sm text-muted-foreground font-mono">
                    We use browser storage to analyze site usage and improve your experience. 
                    Your data is processed anonymously and stored securely. No third-party tracking cookies are used.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    onClick={acceptAll}
                    size="sm"
                    className="font-mono"
                  >
                    Accept All
                  </Button>
                  <Button
                    onClick={rejectOptional}
                    variant="outline"
                    size="sm"
                    className="font-mono"
                  >
                    Essential Only
                  </Button>
                  <Button
                    onClick={() => setShowDetails(true)}
                    variant="ghost"
                    size="sm"
                    className="font-mono"
                  >
                    Customize
                  </Button>
                </div>
              </div>
            ) : (
              // Detailed preferences
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-primary font-mono">
                    PRIVACY PREFERENCES
                  </h3>
                  <button
                    onClick={() => setShowDetails(false)}
                    className="text-primary/60 hover:text-primary"
                    aria-label="Close details"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="space-y-3">
                  {/* Essential */}
                  <div className="bg-card border border-primary/20 p-4 rounded">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <h4 className="font-bold text-foreground mb-1 font-mono text-sm">
                          Essential Data
                        </h4>
                        <p className="text-xs text-muted-foreground font-mono">
                          Required for the website to function. Includes your preferences and admin session (if logged in).
                          Cannot be disabled.
                        </p>
                      </div>
                      <div className="text-xs text-primary font-mono font-bold">
                        ALWAYS ON
                      </div>
                    </div>
                  </div>

                  {/* Analytics */}
                  <div className="bg-card border border-primary/20 p-4 rounded">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <h4 className="font-bold text-foreground mb-1 font-mono text-sm">
                          Analytics
                        </h4>
                        <p className="text-xs text-muted-foreground font-mono">
                          Anonymous usage statistics to understand how visitors interact with the site. 
                          Includes page views, clicks, device type, and approximate location (timezone-based).
                        </p>
                      </div>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={preferences.analytics}
                          onChange={(e) =>
                            setPreferences((prev) => ({
                              ...prev,
                              analytics: e.target.checked,
                            }))
                          }
                          className="w-5 h-5 rounded border-primary/30 bg-background text-primary focus:ring-2 focus:ring-primary cursor-pointer"
                        />
                        <span className="text-xs font-mono">
                          {preferences.analytics ? 'ON' : 'OFF'}
                        </span>
                      </label>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 pt-2">
                  <Button onClick={saveCustom} size="sm" className="font-mono">
                    Save Preferences
                  </Button>
                  <Button
                    onClick={acceptAll}
                    variant="outline"
                    size="sm"
                    className="font-mono"
                  >
                    Accept All
                  </Button>
                  <Button
                    onClick={rejectOptional}
                    variant="ghost"
                    size="sm"
                    className="font-mono"
                  >
                    Essential Only
                  </Button>
                </div>

                <p className="text-xs text-muted-foreground font-mono">
                  For more information, see our{' '}
                  <button className="text-primary hover:underline">
                    Privacy Policy
                  </button>
                  . You can change your preferences at any time in the admin settings.
                </p>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/**
 * Hook to check if analytics consent has been given
 */
export function useAnalyticsConsent(): boolean {
  const [hasConsent, setHasConsent] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem(CONSENT_KEY)
    if (stored) {
      try {
        const prefs = JSON.parse(stored) as ConsentPreferences
        setHasConsent(prefs.analytics)
      } catch {
        setHasConsent(false)
      }
    }
  }, [])

  return hasConsent
}

/**
 * Function to get current consent preferences
 */
export function getConsentPreferences(): ConsentPreferences | null {
  const stored = localStorage.getItem(CONSENT_KEY)
  if (!stored) return null

  try {
    return JSON.parse(stored) as ConsentPreferences
  } catch {
    return null
  }
}
