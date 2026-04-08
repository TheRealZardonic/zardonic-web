/**
 * GET /api/env-check
 *
 * Returns the presence status of required environment variables.
 * Only reports whether each variable is set (boolean) — never exposes values.
 * Used by the SetupWizard to guide new users through ENV configuration.
 *
 * To prevent unauthenticated infrastructure enumeration, this endpoint
 * is only accessible when:
 *   a) Redis is not yet configured (initial setup, no auth possible), OR
 *   b) No admin password has been set yet (setup flow not yet completed), OR
 *   c) The caller has a valid admin session.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { isRedisConfigured, getRedisOrNull } from './_redis.js'
import { validateSession } from './auth.js'

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  // Allow access if Redis is not configured — setup wizard needs this before
  // any authentication infrastructure exists.
  if (!isRedisConfigured()) {
    res.status(200).json({ vars: buildVars() })
    return
  }

  // Allow access if no admin password has been set yet (setup not complete).
  const redis = getRedisOrNull()
  if (redis) {
    try {
      const passwordHash = await redis.get<string>('admin-password-hash')
      if (!passwordHash) {
        res.status(200).json({ vars: buildVars() })
        return
      }
    } catch { /* Redis error — fall through to session check */ }
  }

  // Otherwise require a valid admin session.
  const sessionValid = await validateSession(req)
  if (!sessionValid) {
    res.status(403).json({ error: 'Forbidden' })
    return
  }

  res.status(200).json({ vars: buildVars() })
}

function buildVars(): Record<string, boolean> {
  return {
    UPSTASH_REDIS_REST_URL: !!process.env.UPSTASH_REDIS_REST_URL,
    UPSTASH_REDIS_REST_TOKEN: !!process.env.UPSTASH_REDIS_REST_TOKEN,
    ADMIN_SETUP_TOKEN: !!process.env.ADMIN_SETUP_TOKEN,
    RESEND_API_KEY: !!process.env.RESEND_API_KEY,
  }
}
