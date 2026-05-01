import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getRedis, isRedisConfigured } from './_redis.js'
const kv = new Proxy({} as ReturnType<typeof getRedis>, {
  get (_, prop: string | symbol) { return Reflect.get(getRedis(), prop) },
})
import { scrypt, randomBytes, createHash, timingSafeEqual as cryptoTimingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'
import { applyRateLimit, getClientIp } from './_ratelimit.js'
import { authLoginSchema, authSetupSchema, authChangePasswordSchema, authLoginTotpSchema, totpSetupSchema, totpVerifySchema, validate } from './_schemas.js'
import * as OTPAuth from 'otpauth'
interface SessionData {
  created: number
  fingerprint: string
}

const scryptAsync = promisify(scrypt)

const SESSION_TTL = 14400 // 4 hours (reduced from 24h to limit session hijacking window)
const COOKIE_NAME = 'nk-session'
const TOTP_ISSUER = process.env.SITE_NAME ? `${process.env.SITE_NAME} Admin` : 'Site Admin'
const TOTP_KEY = 'admin-totp-secret'


/**
 * Hash a password with scrypt + random salt.
 * Format: scrypt:<salt_hex>:<derived_key_hex>
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex')
  const derived = (await scryptAsync(password, salt, 64)) as Buffer
  return `scrypt:${salt}:${derived.toString('hex')}`
}

/**
 * Verify a password against a stored scrypt hash.
 * Only `scrypt:<salt>:<derivedKey>` format is accepted.
 * Non-scrypt hashes (e.g. old SHA-256) are rejected — admins must re-setup
 * their password via the setup endpoint.
 */
async function verifyPassword(password: string, stored: string): Promise<boolean> {
  if (!stored.startsWith('scrypt:')) return false
  const [, salt, key] = stored.split(':')
  const derived = (await scryptAsync(password, salt, 64)) as Buffer
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

/** Extract session token from the nk-session cookie */
export function getSessionFromCookie(req: VercelRequest): string | null {
  const rawCookie = req.headers.cookie || ''
  const cookieHeader = Array.isArray(rawCookie) ? rawCookie.join('; ') : rawCookie
  const match = cookieHeader.match(/(?:^|;\s*)nk-session=([^;]*)/)
  return match ? match[1] : null
}

/**
 * Derive a client fingerprint from User-Agent and IP prefix.
 * Uses /24 subnet for IPv4 (first 3 octets) or /48 for IPv6 (first 3 groups).
 * Used to bind sessions to the originating client and detect session hijacking.
 */
function getClientFingerprint(req: VercelRequest): string {
  const ua = req.headers['user-agent'] || ''
  const ip = getClientIp(req)
  let ipPrefix
  if (ip.includes(':')) {
    // IPv6: use first 3 groups (/48 prefix)
    ipPrefix = ip.split(':').slice(0, 3).join(':')
  } else {
    // IPv4: use first 3 octets (/24 prefix)
    ipPrefix = ip.split('.').slice(0, 3).join('.')
  }
  return createHash('sha256').update(`${ua}|${ipPrefix}`).digest('hex')
}

/** Validate that the request has a valid session. Returns true/false.
 *
 * Accepts either:
 *  1. An `nk-session` HttpOnly cookie (primary, issued by POST /api/auth).
 *  2. An `x-session-token` request header (legacy fallback, issued by POST /api/session).
 *
 * Both session types are stored under the same `session:${token}` Redis key so
 * both can be validated with a single lookup.
 */
export async function validateSession(req: VercelRequest): Promise<boolean> {
  // Primary: cookie-based session (modern path)
  const cookieToken = getSessionFromCookie(req)
  // Fallback: header-based token (legacy path — api/session.ts login)
  const headerToken = typeof req.headers['x-session-token'] === 'string'
    ? req.headers['x-session-token']
    : null

  const token = cookieToken ?? headerToken
  if (!token) return false

  const sessionData = await kv.get<SessionData>(`session:${token}`)
  if (!sessionData) return false
  // Validate client binding — reject if User-Agent or IP subnet changed.
  // Header-based sessions created by api/session.ts do not carry a fingerprint,
  // so the fingerprint check is skipped when the field is absent.
  if (sessionData.fingerprint) {
    const currentFingerprint = getClientFingerprint(req)
    if (sessionData.fingerprint !== currentFingerprint) return false
  }
  return true
}

async function createSession(req: VercelRequest, res: VercelResponse): Promise<string> {
  const token = randomBytes(32).toString('hex')
  const fingerprint = getClientFingerprint(req)
  await kv.set(`session:${token}`, { created: Date.now(), fingerprint }, { ex: SESSION_TTL })
  setSessionCookie(res, token)
  return token
}

/**
 * Invalidate all existing sessions by scanning and deleting session:* keys.
 * Called after a password change to force re-authentication.
 */
export async function invalidateAllSessions(): Promise<void> {
  try {
    let cursor = 0
    do {
      const [nextCursor, keys] = await kv.scan(cursor, { match: 'session:*', count: 100 })
      cursor = Number(nextCursor)
      if (keys.length > 0) {
        await Promise.all(keys.map(key => kv.del(key)))
      }
    } while (cursor !== 0)
  } catch (err) {
    console.error('Failed to invalidate sessions:', err)
  }
}

/**
 * Generate a new TOTP secret and return the provisioning URI for QR code enrollment.
 */
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

/**
 * Verify a TOTP code against the stored secret.
 * Allows ±1 period window (30 s each side) to handle clock skew.
 * Returns the validated delta (time step offset) or null if invalid.
 * The delta must be checked by the caller against the used-codes store
 * to prevent replay attacks.
 */
function getTotpDelta(secret: string, code: string): number | null {
  const totp = new OTPAuth.TOTP({
    issuer: TOTP_ISSUER,
    label: 'admin',
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(secret),
  })
  // delta === null means invalid; otherwise returns the time step offset
  return totp.validate({ token: code, window: 1 })
}

/**
 * Verify a TOTP code and guard against replay attacks.
 * Checks validity then atomically marks the time-step as used in KV
 * for the full validity window (90 s) so the same code cannot be reused.
 */
async function verifyTotpCodeOnce(secret: string, code: string): Promise<boolean> {
  const delta = getTotpDelta(secret, code)
  if (delta === null) return false

  // Derive the canonical counter value (absolute time step) for this code.
  // Using Math.floor(Date.now() / 1000 / 30) + delta gives the exact step
  // that produced this code, making the used-key deterministic regardless
  // of which step in the ±1 window matched.
  const step = Math.floor(Date.now() / 1000 / 30) + delta
  const usedKey = `totp-used:${step}`

  // NX (set if not exists) + 90-second TTL — if the key already exists the
  // code was already used within this window and we reject it.
  try {
    const set = await kv.set(usedKey, 1, { ex: 90, nx: true })
    // @vercel/kv returns 'OK' on success and null when NX prevents the write
    return set !== null
  } catch {
    // KV failure: fail closed — reject the code to prevent replay via KV outage
    return false
  }
}

/**
 * Validate the admin setup token.
 * If ADMIN_SETUP_TOKEN is set, the request must include a matching setupToken.
 */
function validateSetupToken(setupToken: unknown): boolean {
  const requiredToken = process.env.ADMIN_SETUP_TOKEN
  if (!requiredToken) return true // No token configured — allow setup (backward-compatible)
  if (!setupToken || typeof setupToken !== 'string') return false
  const a = Buffer.from(requiredToken, 'utf8')
  const b = Buffer.from(setupToken, 'utf8')
  if (a.length !== b.length) return false
  return cryptoTimingSafeEqual(a, b)
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<unknown> {
  if (req.method === 'OPTIONS') return res.status(200).end()

  const allowed = await applyRateLimit(req, res)
  if (!allowed) return

  if (!isRedisConfigured()) {
    return res.status(503).json({ error: 'Service unavailable', message: 'KV storage is not configured.' })
  }

  try {
    // GET — check auth status
    if (req.method === 'GET') {
      const authenticated = await validateSession(req)
      const storedHash = await kv.get<string>('admin-password-hash')
      const totpSecret = await kv.get<string>(TOTP_KEY)
      return res.json({
        authenticated,
        needsSetup: !storedHash,
        totpEnabled: !!totpSecret,
        setupTokenRequired: !!process.env.ADMIN_SETUP_TOKEN,
      })
    }

    // POST — login, setup, change password, or TOTP management
    if (req.method === 'POST') {
      if (!req.body || typeof req.body !== 'object') {
        return res.status(400).json({ error: 'Request body is required' })
      }

      const { action, newPassword } = req.body as { action?: string; newPassword?: string }

      // --- Setup flow: { password, action: 'setup', setupToken? } ---
      if (action === 'setup') {
        const parsed = validate(authSetupSchema, req.body)
        if (!parsed.success) return res.status(400).json({ error: parsed.error })

        // Validate setup token if ADMIN_SETUP_TOKEN is configured
        if (!validateSetupToken(req.body.setupToken)) {
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

      // --- TOTP enrollment: { action: 'totp-setup' } ---
      if (action === 'totp-setup') {
        const sessionValid = await validateSession(req)
        if (!sessionValid) {
          return res.status(401).json({ error: 'Authentication required' })
        }

        const existingTotp = await kv.get<string>(TOTP_KEY)
        if (existingTotp) {
          return res.status(409).json({ error: 'TOTP is already configured. Disable it first to re-enroll.' })
        }

        const { secret, uri } = generateTotpSecret()
        // Store the pending secret temporarily (5 min TTL) until confirmed
        await kv.set('admin-totp-pending', secret, { ex: 300 })
        return res.json({ success: true, totpUri: uri, totpSecret: secret })
      }

      // --- TOTP confirm enrollment: { action: 'totp-verify', code } ---
      if (action === 'totp-verify') {
        const sessionValid = await validateSession(req)
        if (!sessionValid) {
          return res.status(401).json({ error: 'Authentication required' })
        }

        const parsed = validate(totpVerifySchema, req.body)
        if (!parsed.success) return res.status(400).json({ error: parsed.error })

        const pendingSecret = await kv.get<string>('admin-totp-pending')
        if (!pendingSecret) {
          return res.status(400).json({ error: 'No pending TOTP enrollment. Start setup first.' })
        }

        if (!(await verifyTotpCodeOnce(pendingSecret, parsed.data.code))) {
          return res.status(403).json({ error: 'Invalid TOTP code. Please try again.' })
        }

        // Persist the secret and remove the pending key
        const pipe = kv.pipeline()
        pipe.set(TOTP_KEY, pendingSecret)
        pipe.del('admin-totp-pending')
        await pipe.exec()

        return res.json({ success: true, message: 'TOTP 2FA has been enabled.' })
      }

      // --- TOTP disable: { action: 'totp-disable', password, code } ---
      if (action === 'totp-disable') {
        const sessionValid = await validateSession(req)
        if (!sessionValid) {
          return res.status(401).json({ error: 'Authentication required' })
        }

        const parsed = validate(totpSetupSchema, req.body)
        if (!parsed.success) return res.status(400).json({ error: parsed.error })

        // Require password to disable TOTP (prevents session-hijacking TOTP removal)
        const storedHash = await kv.get<string>('admin-password-hash')
        if (!storedHash) return res.status(400).json({ error: 'No password set' })

        const valid = await verifyPassword(parsed.data.password, storedHash)
        if (!valid) return res.status(403).json({ error: 'Invalid password' })

        // Require a valid TOTP code to confirm the owner has the authenticator
        const totpSecret = await kv.get<string>(TOTP_KEY)
        if (!totpSecret) return res.status(400).json({ error: 'TOTP is not enabled' })

        if (!(await verifyTotpCodeOnce(totpSecret, parsed.data.code))) {
          return res.status(403).json({ error: 'Invalid TOTP code' })
        }

        await kv.del(TOTP_KEY)
        return res.json({ success: true, message: 'TOTP 2FA has been disabled.' })
      }

      // --- Change password flow: { currentPassword, newPassword } ---
      if (newPassword) {
        const sessionValid = await validateSession(req)
        if (!sessionValid) {
          return res.status(401).json({ error: 'Authentication required' })
        }

        const storedHash = await kv.get<string>('admin-password-hash')
        if (!storedHash) {
          return res.status(400).json({ error: 'No password set' })
        }

        // currentPassword is always required to prevent session-hijacking password changes
        const parsed = validate(authChangePasswordSchema, req.body)
        if (!parsed.success) return res.status(400).json({ error: parsed.error })

        const valid = await verifyPassword(parsed.data.currentPassword, storedHash)
        if (!valid) {
          return res.status(403).json({ error: 'Current password is incorrect' })
        }

        // Validate newPassword constraints
        if (typeof newPassword !== 'string' || newPassword.length < 8 || newPassword.length > 200) {
          return res.status(400).json({ error: 'New password must be 8-200 characters' })
        }

        const hashed = await hashPassword(newPassword)
        await kv.set('admin-password-hash', hashed)

        // Invalidate all existing sessions after password change
        await invalidateAllSessions()

        // Create a fresh session for the current user
        await createSession(req, res)
        return res.json({ success: true })
      }

      // --- Login flow: { password, totpCode? } ---
      if (req.body.password && !action) {
        const totpSecret = await kv.get<string>(TOTP_KEY)

        // If TOTP is enabled, use the extended login schema
        const schema = totpSecret ? authLoginTotpSchema : authLoginSchema
        const parsed = validate(schema, req.body)
        if (!parsed.success) return res.status(400).json({ error: parsed.error })
        const loginData = parsed.data as { password: string; totpCode?: string }

        const storedHash = await kv.get<string>('admin-password-hash')
        if (!storedHash) {
          return res.status(401).json({ error: 'Invalid credentials' })
        }

        const valid = await verifyPassword(loginData.password, storedHash)
        if (!valid) {
          return res.status(401).json({ error: 'Invalid credentials' })
        }

        // If TOTP is enabled, verify the code
        if (totpSecret) {
          if (!loginData.totpCode) {
            return res.status(403).json({ error: 'TOTP code required', totpRequired: true })
          }
          if (!(await verifyTotpCodeOnce(totpSecret, loginData.totpCode))) {
            return res.status(403).json({ error: 'Invalid TOTP code', totpRequired: true })
          }
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
        await kv.del(`session:${token}`)
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
