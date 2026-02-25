import { Redis } from '@upstash/redis'
import { randomBytes } from 'node:crypto'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getClientIp, hashIp } from './_ratelimit.js'
import { markAttacker, injectEntropyHeaders, setDefenseHeaders } from './_honeytokens.js'
import { incrementThreatScore, THREAT_REASONS } from './_threat-score.js'
import { isHardBlocked } from './_blocklist.js'
import { serveZipBomb } from './_zipbomb.js'
import { recordIncident } from './_attacker-profile.js'

let _redis: Redis | null = null

function getRedis(): Redis | null {
  if (_redis) return _redis
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) return null
  _redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  })
  return _redis
}

/**
 * Handles requests to paths listed as Disallow in robots.txt.
 *
 * Any client that reaches this handler has intentionally ignored the
 * robots.txt access control directive. The handler applies purely
 * defensive measures to protect system availability:
 *
 * 1. Records the violation for security monitoring
 * 2. Flags the source IP for noise injection on subsequent requests
 * 3. Applies a defensive delay to limit scanner throughput
 * 4. Returns a standard error page
 */

const DELAY_MIN_MS = 3000
const DELAY_MAX_MS = 8000

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

function renderErrorPage(path: string): string {
  const ref = randomBytes(4).toString('hex')
  const links = pickLinks()
  const padding = randomBytes(3072).toString('base64')
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
<p class="ref">Path: ${path} &middot; Ref: ${ref}</p>
<nav>
${links.map(l => `<a href="${l}">${l.slice(1)}</a>`).join('\n')}
</nav>
</div>
<!-- ${padding} -->
</body>
</html>`
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const blocked = await isHardBlocked(req)
  if (blocked) {
    return res.status(403).json({ error: 'FORBIDDEN' })
  }

  const ip = getClientIp(req)
  const hashedIp = hashIp(ip)
  const path = (req.query._src as string) || req.url || '/'
  const ua = (req.headers['user-agent'] || '').slice(0, 200)

  const entry = {
    key: `robots:${path}`,
    method: req.method,
    hashedIp,
    userAgent: ua,
    timestamp: new Date().toISOString(),
  }

  console.error('[ACCESS VIOLATION]', JSON.stringify(entry))

  const redis = getRedis()
  if (redis) {
    try {
      await redis.lpush('nk-honeytoken-alerts', JSON.stringify(entry))
      await redis.ltrim('nk-honeytoken-alerts', 0, 499)
    } catch {
      // Persistence failure must not block the response
    }
  }

  await markAttacker(hashedIp)

  let threatResult = { score: 0, level: 'CLEAN', reason: '' }
  try {
    threatResult = await incrementThreatScore(hashedIp, THREAT_REASONS.ROBOTS_VIOLATION.reason, THREAT_REASONS.ROBOTS_VIOLATION.points)
  } catch {
    // Threat scoring failure must not block the response
  }

  try {
    await recordIncident(hashedIp, {
      type: 'robots_violation',
      key: path,
      method: req.method || 'GET',
      userAgent: ua,
      threatScore: threatResult.score,
      threatLevel: threatResult.level,
      timestamp: entry.timestamp,
    })
  } catch {
    // Profile recording failure must not block the response
  }

  // Defensive delay — limits scanner throughput
  const ms = DELAY_MIN_MS + Math.random() * (DELAY_MAX_MS - DELAY_MIN_MS)
  await sleep(ms)

  // Check if zip bomb is enabled
  try {
    const settings = redis ? await redis.get<Record<string, unknown>>('zd-security-settings').catch(() => null) : null
    if (settings?.zipBombEnabled) {
      return await serveZipBomb(res)
    }
  } catch {
    // Zip bomb failure must not block the response
  }

  injectEntropyHeaders(res, 50)
  setDefenseHeaders(res)

  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate')
  return res.status(403).send(renderErrorPage(path))
}
