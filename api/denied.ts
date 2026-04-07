import { Redis } from '@upstash/redis'
const kv = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || '',
  token: process.env.UPSTASH_REDIS_REST_TOKEN || ''
})
import { randomBytes } from 'node:crypto'
import { getClientIp, hashIp } from './_ratelimit.js'
import { markAttacker, injectEntropyHeaders, setDefenseHeaders } from './_honeytokens.js'
import { incrementThreatScore, THREAT_REASONS } from './_threat-score.js'
import { isHardBlocked } from './_blocklist.js'
import { serveZipBomb } from './_zipbomb.js'
import { recordIncident } from './_attacker-profile.js'
import { detectSqlInjection, handleSqlInjectionBackfire } from './_sql-backfire.js'
import { serveCanaryDocument, generateCanaryToken } from './_canary-documents.js'
import { applyLogPoisoning } from './_log-poisoning.js'
import { logSecurityEvent } from './_security-logger.js'
import { detectAndLogScanner } from './_scanner-detection.js'
import { handlePathTraversalBackfire } from './_path-traversal.js'
import { handleProbeBackfire } from './_probe-detection.js'

/**
 * Handles requests to paths listed as Disallow in robots.txt.
 */

interface VercelRequest {
  method?: string
  body?: Record<string, unknown>
  query?: Record<string, string | string[]>
  headers: Record<string, string | string[] | undefined>
  url?: string
}

interface VercelResponse {
  setHeader(key: string, value: string): VercelResponse
  status(code: number): VercelResponse
  json(data: unknown): VercelResponse
  end(): VercelResponse
  send(data: unknown): VercelResponse
}

interface SecuritySettings {
  underAttackMode?: boolean
  zipBombEnabled?: boolean
  zipBombOnRobotsViolation?: boolean
  tarpitOnRobotsViolation?: boolean
  canaryDocumentsEnabled?: boolean
}

const DELAY_MIN_MS = 2000
const DELAY_MAX_MS = 6000
/** Adaptive tarpit ceiling based on threat level. */
const DELAY_CAPS: Record<string, number> = {
  BLOCK: 30000,
  TARPIT: 15000,
  WARN: 8000,
  CLEAN: 6000,
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

const NAV_LINKS = [
  '/admin/login', '/admin/settings', '/admin/users', '/admin/export',
  '/dashboard/', '/dashboard/analytics', '/dashboard/reports',
  '/backup/latest', '/backup/database', '/backup/files',
  '/config/app', '/config/database', '/config/security',
  '/internal/docs', '/internal/api', '/internal/status',
  '/debug/status', '/debug/logs', '/debug/traces',
  '/staging/preview', '/staging/build',
  '/private/data', '/private/keys',
  '/data/export', '/data/users',
  '/logs/access', '/logs/error',
]

function pickLinks(count = 8): string[] {
  const shuffled = [...NAV_LINKS].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, count)
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function renderErrorPage(path: string, canaryToken: string | null): string {
  const ref = randomBytes(4).toString('hex')
  const links = pickLinks()
  const padding = randomBytes(3072).toString('base64')
  const callbackUrl = canaryToken ? `/api/canary-callback?t=${canaryToken}` : ''

  // Tracking pixel — fires on page load even without JavaScript.
  // Allowed by `img-src 'self'` in the Content-Security-Policy.
  const canaryPixel = canaryToken
    ? `\n<img src="${callbackUrl}&e=img" width="1" height="1" style="position:absolute;left:-9999px" alt="">`
    : ''

  // Fingerprinting script — loaded as an external same-origin resource so
  // it is permitted by `script-src 'self'` in the CSP.  Inline `<script>`
  // blocks would be rejected by browsers enforcing the policy.
  const canaryScript = canaryToken
    ? `\n<script src="/api/canary-script?t=${canaryToken}"></script>`
    : ''
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="robots" content="noindex, nofollow">
<title>403 Forbidden</title>
<style>
body{font-family:system-ui,-apple-system,sans-serif;background:#0a0a0a;color:#aaa;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0}
.c{max-width:480px;padding:2rem;border:1px solid #222;text-align:center}
h1{color:#b91c1c;font-size:3rem;margin:0 0 .5rem}
p{margin:.5rem 0;font-size:.9rem}
.ref{font-size:.7rem;color:#444;font-family:monospace}
a{color:#666;text-decoration:none;font-size:.75rem}a:hover{color:#b91c1c}
nav{margin-top:1.5rem;display:flex;flex-wrap:wrap;gap:.5rem;justify-content:center}
</style>
</head>
<body>
<div class="c">
<h1>403</h1>
<p>Access to this resource is restricted.</p>
<p>Authorized personnel must authenticate before proceeding.</p>
<p class="ref">Path: ${escapeHtml(path)} &middot; Ref: ${ref}</p>
<nav>
${links.map(l => `<a href="${l}">${l.slice(1)}</a>`).join('\n')}
</nav>
</div>${canaryPixel}${canaryScript}
<!-- ${padding} -->
</body>
</html>`
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  // Check if IP is hard-blocked first
  const blocked = await isHardBlocked(req)
  if (blocked) {
    res.status(403).json({ error: 'FORBIDDEN' })
    return
  }

  // Under Attack Mode — skip all expensive countermeasures, return minimal 429
  try {
    const secSettings = await kv.get<SecuritySettings>('nk-security-settings').catch(() => null)
    if (secSettings?.underAttackMode) {
      res.setHeader('Connection', 'close')
      res.status(429).end()
      return
    }
  } catch { /* under attack check failure must not block the response */ }

  const ip = getClientIp(req)
  const hashedIp = hashIp(ip)
  const path = (req.query?._src as string) || req.url || '/'
  const ua = (req.headers['user-agent'] as string || '').slice(0, 200)

  // ── Layer 1: Scanner identification ────────────────────────────────────────
  // Runs first so the multiplier is available for all subsequent threat score increments.
  let scannerMultiplier = 1
  try {
    const scannerProfile = await detectAndLogScanner(req, hashedIp, ua)
    scannerMultiplier = scannerProfile.threatMultiplier
  } catch { /* scanner detection failure must not block the response */ }

  // ── Layer 2: SQL Injection Backfire ─────────────────────────────────────────
  try {
    if (detectSqlInjection(req)) {
      const backfireResult = await handleSqlInjectionBackfire(req, res)
      if (backfireResult) return
    }
  } catch { /* backfire failure must not block the response */ }

  // ── Layer 3: Path Traversal / LFI Backfire ──────────────────────────────────
  try {
    const traversalResult = await handlePathTraversalBackfire(req, res)
    if (traversalResult) return
  } catch { /* traversal backfire failure must not block the response */ }

  // ── Layer 4: Probe Backfire (XSS / SSTI / SSRF / CMDi / XXE) ───────────────
  try {
    const probeResult = await handleProbeBackfire(req, res)
    if (probeResult) return
  } catch { /* probe backfire failure must not block the response */ }

  // ── Layer 5: Canary Documents ───────────────────────────────────────────────
  try {
    const canaryResult = await serveCanaryDocument(req, res)
    if (canaryResult) return
  } catch { /* canary failure must not block the response */ }

  // ── Layer 6: Threat Score Increment (with scanner multiplier) ───────────────
  let threatResult = { score: 0, level: 'CLEAN' }
  try {
    const basePoints = THREAT_REASONS.ROBOTS_VIOLATION.points
    const scaledPoints = Math.round(basePoints * scannerMultiplier)
    threatResult = await incrementThreatScore(hashedIp, THREAT_REASONS.ROBOTS_VIOLATION.reason, scaledPoints, ua)
  } catch {
    // Threat scoring failure must not block the response
  }

  // ── Layer 7: Countermeasure selection ───────────────────────────────────────
  let countermeasure = 'LOGGED'
  let settings: SecuritySettings | null = null
  try {
    settings = await kv.get<SecuritySettings>('nk-security-settings').catch(() => null)
  } catch { /* ignore */ }

  const zipBombApplicable = settings?.zipBombEnabled && settings?.zipBombOnRobotsViolation
  if (zipBombApplicable) {
    countermeasure = 'ZIP_BOMB'
  } else if (threatResult.level === 'BLOCK') {
    countermeasure = 'BLOCKED'
  } else if (threatResult.level === 'TARPIT' || (settings?.tarpitOnRobotsViolation !== false)) {
    countermeasure = 'TARPITTED'
  }

  const entry = {
    key: `robots:${path}`,
    method: req.method,
    hashedIp,
    userAgent: ua,
    timestamp: new Date().toISOString(),
    threatScore: threatResult.score,
    threatLevel: threatResult.level,
    countermeasure,
  }

  // Persist to legacy KV list for backward compatibility with security-incidents view
  try {
    await kv.lpush('nk-honeytoken-alerts', JSON.stringify(entry))
    await kv.ltrim('nk-honeytoken-alerts', 0, 499)
  } catch {
    // Persistence failure must not block the response
  }

  // Unified structured security log
  const severity = threatResult.level === 'BLOCK' ? 'critical' : threatResult.level === 'TARPIT' ? 'high' : threatResult.level === 'WARN' ? 'warn' : 'info'
  await logSecurityEvent({
    event: 'ACCESS_VIOLATION',
    severity,
    hashedIp,
    userAgent: ua,
    method: req.method,
    url: path,
    countermeasure,
    threatScore: threatResult.score,
    threatLevel: threatResult.level,
    details: { scannerMultiplier },
  })

  // Flag this IP — subsequent requests to any endpoint will receive noise
  await markAttacker(hashedIp)

  // Record incident in attacker profile
  try {
    await recordIncident(hashedIp, {
      type: 'robots_violation',
      key: path,
      method: req.method,
      userAgent: ua,
      threatScore: threatResult.score,
      threatLevel: threatResult.level,
      countermeasure,
      timestamp: entry.timestamp
    })
  } catch {
    // Profile recording failure must not block the response
  }

  // ── Layer 8: Adaptive tarpit delay ─────────────────────────────────────────
  // Delay scales with threat level: BLOCK ≤ 30s, TARPIT ≤ 15s, WARN ≤ 8s, else ≤ 6s
  const cap = DELAY_CAPS[threatResult.level] ?? DELAY_CAPS.CLEAN
  // Ensure cap is never less than DELAY_MIN_MS to avoid a negative random range
  const upperBound = Math.max(DELAY_MIN_MS, Math.min(DELAY_MAX_MS, cap))
  const ms = DELAY_MIN_MS + Math.random() * (upperBound - DELAY_MIN_MS)
  await sleep(ms)

  // Serve zip bomb if applicable per rule settings
  if (zipBombApplicable) {
    try {
      await serveZipBomb(res)
      return
    } catch {
      // Zip bomb failure must not block the response — fall through to error page
    }
  }

  // Log poisoning — inject misleading data into response headers for flagged attackers
  try {
    await applyLogPoisoning(req, res)
  } catch { /* log poisoning failure must not block the response */ }

  // Noise injection on response headers
  injectEntropyHeaders(res, 50)
  setDefenseHeaders(res)

  // Generate canary token so the 403 error page also acts as a canary document.
  let canaryToken: string | null = null
  try {
    const secSettings = settings || await kv.get<SecuritySettings>('nk-security-settings').catch(() => null)
    if (secSettings?.canaryDocumentsEnabled) {
      canaryToken = await generateCanaryToken(req)
    }
  } catch { /* canary token generation failure must not block the response */ }

  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate')
  res.status(403).send(renderErrorPage(path, canaryToken))
}
