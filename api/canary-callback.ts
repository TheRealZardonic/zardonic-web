import type { VercelRequest, VercelResponse } from '@vercel/node'
import { handleCanaryCallback } from './_canary-documents.js'
import { applyRateLimit } from './_ratelimit.js'
/**
 * Canary callback endpoint — receives "phone home" signals from
 * canary documents opened by attackers.
 *
 * GET  /api/canary-callback?t=<token>&e=img  → tracking pixel callback
 * POST /api/canary-callback?t=<token>&e=js   → JavaScript fingerprint data
 */
export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  if (req.method !== 'GET' && req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  // Rate limit to prevent callback flooding that drowns real alerts in noise.
  const allowed = await applyRateLimit(req, res)
  if (!allowed) return

  await handleCanaryCallback(req, res)
}
