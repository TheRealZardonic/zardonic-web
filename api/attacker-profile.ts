import { applyRateLimit } from './_ratelimit.js'
import { validateSession } from './auth.js'
import { getProfile, getAllProfiles, deleteProfile, analyzeUserAgents } from './_attacker-profile.js'
import { z } from 'zod'
import { validate } from './_schemas.js'

/**
 * Attacker Profile API — detailed per-attacker analytics
 *
 * GET  /api/attacker-profile?hashedIp=xxx  → Get single attacker profile
 * GET  /api/attacker-profile?limit=50&offset=0 → Get all attacker profiles (paginated)
 * DELETE /api/attacker-profile?hashedIp=xxx → Delete attacker profile
 */

interface VercelRequest {
  method?: string
  body?: Record<string, unknown>
  query?: Record<string, string | string[]>
  headers: Record<string, string | string[] | undefined>
}

interface VercelResponse {
  setHeader(key: string, value: string): VercelResponse
  status(code: number): VercelResponse
  json(data: unknown): VercelResponse
  end(): VercelResponse
}

const isKVConfigured = (): boolean => !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN)

const getProfileSchema = z.object({
  hashedIp: z.string().min(8).max(64).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
  offset: z.coerce.number().int().min(0).optional().default(0)
})

const deleteProfileSchema = z.object({
  hashedIp: z.string().min(8).max(64)
})

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  // Validate session first — authenticated admins bypass rate limiting
  // to prevent 429 errors when the dashboard loads multiple endpoints after login
  const sessionValid = await validateSession(req)
  if (!sessionValid) {
    const allowed = await applyRateLimit(req, res)
    if (!allowed) return
    res.status(403).json({ error: 'Forbidden' })
    return
  }

  if (!isKVConfigured()) {
    res.status(503).json({ error: 'Service unavailable' })
    return
  }

  try {
    if (req.method === 'GET') {
      const parsed = validate(getProfileSchema, req.query)
      if (!parsed.success) {
        res.status(400).json({ error: parsed.error })
        return
      }

      const { hashedIp, limit, offset } = parsed.data

      if (hashedIp) {
        // Get single profile
        const profile = await getProfile(hashedIp)
        if (!profile) {
          res.status(404).json({ error: 'Profile not found' })
          return
        }

        // Add User-Agent analysis
        const uaAnalysis = analyzeUserAgents(profile)

        res.json({
          profile: {
            ...profile,
            userAgentAnalysis: uaAnalysis
          }
        })
        return
      } else {
        // Get all profiles with pagination
        const result = await getAllProfiles(limit, offset)
        res.json(result)
        return
      }
    }

    if (req.method === 'DELETE') {
      const parsed = validate(deleteProfileSchema, req.query)
      if (!parsed.success) {
        res.status(400).json({ error: parsed.error })
        return
      }

      const { hashedIp } = parsed.data
      const success = await deleteProfile(hashedIp)

      if (!success) {
        res.status(500).json({ error: 'Failed to delete profile' })
        return
      }

      res.json({ success: true })
      return
    }

    res.status(405).json({ error: 'Method not allowed' })
  } catch (error) {
    console.error('Attacker Profile API error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}
