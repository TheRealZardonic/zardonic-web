import { Redis } from '@upstash/redis'
const kv = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || '',
  token: process.env.UPSTASH_REDIS_REST_TOKEN || ''
})
import { getClientIp, hashIp } from './_ratelimit.js'

export const BLOCK_PREFIX = 'nk-blocked:'
export const BLOCK_INDEX_KEY = 'nk-blocked-index'
export const BLOCK_TTL = 604800 // 7 days default

interface BlockEntry {
  hashedIp: string
  reason: string
  blockedAt: string
  autoBlocked: boolean
}

interface VercelLikeRequest {
  headers: Record<string, string | string[] | undefined>
}

export async function blockIp(hashedIp: string, reason = 'manual', ttlSeconds = BLOCK_TTL): Promise<void> {
  const entry: BlockEntry = { hashedIp, reason, blockedAt: new Date().toISOString(), autoBlocked: false }
  await kv.set(`${BLOCK_PREFIX}${hashedIp}`, entry, { ex: ttlSeconds })
  // Keep an index of all blocked IPs for the admin UI
  await kv.sadd(BLOCK_INDEX_KEY, hashedIp)
  console.error('[HARD BLOCK SET]', JSON.stringify(entry))
}

export async function unblockIp(hashedIp: string): Promise<void> {
  await kv.del(`${BLOCK_PREFIX}${hashedIp}`)
  await kv.srem(BLOCK_INDEX_KEY, hashedIp)
  console.error('[HARD BLOCK REMOVED]', JSON.stringify({ hashedIp }))
}

export async function isHardBlocked(req: VercelLikeRequest): Promise<boolean> {
  try {
    const ip = getClientIp(req)
    const hashedIp = hashIp(ip)
    const entry = await kv.get(`${BLOCK_PREFIX}${hashedIp}`)
    return !!entry
  } catch {
    return false
  }
}

export async function getAllBlockedIps(): Promise<BlockEntry[]> {
  try {
    const hashes = await kv.smembers(BLOCK_INDEX_KEY) || []
    const entries: BlockEntry[] = []
    for (const hash of hashes) {
      const entry = await kv.get<BlockEntry | string>(`${BLOCK_PREFIX}${hash}`)
      if (entry) {
        entries.push(typeof entry === 'string' ? JSON.parse(entry) as BlockEntry : entry)
      } else {
        // Entry expired, clean up index
        await kv.srem(BLOCK_INDEX_KEY, hash)
      }
    }
    return entries
  } catch {
    return []
  }
}
