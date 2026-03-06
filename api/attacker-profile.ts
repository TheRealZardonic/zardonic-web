import type { VercelRequest, VercelResponse } from '@vercel/node'
import { applyRateLimit } from './_ratelimit.js'
import { validateSession } from './auth.js'
import { getProfile, getAllProfiles, deleteProfile, analyzeUserAgents } from './_attacker-profile.js'
import { validate, getProfileSchema, deleteProfileSchema } from './_schemas.js'

const isKVConfigured = () =>
  !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)

/**
 * Attacker Profile API — detailed per-attacker analytics
 *
 * GET  /api/attacker-profile?hashedIp=xxx  → Get single attacker profile
 * GET  /api/attacker-profile?limit=50&offset=0 → Get all attacker profiles (paginated)
 * DELETE /api/attacker-profile?hashedIp=xxx → Delete attacker profile
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end()

  const allowed = await applyRateLimit(req, res)
  if (!allowed) return

  const sessionValid = await validateSession(req)
  if (!sessionValid) return res.status(403).json({ error: 'Forbidden' })

  if (!isKVConfigured()) return res.status(503).json({ error: 'Service unavailable' })

  try {
    if (req.method === 'GET') {
      const parsed = validate(getProfileSchema, req.query)
      if (!parsed.success) return res.status(400).json({ error: parsed.error })

      const { hashedIp, limit, offset } = parsed.data

      if (hashedIp) {
        const profile = await getProfile(hashedIp)
        if (!profile) return res.status(404).json({ error: 'Profile not found' })

        const uaAnalysis = analyzeUserAgents(profile)
        return res.json({ profile: { ...profile, userAgentAnalysis: uaAnalysis } })
      } else {
        const result = await getAllProfiles(limit, offset)
        return res.json(result)
      }
    }

    if (req.method === 'DELETE') {
      const parsed = validate(deleteProfileSchema, req.query)
      if (!parsed.success) return res.status(400).json({ error: parsed.error })

      const success = await deleteProfile(parsed.data.hashedIp)
      if (!success) return res.status(500).json({ error: 'Failed to delete profile' })

      return res.json({ success: true })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (error) {
    console.error('Attacker profile API error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
