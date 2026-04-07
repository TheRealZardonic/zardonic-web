import { Redis } from '@upstash/redis'
const kv = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || '',
  token: process.env.UPSTASH_REDIS_REST_TOKEN || ''
})
import { getClientIp, hashIp } from './_ratelimit.js'
import { logSecurityEvent } from './_security-logger.js'

const KV_SETTINGS_KEY = 'nk-security-settings'
const THREAT_SCORE_PREFIX = 'nk-threat:'
const THREAT_SCORE_TTL = 3600 // 1 hour
const BLOCK_PREFIX = 'nk-blocked:'
const BLOCK_TTL = 604800 // 7 days

/** Default threat level thresholds — can be overridden via security settings */
export const THREAT_LEVELS = {
  CLEAN: 0,
  WARN: 3,
  TARPIT: 7,
  BLOCK: 12,
}

/** Default threat reason point values — can be overridden via security settings */
export const THREAT_REASONS = {
  ROBOTS_VIOLATION: { reason: 'robots_violation', points: 3 },
  HONEYTOKEN_ACCESS: { reason: 'honeytoken_access', points: 5 },
  SUSPICIOUS_UA: { reason: 'suspicious_ua', points: 4 },
  MISSING_BROWSER_HEADERS: { reason: 'missing_browser_headers', points: 2 },
  GENERIC_ACCEPT: { reason: 'generic_accept', points: 1 },
  RATE_LIMIT_EXCEEDED: { reason: 'rate_limit_exceeded', points: 2 },
}

export interface ThreatReason {
  reason: string
  points: number
}

export interface ThreatScoreResult {
  score: number
  level: string
  reason: string
}

interface ThreatThresholds {
  CLEAN: number
  WARN: number
  TARPIT: number
  BLOCK: number
}

interface SecuritySettings {
  warnThreshold?: number
  tarpitThreshold?: number
  autoBlockThreshold?: number
  pointsRobotsViolation?: number
  pointsHoneytokenAccess?: number
  pointsSuspiciousUa?: number
  pointsMissingHeaders?: number
  pointsGenericAccept?: number
  pointsRateLimitExceeded?: number
}

interface VercelLikeRequest {
  headers: Record<string, string | string[] | undefined>
}

/**
 * Resolve effective threat thresholds from KV settings, falling back to defaults.
 */
export async function getEffectiveThresholds(): Promise<ThreatThresholds> {
  try {
    const settings = await kv.get<SecuritySettings>(KV_SETTINGS_KEY).catch(() => null)
    return {
      CLEAN: 0,
      WARN: settings?.warnThreshold ?? THREAT_LEVELS.WARN,
      TARPIT: settings?.tarpitThreshold ?? THREAT_LEVELS.TARPIT,
      BLOCK: settings?.autoBlockThreshold ?? THREAT_LEVELS.BLOCK,
    }
  } catch {
    return { ...THREAT_LEVELS }
  }
}

/**
 * Resolve effective threat reason points from KV settings, falling back to defaults.
 */
export async function getEffectiveReasonPoints(): Promise<typeof THREAT_REASONS> {
  try {
    const settings = await kv.get<SecuritySettings>(KV_SETTINGS_KEY).catch(() => null)
    return {
      ROBOTS_VIOLATION: { reason: 'robots_violation', points: settings?.pointsRobotsViolation ?? THREAT_REASONS.ROBOTS_VIOLATION.points },
      HONEYTOKEN_ACCESS: { reason: 'honeytoken_access', points: settings?.pointsHoneytokenAccess ?? THREAT_REASONS.HONEYTOKEN_ACCESS.points },
      SUSPICIOUS_UA: { reason: 'suspicious_ua', points: settings?.pointsSuspiciousUa ?? THREAT_REASONS.SUSPICIOUS_UA.points },
      MISSING_BROWSER_HEADERS: { reason: 'missing_browser_headers', points: settings?.pointsMissingHeaders ?? THREAT_REASONS.MISSING_BROWSER_HEADERS.points },
      GENERIC_ACCEPT: { reason: 'generic_accept', points: settings?.pointsGenericAccept ?? THREAT_REASONS.GENERIC_ACCEPT.points },
      RATE_LIMIT_EXCEEDED: { reason: 'rate_limit_exceeded', points: settings?.pointsRateLimitExceeded ?? THREAT_REASONS.RATE_LIMIT_EXCEEDED.points },
    }
  } catch {
    return { ...THREAT_REASONS }
  }
}

export function classifyThreatLevel(score: number, thresholds: ThreatThresholds = THREAT_LEVELS): string {
  if (score >= thresholds.BLOCK) return 'BLOCK'
  if (score >= thresholds.TARPIT) return 'TARPIT'
  if (score >= thresholds.WARN) return 'WARN'
  return 'CLEAN'
}

export async function incrementThreatScore(hashedIp: string, reason: string, points: number, userAgent = ''): Promise<ThreatScoreResult> {
  try {
    const key = `${THREAT_SCORE_PREFIX}${hashedIp}`
    // Read previous score to detect level transitions
    const prevRaw = await kv.get(key)
    const prevScore = Number(prevRaw ?? 0)
    const score = await kv.incrby(key, points)
    await kv.expire(key, THREAT_SCORE_TTL)
    const thresholds = await getEffectiveThresholds()
    const prevLevel = classifyThreatLevel(prevScore, thresholds)
    const level = classifyThreatLevel(score, thresholds)

    // Auto-escalate to hard block if threshold exceeded
    if (level === 'BLOCK') {
      await kv.set(`${BLOCK_PREFIX}${hashedIp}`, {
        reason,
        score,
        blockedAt: new Date().toISOString(),
        autoBlocked: true,
      }, { ex: BLOCK_TTL })
    }

    // Log every threat score update with full context (unified logger handles stderr + KV)
    const severity = level === 'BLOCK' ? 'critical' : level === 'TARPIT' ? 'high' : level === 'WARN' ? 'warn' : 'info'
    await logSecurityEvent({
      event: level !== prevLevel ? 'THREAT_LEVEL_ESCALATED' : 'THREAT_SCORE_UPDATED',
      severity,
      hashedIp,
      userAgent,
      countermeasure: level === 'BLOCK' ? 'AUTO_BLOCK' : undefined,
      threatScore: score,
      threatLevel: level,
      details: { reason, points, previousScore: prevScore, previousLevel: prevLevel },
    })

    return { score, level, reason }
  } catch {
    return { score: 0, level: 'CLEAN', reason }
  }
}

export async function getThreatScore(hashedIp: string): Promise<{ score: number; level: string }> {
  try {
    const score = await kv.get(`${THREAT_SCORE_PREFIX}${hashedIp}`) || 0
    const thresholds = await getEffectiveThresholds()
    return { score: Number(score), level: classifyThreatLevel(Number(score), thresholds) }
  } catch {
    return { score: 0, level: 'CLEAN' }
  }
}

export async function getThreatScoreFromReq(req: VercelLikeRequest): Promise<{ score: number; level: string }> {
  const ip = getClientIp(req)
  const hashedIp = hashIp(ip)
  return getThreatScore(hashedIp)
}

export async function incrementThreatScoreFromReq(req: VercelLikeRequest, threatReason: ThreatReason): Promise<ThreatScoreResult> {
  const ip = getClientIp(req)
  const hashedIp = hashIp(ip)
  return incrementThreatScore(hashedIp, threatReason.reason, threatReason.points)
}
