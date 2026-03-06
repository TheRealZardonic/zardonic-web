import { Redis } from '@upstash/redis'
import { scrypt, randomBytes, createHash, timingSafeEqual as cryptoTimingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { applyRateLimit, getClientIp } from './_ratelimit.js'
import {
  authLoginSchema,
  authSetupSchema,
  authChangePasswordSchema,
  authLoginTotpSchema,
  totpSetupSchema,
  totpVerifySchema,
  validate,
} from './_schemas.js'
import * as OTPAuth from 'otpauth'

const scryptAsync = promisify(scrypt)

const SESSION_TTL = 14400 // 4 hours
const COOKIE_NAME = 'zd-session'
const TOTP_ISSUER = 'ZARDONIC Admin'
const TOTP_KEY = 'zd-admin-totp-secret'

const isKVConfigured = () => {
  return !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)
}

let _redis: Redis | null = null

function getRedis(): Redis {
  if (_redis) return _redis
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    throw new Error('Missing UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN')
  }
  _redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  })
  return _redis
}

/**
 * Hash a password with scrypt + random salt.
 * Format: scrypt:<salt_hex>:<derived_key_hex>
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex')
  const derived = await scryptAsync(password, salt, 64) as Buffer
  return `scrypt:${salt}:${derived.toString('hex')}`
}

/**
 * Verify a password against a stored hash.
 * Supports both scrypt (new) and legacy SHA-256 formats.
 */
async function verifyPassword(password: string, stored: string): Promise<boolean> {
  if (!stored.startsWith('scrypt:')) {
    // Legacy SHA-256 format
    const hash = createHash('sha256').update(password).digest('hex')
    const a = Buffer.from(hash, 'utf8')
    const b = Buffer.from(stored, 'utf8')
    if (a.length !== b.length) return false
    return cryptoTimingSafeEqual(a, b)
  }

  const parts = stored.split(':')
  const salt = parts[1]
  const key = parts[2]
  const derived = await scryptAsync(password, salt, 64) as Buffer
  const storedKey = Buffer.from(key, 'hex')
  if (derived.length !== storedKey.length) return false
  return cryptoTimingSafeEqual(derived, storedKey)
}

function setSessionCookie(res: VercelResponse, token: string): void {
  const isLocal = process.env.NODE_ENV !== 'production' && !process.env.VERCEL
  const secure = isLocal ? '' : ' Secure;'
  res.setHeader('Set-Cookie', `${COOKIE_NAME}=${token}; HttpOnly;${secure} SameSite=Strict; Path=/; Max-Age=${SESSION_TTL}`)
}

function clearSessionCookie(res: VercelResponse): void {
  const isLocal = process.env.NODE_ENV !== 'production' && !process.env.VERCEL
  const secure = isLocal ? '' : ' Secure;'
  res.setHeader('Set-Cookie', `${COOKIE_NAME}=; HttpOnly;${secure} SameSite=Strict; Path=/; Max-Age=0`)
}

/** Extract session token from the zd-session cookie */
export function getSessionFromCookie(req: VercelRequest): string | null {
  const cookieHeader = req.headers.cookie || ''
  const match = cookieHeader.match(/(?:^|;\s*)zd-session=([^;]*)/)
  return match ? match[1] : null
}

/**
 * Derive a client fingerprint from User-Agent and IP prefix.
 * Used to bind sessions to the originating client and detect session hijacking.
 */
function getClientFingerprint(req: VercelRequest): string {
  const ua = req.headers['user-agent'] || ''
  const ip = getClientIp(req)
  let ipPrefix: string
  if (ip.includes(':')) {
    ipPrefix = ip.split(':').slice(0, 3).join(':')
  } else {
    ipPrefix = ip.split('.').slice(0, 3).join('.')
  }
  return createHash('sha256').update(`${ua}|${ipPrefix}`).digest('hex')
}

interface SessionData {
  created: number
  fingerprint: string
}

/** Validate that the request has a valid session. Returns true/false. */
export async function validateSession(req: VercelRequest): Promise<boolean> {
  // Check both zd-session cookie (new) and x-session-token header (legacy)
  const cookieToken = getSessionFromCookie(req)
  const headerToken = req.headers['x-session-token'] as string | undefined

  const token = cookieToken || headerToken
  if (!token) return false

  const kv = getRedis()
  const sessionData = await kv.get<SessionData>(`zd-session:${token}`)
  if (!sessionData) {
    // Fallback: check legacy session key (without prefix) for backward compat
    const legacySession = await kv.get<{ token?: string; fingerprint?: string }>(`session:${token}`)
    return !!legacySession
  }

  // Validate client binding — reject if User-Agent or IP subnet changed (cookie sessions only)
  if (cookieToken && sessionData.fingerprint) {
    const currentFingerprint = getClientFingerprint(req)
    if (sessionData.fingerprint !== currentFingerprint) return false
  }

  return true
}

async function createSession(req: VercelRequest, res: VercelResponse): Promise<string> {
  const token = randomBytes(32).toString('hex')
  const fingerprint = getClientFingerprint(req)
  const kv = getRedis()
  await kv.set(`zd-session:${token}`, { created: Date.now(), fingerprint }, { ex: SESSION_TTL })
  setSessionCookie(res, token)
  return token
}

/**
 * Invalidate all existing sessions.
 * Called after a password change to force re-authentication.
 */
async function invalidateAllSessions(): Promise<void> {
  const kv = getRedis()
  try {
    let cursor = 0
    do {
      const [nextCursor, keys] = await kv.scan(cursor, { match: 'zd-session:*', count: 100 })
      cursor = Number(nextCursor)
      if (keys.length > 0) {
        await Promise.all((keys as string[]).map(key => kv.del(key)))
      }
    } while (cursor !== 0)
  } catch (err) {
    console.error('Failed to invalidate sessions:', err)
  }
}

function generateTotpSecret(): { secret: string; uri: string } {
  const secret = new OTPAuth.Secret({ size: 20 })
  const totp = new OTPAuth.TOTP({
    issuer: TOTP_ISSUER,
    label: 'admin',
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret,
  })
  return { secret: secret.base32, uri: totp.toString() }
}

function verifyTotpCode(secret: string, code: string): boolean {
  const totp = new OTPAuth.TOTP({
    issuer: TOTP_ISSUER,
    label: 'admin',
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(secret),
  })
  const delta = totp.validate({ token: code, window: 1 })
  return delta !== null
}

function validateSetupToken(setupToken: string | undefined): boolean {
  const requiredToken = process.env.ADMIN_SETUP_TOKEN
  if (!requiredToken) return true
  if (!setupToken || typeof setupToken !== 'string') return false
  const a = Buffer.from(requiredToken, 'utf8')
  const b = Buffer.from(setupToken, 'utf8')
  if (a.length !== b.length) return false
  return cryptoTimingSafeEqual(a, b)
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end()

  const allowed = await applyRateLimit(req, res)
  if (!allowed) return

  if (!isKVConfigured()) {
    return res.status(503).json({ error: 'Service unavailable', message: 'KV storage is not configured.' })
  }

  const kv = getRedis()

  try {
    // GET — check auth status
    if (req.method === 'GET') {
      const authenticated = await validateSession(req)
      const storedHash = await kv.get('admin-password-hash')
      const totpSecret = await kv.get(TOTP_KEY)
      return res.json({
        authenticated,
        needsSetup: !storedHash,
        totpEnabled: !!totpSecret,
        setupTokenRequired: !!process.env.ADMIN_SETUP_TOKEN,
      })
    }

    if (req.method === 'POST') {
      if (!req.body || typeof req.body !== 'object') {
        return res.status(400).json({ error: 'Request body is required' })
      }

      const { action, newPassword } = req.body as Record<string, unknown>

      // --- Setup flow ---
      if (action === 'setup') {
        const parsed = validate(authSetupSchema, req.body)
        if (!parsed.success) return res.status(400).json({ error: parsed.error })

        if (!validateSetupToken((req.body as Record<string, string>).setupToken)) {
          return res.status(403).json({ error: 'Invalid setup token' })
        }

        const existingHash = await kv.get('admin-password-hash')
        if (existingHash) {
          return res.status(409).json({ error: 'Password already configured' })
        }

        const hashed = await hashPassword(parsed.data.password)
        await kv.set('admin-password-hash', hashed)
        await createSession(req, res)
        return res.json({ success: true })
      }

      // --- TOTP enrollment ---
      if (action === 'totp-setup') {
        const sessionValid = await validateSession(req)
        if (!sessionValid) return res.status(401).json({ error: 'Authentication required' })

        const existingTotp = await kv.get(TOTP_KEY)
        if (existingTotp) {
          return res.status(409).json({ error: 'TOTP is already configured. Disable it first to re-enroll.' })
        }

        const { secret, uri } = generateTotpSecret()
        await kv.set('zd-admin-totp-pending', secret, { ex: 300 })
        return res.json({ success: true, totpUri: uri, totpSecret: secret })
      }

      // --- TOTP confirm enrollment ---
      if (action === 'totp-verify') {
        const sessionValid = await validateSession(req)
        if (!sessionValid) return res.status(401).json({ error: 'Authentication required' })

        const parsed = validate(totpVerifySchema, req.body)
        if (!parsed.success) return res.status(400).json({ error: parsed.error })

        const pendingSecret = await kv.get<string>('zd-admin-totp-pending')
        if (!pendingSecret) {
          return res.status(400).json({ error: 'No pending TOTP enrollment. Start setup first.' })
        }

        if (!verifyTotpCode(pendingSecret, parsed.data.code)) {
          return res.status(403).json({ error: 'Invalid TOTP code. Please try again.' })
        }

        await kv.set(TOTP_KEY, pendingSecret)
        await kv.del('zd-admin-totp-pending')

        return res.json({ success: true, message: 'TOTP 2FA has been enabled.' })
      }

      // --- TOTP disable ---
      if (action === 'totp-disable') {
        const sessionValid = await validateSession(req)
        if (!sessionValid) return res.status(401).json({ error: 'Authentication required' })

        const parsed = validate(totpSetupSchema, req.body)
        if (!parsed.success) return res.status(400).json({ error: parsed.error })

        const storedHash = await kv.get<string>('admin-password-hash')
        if (!storedHash) return res.status(400).json({ error: 'No password set' })

        const valid = await verifyPassword(parsed.data.password, storedHash)
        if (!valid) return res.status(403).json({ error: 'Invalid password' })

        const totpSecret = await kv.get<string>(TOTP_KEY)
        if (!totpSecret) return res.status(400).json({ error: 'TOTP is not enabled' })

        if (!verifyTotpCode(totpSecret, parsed.data.code)) {
          return res.status(403).json({ error: 'Invalid TOTP code' })
        }

        await kv.del(TOTP_KEY)
        return res.json({ success: true, message: 'TOTP 2FA has been disabled.' })
      }

      // --- Change password flow ---
      if (newPassword) {
        const sessionValid = await validateSession(req)
        if (!sessionValid) return res.status(401).json({ error: 'Authentication required' })

        const storedHash = await kv.get<string>('admin-password-hash')
        if (!storedHash) return res.status(400).json({ error: 'No password set' })

        const parsed = validate(authChangePasswordSchema, req.body)
        if (!parsed.success) return res.status(400).json({ error: parsed.error })

        const valid = await verifyPassword(parsed.data.currentPassword, storedHash)
        if (!valid) return res.status(403).json({ error: 'Current password is incorrect' })

        if (typeof newPassword !== 'string' || newPassword.length < 8 || newPassword.length > 200) {
          return res.status(400).json({ error: 'New password must be 8-200 characters' })
        }

        const hashed = await hashPassword(newPassword)
        await kv.set('admin-password-hash', hashed)

        await invalidateAllSessions()
        await createSession(req, res)
        return res.json({ success: true })
      }

      // --- Login flow ---
      if ((req.body as Record<string, unknown>).password && !action) {
        const totpSecret = await kv.get<string>(TOTP_KEY)

        const schema = totpSecret ? authLoginTotpSchema : authLoginSchema
        const parsed = validate(schema, req.body)
        if (!parsed.success) return res.status(400).json({ error: parsed.error })

        const storedHash = await kv.get<string>('admin-password-hash')
        if (!storedHash) return res.status(401).json({ error: 'Invalid credentials' })

        const valid = await verifyPassword(parsed.data.password, storedHash)
        if (!valid) return res.status(401).json({ error: 'Invalid credentials' })

        if (totpSecret) {
          const parsedWithTotp = parsed.data as { totpCode?: string }
          if (!parsedWithTotp.totpCode) {
            return res.status(403).json({ error: 'TOTP code required', totpRequired: true })
          }
          if (!verifyTotpCode(totpSecret, parsedWithTotp.totpCode)) {
            return res.status(403).json({ error: 'Invalid TOTP code', totpRequired: true })
          }
        }

        // Migration: rehash legacy SHA-256 to scrypt on successful login
        if (!storedHash.startsWith('scrypt:')) {
          const rehashed = await hashPassword(parsed.data.password)
          await kv.set('admin-password-hash', rehashed)
        }

        await createSession(req, res)
        return res.json({ success: true })
      }

      return res.status(400).json({ error: 'Invalid request' })
    }

    // DELETE — logout
    if (req.method === 'DELETE') {
      const token = getSessionFromCookie(req)
      if (token) {
        await kv.del(`zd-session:${token}`)
      }
      clearSessionCookie(res)
      return res.json({ success: true })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (error) {
    console.error('Auth API error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
