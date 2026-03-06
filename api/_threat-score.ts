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

const THREAT_SCORE_PREFIX = 'zd-threat:'
const THREAT_SCORE_TTL = 3600 // 1 hour
const BLOCK_PREFIX = 'zd-blocked:'
const BLOCK_TTL = 604800 // 7 days

export const THREAT_LEVELS = {
  CLEAN: 0,
  WARN: 3,
  TARPIT: 7,
  BLOCK: 12,
}

export const THREAT_REASONS = {
  ROBOTS_VIOLATION: { reason: 'robots_violation', points: 3 },
  HONEYTOKEN_ACCESS: { reason: 'honeytoken_access', points: 5 },
  SUSPICIOUS_UA: { reason: 'suspicious_ua', points: 4 },
  MISSING_BROWSER_HEADERS: { reason: 'missing_browser_headers', points: 2 },
  GENERIC_ACCEPT: { reason: 'generic_accept', points: 1 },
  RATE_LIMIT_EXCEEDED: { reason: 'rate_limit_exceeded', points: 2 },
}

export function classifyThreatLevel(score: number, customThresholds?: Record<string, number>): string {
  const thresholds = customThresholds || THREAT_LEVELS
  if (score >= thresholds.BLOCK) return 'BLOCK'
  if (score >= thresholds.TARPIT) return 'TARPIT'
  if (score >= thresholds.WARN) return 'WARN'
  return 'CLEAN'
}

/**
 * Get effective threat level thresholds from KV settings, falling back to defaults.
 */
export async function getEffectiveThresholds(): Promise<typeof THREAT_LEVELS> {
  const redis = getRedis()
  if (!redis) return { ...THREAT_LEVELS }
  try {
    const settings = await redis.get<Record<string, unknown>>('zd-security-settings')
    if (!settings) return { ...THREAT_LEVELS }
    return {
      CLEAN: 0,
      WARN: (settings.warnThreshold as number) || THREAT_LEVELS.WARN,
      TARPIT: (settings.tarpitThreshold as number) || THREAT_LEVELS.TARPIT,
      BLOCK: (settings.autoBlockThreshold as number) || THREAT_LEVELS.BLOCK,
    }
  } catch {
    return { ...THREAT_LEVELS }
  }
}

/**
 * Get effective threat reason points from KV settings, falling back to defaults.
 */
export async function getEffectiveReasonPoints(): Promise<typeof THREAT_REASONS> {
  const redis = getRedis()
  if (!redis) return { ...THREAT_REASONS }
  try {
    const settings = await redis.get<Record<string, unknown>>('zd-security-settings')
    if (!settings) return { ...THREAT_REASONS }
    return {
      ROBOTS_VIOLATION: { reason: 'robots_violation', points: (settings.pointsRobotsViolation as number) || THREAT_REASONS.ROBOTS_VIOLATION.points },
      HONEYTOKEN_ACCESS: { reason: 'honeytoken_access', points: (settings.pointsHoneytokenAccess as number) || THREAT_REASONS.HONEYTOKEN_ACCESS.points },
      SUSPICIOUS_UA: { reason: 'suspicious_ua', points: (settings.pointsSuspiciousUa as number) || THREAT_REASONS.SUSPICIOUS_UA.points },
      MISSING_BROWSER_HEADERS: { reason: 'missing_browser_headers', points: (settings.pointsMissingHeaders as number) || THREAT_REASONS.MISSING_BROWSER_HEADERS.points },
      GENERIC_ACCEPT: { reason: 'generic_accept', points: (settings.pointsGenericAccept as number) || THREAT_REASONS.GENERIC_ACCEPT.points },
      RATE_LIMIT_EXCEEDED: { reason: 'rate_limit_exceeded', points: (settings.pointsRateLimitExceeded as number) || THREAT_REASONS.RATE_LIMIT_EXCEEDED.points },
    }
  } catch {
    return { ...THREAT_REASONS }
  }
}

interface ThreatResult {
  score: number
  level: string
  reason: string
}

export async function incrementThreatScore(hashedIp: string, reason: string, points: number): Promise<ThreatResult> {
  const redis = getRedis()
  if (!redis) return { score: 0, level: 'CLEAN', reason }
  try {
    const key = `${THREAT_SCORE_PREFIX}${hashedIp}`
    const score = await redis.incrby(key, points)
    await redis.expire(key, THREAT_SCORE_TTL)
    const level = classifyThreatLevel(score)

    if (level === 'BLOCK') {
      await redis.set(`${BLOCK_PREFIX}${hashedIp}`, {
        reason,
        score,
        blockedAt: new Date().toISOString(),
        autoBlocked: true,
      }, { ex: BLOCK_TTL })
      console.error('[AUTO BLOCK]', JSON.stringify({ hashedIp, reason, score }))
    }

    return { score, level, reason }
  } catch {
    return { score: 0, level: 'CLEAN', reason }
  }
}

export async function getThreatScore(hashedIp: string): Promise<{ score: number; level: string }> {
  const redis = getRedis()
  if (!redis) return { score: 0, level: 'CLEAN' }
  try {
    const raw = await redis.get<number>(`${THREAT_SCORE_PREFIX}${hashedIp}`)
    const score = Number(raw) || 0
    return { score, level: classifyThreatLevel(score) }
  } catch {
    return { score: 0, level: 'CLEAN' }
  }
}

export async function getThreatScoreFromReq(req: VercelRequest): Promise<{ score: number; level: string }> {
  const ip = getClientIp(req)
  const hashedIp = hashIp(ip)
  return getThreatScore(hashedIp)
}

export async function incrementThreatScoreFromReq(req: VercelRequest, threatReason: { reason: string; points: number }): Promise<ThreatResult> {
  const ip = getClientIp(req)
  const hashedIp = hashIp(ip)
  return incrementThreatScore(hashedIp, threatReason.reason, threatReason.points)
}
