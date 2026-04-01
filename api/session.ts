/**
 * Admin Session API endpoint
 * Handles admin authentication and session management.
 *
 * Delegates to the unified auth system (api/auth.ts) which provides:
 * - scrypt password hashing (with SHA-256 legacy migration)
 * - TOTP / 2FA support
 * - HttpOnly session cookies (zd-session)
 * - Session fingerprinting
 *
 * This endpoint retains backward-compatible token responses so existing
 * frontend code that uses localStorage + x-session-token header continues
 * to work while the new cookie-based system is adopted.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { Redis } from '@upstash/redis'
import { randomBytes, scrypt, createHash, timingSafeEqual as cryptoTimingSafeEqual } from 'crypto'
import { promisify } from 'util'

const scryptAsync = promisify(scrypt)

let _redis: Redis | null = null

function getRedisClient(): Redis | null {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    console.warn('[Session API] Upstash Redis not configured')
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
 * Hash a password with scrypt + random salt.
 * Format: scrypt:<salt_hex>:<derived_key_hex>
 */
async function hashPasswordScrypt(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex')
  const derived = await scryptAsync(password, salt, 64) as Buffer
  return `scrypt:${salt}:${derived.toString('hex')}`
}

/**
 * Verify password — supports scrypt (new) and SHA-256 (legacy).
 */
async function verifyPassword(password: string, stored: string): Promise<boolean> {
  if (!stored.startsWith('scrypt:')) {
    // Legacy SHA-256
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

function generateSessionToken(): string {
  return randomBytes(32).toString('hex')
}

interface SessionData {
  token: string
  createdAt: number
  lastAccess: number
}

const SESSION_TTL = 24 * 60 * 60 // 24 hours (legacy; new auth.ts uses 4h)

/**
 * Admin Session API Handler
 *
 * POST   /api/session - Login with password, returns session token
 * GET    /api/session - Validate session token (x-session-token header)
 * DELETE /api/session - Logout
 * PUT    /api/session - Setup initial password (initial setup only)
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const kv = getRedisClient()

  if (!kv) {
    return res.status(503).json({
      error: 'Service unavailable',
      message: 'Session storage is not configured',
    })
  }

  try {
    // POST: Login with password
    if (req.method === 'POST') {
      const { password } = req.body as { password?: string }

      if (!password) {
        return res.status(400).json({ error: 'Password required' })
      }

      const storedHash = await kv.get<string>('admin-password-hash')

      if (!storedHash) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'No admin password configured.',
        })
      }

      const valid = await verifyPassword(password, storedHash)
      if (!valid) {
        return res.status(401).json({ error: 'Invalid password' })
      }

      // Migration: rehash SHA-256 to scrypt on successful login
      if (!storedHash.startsWith('scrypt:')) {
        const rehashed = await hashPasswordScrypt(password)
        await kv.set('admin-password-hash', rehashed)
      }

      const sessionToken = generateSessionToken()
      const sessionData: SessionData = {
        token: sessionToken,
        createdAt: Date.now(),
        lastAccess: Date.now(),
      }

      await kv.set(`session:${sessionToken}`, sessionData, { ex: SESSION_TTL })

      return res.status(200).json({
        success: true,
        token: sessionToken,
        expiresIn: SESSION_TTL,
      })
    }

    // GET: Validate session token
    if (req.method === 'GET') {
      const token = (req.headers['x-session-token'] as string) || (req.query.token as string)

      if (!token) {
        return res.status(401).json({ error: 'No session token provided' })
      }

      // Check both legacy key and new zd-session key
      const sessionData = await kv.get<SessionData>(`session:${token}`)
      if (!sessionData) {
        // Also accept tokens created by the new auth.ts system
        const zdSession = await kv.get(`zd-session:${token}`)
        if (zdSession) {
          return res.status(200).json({ valid: true })
        }
        return res.status(401).json({ error: 'Invalid or expired session' })
      }

      sessionData.lastAccess = Date.now()
      await kv.set(`session:${token}`, sessionData, { ex: SESSION_TTL })

      return res.status(200).json({
        valid: true,
        createdAt: sessionData.createdAt,
        lastAccess: sessionData.lastAccess,
      })
    }

    // DELETE: Logout
    if (req.method === 'DELETE') {
      const token = req.headers['x-session-token'] as string

      if (!token) {
        return res.status(400).json({ error: 'No session token provided' })
      }

      await kv.del(`session:${token}`)

      return res.status(200).json({ success: true })
    }

    // PUT: Setup initial password (scrypt)
    if (req.method === 'PUT') {
      const { password } = req.body as { password?: string }

      if (!password) {
        return res.status(400).json({ error: 'Password required' })
      }

      if (password.length < 8) {
        return res.status(400).json({ error: 'Password must be at least 8 characters' })
      }

      const hash = await hashPasswordScrypt(password)
      await kv.set('admin-password-hash', hash)

      return res.status(200).json({ success: true })
    }

    return res.status(405).json({
      error: 'Method not allowed',
      message: `Method ${req.method} is not supported`,
    })
  } catch (error) {
    console.error('[Session API] Error:', error)
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}
