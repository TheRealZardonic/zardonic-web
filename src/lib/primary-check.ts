/**
 * Primary instance detection utilities.
 *
 * SECURITY: This module is the ONLY source of truth for superadmin bypass.
 * Never use environment variables (like VITE_IS_PRIMARY) for this check,
 * because tenants can set arbitrary env vars on their own deployments.
 * Detection must be based on the runtime hostname.
 */

/**
 * PRIMARY_HOSTNAMES — all hostnames that identify the master Neuroklast instance.
 */
const PRIMARY_HOSTNAMES = [
  'neuroklast.net',
  'www.neuroklast.net',
  'neuroklast-band-land.vercel.app',
] as const

/** Client-side check: Is the current browser on the master instance? */
export function isPrimaryInstance(): boolean {
  if (typeof window === 'undefined') return false
  return (PRIMARY_HOSTNAMES as readonly string[]).includes(window.location.hostname)
}
