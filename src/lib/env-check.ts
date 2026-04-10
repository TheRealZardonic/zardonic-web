/**
 * Client-side helper to fetch environment variable status from /api/env-check.
 *
 * Returns a record mapping variable names to their presence (boolean).
 * Falls back to all-false on network or parse errors so the wizard can
 * still render a helpful "could not verify" state.
 */

export interface EnvStatus {
  UPSTASH_REDIS_REST_URL: boolean
  UPSTASH_REDIS_REST_TOKEN: boolean
  ADMIN_SETUP_TOKEN: boolean
  RESEND_API_KEY: boolean
}

export const REQUIRED_ENV_VARS: { key: keyof EnvStatus; label: string; description: string; required: boolean }[] = [
  { key: 'UPSTASH_REDIS_REST_URL', label: 'Upstash Redis URL', description: 'Upstash Redis URL for data persistence', required: true },
  { key: 'UPSTASH_REDIS_REST_TOKEN', label: 'Upstash Redis Token', description: 'Upstash Redis token for data persistence', required: true },
  { key: 'ADMIN_SETUP_TOKEN', label: 'Admin Setup Token', description: 'One-time token to create your admin password', required: true },
  { key: 'RESEND_API_KEY', label: 'Resend API Key', description: 'API key for contact form email forwarding', required: false },
]

const EMPTY_STATUS: EnvStatus = {
  UPSTASH_REDIS_REST_URL: false,
  UPSTASH_REDIS_REST_TOKEN: false,
  ADMIN_SETUP_TOKEN: false,
  RESEND_API_KEY: false,
}

export async function fetchEnvStatus(): Promise<EnvStatus> {
  try {
    const res = await fetch('/api/env-check')
    if (!res.ok) return EMPTY_STATUS
    const data = await res.json()
    return data?.vars ?? EMPTY_STATUS
  } catch {
    return EMPTY_STATUS
  }
}

/** Returns true when all required env vars are set. */
export function allRequiredSet(status: EnvStatus): boolean {
  return REQUIRED_ENV_VARS.filter((v) => v.required).every((v) => status[v.key])
}
