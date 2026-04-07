/**
 * Primary instance detection — server-side utility for API routes.
 *
 * SECURITY: This module is the ONLY source of truth for superadmin bypass in API routes.
 * Never use environment variables (like VITE_IS_PRIMARY) for this check,
 * because tenants can set arbitrary env vars on their own deployments.
 * Detection must be based on the request Host header.
 *
 * NOTE: The PRIMARY_HOSTNAMES list is intentionally duplicated from src/lib/primary-check.ts.
 * API routes (api/) run as Node.js serverless functions and cannot import from src/
 * (which uses Vite/ESM path aliases and browser APIs). Keep both lists in sync.
 */

/**
 * PRIMARY_HOSTNAMES — all hostnames that identify the master Neuroklast instance.
 */
const PRIMARY_HOSTNAMES = [
  'neuroklast.net',
  'www.neuroklast.net',
  'neuroklast-band-land.vercel.app',
]

/**
 * Server-side check: Is this request hitting the master instance?
 * Strips port numbers (e.g. "neuroklast.net:443" → "neuroklast.net").
 *
 * @param host - Value of the `Host` request header (req.headers.host)
 */
export function isPrimaryHost(host: string | undefined): boolean {
  if (!host) return false
  const hostname = host.split(':')[0]
  return PRIMARY_HOSTNAMES.includes(hostname)
}
