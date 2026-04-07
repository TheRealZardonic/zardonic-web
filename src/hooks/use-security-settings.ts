/**
 * @file use-security-settings.ts
 *
 * Custom hook for loading and persisting security settings via the
 * `/api/security-settings` BFF endpoint.
 *
 * WHY a dedicated hook: Previously all fetch/save logic was inlined in the
 * 1 155-line `SecuritySettingsDialog.tsx` UI component, violating the
 * Separation of Concerns principle (ISO/IEC 25010). Extracting it here makes
 * the logic independently testable, reusable, and keeps the UI component
 * purely presentational.
 *
 * The hook follows the same pattern as `useSetupWizard` (extracted in ADR-001)
 * to maintain architectural consistency across the codebase.
 *
 * Architecture Decision: see .github/ARCHITECTURE.md → ADR-004.
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import { toast } from 'sonner'
import { useLocale } from '@/hooks/use-locale'
import { t } from '@/lib/i18n-security'
import {
  DEFAULT_SECURITY_SETTINGS,
  type SecuritySettings,
} from '@/lib/security-settings-types'

// ─── Constants ────────────────────────────────────────────────────────────────

/**
 * Number of boolean toggles counted as "active modules" for the security
 * level indicator. Update when adding new module toggles to `SecuritySettings`.
 */
export const TOTAL_MODULES = 14

/** Threshold above which the security level is shown as HIGH. */
export const SECURITY_LEVEL_HIGH_THRESHOLD = 9

/** Threshold above which the security level is shown as MEDIUM. */
export const SECURITY_LEVEL_MEDIUM_THRESHOLD = 6

/** Boolean keys of `SecuritySettings` that count towards the active-module tally. */
const ACTIVE_MODULE_KEYS: ReadonlyArray<keyof SecuritySettings> = [
  'underAttackMode',
  'honeytokensEnabled',
  'rateLimitEnabled',
  'robotsTrapEnabled',
  'entropyInjectionEnabled',
  'suspiciousUaBlockingEnabled',
  'sessionBindingEnabled',
  'threatScoringEnabled',
  'hardBlockEnabled',
  'zipBombEnabled',
  'alertingEnabled',
  'sqlBackfireEnabled',
  'canaryDocumentsEnabled',
  'logPoisoningEnabled',
] as const

// ─── Hook types ───────────────────────────────────────────────────────────────

/** State slice returned by `useSecuritySettings`. */
export interface SecuritySettingsState {
  settings: SecuritySettings
  loading: boolean
  saving: boolean
  error: string | null
  activeModules: number
}

/** Action handlers returned by `useSecuritySettings`. */
export interface SecuritySettingsActions {
  /** Update a single setting field immutably. */
  update: <K extends keyof SecuritySettings>(key: K, value: SecuritySettings[K]) => void
  /** Persist current settings to `/api/security-settings`. */
  handleSave: () => Promise<void>
  /** Reset the form to `DEFAULT_SECURITY_SETTINGS` (does not auto-save). */
  handleReset: () => void
  /** Download current settings as a JSON file. */
  handleExportJson: () => void
}

/** Full return type of `useSecuritySettings`. */
export type UseSecuritySettingsReturn = SecuritySettingsState & SecuritySettingsActions

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Fetches security settings from `/api/security-settings` on mount and provides
 * typed handlers for updating, saving, resetting, and exporting them.
 *
 * @param open - When `false` the fetch is skipped, deferring the API call until
 *               the dialog is actually opened (lazy load pattern).
 * @returns Combined state and action object.
 *
 * @example
 * ```tsx
 * const { settings, loading, update, handleSave } = useSecuritySettings(open)
 * ```
 */
export function useSecuritySettings(open: boolean): UseSecuritySettingsReturn {
  const [settings, setSettings] = useState<SecuritySettings>(DEFAULT_SECURITY_SETTINGS)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { locale } = useLocale()

  // ── Fetch settings from the API on dialog open ───────────────────────────

  useEffect(() => {
    if (!open) return
    setLoading(true)
    setError(null)

    fetch('/api/security-settings', { credentials: 'same-origin' })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json() as Promise<{ settings: Partial<SecuritySettings> }>
      })
      .then((data) => {
        setSettings({ ...DEFAULT_SECURITY_SETTINGS, ...data.settings })
      })
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : String(err)
        setError(message)
      })
      .finally(() => {
        setLoading(false)
      })
  }, [open])

  // ── Immutable update helper ───────────────────────────────────────────────

  /**
   * Updates a single setting key without mutating the existing settings object.
   * Uses a functional state update to avoid stale closures.
   */
  const update = useCallback(
    <K extends keyof SecuritySettings>(key: K, value: SecuritySettings[K]) => {
      setSettings((prev) => ({ ...prev, [key]: value }))
    },
    [],
  )

  // ── Save to API ───────────────────────────────────────────────────────────

  /**
   * POSTs the current settings to `/api/security-settings`.
   * Auth is handled via HttpOnly session cookie; a 403 indicates session expiry.
   */
  const handleSave = useCallback(async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/security-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify(settings),
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({})) as { error?: string }
        throw new Error(errorData.error ?? `HTTP ${res.status}`)
      }

      toast.success(t('settings.saved', locale))
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      toast.error(`${t('settings.failedSave', locale)}: ${message}`)
    } finally {
      setSaving(false)
    }
  }, [settings, locale])

  // ── Reset ─────────────────────────────────────────────────────────────────

  /**
   * Resets the form to `DEFAULT_SECURITY_SETTINGS`.
   *
   * WHY no auto-save: The user may want to review changes before committing.
   * They must explicitly press Save after resetting.
   */
  const handleReset = useCallback(() => {
    setSettings(DEFAULT_SECURITY_SETTINGS)
  }, [])

  // ── JSON export ───────────────────────────────────────────────────────────

  /**
   * Triggers a browser file download of the current settings as a JSON file.
   * Useful for audit trails and backup before destructive changes.
   */
  const handleExportJson = useCallback(() => {
    const blob = new Blob([JSON.stringify(settings, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `security-config-${new Date().toISOString().slice(0, 10)}.json`
    anchor.click()
    URL.revokeObjectURL(url)
    toast.success(t('settings.exported', locale))
  }, [settings, locale])

  // ── Active modules count (memoised for performance) ───────────────────────

  /**
   * Number of boolean security modules that are currently enabled.
   * Used to render the security-level indicator bar in the dialog header.
   *
   * Memoised because it iterates over 14 keys on every render; the settings
   * object changes rarely (only on toggle) so the memo is almost always valid.
   */
  const activeModules = useMemo(
    () => ACTIVE_MODULE_KEYS.filter((key) => settings[key]).length,
    [settings],
  )

  return {
    // State
    settings,
    loading,
    saving,
    error,
    activeModules,
    // Actions
    update,
    handleSave,
    handleReset,
    handleExportJson,
  }
}
