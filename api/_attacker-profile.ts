import { Redis } from '@upstash/redis'
const kv = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || '',
  token: process.env.UPSTASH_REDIS_REST_TOKEN || ''
})

/**
 * Attacker profiling system — aggregates behavioral data per IP hash.
 *
 * Tracks:
 * - Threat score history over time
 * - Attack type frequency (honeytoken, robots.txt, suspicious UA, etc.)
 * - User-Agent patterns
 * - Request timing patterns
 * - Incident timeline
 *
 * Data is stored per IP hash to enable detailed forensic analysis.
 */

const PROFILE_PREFIX = 'nk-profile:'
const PROFILE_LIST_KEY = 'nk-profile-list'
const PROFILE_TTL = 2592000 // 30 days
const MAX_HISTORY_ENTRIES = 100

export interface IncidentData {
  type?: string
  key?: string
  method?: string
  userAgent?: string
  threatScore?: number
  threatLevel?: string
  timestamp: string
  token?: string
  documentPath?: string
  event?: string
  url?: string
  countermeasure?: string
  /** Detected pattern name for backfire modules (e.g. 'ETC_PASSWD', 'UNION_SELECT'). */
  pattern?: string | null
}

interface ThreatScoreHistoryEntry {
  score: number
  level?: string
  timestamp: string
  reason: string
}

interface IncidentEntry {
  type: string
  key?: string
  method?: string
  timestamp: string
  threatScore?: number
  threatLevel?: string
}

export interface ForensicEntry {
  token?: string
  event?: string
  timestamp: string
  documentPath?: string
  userAgent?: string
  acceptLanguage?: string
  openerIp?: string
  downloaderIp?: string
  jsFingerprint?: unknown
}

interface BehavioralPatternDetails {
  scoreDelta?: number
  timeHours?: number
  attackTypes?: string[]
  userAgentCount?: number
  totalIncidents?: number
  avgIntervalMs?: number
}

export interface BehavioralPattern {
  type: string
  severity: string
  description: string
  details: BehavioralPatternDetails
}

export interface AttackerProfile {
  hashedIp: string
  firstSeen: string
  lastSeen: string
  totalIncidents: number
  attackTypes: Record<string, number>
  userAgents: Record<string, number>
  threatScoreHistory: ThreatScoreHistoryEntry[]
  incidents: IncidentEntry[]
  forensicData?: ForensicEntry[]
  behavioralPatterns?: BehavioralPattern[]
}

interface ClassifiedUserAgent {
  userAgent: string
  count: number
  category: string
}

export interface UserAgentAnalysis {
  total: number
  unique?: number
  userAgents: ClassifiedUserAgent[]
  topUserAgent: ClassifiedUserAgent | null
  diversity: string
}

/**
 * Record an incident in the attacker's profile.
 */
export async function recordIncident(hashedIp: string, incident: IncidentData): Promise<AttackerProfile | null> {
  try {
    const profileKey = `${PROFILE_PREFIX}${hashedIp}`

    // Get existing profile or create new
    let profile = await kv.get<AttackerProfile>(profileKey)
    if (!profile) {
      profile = {
        hashedIp,
        firstSeen: incident.timestamp,
        lastSeen: incident.timestamp,
        totalIncidents: 0,
        attackTypes: {},
        userAgents: {},
        threatScoreHistory: [],
        incidents: []
      }
    }

    // Update profile
    profile.lastSeen = incident.timestamp
    profile.totalIncidents = (profile.totalIncidents || 0) + 1

    // Track attack types
    const attackType = incident.type || 'unknown'
    profile.attackTypes[attackType] = (profile.attackTypes[attackType] || 0) + 1

    // Track User-Agents
    const ua = incident.userAgent || 'unknown'
    const uaKey = ua.substring(0, 100) // Limit UA key length
    profile.userAgents[uaKey] = (profile.userAgents[uaKey] || 0) + 1

    // Add to threat score history (keep last 100 entries)
    if (incident.threatScore !== undefined) {
      profile.threatScoreHistory = profile.threatScoreHistory || []
      profile.threatScoreHistory.push({
        score: incident.threatScore,
        level: incident.threatLevel,
        timestamp: incident.timestamp,
        reason: attackType
      })
      // Keep only last MAX_HISTORY_ENTRIES
      if (profile.threatScoreHistory.length > MAX_HISTORY_ENTRIES) {
        profile.threatScoreHistory = profile.threatScoreHistory.slice(-MAX_HISTORY_ENTRIES)
      }
    }

    // Add incident to timeline (keep last 50)
    profile.incidents = profile.incidents || []
    profile.incidents.push({
      type: attackType,
      key: incident.key,
      method: incident.method,
      timestamp: incident.timestamp,
      threatScore: incident.threatScore,
      threatLevel: incident.threatLevel
    })
    if (profile.incidents.length > 50) {
      profile.incidents = profile.incidents.slice(-50)
    }

    // Save profile
    await kv.set(profileKey, profile, { ex: PROFILE_TTL })

    // Add to profile list for enumeration
    await kv.sadd(PROFILE_LIST_KEY, hashedIp)

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
  try {
    const profileKey = `${PROFILE_PREFIX}${hashedIp}`
    const profile = await kv.get<AttackerProfile>(profileKey)

    if (!profile) {
      return null
    }

    // Calculate behavioral patterns
    const patterns = analyzeBehavioralPatterns(profile)

    return {
      ...profile,
      behavioralPatterns: patterns
    }
  } catch (error) {
    console.error('[PROFILE] Failed to get profile:', error)
    return null
  }
}

/**
 * Get all attacker profiles with pagination.
 */
export async function getAllProfiles(
  limit = 50,
  offset = 0
): Promise<{ profiles: AttackerProfile[]; total: number; limit: number; offset: number }> {
  try {
    const hashedIps = await kv.smembers(PROFILE_LIST_KEY) || []

    // Sort by most recent activity (we'll need to fetch profiles)
    const profiles: AttackerProfile[] = []
    for (const hashedIp of hashedIps) {
      const profile = await getProfile(hashedIp)
      if (profile) {
        profiles.push(profile)
      } else {
        // Clean up stale entry
        await kv.srem(PROFILE_LIST_KEY, hashedIp)
      }
    }

    // Sort by last seen, most recent first
    profiles.sort((a, b) => new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime())

    // Paginate
    const paginatedProfiles = profiles.slice(offset, offset + limit)

    return {
      profiles: paginatedProfiles,
      total: profiles.length,
      limit,
      offset
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

  // Pattern 1: Rapid escalation (score increased quickly)
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
        details: { scoreDelta: lastScore - firstScore, timeHours: hoursDiff }
      })
    }
  }

  // Pattern 2: Diverse attack types
  const attackTypeCount = Object.keys(profile.attackTypes || {}).length
  if (attackTypeCount >= 3) {
    patterns.push({
      type: 'diverse_attacks',
      severity: 'high',
      description: `Using ${attackTypeCount} different attack types`,
      details: { attackTypes: Object.keys(profile.attackTypes) }
    })
  }

  // Pattern 3: Multiple User-Agents (possible bot rotation)
  const uaCount = Object.keys(profile.userAgents || {}).length
  if (uaCount >= 3) {
    patterns.push({
      type: 'ua_rotation',
      severity: 'medium',
      description: `Rotating between ${uaCount} different User-Agents`,
      details: { userAgentCount: uaCount }
    })
  }

  // Pattern 4: Persistent attacker (many incidents over time)
  if (profile.totalIncidents >= 10) {
    patterns.push({
      type: 'persistent',
      severity: 'high',
      description: `${profile.totalIncidents} incidents recorded`,
      details: { totalIncidents: profile.totalIncidents }
    })
  }

  // Pattern 5: Automated scanning (fast consecutive requests)
  if (profile.incidents && profile.incidents.length >= 5) {
    const recentIncidents = profile.incidents.slice(-5)
    const timestamps = recentIncidents.map(i => new Date(i.timestamp).getTime())
    const intervals: number[] = []
    for (let i = 1; i < timestamps.length; i++) {
      intervals.push(timestamps[i] - timestamps[i - 1])
    }
    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length

    if (avgInterval < 5000) { // Less than 5 seconds between requests
      patterns.push({
        type: 'automated_scan',
        severity: 'high',
        description: 'Automated scanning pattern detected (rapid requests)',
        details: { avgIntervalMs: Math.round(avgInterval) }
      })
    }
  }

  return patterns
}

/**
 * Get User-Agent analysis for a profile.
 */
export function analyzeUserAgents(profile: AttackerProfile): UserAgentAnalysis {
  if (!profile || !profile.userAgents) {
    return { total: 0, userAgents: [], topUserAgent: null, diversity: '0.000' }
  }

  const userAgents = Object.entries(profile.userAgents)
    .map(([ua, count]) => ({ userAgent: ua, count }))
    .sort((a, b) => b.count - a.count)

  const totalRequests = Object.values(profile.userAgents).reduce((a, b) => a + b, 0)
  const uniqueCount = userAgents.length
  const diversity = uniqueCount / totalRequests // Higher = more rotation

  // Classify User-Agents
  const classified: ClassifiedUserAgent[] = userAgents.map(ua => {
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
    diversity: diversity.toFixed(3)
  }
}

/**
 * Add forensic data collected from canary document callbacks to a profile.
 *
 * Forensic data includes browser fingerprints, real IPs discovered via
 * WebRTC STUN, screen dimensions, timezone, language and canvas hashes.
 * Stored under Art. 6(1)(f) GDPR — legitimate interest in defending
 * against active intrusion attempts.
 *
 * @param {string} hashedIp - SHA-256 hashed IP of the attacker
 * @param {object} forensicEntry - Forensic data from canary callback
 */
export async function addForensicData(hashedIp: string, forensicEntry: ForensicEntry): Promise<AttackerProfile | null> {
  try {
    const profileKey = `${PROFILE_PREFIX}${hashedIp}`
    let profile = await kv.get<AttackerProfile>(profileKey)

    if (!profile) {
      // No profile yet — create a minimal one so forensic data is not lost
      profile = {
        hashedIp,
        firstSeen: forensicEntry.timestamp || new Date().toISOString(),
        lastSeen: forensicEntry.timestamp || new Date().toISOString(),
        totalIncidents: 0,
        attackTypes: {},
        userAgents: {},
        threatScoreHistory: [],
        incidents: [],
        forensicData: []
      }
    }

    // Ensure forensicData array exists (for profiles created before this feature)
    profile.forensicData = profile.forensicData || []

    profile.forensicData.push(forensicEntry)

    // Keep last 50 forensic entries
    if (profile.forensicData.length > 50) {
      profile.forensicData = profile.forensicData.slice(-50)
    }

    await kv.set(profileKey, profile, { ex: PROFILE_TTL })
    await kv.sadd(PROFILE_LIST_KEY, hashedIp)

    return profile
  } catch (error) {
    console.error('[PROFILE] Failed to add forensic data:', error)
    return null
  }
}

/**
 * Delete an attacker profile.
 */
export async function deleteProfile(hashedIp: string): Promise<boolean> {
  try {
    const profileKey = `${PROFILE_PREFIX}${hashedIp}`
    await kv.del(profileKey)
    await kv.srem(PROFILE_LIST_KEY, hashedIp)
    return true
  } catch (error) {
    console.error('[PROFILE] Failed to delete profile:', error)
    return false
  }
}
