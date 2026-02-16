/**
 * Admin Session API endpoint for Vercel KV storage
 * Handles admin authentication and session management
 * NO localStorage - all stored in Vercel KV
 */

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { Redis } from '@upstash/redis'
import { createHash, randomBytes } from 'crypto'

// Initialize Redis client
let redis: Redis | null = null

function getRedisClient(): Redis | null {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    console.warn('[Session API] Upstash Redis not configured')
    return null
  }
  
  if (!redis) {
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
  }
  
  return redis
}

// Helper: Hash password with SHA-256
function hashPassword(password: string): string {
  return createHash('sha256').update(password).digest('hex')
}

// Helper: Generate session token
function generateSessionToken(): string {
  return randomBytes(32).toString('hex')
}

// Helper: Timing-safe comparison
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let result = 0
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return result === 0
}

interface SessionData {
  token: string
  createdAt: number
  lastAccess: number
}

/**
 * Admin Session API Handler
 * 
 * POST /api/session - Login with password, get session token
 * GET /api/session - Validate session token
 * DELETE /api/session - Logout (delete session)
 * PUT /api/session - Setup initial password
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
      const { password } = req.body as { password: string }

      if (!password) {
        return res.status(400).json({ error: 'Password required' })
      }

      // Get stored password hash
      const storedHash = await kv.get<string>('admin-password-hash')
      
      if (!storedHash) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'No admin password configured. Use /api/session?setup=true',
        })
      }

      const inputHash = hashPassword(password)
      
      if (!timingSafeEqual(inputHash, storedHash)) {
        return res.status(401).json({ error: 'Invalid password' })
      }

      // Generate session token
      const sessionToken = generateSessionToken()
      const sessionData: SessionData = {
        token: sessionToken,
        createdAt: Date.now(),
        lastAccess: Date.now(),
      }

      // Store session with 24-hour TTL
      await kv.set(`session:${sessionToken}`, sessionData, { ex: 24 * 60 * 60 })

      return res.status(200).json({
        success: true,
        token: sessionToken,
        expiresIn: 24 * 60 * 60,
      })
    }

    // GET: Validate session token
    if (req.method === 'GET') {
      const token = req.headers['x-session-token'] as string || req.query.token as string

      if (!token) {
        return res.status(401).json({ error: 'No session token provided' })
      }

      const sessionData = await kv.get<SessionData>(`session:${token}`)

      if (!sessionData) {
        return res.status(401).json({ error: 'Invalid or expired session' })
      }

      // Update last access time
      sessionData.lastAccess = Date.now()
      await kv.set(`session:${token}`, sessionData, { ex: 24 * 60 * 60 })

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

    // PUT: Setup initial password
    if (req.method === 'PUT') {
      const { password } = req.body as { password: string }

      if (!password) {
        return res.status(400).json({ error: 'Password required' })
      }

      if (password.length < 8) {
        return res.status(400).json({ error: 'Password must be at least 8 characters' })
      }

      const hash = hashPassword(password)
      
      // Store password hash (no TTL - permanent)
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
