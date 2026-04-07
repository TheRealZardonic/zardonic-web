import { randomBytes } from 'crypto'
import { Redis } from '@upstash/redis'
const kv = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || '',
  token: process.env.UPSTASH_REDIS_REST_TOKEN || ''
})
import { validateSession } from '../auth.js'
import { isPrimaryHost } from '../_primary-check.js'

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

// ─── Default key entry for error fallbacks ────────────────────────────────────

const FALLBACK_KEY_ENTRY = {
  name: '(unnamed)',
  tier: 'free',
  createdAt: null,
  revokeId: null,
  holderName: null,
  holderEmail: null,
  holderWebsite: null,
  notes: null,
  assignedThemes: [] as string[],
}

// ─── Key Manager API ──────────────────────────────────────────────────────────

/**
 * GET  → List all activation keys (name + tier + created-at + revokeId, NOT the key value!)
 * POST → Generate a new activation key (returns the key value once, plus a revokeId)
 * DELETE → Revoke a key by its revokeId (a separate identifier, never the key itself)
 *
 * Only available on the primary deployment (hostname: neuroklast.net).
 * Requires a valid admin session (cookie-based).
 *
 * Key security: The actual activation key value is ONLY returned on creation.
 * All subsequent operations use the `revokeId` (a random token stored alongside
 * the key metadata) to avoid exposing key values in list responses or DELETE
 * requests.  A mapping from revokeId → key is stored in KV.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only available on primary instance.
  // SECURITY: host-header check; env vars like VITE_IS_PRIMARY must never be used here.
  if (!isPrimaryHost(req.headers.host as string | undefined)) {
    return res.status(403).json({ error: 'Key manager only available on primary deployment' })
  }

  // Admin auth required (cookie-based session)
  if (!(await validateSession(req))) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  if (req.method === 'GET') {
    // List all keys (metadata only, never the key values)
    try {
      const keys = await kv.smembers('activation-keys') as string[]
      const keyList = await Promise.all(
        keys.map(async (key: string) => {
          try {
            const meta = await kv.hgetall(`activation-key-meta:${key}`) as Record<string, unknown> | null
            return {
              name: (meta?.name as string) || '(unnamed)',
              tier: (meta?.tier as string) || 'free',
              createdAt: (meta?.createdAt as string) || null,
              // Use revokeId for revocation — never expose the key value
              revokeId: (meta?.revokeId as string) || null,
              // Extended metadata
              holderName: (meta?.holderName as string) || null,
              holderEmail: (meta?.holderEmail as string) || null,
              holderWebsite: (meta?.holderWebsite as string) || null,
              notes: (meta?.notes as string) || null,
              assignedThemes: meta?.assignedThemes
                ? JSON.parse(meta.assignedThemes as string)
                : [],
            }
          } catch {
            return { ...FALLBACK_KEY_ENTRY }
          }
        })
      )
      return res.status(200).json({ keys: keyList })
    } catch (error) {
      console.error('[admin/keys GET] KV error:', error)
      return res.status(500).json({ error: 'Failed to list keys' })
    }
  }

  if (req.method === 'POST') {
    // Generate a new activation key
    const { name = 'Unnamed Key', tier = 'free', holderName, holderEmail, holderWebsite, notes, assignedThemes: postAssignedThemes } = req.body || {}

    if (typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'name is required' })
    }
    if (!['free', 'premium', 'agency'].includes(String(tier))) {
      return res.status(400).json({ error: 'Invalid tier. Must be one of: free, premium, agency' })
    }

    try {
      // 24 bytes = 48 hex chars of cryptographic entropy
      const key = randomBytes(24).toString('hex')
      const revokeId = randomBytes(16).toString('hex')
      const createdAt = new Date().toISOString()

      const metaFields: Record<string, string> = {
        name: name.trim(),
        tier: String(tier),
        createdAt,
        revokeId,
        features: JSON.stringify([]),
      }
      if (holderName && typeof holderName === 'string') metaFields.holderName = holderName.trim()
      if (holderEmail && typeof holderEmail === 'string') metaFields.holderEmail = holderEmail.trim()
      if (holderWebsite && typeof holderWebsite === 'string') metaFields.holderWebsite = holderWebsite.trim()
      if (notes && typeof notes === 'string') metaFields.notes = notes.trim()
      if (postAssignedThemes && Array.isArray(postAssignedThemes)) {
        metaFields.assignedThemes = JSON.stringify(postAssignedThemes)
      }

      await kv.sadd('activation-keys', key)
      await kv.hset(`activation-key-meta:${key}`, metaFields)
      // Store reverse mapping revokeId → key for safe revocation
      await kv.set(`activation-revoke:${revokeId}`, key)

      // Return the key value ONCE — after this it is never returned again
      return res.status(201).json({ key, revokeId, name: name.trim(), tier, createdAt })
    } catch (error) {
      console.error('[admin/keys POST] KV error:', error)
      return res.status(500).json({ error: 'Failed to create key' })
    }
  }

  if (req.method === 'PATCH') {
    // Update key metadata fields
    const { revokeId, holderName, holderEmail, holderWebsite, notes, assignedThemes } = req.body || {}

    if (!revokeId || typeof revokeId !== 'string' || !revokeId.trim()) {
      return res.status(400).json({ error: 'revokeId is required' })
    }

    try {
      const key = await kv.get(`activation-revoke:${revokeId.trim()}`) as string | null
      if (!key) {
        return res.status(404).json({ error: 'Key not found' })
      }

      const updateFields: Record<string, string> = {}
      if (holderName !== undefined) updateFields.holderName = String(holderName ?? '').trim()
      if (holderEmail !== undefined) updateFields.holderEmail = String(holderEmail ?? '').trim()
      if (holderWebsite !== undefined) updateFields.holderWebsite = String(holderWebsite ?? '').trim()
      if (notes !== undefined) updateFields.notes = String(notes ?? '').trim()
      if (assignedThemes !== undefined) {
        updateFields.assignedThemes = JSON.stringify(
          Array.isArray(assignedThemes) ? assignedThemes : []
        )
      }

      if (Object.keys(updateFields).length > 0) {
        await kv.hset(`activation-key-meta:${key}`, updateFields)
      }

      return res.status(200).json({ success: true })
    } catch (error) {
      console.error('[admin/keys PATCH] KV error:', error)
      return res.status(500).json({ error: 'Failed to update key metadata' })
    }
  }

  if (req.method === 'DELETE') {
    const { revokeId } = req.body || {}

    if (!revokeId || typeof revokeId !== 'string' || !revokeId.trim()) {
      return res.status(400).json({ error: 'revokeId is required' })
    }

    try {
      // Look up the actual key value via the revokeId mapping
      const key = await kv.get(`activation-revoke:${revokeId.trim()}`) as string | null
      if (!key) {
        return res.status(404).json({ error: 'Key not found or already revoked' })
      }

      await kv.srem('activation-keys', key)
      await kv.del(`activation-key-meta:${key}`)
      await kv.del(`activation-revoke:${revokeId.trim()}`)
      return res.status(200).json({ success: true })
    } catch (error) {
      console.error('[admin/keys DELETE] KV error:', error)
      return res.status(500).json({ error: 'Failed to revoke key' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
