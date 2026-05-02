import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getRedis, isRedisConfigured } from './_redis.js'
const kv = new Proxy({} as ReturnType<typeof getRedis>, {
  get (_, prop: string | symbol) { return Reflect.get(getRedis(), prop) },
})
import { applyRateLimit } from './_ratelimit.js'
import { isHoneytoken, triggerHoneytokenAlarm, isMarkedAttacker, injectEntropyHeaders, getRandomTaunt, setDefenseHeaders } from './_honeytokens.js'
import { kvGetQuerySchema, kvPostSchema, validate } from './_schemas.js'
import { validateSession } from './auth.js'
import { isHardBlocked } from './_blocklist.js'
// Check if KV is properly configured

/**
 * Allow-list of keys that may be read without admin authentication.
 * All other keys require a valid session cookie.
 * This prevents accidental leakage of sensitive data stored under
 * arbitrary key names (e.g. stripe_api_key, db_password, etc.).
 *
 * band-data is publicly readable but is sanitized on write to strip
 * any fields matching sensitive patterns (token, secret, password, etc.).
 */
const ALLOWED_PUBLIC_READ_KEYS = new Set([
  'band-data',
  'site-config',
  'admin:settings',
])

// Constant-time string comparison to prevent timing attacks on hash comparison.
// Always compares the full length of the longer string to avoid leaking length.
export function timingSafeEqual(a: unknown, b: unknown): boolean {
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
  const rawUa = req.headers['user-agent'] || ''
  const ua = Array.isArray(rawUa) ? rawUa[0] : rawUa
  return SUSPICIOUS_UA_PATTERNS.some(p => p.test(ua))
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<unknown> {
  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  // Hard-block check — immediate rejection
  const blocked = await isHardBlocked(req)
  if (blocked) {
    return res.status(403).json({ error: 'FORBIDDEN' })
  }

  // Wfuzz / hacking tool detection — immediate block (no tarpit to prevent FDoS)
  if (isSuspiciousUA(req)) {
    return res.status(403).json({
      error: 'NOOB_DETECTED',
      tip: 'Next time, try changing your User-Agent before hacking a band.',
    })
  }

  // Rate limiting — blocks brute-force and DoS attacks (GDPR-compliant, IP is hashed)
  const allowed = await applyRateLimit(req, res)
  if (!allowed) return

  // Entropy injection counter-measure: inject noise headers for flagged attacker IPs
  if (await isMarkedAttacker(req)) {
    injectEntropyHeaders(res)
    setDefenseHeaders(res)
  }

  // Check if KV is configured
  if (!isRedisConfigured()) {
    console.error('KV not configured: Missing UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN environment variables')
    return res.status(503).json({ 
      error: 'Service unavailable',
      message: 'KV storage is not configured. Please set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN environment variables.'
    })
  }

  try {
    if (req.method === 'GET') {
      // Zod validation
      const parsed = validate(kvGetQuerySchema, req.query)
      if (!parsed.success) return res.status(400).json({ error: parsed.error })
      const { key } = parsed.data

      // Honeytoken detection — taunting response on GET.
      // Confrontational message lets the attacker know they've been caught.
      if (isHoneytoken(key)) {
        const responseSent = await triggerHoneytokenAlarm(req, key, res)
        if (responseSent) return
        setDefenseHeaders(res)
        return res.status(403).json({
          error: 'ACCESS_DENIED',
          message: getRandomTaunt(),
        })
      }

      // Allow-list: only explicitly listed keys are publicly readable.
      // All other keys require a valid session to prevent leakage
      // of sensitive data stored under arbitrary key names.
      // validateSession is called exactly once per request and the result
      // is reused for both the auth gate and the selective field-stripping logic.
      const isPublicRead = ALLOWED_PUBLIC_READ_KEYS.has(key)
      const isAuthenticated = await validateSession(req)
      if (!isPublicRead && !isAuthenticated) {
        return res.status(403).json({ error: 'Forbidden' })
      }

      const value = await kv.get(key)

      // Strip sensitive terminal command data from public band-data reads.
      // Terminal commands contain secrets that should only be served via
      // the dedicated /api/terminal endpoint, not exposed in the full payload.
      if (key === 'band-data' && isPublicRead && !isAuthenticated && value && typeof value === 'object') {
        const { terminalCommands: _stripped, ...safeValue } = value as Record<string, unknown>
        return res.json({ value: safeValue })
      }

      // Strip sensitive fields from public site-config reads.
      // syncUrl, secretCode, and configOverrides may contain secrets;
      // widget plugin configs are sanitized to mask API keys/tokens.
      if (key === 'site-config' && isPublicRead && !isAuthenticated && value && typeof value === 'object') {
        const { syncUrl: _su, secretCode: _sc, configOverrides: _co, ...safeConfig } = value as Record<string, unknown>
        // Sanitize widget plugin configs to mask sensitive values
        if (Array.isArray(safeConfig.widgetPlugins)) {
          safeConfig.widgetPlugins = safeConfig.widgetPlugins.map((plugin: Record<string, unknown>) => {
            if (!plugin.config || typeof plugin.config !== 'object') return plugin
            const sanitized: Record<string, unknown> = {}
            for (const [k, v] of Object.entries(plugin.config)) {
              const lower = k.toLowerCase()
              if (lower.includes('key') || lower.includes('token') || lower.includes('secret') || lower.includes('password')) {
                sanitized[k] = '***'
              } else {
                sanitized[k] = v
              }
            }
            return { ...plugin, config: sanitized }
          })
        }
        return res.json({ value: safeConfig })
      }

      // Strip sensitive fields from public admin:settings reads.
      // terminalCommands and configOverrides may contain secrets;
      // contactInfo.emailForwardTo is a private email address.
      if (key === 'admin:settings' && isPublicRead && !isAuthenticated && value && typeof value === 'object') {
        const { terminalCommands: _tc, configOverrides: _co, ...safeSettings } = value as Record<string, unknown>
        if (safeSettings.contactInfo && typeof safeSettings.contactInfo === 'object') {
          const { emailForwardTo: _ef, ...safeContactInfo } = safeSettings.contactInfo as Record<string, unknown>
          safeSettings.contactInfo = safeContactInfo
        }
        return res.json({ value: safeSettings })
      }

      return res.json({ value: value ?? null })
    }

    if (req.method === 'POST') {
      if (!req.body || typeof req.body !== 'object') {
        return res.status(400).json({ error: 'Request body is required' })
      }

      // Zod validation
      const parsed = validate(kvPostSchema, req.body)
      if (!parsed.success) return res.status(400).json({ error: parsed.error })
      const { key, value } = parsed.data

      // Honeytoken detection — taunting response on POST.
      if (isHoneytoken(key)) {
        const responseSent = await triggerHoneytokenAlarm(req, key, res)
        if (responseSent) return
        setDefenseHeaders(res)
        return res.status(403).json({
          error: 'ACCESS_DENIED',
          message: getRandomTaunt(),
        })
      }

      // Block writes to internal keys used by analytics or system functions
      const lowerKey = key.toLowerCase()
      if (lowerKey.startsWith('nk-analytics') || lowerKey.startsWith('nk-heatmap') || lowerKey.startsWith('img-cache:')) {
        return res.status(403).json({ error: 'Forbidden: reserved key prefix' })
      }

      // Block direct writes to admin-password-hash — only allowed through /api/auth
      if (key === 'admin-password-hash') {
        return res.status(403).json({ error: 'Forbidden: use /api/auth to manage passwords' })
      }

      // All other writes require a valid session
      const sessionValid = await validateSession(req)
      if (!sessionValid) {
        return res.status(403).json({ error: 'Unauthorized' })
      }

      // Sanitize band-data writes: strip any fields that look like secrets/tokens
      // to prevent accidental exposure since band-data is publicly readable.
      if (key === 'band-data' && value && typeof value === 'object' && !Array.isArray(value)) {
        const SENSITIVE_FIELD_PATTERNS = [/token/i, /secret/i, /password/i, /apikey/i, /api_key/i, /credential/i]
        // Known-safe fields that match sensitive patterns but are not actual secrets
        const SAFE_BAND_DATA_FIELDS = new Set(['secretCode', 'configOverrides', 'seo'])
        const sanitized = Object.fromEntries(
          Object.entries(value).filter(([k]) => SAFE_BAND_DATA_FIELDS.has(k) || !SENSITIVE_FIELD_PATTERNS.some(p => p.test(k)))
        )

        // Preserve terminalCommands from existing data when not provided in the
        // incoming value.  Public (unauthenticated) GET responses strip this field
        // for security, so a client that loaded the page before logging in will not
        // have it in its state.  Without this merge the commands would be silently
        // deleted on the next unrelated save.
        if (!('terminalCommands' in sanitized)) {
          try {
            const existing = await kv.get<Record<string, unknown>>(key)
            if (existing && typeof existing === 'object' && Array.isArray((existing as Record<string, unknown>).terminalCommands)) {
              sanitized.terminalCommands = (existing as Record<string, unknown>).terminalCommands
            }
          } catch { /* ignore — best-effort preservation */ }
        }

        await kv.set(key, sanitized)
        return res.json({ success: true })
      }

      // Preserve fields stripped from public reads of admin:settings.
      // An unauthenticated page load receives admin:settings without
      // terminalCommands, configOverrides, and contactInfo.emailForwardTo.
      // Without this merge an admin who visits the page before logging in
      // and then saves any setting would permanently delete those fields.
      if (key === 'admin:settings' && value && typeof value === 'object' && !Array.isArray(value)) {
        const incoming = value as Record<string, unknown>
        try {
          const existing = await kv.get<Record<string, unknown>>(key)
          if (existing && typeof existing === 'object') {
            for (const field of ['terminalCommands', 'configOverrides'] as const) {
              if (!(field in incoming) && field in existing) {
                incoming[field] = existing[field]
              }
            }
            // Preserve contactInfo.emailForwardTo
            if (existing.contactInfo && typeof existing.contactInfo === 'object') {
              const existingCi = existing.contactInfo as Record<string, unknown>
              if ('emailForwardTo' in existingCi) {
                if (!incoming.contactInfo || typeof incoming.contactInfo !== 'object') {
                  incoming.contactInfo = { ...existingCi }
                } else {
                  const incomingCi = incoming.contactInfo as Record<string, unknown>
                  if (!('emailForwardTo' in incomingCi)) {
                    incomingCi.emailForwardTo = existingCi.emailForwardTo
                  }
                }
              }
            }
          }
        } catch (preserveErr) {
          console.warn('admin:settings field preservation failed — writing incoming value as-is:', preserveErr instanceof Error ? preserveErr.message : preserveErr)
        }
        await kv.set(key, incoming)
        return res.json({ success: true })
      }

      await kv.set(key, value)
      return res.json({ success: true })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (error) {
    console.error('KV API error:', error)
    // Provide more detailed error message for debugging
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('KV API error details:', {
      message: errorMessage,
      method: req.method,
      // key name intentionally omitted to avoid logging potentially sensitive identifiers
    })
    
    // Check if it's a Redis configuration error from @upstash/redis.
    // Upstash throws when the required environment variables are absent or invalid.
    const isRedisConfigError = error instanceof Error && (
      errorMessage.toLowerCase().includes('upstash_redis_rest_url') ||
      errorMessage.toLowerCase().includes('upstash_redis_rest_token') ||
      errorMessage.toLowerCase().includes('unauthorized') ||
      errorMessage.toLowerCase().includes('fetch failed')
    )
    
    if (isRedisConfigError) {
      return res.status(503).json({ 
        error: 'Service unavailable',
        message: 'Redis storage configuration error. Please check environment variables.'
      })
    }
    
    return res.status(500).json({ 
      error: 'Internal server error'
    })
  }
}
