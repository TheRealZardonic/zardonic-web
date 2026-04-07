/**
 * GET /api/env-check
 *
 * Returns the presence status of required environment variables.
 * Only reports whether each variable is set (boolean) — never exposes values.
 * Used by the SetupWizard to guide new users through ENV configuration.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'

export default function handler(req: VercelRequest, res: VercelResponse): void {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const vars = {
    UPSTASH_REDIS_REST_URL: !!process.env.UPSTASH_REDIS_REST_URL,
    UPSTASH_REDIS_REST_TOKEN: !!process.env.UPSTASH_REDIS_REST_TOKEN,
    ADMIN_SETUP_TOKEN: !!process.env.ADMIN_SETUP_TOKEN,
    RESEND_API_KEY: !!process.env.RESEND_API_KEY,
  }

  res.status(200).json({ vars })
}
