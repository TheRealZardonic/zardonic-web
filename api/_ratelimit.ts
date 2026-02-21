import { Redis } from '@upstash/redis'
import { Ratelimit } from '@upstash/ratelimit'
import { createHash } from 'node:crypto'
import type { VercelRequest, VercelResponse } from '@vercel/node'

/**
 * GDPR-compliant rate limiting utility.
 *
 * - Uses @upstash/ratelimit with Upstash Redis as the backing store.
 * - IP addresses are hashed with SHA-256 + a secret salt before being used
 *   as identifiers, so no personal data (IP) is stored in plaintext.
 * - Rate limit state is ephemeral — entries expire automatically after the
 *   sliding window period (10 s default).
 *
 * The salt is read from the RATE_LIMIT_SALT environment variable. If absent,
 * a hardcoded fallback is used so the system still works in development.
 */

const SALT = process.env.RATE_LIMIT_SALT || 'zd-default-rate-limit-salt-change-me'

// Refuse to start in production without a unique salt — a static fallback would
// allow attackers to reverse IP hashes via rainbow tables since the code is public.
if (!process.env.RATE_LIMIT_SALT && process.env.NODE_ENV === 'production') {
  throw new Error('[SECURITY] RATE_LIMIT_SALT environment variable is not set. A unique random salt is required in production to protect IP hashes. Generate one with: openssl rand -hex 32')
}

const isKVConfigured = () =>
  !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)

/**
 * Hash an IP address with SHA-256 + salt so it can be used as a rate-limit
 * key without storing PII.
 */
export function hashIp(ip: string): string {
  return createHash('sha256').update(SALT + ip).digest('hex')
}

/**
 * Extract the client IP from a Vercel serverless request.
 * Vercel sets `x-forwarded-for`; we take the first address in the chain.
 */
export function getClientIp(req: VercelRequest): string {
  const forwarded = req.headers['x-forwarded-for']
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim()
  }
  if (Array.isArray(forwarded) && forwarded.length > 0) {
    return forwarded[0].split(',')[0].trim()
  }
  return '127.0.0.1'
}

/**
 * Pre-configured rate limiter instance.
 * Sliding window: 5 requests per 10 seconds per (hashed) IP.
 *
 * Only created when KV is configured; otherwise applyRateLimit() is a no-op
 * so local development without KV still works.
 */
let ratelimit: Ratelimit | null = null

function getRatelimit(): Ratelimit | null {
  if (ratelimit) return ratelimit
  if (!isKVConfigured()) return null
  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  })
  ratelimit = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, '10 s'),
    prefix: 'zd-rl',
  })
  return ratelimit
}

/**
 * Apply rate limiting to a request.
 *
 * Returns `true` if the request is allowed, `false` + sends a 429 response
 * if the limit has been exceeded.
 *
 * Usage inside a Vercel handler:
 *   const allowed = await applyRateLimit(req, res)
 *   if (!allowed) return   // 429 already sent
 */
export async function applyRateLimit(req: VercelRequest, res: VercelResponse): Promise<boolean> {
  const rl = getRatelimit()
  if (!rl) return true // KV not configured — allow (dev mode)

  const ip = getClientIp(req)
  const identifier = hashIp(ip)

  try {
    const { success } = await rl.limit(identifier)
    if (!success) {
      res.status(429).setHeader('Retry-After', '10').json({
        error: 'Too Many Requests',
        message: 'Rate limit exceeded. Please try again in a few seconds.',
      })
      return false
    }
    return true
  } catch (err) {
    // If rate limiting itself fails (e.g. KV outage), fail closed to prevent
    // brute-force bypass by destabilizing the KV backend.
    console.error('Rate limit check failed, blocking request:', err)
    res.status(503).json({
      error: 'Service Unavailable',
      message: 'Rate limiting service is temporarily unavailable. Please try again later.',
    })
    return false
  }
}
