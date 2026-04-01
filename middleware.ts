import { Redis } from '@upstash/redis'

/**
 * Vercel Edge Middleware — Global Circuit Breaker + IP Blocklist Gate.
 *
 * Runs on the Vercel Edge Network BEFORE any Serverless Function is invoked.
 * This protects the billing account in two ways:
 *
 * 1. **Hard-blocked IPs** are rejected instantly (403, empty body) so the
 *    expensive Serverless Function (api/denied.ts etc.) never starts.
 *
 * 2. **Global Circuit Breaker** — counts ALL incoming requests in 10-second
 *    time windows.  When the count exceeds THRESHOLD (500) the system sets
 *    `zd_under_attack` in Redis with a 5-minute TTL.  While that flag is set
 *    every single request is rejected (429, empty body).  After the TTL
 *    expires the flag auto-deletes and normal operation resumes.
 *
 * Edge Functions are billed by CPU cycles, not wall-clock time, so the
 * Redis round-trip costs almost nothing compared to a Serverless Function.
 */

const SALT = process.env.RATE_LIMIT_SALT

/**
 * Hash an IP with SHA-256 + salt using the Web Crypto API (Edge-compatible).
 */
async function hashIp(ip: string): Promise<string> {
  const data = new TextEncoder().encode(SALT + ip)
  const buf = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

function getClientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for')
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim()
  }
  return '127.0.0.1'
}

/** Requests per 10-second window before the circuit breaker trips. */
const THRESHOLD = 500

/** How long (seconds) the circuit breaker stays open once tripped. */
const COOLDOWN_SECONDS = 300

export default async function middleware(req: Request): Promise<Response | undefined> {
  // Skip when Redis is not configured (local development)
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return
  }

  if (!SALT) {
    console.error('[middleware] RATE_LIMIT_SALT env var is not set. Skipping rate limiting.')
    return
  }

  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  })

  try {
    // ── 1. Circuit Breaker ──────────────────────────────────────────
    const isUnderAttack = await redis.get('zd_under_attack')
    if (isUnderAttack) {
      return new Response(null, { status: 429 })
    }

    // ── 2. Hard-Blocked IP Gate ─────────────────────────────────────
    const ip = getClientIp(req)
    const hashedIp = await hashIp(ip)
    const isBlocked = await redis.get(`zd-blocked:${hashedIp}`)
    if (isBlocked) {
      return new Response(null, { status: 403 })
    }

    // ── 3. Global Rate Counter ──────────────────────────────────────
    const timeWindow = Math.floor(Date.now() / 10000)
    const globalRateKey = `zd_global_rate_${timeWindow}`

    const pipeline = redis.pipeline()
    pipeline.incr(globalRateKey)
    pipeline.expire(globalRateKey, 20)

    const results = await pipeline.exec()
    const currentRequests = results[0] as number

    if (currentRequests > THRESHOLD) {
      await redis.set('zd_under_attack', true, { ex: COOLDOWN_SECONDS })
      return new Response(null, { status: 429 })
    }

    // Pass through — Serverless Function handles the rest
  } catch {
    // Redis failure must never block legitimate traffic
  }
}

export const config = {
  matcher: '/:path*',
}
