/**
 * Consent utility library — pure functions and a React hook for GDPR consent.
 *
 * Extracted from CookieConsent.tsx so that non-UI modules (e.g. use-app-state.ts)
 * can import consent helpers without creating a hook → component layer violation.
 *
 * The CookieConsent component remains the single place that writes consent to
 * localStorage and fires the custom DOM event; this module only reads and reacts.
 */

import { useState, useEffect } from 'react'

/** Bump this whenever the privacy policy or processing purposes change materially */
export const CONSENT_VERSION = 2
export const CONSENT_STORAGE_KEY = 'zd-cookie-consent'

export interface ConsentPreferences {
  essential: boolean  // Always true — technically necessary, no consent required
  analytics: boolean  // Optional — requires explicit opt-in
  timestamp: number   // Unix ms when consent was recorded
  version: number     // Consent schema version
}

// ─── localStorage helpers (synchronous, no API call needed) ──────────────────

export function readStoredConsent(): ConsentPreferences | null {
  try {
    const raw = localStorage.getItem(CONSENT_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as ConsentPreferences
    if (!parsed.version || parsed.version < CONSENT_VERSION) return null
    return parsed
  } catch {
    return null
  }
}

export function writeStoredConsent(prefs: ConsentPreferences): void {
  try {
    localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(prefs))
  } catch {
    // Storage unavailable — consent stays in memory only for this session
  }
}

export function removeStoredConsent(): void {
  try {
    localStorage.removeItem(CONSENT_STORAGE_KEY)
  } catch { /* ignore */ }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/** Synchronously read analytics consent from localStorage (safe to call outside React) */
export function getAnalyticsConsentSync(): boolean {
  return readStoredConsent()?.analytics === true
}

/** Expose a global event so other parts of the app can react to consent changes */
export function dispatchConsentEvent(prefs: ConsentPreferences): void {
  window.dispatchEvent(new CustomEvent('zd:consent-change', { detail: prefs }))
}

/**
 * Synchronously read full consent preferences (no async, no network call).
 * Returns null if no consent has been recorded yet.
 */
export function getConsentPreferencesAsync(): ConsentPreferences | null {
  return readStoredConsent()
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * React hook that reactively tracks analytics consent.
 * Updates when the user changes their preference (listens for zd:consent-change).
 */
export function useAnalyticsConsent(): boolean {
  const [hasConsent, setHasConsent] = useState<boolean>(() => getAnalyticsConsentSync())

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<ConsentPreferences>).detail
      setHasConsent(detail.analytics === true)
    }
    window.addEventListener('zd:consent-change', handler)
    return () => window.removeEventListener('zd:consent-change', handler)
  }, [])

  return hasConsent
}
