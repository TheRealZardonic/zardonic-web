import type { VercelRequest, VercelResponse } from '@vercel/node'
import { Redis } from '@upstash/redis'
import { applyRateLimit } from './_ratelimit.js'
import { isHoneytoken, triggerHoneytokenAlarm, isMarkedAttacker, injectEntropyHeaders, getRandomTaunt, setDefenseHeaders } from './_honeytokens.js'
import { kvGetQuerySchema, kvPostSchema, validate } from './_schemas.js'
import { validateSession } from './auth.js'
import { isHardBlocked } from './_blocklist.js'

// Check if KV is properly configured
const isKVConfigured = () => {
  return !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)
}

/**
 * Allow-list of keys that may be read without admin authentication.
 * Only explicitly listed keys are publicly readable.
 */
const ALLOWED_PUBLIC_READ_KEYS = new Set([
  'zardonic-band-data',
  'zardonic-site-data',
])

/**
 * Keys whose data is long-lived admin-managed content and must not have a TTL.
 * All other (cached/transient) keys use a 90-day expiry.
 */
const PERSISTENT_KEYS = new Set([
  'zardonic-band-data',
  'zardonic-site-data',
])

// Lazily create the Redis client so we only instantiate when env vars are set
let _redis: Redis | null = null
function getRedis(): Redis {
  if (!_redis) {
    const url = process.env.UPSTASH_REDIS_REST_URL
    const token = process.env.UPSTASH_REDIS_REST_TOKEN
    if (!url || !token) {
      throw new Error('Missing UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN')
    }
    _redis = new Redis({ url, token })
  }
  return _redis
}

// Constant-time string comparison to prevent timing attacks on hash comparison
export function timingSafeEqual(a: string, b: string): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') return false
  const len = Math.max(a.length, b.length)
  let result = a.length ^ b.length
  for (let i = 0; i < len; i++) {
    result |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0)
  }
  return result === 0
}

/** Suspicious User-Agent patterns used by hacking/fuzzing tools */
const SUSPICIOUS_UA_PATTERNS = [/wfuzz/i, /nikto/i, /sqlmap/i, /dirbuster/i, /gobuster/i, /ffuf/i]

function isSuspiciousUA(req: VercelRequest): boolean {
  const ua = req.headers['user-agent'] || ''
  return SUSPICIOUS_UA_PATTERNS.some(p => p.test(ua))
}

/** Sensitive key patterns that must never be readable by the public */
const SENSITIVE_KEY_PATTERNS = [/token/i, /secret/i, /password/i, /private/i, /credential/i]

function hasSensitivePattern(key: string): boolean {
  return SENSITIVE_KEY_PATTERNS.some(p => p.test(key))
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  // Hard-block check — immediate rejection
  const blocked = await isHardBlocked(req)
  if (blocked) {
    return res.status(403).json({ error: 'FORBIDDEN' })
  }

  // Wfuzz / hacking tool detection
  if (isSuspiciousUA(req)) {
    return res.status(403).json({
      error: 'NOOB_DETECTED',
      tip: "Next time, try changing your User-Agent before hacking a band.",
    })
  }

  // Rate limiting (GDPR-compliant, IP is hashed)
  const allowed = await applyRateLimit(req, res)
  if (!allowed) return

  // Entropy injection for flagged attacker IPs
  if (await isMarkedAttacker(req)) {
    injectEntropyHeaders(res)
    setDefenseHeaders(res)
  }

  // Check if KV is configured
  if (!isKVConfigured()) {
    console.error('KV not configured: Missing UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN environment variables')
    return res.status(503).json({ 
      error: 'Service unavailable',
      message: 'KV storage is not configured. Please set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN environment variables.'
    })
  }

  const kv = getRedis()

  try {
    if (req.method === 'GET') {
      const parsed = validate(kvGetQuerySchema, req.query)
      if (!parsed.success) return res.status(400).json({ error: parsed.error })
      const { key } = parsed.data

      // Honeytoken detection on GET
      if (isHoneytoken(key)) {
        await triggerHoneytokenAlarm(req, key)
        setDefenseHeaders(res)
        return res.status(403).json({
          error: 'ACCESS_DENIED',
          message: getRandomTaunt(),
        })
      }

      // Allow-list: only explicitly listed keys are publicly readable
      const isPublicRead = ALLOWED_PUBLIC_READ_KEYS.has(key)
      if (!isPublicRead) {
        const sessionValid = await validateSession(req)
        if (!sessionValid) {
          return res.status(403).json({ error: 'Forbidden' })
        }
      }

      const value = await kv.get(key)

      // Strip sensitive fields from public band-data reads
      if (isPublicRead && value && typeof value === 'object') {
        const safeValue = { ...(value as Record<string, unknown>) }
        delete safeValue['terminalCommands']
        return res.json({ value: safeValue })
      }

      return res.json({ value: value ?? null })
    }

    if (req.method === 'POST') {
      if (!req.body || typeof req.body !== 'object') {
        return res.status(400).json({ error: 'Request body is required' })
      }

      const parsed = validate(kvPostSchema, req.body)
      if (!parsed.success) return res.status(400).json({ error: parsed.error })
      const { key, value } = parsed.data

      // Honeytoken detection on POST
      if (isHoneytoken(key)) {
        await triggerHoneytokenAlarm(req, key)
        setDefenseHeaders(res)
        return res.status(403).json({
          error: 'ACCESS_DENIED',
          message: getRandomTaunt(),
        })
      }

      // Block writes to sensitive key patterns without a valid session
      if (hasSensitivePattern(key) && key !== 'admin-password-hash') {
        const sessionValid = await validateSession(req)
        if (!sessionValid) {
          return res.status(403).json({ error: 'Forbidden' })
        }
      }

      // All writes require a valid session (except initial password setup)
      if (key === 'admin-password-hash') {
        const existingHash = await kv.get<string>('admin-password-hash')
        if (existingHash) {
          const sessionValid = await validateSession(req)
          if (!sessionValid) {
            return res.status(403).json({ error: 'Unauthorized' })
          }
        }
      } else {
        const sessionValid = await validateSession(req)
        if (!sessionValid) {
          return res.status(403).json({ error: 'Unauthorized' })
        }
      }

      // Persistent keys and admin-password-hash never expire.
      // All other (transient/cached) keys use a 90-day TTL.
      if (key === 'admin-password-hash' || PERSISTENT_KEYS.has(key)) {
        await kv.set(key, value)
      } else {
        await kv.set(key, value, { ex: 90 * 24 * 60 * 60 }) // 90-day TTL for transient/cached keys
      }
      return res.json({ success: true })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (error) {
    console.error('KV API error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    
    const isKVConfigError = error instanceof Error && (
      errorMessage.toLowerCase().includes('upstash_redis_rest_url') ||
      errorMessage.toLowerCase().includes('upstash_redis_rest_token') ||
      errorMessage.toLowerCase().includes('upstash') ||
      errorMessage.toLowerCase().includes('missing credentials')
    )
    
    if (isKVConfigError) {
      return res.status(503).json({ 
        error: 'Service unavailable',
        message: 'KV storage configuration error. Please check environment variables.',
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
      })
    }
    
    return res.status(500).json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
    })
  }
}
