import { Redis } from '@upstash/redis'

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

/**
 * Attacker profiling system — aggregates behavioral data per IP hash.
 *
 * Tracks:
 * - Threat score history over time
 * - Attack type frequency (honeytoken, robots.txt, suspicious UA, etc.)
 * - User-Agent patterns
 * - Incident timeline
 *
 * Data is stored per IP hash to enable detailed forensic analysis.
 * All data is GDPR-compliant — only hashed IPs are stored.
 */

const PROFILE_PREFIX = 'nk-profile:'
const PROFILE_LIST_KEY = 'nk-profile-list'
const PROFILE_TTL = 2592000 // 30 days
const MAX_HISTORY_ENTRIES = 100

interface ThreatScoreEntry {
  score: number
  level: string
  timestamp: string
  reason: string
}

interface IncidentEntry {
  type: string
  key?: string
  method: string
  timestamp: string
  threatScore?: number
  threatLevel?: string
}

interface AttackerProfile {
  hashedIp: string
  firstSeen: string
  lastSeen: string
  totalIncidents: number
  attackTypes: Record<string, number>
  userAgents: Record<string, number>
  threatScoreHistory: ThreatScoreEntry[]
  incidents: IncidentEntry[]
}

interface IncidentInput {
  type: string
  key?: string
  method: string
  userAgent: string
  threatScore?: number
  threatLevel?: string
  timestamp: string
}

interface BehavioralPattern {
  type: string
  severity: string
  description: string
  details: Record<string, unknown>
}

/**
 * Record an incident in the attacker's profile.
 */
export async function recordIncident(hashedIp: string, incident: IncidentInput): Promise<AttackerProfile | null> {
  const redis = getRedis()
  if (!redis) return null
  try {
    const profileKey = `${PROFILE_PREFIX}${hashedIp}`

    let profile = await redis.get<AttackerProfile>(profileKey)
    if (!profile) {
      profile = {
        hashedIp,
        firstSeen: incident.timestamp,
        lastSeen: incident.timestamp,
        totalIncidents: 0,
        attackTypes: {},
        userAgents: {},
        threatScoreHistory: [],
        incidents: [],
      }
    }

    profile.lastSeen = incident.timestamp
    profile.totalIncidents = (profile.totalIncidents || 0) + 1

    const attackType = incident.type || 'unknown'
    profile.attackTypes[attackType] = (profile.attackTypes[attackType] || 0) + 1

    const ua = incident.userAgent || 'unknown'
    const uaKey = ua.substring(0, 100)
    profile.userAgents[uaKey] = (profile.userAgents[uaKey] || 0) + 1

    if (incident.threatScore !== undefined) {
      profile.threatScoreHistory = profile.threatScoreHistory || []
      profile.threatScoreHistory.push({
        score: incident.threatScore,
        level: incident.threatLevel || 'CLEAN',
        timestamp: incident.timestamp,
        reason: attackType,
      })
      if (profile.threatScoreHistory.length > MAX_HISTORY_ENTRIES) {
        profile.threatScoreHistory = profile.threatScoreHistory.slice(-MAX_HISTORY_ENTRIES)
      }
    }

    profile.incidents = profile.incidents || []
    profile.incidents.push({
      type: attackType,
      key: incident.key,
      method: incident.method,
      timestamp: incident.timestamp,
      threatScore: incident.threatScore,
      threatLevel: incident.threatLevel,
    })
    if (profile.incidents.length > 50) {
      profile.incidents = profile.incidents.slice(-50)
    }

    await redis.set(profileKey, profile, { ex: PROFILE_TTL })
    await redis.sadd(PROFILE_LIST_KEY, hashedIp)

    return profile
  } catch (error) {
    console.error('[PROFILE] Failed to record incident:', error)
    return null
  }
}

/**
 * Get attacker profile by hashed IP.
 */
export async function getProfile(hashedIp: string): Promise<(AttackerProfile & { behavioralPatterns: BehavioralPattern[] }) | null> {
  const redis = getRedis()
  if (!redis) return null
  try {
    const profileKey = `${PROFILE_PREFIX}${hashedIp}`
    const profile = await redis.get<AttackerProfile>(profileKey)

    if (!profile) return null

    const patterns = analyzeBehavioralPatterns(profile)
    return { ...profile, behavioralPatterns: patterns }
  } catch (error) {
    console.error('[PROFILE] Failed to get profile:', error)
    return null
  }
}

/**
 * Get all attacker profiles with pagination.
 */
export async function getAllProfiles(limit = 50, offset = 0): Promise<{ profiles: (AttackerProfile & { behavioralPatterns: BehavioralPattern[] })[]; total: number; limit: number; offset: number }> {
  const redis = getRedis()
  if (!redis) return { profiles: [], total: 0, limit, offset }
  try {
    const hashedIps = (await redis.smembers(PROFILE_LIST_KEY)) as string[] || []

    const profiles: (AttackerProfile & { behavioralPatterns: BehavioralPattern[] })[] = []
    for (const hashedIp of hashedIps) {
      const profile = await getProfile(hashedIp)
      if (profile) {
        profiles.push(profile)
      } else {
        await redis.srem(PROFILE_LIST_KEY, hashedIp)
      }
    }

    profiles.sort((a, b) => new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime())

    return {
      profiles: profiles.slice(offset, offset + limit),
      total: profiles.length,
      limit,
      offset,
    }
  } catch (error) {
    console.error('[PROFILE] Failed to get all profiles:', error)
    return { profiles: [], total: 0, limit, offset }
  }
}

/**
 * Analyze behavioral patterns from profile data.
 */
function analyzeBehavioralPatterns(profile: AttackerProfile): BehavioralPattern[] {
  const patterns: BehavioralPattern[] = []

  if (profile.threatScoreHistory && profile.threatScoreHistory.length >= 2) {
    const firstScore = profile.threatScoreHistory[0].score
    const lastScore = profile.threatScoreHistory[profile.threatScoreHistory.length - 1].score
    const timeDiff = new Date(profile.lastSeen).getTime() - new Date(profile.firstSeen).getTime()
    const hoursDiff = timeDiff / (1000 * 60 * 60)

    if (hoursDiff < 1 && (lastScore - firstScore) >= 5) {
      patterns.push({
        type: 'rapid_escalation',
        severity: 'high',
        description: 'Threat score increased rapidly within one hour',
        details: { scoreDelta: lastScore - firstScore, timeHours: hoursDiff },
      })
    }
  }

  const attackTypeCount = Object.keys(profile.attackTypes || {}).length
  if (attackTypeCount >= 3) {
    patterns.push({
      type: 'diverse_attacks',
      severity: 'high',
      description: `Using ${attackTypeCount} different attack types`,
      details: { attackTypes: Object.keys(profile.attackTypes) },
    })
  }

  const uaCount = Object.keys(profile.userAgents || {}).length
  if (uaCount >= 3) {
    patterns.push({
      type: 'ua_rotation',
      severity: 'medium',
      description: `Rotating between ${uaCount} different User-Agents`,
      details: { userAgentCount: uaCount },
    })
  }

  if (profile.totalIncidents >= 10) {
    patterns.push({
      type: 'persistent',
      severity: 'high',
      description: `${profile.totalIncidents} incidents recorded`,
      details: { totalIncidents: profile.totalIncidents },
    })
  }

  if (profile.incidents && profile.incidents.length >= 5) {
    const recentIncidents = profile.incidents.slice(-5)
    const timestamps = recentIncidents.map(i => new Date(i.timestamp).getTime())
    const intervals: number[] = []
    for (let i = 1; i < timestamps.length; i++) {
      intervals.push(timestamps[i] - timestamps[i - 1])
    }
    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length

    if (avgInterval < 5000) {
      patterns.push({
        type: 'automated_scan',
        severity: 'high',
        description: 'Automated scanning pattern detected (rapid requests)',
        details: { avgIntervalMs: Math.round(avgInterval) },
      })
    }
  }

  return patterns
}

interface UserAgentAnalysis {
  total: number
  unique: number
  userAgents: Array<{ userAgent: string; count: number; category: string }>
  topUserAgent: { userAgent: string; count: number; category: string } | null
  diversity: string
}

/**
 * Get User-Agent analysis for a profile.
 */
export function analyzeUserAgents(profile: AttackerProfile): UserAgentAnalysis {
  if (!profile || !profile.userAgents) {
    return { total: 0, unique: 0, userAgents: [], topUserAgent: null, diversity: '0.000' }
  }

  const userAgents = Object.entries(profile.userAgents)
    .map(([ua, count]) => ({ userAgent: ua, count: count as number }))
    .sort((a, b) => b.count - a.count)

  const totalRequests = Object.values(profile.userAgents).reduce((a: number, b) => a + (b as number), 0)
  const uniqueCount = userAgents.length
  const diversity = uniqueCount / totalRequests

  const classified = userAgents.map(ua => {
    const uaLower = ua.userAgent.toLowerCase()
    let category = 'unknown'

    if (uaLower.includes('bot') || uaLower.includes('crawler') || uaLower.includes('spider')) {
      category = 'bot'
    } else if (uaLower.includes('curl') || uaLower.includes('wget') || uaLower.includes('python')) {
      category = 'script'
    } else if (uaLower.includes('postman') || uaLower.includes('insomnia')) {
      category = 'api_client'
    } else if (uaLower.includes('chrome') || uaLower.includes('firefox') || uaLower.includes('safari')) {
      category = 'browser'
    } else if (uaLower.includes('nikto') || uaLower.includes('sqlmap') || uaLower.includes('wfuzz')) {
      category = 'attack_tool'
    }

    return { ...ua, category }
  })

  return {
    total: totalRequests,
    unique: uniqueCount,
    userAgents: classified,
    topUserAgent: classified[0] || null,
    diversity: diversity.toFixed(3),
  }
}

/**
 * Delete an attacker profile.
 */
export async function deleteProfile(hashedIp: string): Promise<boolean> {
  const redis = getRedis()
  if (!redis) return false
  try {
    const profileKey = `${PROFILE_PREFIX}${hashedIp}`
    await redis.del(profileKey)
    await redis.srem(PROFILE_LIST_KEY, hashedIp)
    return true
  } catch (error) {
    console.error('[PROFILE] Failed to delete profile:', error)
    return false
  }
}
