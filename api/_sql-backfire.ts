import { Redis } from '@upstash/redis'
import { getClientIp, hashIp } from './_ratelimit.js'
import { recordIncident } from './_attacker-profile.js'
import type { VercelRequest, VercelResponse } from '@vercel/node'

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

const KV_SETTINGS_KEY = 'zd-security-settings'

function getRedis(): Redis | null {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) return null
  return new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  })
}

/** Common SQL injection probe patterns */
const SQL_INJECTION_PATTERNS = [
  /(?:UNION\s+(?:ALL\s+)?SELECT)/i,
  /(?:'\s*OR\s+['"]?\d)/i,
  /(?:;\s*DROP\s+TABLE)/i,
  /(?:;\s*DELETE\s+FROM)/i,
  /(?:'\s*;\s*--)/i,
  /(?:SLEEP\s*\(\d+\))/i,
  /(?:BENCHMARK\s*\()/i,
  /(?:WAITFOR\s+DELAY)/i,
  /(?:pg_sleep\s*\()/i,
  /(?:LOAD_FILE\s*\()/i,
  /(?:INTO\s+(?:OUT|DUMP)FILE)/i,
  /(?:information_schema)/i,
  /(?:sys\.database)/i,
  /(?:0x[0-9a-f]{8,})/i,
  /(?:CHAR\s*\(\s*\d+(?:\s*,\s*\d+)*\s*\))/i,
]

/**
 * Detect SQL injection attempts in request parameters.
 * Returns true if any query param, body field, or header contains SQL patterns.
 */
export function detectSqlInjection(req: VercelRequest): boolean {
  const sources: string[] = []

  // Check query parameters
  if (req.query) {
    sources.push(...Object.values(req.query).filter((v): v is string => typeof v === 'string'))
  }

  // Check request body string fields
  if (req.body && typeof req.body === 'object') {
    sources.push(...Object.values(req.body as Record<string, unknown>).filter((v): v is string => typeof v === 'string'))
  }

  // Check URL path
  if (req.url) sources.push(req.url)

  // Check cookie header (scanners sometimes inject SQL via cookies)
  const cookie = req.headers?.cookie
  if (typeof cookie === 'string') sources.push(cookie)

  for (const value of sources) {
    for (const pattern of SQL_INJECTION_PATTERNS) {
      if (pattern.test(value)) return true
    }
  }
  return false
}

/**
 * Backfire payloads — SQL statements designed to corrupt the scanner's
 * local analysis database.  These are embedded in HTTP response bodies
 * and headers.  A legitimate browser ignores them; an automated tool
 * that evaluates response data as SQL will execute them against its own
 * database.
 */
const BACKFIRE_PAYLOADS = [
  // Drop common scanner tables
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
export function setBackfireHeaders(res: VercelResponse): void {
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
  return {
    error: 'Database error',
    message: shuffled[0],
    details: shuffled.slice(1, 4),
    query: shuffled[4] || BACKFIRE_PAYLOADS[0],
    stack: `Error: ${shuffled[0]}\n    at Query.execute (${shuffled[1]})\n    at Connection.query (${shuffled[2]})`,
    debug: {
      last_query: shuffled[3] || BACKFIRE_PAYLOADS[3],
      db_version: "PostgreSQL 15.2'; DROP TABLE IF EXISTS vulnerabilities; --",
      tables: ['users', 'sessions', 'scan_results', 'admin_backup'],
    },
  }
}

/**
 * Handle an SQL injection attempt with backfire response.
 * Records the incident and returns a poisoned response.
 */
export async function handleSqlInjectionBackfire(req: VercelRequest, res: VercelResponse): Promise<boolean | VercelResponse> {
  const ip = getClientIp(req)
  const hashedIp = hashIp(ip)

  // Check if backfire is enabled
  try {
    const redis = getRedis()
    if (!redis) return false
    const settings = await redis.get<{ sqlBackfireEnabled?: boolean }>(KV_SETTINGS_KEY)
    if (!settings?.sqlBackfireEnabled) return false
  } catch {
    return false
  }

  // Record the incident
  try {
    await recordIncident(hashedIp, {
      type: 'sql_injection_backfire',
      method: req.method || '',
      url: req.url || '',
      userAgent: ((req.headers?.['user-agent'] as string) || '').slice(0, 200),
      timestamp: new Date().toISOString(),
    })
  } catch {
    // Recording failure must not block the response
  }

  // Log for SIEM
  console.error('[SQL BACKFIRE]', JSON.stringify({
    hashedIp,
    method: req.method,
    url: req.url,
    timestamp: new Date().toISOString(),
  }))

  // Send the backfire response
  setBackfireHeaders(res)
  res.setHeader('Content-Type', 'application/json')
  res.setHeader('Cache-Control', 'no-store')
  return res.status(500).json(generateBackfireBody())
}
