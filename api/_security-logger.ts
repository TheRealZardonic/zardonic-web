import { Redis } from '@upstash/redis'
const kv = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || '',
  token: process.env.UPSTASH_REDIS_REST_TOKEN || ''
})
import { randomBytes } from 'node:crypto'

/**
 * Unified security event logger.
 *
 * Every security-relevant event (honeytoken access, SQL injection, rate limit
 * violation, canary callback, circuit-breaker trip, etc.) is recorded here in
 * a consistent, machine-readable JSON structure.
 *
 * Outputs:
 *  1. `console.error` → picked up by Vercel Log Drain or any SIEM system
 *  2. KV list `nk-security-log` (capped at MAX_LOG_ENTRIES) → admin dashboard
 *
 * Callers must never `await` the returned promise unless they need back-pressure.
 * All KV writes are best-effort; failure is silently swallowed so logging
 * never blocks a response or causes request failure.
 */

export type SecurityEventSeverity = 'info' | 'warn' | 'high' | 'critical'

export interface SecurityGeo {
  countryCode?: string | null
  region?: string | null
  city?: string | null
}

export interface SecurityLogEntry {
  /** Unique 8-byte hex event ID for log correlation. */
  id: string
  /** ISO 8601 timestamp of the event. */
  timestamp: string
  /** Short all-caps event name, e.g. HONEYTOKEN_ACCESS. */
  event: string
  /** Severity level for log-drain filtering and alerting. */
  severity: SecurityEventSeverity
  /** SHA-256(salt + ip) — never stores raw IP addresses. */
  hashedIp: string
  /** Truncated User-Agent string (max 200 chars). */
  userAgent: string
  /** HTTP method of the triggering request. */
  method?: string
  /** Request URL or path (may include query string). */
  url?: string
  /** Non-PII geographic metadata from Vercel headers. */
  geo?: SecurityGeo
  /** The countermeasure that was applied (ZIP_BOMB, TARPIT, TAUNT_403, …). */
  countermeasure?: string
  /** Threat score at the time of the event. */
  threatScore?: number
  /** Threat level (CLEAN | WARN | TARPIT | BLOCK). */
  threatLevel?: string
  /** Event-specific structured details. */
  details?: Record<string, unknown>
}

const SECURITY_LOG_KEY = 'nk-security-log'
const MAX_LOG_ENTRIES = 1000

/**
 * Record a structured security event.
 *
 * Always returns immediately — KV persistence runs in the background.
 * Guaranteed to never throw.
 */
export async function logSecurityEvent(
  entry: Omit<SecurityLogEntry, 'id' | 'timestamp'>,
): Promise<void> {
  const fullEntry: SecurityLogEntry = {
    id: randomBytes(8).toString('hex'),
    timestamp: new Date().toISOString(),
    ...entry,
  }

  // Write to stderr — Vercel Log Drain / SIEM picks this up
  console.error(`[SECURITY:${entry.event}]`, JSON.stringify(fullEntry))

  // Persist to KV (best-effort — must not block the response)
  try {
    const count = await kv.lpush(SECURITY_LOG_KEY, JSON.stringify(fullEntry))
    // Trim only when the list exceeds the cap to minimise KV write overhead
    if (typeof count === 'number' && count > MAX_LOG_ENTRIES) {
      await kv.ltrim(SECURITY_LOG_KEY, 0, MAX_LOG_ENTRIES - 1)
    }
  } catch {
    // KV failure must never surface to the caller
  }
}
