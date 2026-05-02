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
 *    time windows.  When the count exceeds THRESHOLD the system sets
 *    `zd_under_attack` in Redis with a COOLDOWN_SECONDS TTL.  While that
 *    flag is set every single request is rejected (429, empty body).  After
 *    the TTL expires the flag auto-deletes and normal operation resumes.
 *
 * Edge Functions are billed by CPU cycles, not wall-clock time, so the
 * Redis round-trip costs almost nothing compared to a Serverless Function.
 */

const SALT = process.env.RATE_LIMIT_SALT

/** Requests per 10-second window before the circuit breaker trips. */
const THRESHOLD = Number(process.env.RATE_LIMIT_THRESHOLD) || 500

/** How long (seconds) the circuit breaker stays open once tripped. */
const COOLDOWN_SECONDS = Number(process.env.RATE_LIMIT_COOLDOWN_SECONDS) || 300

/**
 * Module-level Redis client — instantiated once per Edge worker lifetime
 * rather than on every request to avoid unnecessary object allocation.
 * The client is lazily created on the first request that reaches this code.
 */
let _redis: Redis | null = null

function getRedis(): Redis | null {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return null
  }
  if (!_redis) {
    _redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
  }
  return _redis
}

/**
 * Hash an IP with SHA-256 + salt using the Web Crypto API (Edge-compatible).
 *
 * Format MUST match `hashIp()` in `api/_ratelimit.ts` which uses:
 *   createHash('sha256').update(SALT + ip).digest('hex')
 * i.e. direct string concatenation without any separator.
 * Both functions must stay in sync so the middleware can read block entries
 * written by the serverless API layer (stored under `nk-blocked:<hash>`).
 */
async function hashIp(ip: string, salt: string): Promise<string> {
  // Direct concatenation — matches Node.js `createHash('sha256').update(SALT + ip)`.
  const data = new TextEncoder().encode(`${salt}${ip}`)
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

export default async function middleware(req: Request): Promise<Response | undefined> {
  const redis = getRedis()

  // Skip when Redis is not configured (local development)
  if (!redis) {
    return
  }

  // Hard-fail when RATE_LIMIT_SALT is missing in production.
  // Without a salt the IP hash is predictable, undermining GDPR-compliant
  // IP anonymisation. Log the error and skip rate-limiting — do NOT fall
  // back to a hardcoded default that an attacker could exploit.
  if (!SALT) {
    console.error('[middleware] RATE_LIMIT_SALT env var is not set. Rate limiting disabled — set this variable in production.')
    return
  }

  try {
    // ── 1. Circuit Breaker ──────────────────────────────────────────
    const isUnderAttack = await redis.get('zd_under_attack')
    if (isUnderAttack) {
      return new Response(null, { status: 429 })
    }

    // ── 2. Hard-Blocked IP Gate ─────────────────────────────────────
    const ip = getClientIp(req)
    const hashedIp = await hashIp(ip, SALT)
    const isBlocked = await redis.get(`nk-blocked:${hashedIp}`)
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
