import { Redis } from '@upstash/redis'
const kv = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || '',
  token: process.env.UPSTASH_REDIS_REST_TOKEN || ''
})
import { applyRateLimit } from '../_ratelimit.js'
import { validateSession } from '../auth.js'
import { isPrimaryHost } from '../_primary-check.js'
import { z } from 'zod'

// Minimal inline types so we avoid the vulnerable @vercel/node package
interface VercelRequest {
  method?: string
  body?: Record<string, unknown>
  headers: Record<string, string | string[] | undefined>
}
interface VercelResponse {
  setHeader(key: string, value: string): VercelResponse
  status(code: number): VercelResponse
  json(data: unknown): VercelResponse
  end(): VercelResponse
}

// ─── Validation schema ────────────────────────────────────────────────────────

const BodySchema = z.object({
  themeId: z.string().min(1).max(100),
  licenseKey: z.string().min(1).max(200),
})

// ─── Key format helpers ───────────────────────────────────────────────────────

/** Known key prefixes per theme ID */
const THEME_KEY_PREFIXES: Record<string, string> = {
  'zardonic': 'ZARDONIC-',
}

function isKeyFormatValid(themeId: string, key: string): boolean {
  const prefix = THEME_KEY_PREFIXES[themeId]
  if (prefix && !key.toUpperCase().startsWith(prefix)) return false
  // After the prefix the key must have at least one non-whitespace character
  const rest = prefix ? key.slice(prefix.length) : key
  return rest.trim().length > 0
}

/**
 * POST /api/admin/validate-theme-key
 * Body: { themeId: string, licenseKey: string }
 * Response: { valid: boolean, themeId: string }
 *
 * Requires a valid admin session (cookie-based).
 * Rate-limited to prevent brute-force attacks.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  // Admin auth required
  if (!(await validateSession(req))) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  // Rate limit — stricter window for key validation to prevent brute-force
  const allowed = await applyRateLimit(req, res)
  if (!allowed) return

  // Validate request body
  const parseResult = BodySchema.safeParse(req.body)
  if (!parseResult.success) {
    return res.status(400).json({
      error: 'Invalid request body',
      details: parseResult.error.flatten().fieldErrors,
    })
  }

  const { themeId, licenseKey } = parseResult.data
  const normalizedKey = licenseKey.trim().toUpperCase()

  const host = req.headers.host || ''
  const IS_PRIMARY = isPrimaryHost(typeof host === 'string' ? host : host[0])

  if (IS_PRIMARY) {
    return res.status(200).json({ valid: true, themeId })
  }

  // Fast format check — reject obviously wrong keys without hitting KV
  if (!isKeyFormatValid(themeId, normalizedKey)) {
    return res.status(200).json({ valid: false, themeId, error: 'Invalid key format for this theme' })
  }

  try {
    // Check if this key is stored in KV as valid for this theme
    const kvKey = `theme-license-key:${themeId}:${normalizedKey}`
    const exists = await kv.exists(kvKey)

    if (!exists) {
      return res.status(200).json({ valid: false, themeId, error: 'License key not found' })
    }

    // Mark this theme as unlocked for this installation
    await kv.set(`theme-license:${themeId}`, { unlockedAt: new Date().toISOString(), key: normalizedKey.slice(0, 8) + '...' })

    return res.status(200).json({ valid: true, themeId })
  } catch (error) {
    console.error('[validate-theme-key] KV error:', error)
    return res.status(500).json({ error: 'Service temporarily unavailable' })
  }
}
