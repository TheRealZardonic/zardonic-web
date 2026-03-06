import { kv } from '@vercel/kv'
import { randomBytes } from 'node:crypto'
import { getClientIp, hashIp } from './_ratelimit.js'
import { recordIncident } from './_attacker-profile.js'

/**
 * Log Poisoning — inject deceptive data into responses that corrupts
 * the attacker's log analysis and reconnaissance output.
 *
 * When a flagged attacker or scanner sends requests, the server
 * injects misleading data designed to:
 *
 * 1. Poison their log analysis with fake internal paths and credentials
 * 2. Inject terminal escape sequences that corrupt CLI-based log viewers
 * 3. Add fake "vulnerable" endpoints to waste their time
 * 4. Insert ANSI escape codes that execute commands in vulnerable terminals
 */

const KV_SETTINGS_KEY = 'nk-security-settings'

/**
 * Fake internal paths that look like juicy targets.
 * Attackers scanning logs will waste time probing these non-existent paths.
 */
const FAKE_INTERNAL_PATHS = [
  '/internal/api/v2/users/export',
  '/internal/graphql?query={users{id,email,password}}',
  '/api/v3/admin/database/dump',
  '/debug/pprof/heap',
  '/actuator/env',
  '/.well-known/openid-configuration',
  '/api/internal/keys/rotate',
  '/admin/phpmyadmin/sql.php',
  '/wp-json/wp/v2/users',
  '/api/v1/secrets/list',
]

/**
 * Fake server information to mislead attacker reconnaissance.
 */
const FAKE_SERVER_HEADERS = [
  { name: 'X-Powered-By', value: 'Express/4.18.2' },
  { name: 'X-AspNet-Version', value: '4.0.30319' },
  { name: 'X-Backend', value: 'Apache/2.4.54 (Ubuntu)' },
  { name: 'X-Debug-Token', value: () => randomBytes(16).toString('hex') },
  { name: 'X-Request-Id', value: () => `req_${randomBytes(12).toString('hex')}` },
  { name: 'X-Upstream', value: 'backend-01.prod.internal:8443' },
  { name: 'X-Cache-Key', value: () => `cache:${randomBytes(8).toString('hex')}:prod` },
]

/**
 * ANSI escape sequences that corrupt terminal-based log viewers.
 * These are harmless in browsers but wreak havoc on CLI tools like
 * `less`, `tail`, `grep` output, and terminal-based SIEM displays.
 */
const TERMINAL_POISON_STRINGS = [
  '\x1b[2J\x1b[H',           // Clear screen
  '\x1b]0;SCAN_DETECTED\x07', // Set terminal title
  '\x1b[?25l',                // Hide cursor
  '\x1b[31m[CRITICAL]\x1b[0m Your scanner has been detected and logged.',
  '\x1b[5m⚠ WARNING: Intrusion countermeasures activated\x1b[0m',
]

/**
 * Inject poisoned log entries into response headers.
 * Scanners that log response headers will collect misleading data.
 */
export function injectLogPoisonHeaders(res) {
  // Fake server identity to confuse fingerprinting
  const fakeHeader = FAKE_SERVER_HEADERS[Math.floor(Math.random() * FAKE_SERVER_HEADERS.length)]
  const value = typeof fakeHeader.value === 'function' ? fakeHeader.value() : fakeHeader.value
  res.setHeader(fakeHeader.name, value)

  // Inject fake "leaked" internal paths in a header scanners often parse
  const fakePath = FAKE_INTERNAL_PATHS[Math.floor(Math.random() * FAKE_INTERNAL_PATHS.length)]
  res.setHeader('X-Debug-Route', fakePath)

  // Fake leaked credentials in headers (red herrings)
  res.setHeader('X-Trace-Auth', `Bearer ${randomBytes(32).toString('base64url')}`)

  // Terminal poison in a header that CLI tools will display
  const poison = TERMINAL_POISON_STRINGS[Math.floor(Math.random() * TERMINAL_POISON_STRINGS.length)]
  res.setHeader('X-Log-Trace', poison)
}

/**
 * Generate a poisoned response body with fake internal data.
 * This makes the attacker's automated reports full of noise.
 */
export function generatePoisonedErrorBody() {
  return {
    error: 'Internal Server Error',
    trace: `at Handler.process (${FAKE_INTERNAL_PATHS[Math.floor(Math.random() * FAKE_INTERNAL_PATHS.length)]})`,
    debug: {
      server: 'backend-01.prod.internal',
      db_host: 'rds-prod.internal.aws:5432',
      redis: 'redis-sentinel.internal:26379',
      api_key: `sk_prod_${randomBytes(20).toString('hex')}`,
      session_store: '/tmp/sessions/' + randomBytes(8).toString('hex'),
    },
    internal_routes: FAKE_INTERNAL_PATHS.slice(0, 3 + Math.floor(Math.random() * 3)),
    timestamp: new Date().toISOString(),
  }
}

/**
 * Check if log poisoning should be applied to this request.
 * Returns true for flagged attackers when log poisoning is enabled.
 */
export async function shouldPoisonLogs(hashedIp) {
  try {
    const settings = await kv.get(KV_SETTINGS_KEY).catch(() => null)
    if (!settings?.logPoisoningEnabled) return false

    // Check if IP is flagged as attacker
    const flagged = await kv.get(`nk-flagged:${hashedIp}`)
    return !!flagged
  } catch {
    return false
  }
}

/**
 * Apply full log poisoning to a response for a flagged attacker.
 * Records the incident and injects poisoned headers.
 */
export async function applyLogPoisoning(req, res) {
  const ip = getClientIp(req)
  const hashedIp = hashIp(ip)

  const shouldPoison = await shouldPoisonLogs(hashedIp)
  if (!shouldPoison) return false

  // Record the incident
  try {
    await recordIncident(hashedIp, {
      type: 'log_poisoning_applied',
      method: req.method,
      url: req.url,
      userAgent: (req.headers?.['user-agent'] || '').slice(0, 200),
      timestamp: new Date().toISOString(),
    })
  } catch { /* ignore */ }

  // Inject poisoned headers
  injectLogPoisonHeaders(res)

  return true
}
