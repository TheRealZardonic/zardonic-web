import { Redis } from '@upstash/redis'
import { randomBytes } from 'node:crypto'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getClientIp, hashIp } from './_ratelimit.js'
import { incrementThreatScore, THREAT_REASONS } from './_threat-score.js'
import { sendSecurityAlert } from './_alerting.js'
import { serveZipBomb } from './_zipbomb.js'
import { recordIncident } from './_attacker-profile.js'

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
 * Honeytokens — decoy records planted in the database.
 *
 * These keys/values look like real credentials or backup data.  They are
 * never accessed by legitimate application code.  Any read or write to a
 * honeytoken key is treated as an intrusion indicator and triggers a
 * silent alarm.
 */

/** Keys that serve as honeytokens.  Must never be used by real code. */
export const HONEYTOKEN_KEYS = [
  'admin_backup',
  'admin-backup-hash',
  'db-credentials',
  'api-master-key',
  'backup-admin-password',
]

/** Check whether a given key is a honeytoken */
export function isHoneytoken(key: string): boolean {
  if (typeof key !== 'string') return false
  return HONEYTOKEN_KEYS.includes(key.toLowerCase())
}

/**
 * Record a honeytoken access event.
 */
export async function triggerHoneytokenAlarm(req: VercelRequest, key: string, res: VercelResponse | null = null): Promise<void> {
  const ip = getClientIp(req)
  const hashedIp = hashIp(ip)
  const entry = {
    key,
    method: req.method,
    hashedIp,
    userAgent: (req.headers['user-agent'] || '').slice(0, 200),
    timestamp: new Date().toISOString(),
  }

  console.error('[HONEYTOKEN ALERT]', JSON.stringify(entry))

  const redis = getRedis()
  if (redis) {
    try {
      await redis.lpush('nk-honeytoken-alerts', JSON.stringify(entry))
      await redis.ltrim('nk-honeytoken-alerts', 0, 499)
    } catch {
      // Persistence failure must not block the response
    }
  }

  await markAttacker(hashedIp)

  let threatResult = { score: 0, level: 'CLEAN' }
  try {
    threatResult = await incrementThreatScore(hashedIp, THREAT_REASONS.HONEYTOKEN_ACCESS.reason, THREAT_REASONS.HONEYTOKEN_ACCESS.points)
  } catch {
    // Threat scoring failure must not block the response
  }

  try {
    await recordIncident(hashedIp, {
      type: 'honeytoken_access',
      key,
      method: req.method || 'GET',
      userAgent: entry.userAgent,
      threatScore: threatResult.score,
      threatLevel: threatResult.level,
      timestamp: entry.timestamp,
    })
  } catch {
    // Profile recording failure must not block the response
  }

  try {
    const settings = redis ? await redis.get<Record<string, unknown>>('zd-security-settings').catch(() => null) : null
    if (settings?.alertingEnabled) {
      await sendSecurityAlert({
        type: 'HONEYTOKEN ACCESS',
        key,
        method: req.method,
        hashedIp,
        userAgent: entry.userAgent,
        timestamp: entry.timestamp,
        threatScore: threatResult.score,
        threatLevel: threatResult.level,
        severity: 'critical',
      })
    }
  } catch {
    // Alerting failure must not block the response
  }

  try {
    if (res) {
      const settings = redis ? await redis.get<Record<string, unknown>>('zd-security-settings').catch(() => null) : null
      if (settings?.zipBombEnabled) {
        await serveZipBomb(res)
        return
      }
    }
  } catch {
    // Zip bomb failure must not block the response
  }
}

/** KV prefix and TTL for flagged attacker IPs */
const FLAGGED_PREFIX = 'nk-flagged:'
const FLAGGED_TTL = 86400 // 24 hours

/**
 * Mark an IP hash as a known attacker in KV.
 */
export async function markAttacker(hashedIp: string): Promise<void> {
  const redis = getRedis()
  if (!redis) return
  try {
    await redis.set(`${FLAGGED_PREFIX}${hashedIp}`, true, { ex: FLAGGED_TTL })
  } catch {
    // Marking failure must not block the response
  }
}

/**
 * Check whether the request originates from an IP previously flagged as an attacker.
 */
export async function isMarkedAttacker(req: VercelRequest): Promise<boolean> {
  const redis = getRedis()
  if (!redis) return false
  try {
    const ip = getClientIp(req)
    const hashedIp = hashIp(ip)
    const flagged = await redis.get(`${FLAGGED_PREFIX}${hashedIp}`)
    return !!flagged
  } catch {
    return false
  }
}

/**
 * Confrontational taunt messages returned to detected attackers.
 */
export const TAUNT_MESSAGES = [
  'Nice try, mf. Your IP hash is now a permanent resident in our blacklist.',
  "CONNECTION_TERMINATED: You're not half as fast as you think you are.",
  'FATAL_ERROR: Neural link severed. Go back to the playground.',
  "NOOB_DETECTED: Next time, try changing your User-Agent before hacking a band.",
]

/** Pick a random taunt message */
export function getRandomTaunt(): string {
  return TAUNT_MESSAGES[Math.floor(Math.random() * TAUNT_MESSAGES.length)]
}

/**
 * Set confrontational defense warning headers on responses to flagged attackers.
 */
export function setDefenseHeaders(res: VercelResponse): void {
  res.setHeader('X-Neural-Defense', 'Active. Target identified.')
  res.setHeader('X-Netrunner-Status', "Nice try, but you're barking up the wrong tree.")
  res.setHeader('X-Warning', 'Stop poking the Baphomet. It might poke back.')
}

/**
 * Entropy Injection counter-measure against automated scanners.
 */
export function injectEntropyHeaders(res: VercelResponse, count = 200): void {
  for (let i = 0; i < count; i++) {
    const idx = String(i).padStart(3, '0')
    res.setHeader(`X-Neural-Noise-${idx}`, randomBytes(16).toString('hex'))
  }
}

/**
 * Serve a 1x1 transparent PNG fingerprint pixel with browser hint headers.
 * Used to gather information about suspected bot clients.
 */
export function serveFingerprintPixel(res: VercelResponse): void {
  // Minimal 1x1 transparent PNG (67 bytes)
  const PIXEL = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
    'base64'
  )
  res.setHeader('Content-Type', 'image/png')
  res.setHeader('Content-Length', PIXEL.length)
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate')
  res.setHeader('Accept-CH', 'Sec-CH-UA, Sec-CH-UA-Mobile, Sec-CH-UA-Platform, Viewport-Width, Width')
  res.setHeader('Critical-CH', 'Sec-CH-UA, Sec-CH-UA-Mobile')
  res.setHeader('Vary', 'Sec-CH-UA, Sec-CH-UA-Mobile, Sec-CH-UA-Platform')
  setDefenseHeaders(res)
  res.status(200).send(PIXEL)
}

/**
 * Seed honeytoken records into KV.
 */
export async function seedHoneytokens(): Promise<void> {
  const redis = getRedis()
  if (!redis) return
  const decoyValues: Record<string, string> = {
    'admin_backup': 'b2a4f8e1c3d5a7b9e0f2c4d6a8b0e1f3c5d7a9b1e3f5c7d9a1b3e5f7c9d1a3',
    'admin-backup-hash': '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
    'db-credentials': '{"host":"internal-db.prod","user":"root","pass":"s3cret-fake"}',
    'api-master-key': 'sk_live_fake_4eC39HqLyjWDarjtT1zdp7dc',
    'backup-admin-password': 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
  }

  for (const [key, value] of Object.entries(decoyValues)) {
    try {
      const existing = await redis.get(key)
      if (existing == null) {
        await redis.set(key, value)
      }
    } catch {
      // Seeding failure is non-critical
    }
  }
}
