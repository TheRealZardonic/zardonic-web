import type { VercelRequest, VercelResponse } from '@vercel/node'
import { z } from 'zod'
import { applyRateLimit } from './_ratelimit.js'

/** Maximum lengths for contact form fields (mirrors client schema) */
const MAX_NAME_LENGTH = 100
const MAX_EMAIL_LENGTH = 254
const MAX_SUBJECT_LENGTH = 200
const MAX_MESSAGE_LENGTH = 5000

/** Server-side validation schema */
const contactSchema = z.object({
  name: z.string().trim().min(1).max(MAX_NAME_LENGTH),
  email: z.string().trim().min(1).email().max(MAX_EMAIL_LENGTH),
  subject: z.string().trim().min(1).max(MAX_SUBJECT_LENGTH),
  message: z.string().trim().min(1).max(MAX_MESSAGE_LENGTH),
  /** Honeypot — accepted as any string so we can silently discard bot submissions */
  _hp: z.string().optional(),
})

/**
 * Simple in-memory rate limiter (fallback when Redis is unavailable).
 * The KV-based applyRateLimit from _ratelimit.ts is the primary limiter.
 */
const RATE_LIMIT_WINDOW_MS = 60_000
const RATE_LIMIT_MAX = 5

const ipHits = new Map<string, { count: number; resetAt: number }>()

function isRateLimitedInMemory(ip: string): boolean {
  const now = Date.now()
  const entry = ipHits.get(ip)
  if (!entry || now > entry.resetAt) {
    ipHits.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
    return false
  }
  entry.count++
  return entry.count > RATE_LIMIT_MAX
}

/**
 * Extracts the client IP from Vercel/proxy headers.
 * Falls back to 'unknown' when running locally.
 */
function getClientIp(req: VercelRequest): string {
  const forwarded = req.headers['x-forwarded-for']
  if (typeof forwarded === 'string') return forwarded.split(',')[0].trim()
  if (Array.isArray(forwarded) && forwarded.length > 0) return forwarded[0].split(',')[0].trim()
  return 'unknown'
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // --- KV-based rate limiting (GDPR-compliant, IP hashed) ---
  const rlAllowed = await applyRateLimit(req, res)
  if (!rlAllowed) return

  // --- Fallback in-memory rate limiting (multi-submission guard) ---
  const ip = getClientIp(req)
  if (isRateLimitedInMemory(ip)) {
    return res.status(429).json({ error: 'Too many requests — please try again later' })
  }

  // --- Input validation ---
  const parsed = contactSchema.safeParse(req.body)
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message || 'Invalid input'
    return res.status(400).json({ error: firstError })
  }

  const { name, email, subject, message, _hp } = parsed.data

  // Honeypot check — bots typically fill hidden fields
  if (_hp) {
    // Silently accept to avoid leaking detection to bots
    return res.status(200).json({ success: true })
  }

  try {
    // Store the contact submission in Upstash Redis (if configured)
    const redisUrl = process.env.UPSTASH_REDIS_REST_URL
    const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN

    if (redisUrl && redisToken) {
      const { Redis } = await import('@upstash/redis')
      const redis = new Redis({ url: redisUrl, token: redisToken })

      const submission = {
        name,
        email,
        subject,
        message,
        ip,
        createdAt: new Date().toISOString(),
      }

      // Store in a list of contact submissions (keep last 100)
      const listKey = 'contact-submissions'
      await redis.lpush(listKey, JSON.stringify(submission))
      await redis.ltrim(listKey, 0, 99)
      // Set a 90-day TTL on the list so old submissions are cleaned up
      await redis.expire(listKey, 90 * 24 * 60 * 60)
    } else {
      // Log to server console when Redis is not configured (development)
      console.log('Contact form submission (Redis not configured):', { name, subject })
    }

    return res.status(200).json({ success: true })
  } catch (error) {
    console.error('Contact API error:', error)
    return res.status(500).json({ error: 'Internal server error — please try again later' })
  }
}
