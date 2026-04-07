import { Redis } from '@upstash/redis'
const kv = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || '',
  token: process.env.UPSTASH_REDIS_REST_TOKEN || ''
})
import { getClientIp, hashIp } from './_ratelimit.js'
import { recordIncident } from './_attacker-profile.js'
import { logSecurityEvent } from './_security-logger.js'

/**
 * SQL Injection Backfire — counter-offensive defense module.
 *
 * When a scanner probes for SQL injection vulnerabilities, the server
 * responds with payloads designed to corrupt the attacker's local
 * analysis database (e.g. sqlmap's session store, custom SQLite DBs).
 *
 * These payloads are harmless to legitimate users and browsers — they
 * only trigger when parsed by automated SQL analysis tools that
 * evaluate response data as SQL.
 */

const KV_SETTINGS_KEY = 'nk-security-settings'

interface VercelLikeRequest {
  method?: string
  url?: string
  query?: Record<string, string | string[]>
  body?: Record<string, unknown>
  headers: Record<string, string | string[] | undefined>
}

interface VercelLikeResponse {
  setHeader(key: string, value: string): VercelLikeResponse
  status(code: number): VercelLikeResponse
  json(data: unknown): VercelLikeResponse
}

interface SecuritySettings {
  sqlBackfireEnabled?: boolean
}

/** Named SQL injection probe patterns — name is logged for admin visibility */
const SQL_INJECTION_PATTERNS: Array<{ name: string; pattern: RegExp }> = [
  { name: 'UNION_SELECT',      pattern: /(?:UNION\s+(?:ALL\s+)?SELECT)/i },
  { name: 'OR_TAUTOLOGY',      pattern: /(?:'\s*OR\s+['"]?\d)/i },
  { name: 'DROP_TABLE',        pattern: /(?:;\s*DROP\s+TABLE)/i },
  { name: 'DELETE_FROM',       pattern: /(?:;\s*DELETE\s+FROM)/i },
  { name: 'COMMENT_TERMINATE', pattern: /(?:'\s*;\s*--)/i },
  { name: 'TIME_SLEEP',        pattern: /(?:SLEEP\s*\(\d+\))/i },
  { name: 'BENCHMARK',         pattern: /(?:BENCHMARK\s*\()/i },
  { name: 'WAITFOR_DELAY',     pattern: /(?:WAITFOR\s+DELAY)/i },
  { name: 'PG_SLEEP',          pattern: /(?:pg_sleep\s*\()/i },
  { name: 'LOAD_FILE',         pattern: /(?:LOAD_FILE\s*\()/i },
  { name: 'INTO_OUTFILE',      pattern: /(?:INTO\s+(?:OUT|DUMP)FILE)/i },
  { name: 'INFORMATION_SCHEMA', pattern: /(?:information_schema)/i },
  { name: 'SYS_DATABASE',      pattern: /(?:sys\.database)/i },
  { name: 'HEX_ENCODING',      pattern: /(?:0x[0-9a-f]{8,})/i },
  { name: 'CHAR_ENCODING',     pattern: /(?:CHAR\s*\(\s*\d+(?:\s*,\s*\d+)*\s*\))/i },
]

/** Return the name of the first SQL injection pattern that matches any source, or null. */
function detectSqlInjectionPattern(req: VercelLikeRequest): string | null {
  const sources: string[] = []
  if (req.query) {
    sources.push(...Object.values(req.query).filter((v): v is string => typeof v === 'string'))
  }
  if (req.body && typeof req.body === 'object') {
    sources.push(...Object.values(req.body).filter((v): v is string => typeof v === 'string'))
  }
  if (req.url) sources.push(req.url)
  const cookie = req.headers?.cookie
  if (typeof cookie === 'string') sources.push(cookie)

  for (const value of sources) {
    for (const { name, pattern } of SQL_INJECTION_PATTERNS) {
      if (pattern.test(value)) return name
    }
  }
  return null
}

/**
 * Detect SQL injection attempts in request parameters.
 * Returns the matched pattern name when found, or null for clean requests.
 */
export function detectSqlInjection(req: VercelLikeRequest): boolean {
  return detectSqlInjectionPattern(req) !== null
}

/**
 * ReDoS (Regular Expression Denial of Service) payloads.
 *
 * These strings are embedded in response bodies alongside the SQL backfire
 * payloads.  Automated scanning tools that use regex to parse HTTP responses
 * for SQL error patterns can experience catastrophic backtracking when their
 * patterns are applied to these inputs.
 *
 * The strings are harmless to browsers and legitimate clients — they are just
 * long sequences of characters that do not render visibly.
 */
const REDOS_PAYLOADS = [
  // Targets (a+)+ style regexes in Python/Perl SQL error parsers
  "'OR" + " 1".repeat(80) + "=1'",
  // Triggers catastrophic backtracking in (a*b*)* patterns
  "'" + "a".repeat(60) + "'" + "a".repeat(60) + "'",
  // Long quote-delimited string that breaks naive SQL tokenisers
  "'" + " OR ".repeat(40) + "'1'='1",
  // Causes exponential backtracking in nested quantifier regexes
  "1" + " UNION ALL SELECT".repeat(20) + " NULL--",
]
/**
 * Backfire payloads — SQL statements designed to corrupt the scanner's
 * local analysis database.  These are embedded in HTTP response bodies
 * and headers.  A legitimate browser ignores them; an automated tool
 * that evaluates response data as SQL will execute them against its own
 * database.
 */
const BACKFIRE_PAYLOADS = [
  "'; DROP TABLE IF EXISTS scan_results; --",
  "'; DROP TABLE IF EXISTS vulnerabilities; --",
  "'; DROP TABLE IF EXISTS sessions CASCADE; --",
  "'; DROP TABLE IF EXISTS targets CASCADE; --",

  // Corrupt scan results with misleading data
  "'; INSERT INTO scan_results (url, vuln_type, severity) VALUES ('decoy.example.com', 'NONE', 'FALSE_POSITIVE'); --",
  "'; UPDATE scan_results SET severity = 'FALSE_POSITIVE' WHERE 1=1; --",

  // SQLite-specific (sqlmap uses SQLite for session storage)
  "'; DROP TABLE IF EXISTS sqlmapoutput; --",
  "'; DROP TABLE IF EXISTS sqlmapsession; --",
  "'; DELETE FROM sqlite_master WHERE type='table'; --",

  // Trigger errors in the scanner's analysis
  "'; SELECT RAISE(ABORT, 'SCAN_TERMINATED_BY_TARGET'); --",
  "'; PRAGMA integrity_check; DELETE FROM main WHERE 1=1; --",
]

/**
 * Generate backfire response headers.
 * Scanners often parse response headers for SQL-like content.
 */
export function setBackfireHeaders(res: VercelLikeResponse): void {
  res.setHeader('X-DB-Status', "'; DROP TABLE scan_results; --")
  res.setHeader('X-SQL-Version', "'; UPDATE targets SET status='unreachable'; --")
  res.setHeader('X-Backend-DB', "PostgreSQL'; DELETE FROM sessions WHERE 1=1; --")
  res.setHeader('X-Debug-Query', "SELECT 1'; DROP TABLE IF EXISTS sqlmapoutput; --")
}

/**
 * Generate a JSON response body containing backfire payloads.
 * The response looks like a normal API error but contains embedded
 * SQL payloads that corrupt the scanner's local database when parsed.
 */
export function generateBackfireBody(): Record<string, unknown> {
  const shuffled = [...BACKFIRE_PAYLOADS].sort(() => Math.random() - 0.5)
  const redos = REDOS_PAYLOADS[Math.floor(Math.random() * REDOS_PAYLOADS.length)]
  return {
    error: 'Database error',
    message: shuffled[0],
    details: shuffled.slice(1, 4),
    query: shuffled[4] || BACKFIRE_PAYLOADS[0],
    // ReDoS payload — causes catastrophic backtracking in scanner regex engines
    trace: `Error: ${redos}\n    at Query.execute (${shuffled[1]})\n    at Connection.query (${shuffled[2]})`,
    debug: {
      last_query: shuffled[3] || BACKFIRE_PAYLOADS[3],
      db_version: "PostgreSQL 15.2'; DROP TABLE IF EXISTS vulnerabilities; --",
      tables: ['users', 'sessions', 'scan_results', 'admin_backup'],
      // Second ReDoS payload in a field scanners often parse deeply
      raw_error: redos,
    },
  }
}

/**
 * Handle an SQL injection attempt with backfire response.
 * Records the incident and returns a poisoned response.
 */
export async function handleSqlInjectionBackfire(req: VercelLikeRequest, res: VercelLikeResponse): Promise<boolean> {
  const ip = getClientIp(req)
  const hashedIp = hashIp(ip)
  const userAgent = (req.headers?.['user-agent'] as string || '').slice(0, 200)
  const timestamp = new Date().toISOString()
  const detectedPattern = detectSqlInjectionPattern(req)

  // Check if backfire is enabled
  try {
    const settings = await kv.get<SecuritySettings>(KV_SETTINGS_KEY).catch(() => null)
    if (!settings?.sqlBackfireEnabled) return false
  } catch {
    return false
  }

  // Record the incident in attacker profile
  try {
    await recordIncident(hashedIp, {
      type: 'sql_injection_backfire',
      method: req.method,
      url: req.url,
      userAgent,
      timestamp,
    })
  } catch {
    // Recording failure must not block the response
  }

  // Unified structured log
  await logSecurityEvent({
    event: 'SQL_INJECTION_BACKFIRE',
    severity: 'high',
    hashedIp,
    userAgent,
    method: req.method,
    url: req.url,
    countermeasure: 'SQL_BACKFIRE',
    details: { detectedPattern },
  })

  // Send the backfire response
  setBackfireHeaders(res)
  res.setHeader('Content-Type', 'application/json')
  res.setHeader('Cache-Control', 'no-store')
  res.status(500).json(generateBackfireBody())
  return true
}
