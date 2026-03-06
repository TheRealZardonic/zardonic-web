import { Redis } from '@upstash/redis'
import type { VercelRequest } from '@vercel/node'
import { getClientIp, hashIp } from './_ratelimit.js'

let _redis: Redis | null = null

function getRedis(): Redis | null {
  if (_redis) return _redis
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) return null
  _redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  })
  return _redis
}

export const BLOCK_PREFIX = 'zd-blocked:'
export const BLOCK_INDEX_KEY = 'zd-blocked-index'
export const BLOCK_TTL = 604800 // 7 days default

interface BlockEntry {
  hashedIp: string
  reason: string
  blockedAt: string
  autoBlocked: boolean
}

export async function blockIp(hashedIp: string, reason = 'manual', ttlSeconds = BLOCK_TTL): Promise<void> {
  const redis = getRedis()
  if (!redis) return
  const entry: BlockEntry = { hashedIp, reason, blockedAt: new Date().toISOString(), autoBlocked: false }
  await redis.set(`${BLOCK_PREFIX}${hashedIp}`, entry, { ex: ttlSeconds })
  await redis.sadd(BLOCK_INDEX_KEY, hashedIp)
  console.error('[HARD BLOCK SET]', JSON.stringify(entry))
}

export async function unblockIp(hashedIp: string): Promise<void> {
  const redis = getRedis()
  if (!redis) return
  await redis.del(`${BLOCK_PREFIX}${hashedIp}`)
  await redis.srem(BLOCK_INDEX_KEY, hashedIp)
  console.error('[HARD BLOCK REMOVED]', JSON.stringify({ hashedIp }))
}

export async function isHardBlocked(req: VercelRequest): Promise<boolean> {
  const redis = getRedis()
  if (!redis) return false
  try {
    const ip = getClientIp(req)
    const hashedIp = hashIp(ip)
    const entry = await redis.get(`${BLOCK_PREFIX}${hashedIp}`)
    return !!entry
  } catch {
    return false
  }
}

export async function getAllBlockedIps(): Promise<BlockEntry[]> {
  const redis = getRedis()
  if (!redis) return []
  try {
    const hashes = (await redis.smembers(BLOCK_INDEX_KEY)) as string[] || []
    const entries: BlockEntry[] = []
    for (const hash of hashes) {
      const entry = await redis.get<BlockEntry>(`${BLOCK_PREFIX}${hash}`)
      if (entry) {
        entries.push(entry)
      } else {
        await redis.srem(BLOCK_INDEX_KEY, hash)
      }
    }
    return entries
  } catch {
    return []
  }
}
