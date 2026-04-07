import { Redis } from '@upstash/redis'
const kv = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || '',
  token: process.env.UPSTASH_REDIS_REST_TOKEN || ''
})
import { createHash } from 'node:crypto'
import { applyRateLimit } from './_ratelimit.js'
import { validateSession } from './auth.js'

/**
 * Security incidents API — returns honeytoken alerts and access violations.
 *
 * GET /api/security-incidents
 *   Requires admin session. Returns the last 500 security events
 *   (honeytoken triggers, robots.txt violations, etc.) from KV.
 *
 * DELETE /api/security-incidents
 *   Requires admin session. Clears all stored security incidents.
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

const isKVConfigured = (): boolean => {
  return !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN)
}

/** Verify the evidenceHash field of a stored incident. */
function verifyEvidenceHash(incident: Record<string, unknown>): boolean {
  const storedHash = incident.evidenceHash
  if (typeof storedHash !== 'string') return false
  const { evidenceHash: _stripped, ...rest } = incident
  const expected = createHash('sha256').update(JSON.stringify(rest)).digest('hex')
  return storedHash === expected
}

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
    res.status(503).json({ error: 'Service unavailable', message: 'KV storage is not configured.' })
    return
  }

  try {
    if (req.method === 'GET') {
      // Fetch up to 500 security incidents from the capped list
      const raw = await kv.lrange('nk-honeytoken-alerts', 0, 499)
      const incidents = (raw || []).map((entry) => {
        if (typeof entry === 'string') {
          try { return JSON.parse(entry) } catch { return entry }
        }
        return entry
      })

      // Forensic export format — includes tamper-evidence verification
      if (req.query?.format === 'forensic') {
        let tamperedCount = 0
        const verified = incidents.map((inc) => {
          if (typeof inc !== 'object' || inc === null) return { incident: inc, verified: false }
          const ok = verifyEvidenceHash(inc as Record<string, unknown>)
          if (!ok) tamperedCount++
          return { incident: inc, verified: ok }
        })
        res.json({
          incidents: verified,
          integrity: { verified: tamperedCount === 0, tamperedCount },
          meta: {
            exportedAt: new Date().toISOString(),
            exportedBy: 'admin',
            totalCount: incidents.length,
            serverVersion: process.env.npm_package_version ?? 'unknown',
          },
        })
        return
      }

      res.json({ incidents })
      return
    }

    if (req.method === 'DELETE') {
      await kv.del('nk-honeytoken-alerts')
      res.json({ success: true })
      return
    }

    res.status(405).json({ error: 'Method not allowed' })
  } catch (error) {
    console.error('Security incidents API error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}
