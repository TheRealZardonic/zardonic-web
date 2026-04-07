/**
 * Activation key validation for Band Land deployments.
 *
 * Each deployment must supply a VITE_ACTIVATION_KEY environment variable.
 * On app startup, the key is validated against the central Neuroklast API.
 * The result is cached in sessionStorage for the duration of the browser session
 * to avoid repeated network calls on every page refresh.
 */
import { isPrimaryInstance } from '@/lib/primary-check'

export type LicenseTier = 'free' | 'premium' | 'agency'

export interface ActivationResult {
  valid: boolean
  tier?: LicenseTier
  features?: string[]
  assignedThemes?: string[]
  error?: string
}

const SESSION_KEY = 'nk-activation-result'

/**
 * The central validation endpoint on the official Neuroklast deployment.
 * Forks running on other Vercel instances call back to THIS URL so that
 * activation keys are always checked against the single source of truth.
 *
 * Override via VITE_ACTIVATION_API_URL for testing or staging environments.
 */
const ACTIVATION_API_URL =
  (import.meta.env.VITE_ACTIVATION_API_URL as string | undefined) ||
  'https://neuroklast-band-land.vercel.app/api/validate-key'

/**
 * Read the cached activation result from sessionStorage.
 * Returns null if no valid cache entry exists.
 */
function getCachedResult(): ActivationResult | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY)
    if (!raw) return null
    return JSON.parse(raw) as ActivationResult
  } catch {
    return null
  }
}

/**
 * Persist the activation result to sessionStorage.
 */
function setCachedResult(result: ActivationResult): void {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(result))
  } catch {
    // sessionStorage may be unavailable in some sandboxed environments; ignore.
  }
}

/**
 * Validate the deployment's activation key against the central Neuroklast API.
 *
 * - If the current hostname is `neuroklast.net` (primary instance), validation is bypassed (always valid).
 * - If no key is configured (`VITE_ACTIVATION_KEY` is empty), returns invalid.
 * - Caches the result in sessionStorage for the current browser session.
 * - If the remote API is unreachable, fails closed (returns invalid) to prevent
 *   unactivated deployments from running silently.
 */
export async function validateActivationKey(): Promise<ActivationResult> {
  // Primary instance (master deployment on neuroklast.net) — always valid, no key required.
  // SECURITY: hostname-based check; env vars like VITE_IS_PRIMARY must never be used here.
  if (isPrimaryInstance()) {
    const result: ActivationResult = { valid: true, tier: 'agency', features: [] }
    return result
  }

  // Return cached result for the current session
  const cached = getCachedResult()
  if (cached !== null) return cached

  const key = import.meta.env.VITE_ACTIVATION_KEY as string | undefined

  if (!key || key.trim() === '') {
    const result: ActivationResult = { valid: false, error: 'No activation key configured' }
    setCachedResult(result)
    return result
  }

  try {
    const response = await fetch(ACTIVATION_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: key.trim() }),
    })

    if (!response.ok) {
      const result: ActivationResult = { valid: false, error: 'Validation service unavailable' }
      // Do not cache transient server errors so the next load retries
      return result
    }

    const data = await response.json() as ActivationResult
    setCachedResult(data)
    return data
  } catch {
    // Network error — fail closed
    const result: ActivationResult = { valid: false, error: 'Validation service unavailable' }
    return result
  }
}

/**
 * Clear the cached activation result (e.g. after a key change).
 */
export function clearActivationCache(): void {
  try {
    sessionStorage.removeItem(SESSION_KEY)
  } catch {
    // ignore
  }
}
