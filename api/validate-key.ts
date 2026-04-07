import { Redis } from '@upstash/redis'
const kv = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || '',
  token: process.env.UPSTASH_REDIS_REST_TOKEN || ''
})
import { isPrimaryHost } from './_primary-check.js'

// Minimal inline types so we avoid the vulnerable @vercel/node package
interface VercelRequest {
  method?: string
  body?: Record<string, unknown>
  headers?: Record<string, string | string[] | undefined>
}
interface VercelResponse {
  setHeader(key: string, value: string): VercelResponse
  status(code: number): VercelResponse
  json(data: unknown): VercelResponse
  end(): VercelResponse
}

/**
 * Central Activation Key validation endpoint.
 *
 * POST /api/validate-key
 * Body: { key: string }
 *
 * Response: { valid: boolean, tier?: string, features?: string[] }
 *
 * CORS is intentionally open so that forks deployed on their own Vercel
 * instances can call back to the original project's API to validate keys
 * stored in the central KV store.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS — allow any origin so that authorized forks can validate their keys
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ valid: false, error: 'Method not allowed' })

  const { key } = req.body || {}

  const host = [req.headers?.host].flat()[0] ?? ''
  const IS_PRIMARY = isPrimaryHost(host)

  if (IS_PRIMARY) {
    return res.status(200).json({ valid: true, tier: 'agency', features: [], assignedThemes: [] })
  }

  if (!key || typeof key !== 'string' || key.trim().length === 0) {
    return res.status(400).json({ valid: false, error: 'Invalid key format' })
  }

  const trimmedKey = key.trim()

  try {
    const isValid = await kv.sismember('activation-keys', trimmedKey)

    if (!isValid) {
      return res.status(200).json({ valid: false })
    }

    // Look up optional license tier metadata stored as a hash
    // Key format: activation-key-meta:<key>  →  { tier, features[], assignedThemes[] }
    let tier = 'free'
    let features: string[] = []
    let assignedThemes: string[] = []
    try {
      const meta = await kv.hgetall(`activation-key-meta:${trimmedKey}`) as Record<string, unknown> | null
      if (meta) {
        if (typeof meta.tier === 'string') tier = meta.tier
        if (meta.features) {
          features = typeof meta.features === 'string'
            ? JSON.parse(meta.features)
            : meta.features as string[]
        }
        if (meta.assignedThemes) {
          assignedThemes = typeof meta.assignedThemes === 'string'
            ? JSON.parse(meta.assignedThemes)
            : meta.assignedThemes as string[]
        }
      }
    } catch {
      // Meta lookup is best-effort — a valid key without metadata gets free tier
    }

    return res.status(200).json({ valid: true, tier, features, assignedThemes })
  } catch (error) {
    console.error('[validate-key] KV error:', error)
    // Bei KV-Fehler: fail open für eigene Instanz, fail closed für alle anderen
    return res.status(200).json({ valid: IS_PRIMARY, error: 'Service temporarily unavailable' })
  }
}
