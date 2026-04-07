import { Redis } from '@upstash/redis'
const kv = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || '',
  token: process.env.UPSTASH_REDIS_REST_TOKEN || ''
})
import { randomBytes, createHash } from 'node:crypto'
import { getClientIp, hashIp, getVercelGeoData } from './_ratelimit.js'
import { incrementThreatScore, THREAT_REASONS } from './_threat-score.js'
import { sendSecurityAlert } from './_alerting.js'
import { serveZipBomb } from './_zipbomb.js'
import { recordIncident } from './_attacker-profile.js'
import { logSecurityEvent } from './_security-logger.js'

/**
 * Honeytokens — decoy records planted in the database.
 *
 * These keys/values look like real credentials or backup data.  They are
 * never accessed by legitimate application code.  Any read or write to a
 * honeytoken key is treated as an intrusion indicator and triggers a
 * silent alarm (logged + persisted to KV for the admin dashboard).
 *
 * The alarm is *silent* — the API returns a plausible-looking error so the
 * attacker doesn't know they've been detected.
 */

interface VercelLikeRequest {
  method?: string
  headers: Record<string, string | string[] | undefined>
}

interface VercelLikeResponse {
  setHeader(key: string, value: string): VercelLikeResponse
  status(code: number): VercelLikeResponse
  json(data: unknown): VercelLikeResponse
  end(): VercelLikeResponse
  send(data: unknown): VercelLikeResponse
}

interface SecuritySettings {
  alertingEnabled?: boolean
  zipBombEnabled?: boolean
}

/**
 * Filter request headers for forensic storage.
 * Removes sensitive headers (cookie, authorization, api keys) to avoid
 * storing credentials; all remaining values are coerced to a single string.
 */
function sanitizeHeaders(
  headers: Record<string, string | string[] | undefined>,
): Record<string, string> {
  const BLOCKED = new Set(['cookie', 'authorization', 'x-auth-token', 'x-api-key'])
  return Object.fromEntries(
    Object.entries(headers)
      .filter(([k]) => !BLOCKED.has(k.toLowerCase()))
      .map(([k, v]) => [k, Array.isArray(v) ? v[0] : (v ?? '')]),
  )
}

/**
 * Compute a tamper-evident SHA-256 hash of an incident object.
 * The hash covers all fields except `evidenceHash` itself, allowing
 * downstream verifiers to confirm the entry has not been modified.
 */
export function computeEvidenceHash(
  incident: Record<string, unknown>,
): string {
  return createHash('sha256').update(JSON.stringify(incident)).digest('hex')
}

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
 *
 * Writes a timestamped entry to `nk-honeytoken-alerts` in KV so the admin
 * can review intrusion attempts.  Also logs to stderr for server-side
 * monitoring (e.g. Vercel log drain → SIEM).
 */
/**
 * Returns `true` when a response was already sent (e.g. zip bomb),
 * so callers know they must not attempt to send a second response.
 */
export async function triggerHoneytokenAlarm(req: VercelLikeRequest, key: string, res: VercelLikeResponse | null = null): Promise<boolean> {
  const ip = getClientIp(req)
  const hashedIp = hashIp(ip)
  const detectedAt = new Date().toISOString()
  const geo = getVercelGeoData(req)
  const sanitizedHeaders = sanitizeHeaders(req.headers)
  const userAgent = (req.headers['user-agent'] as string || '').slice(0, 200)
  const method = req.method ?? 'UNKNOWN'

  const baseEntry = {
    key,
    method,
    hashedIp,
    userAgent,
    timestamp: detectedAt,
    detectedAt,
    incidentClass: 'HONEYTOKEN_ACCESS' as const,
    severity: 'CRITICAL' as const,
    legalBasis: '§202a StGB — Unauthorized access to computer systems',
    countryCode: geo.countryCode,
    requestHeaders: sanitizedHeaders,
  }
  const evidenceHash = computeEvidenceHash(baseEntry)
  const entry = { ...baseEntry, evidenceHash }

  // Persist to KV for the legacy security-incidents admin view (capped list)
  try {
    await kv.lpush('nk-honeytoken-alerts', JSON.stringify(entry))
    await kv.ltrim('nk-honeytoken-alerts', 0, 499) // keep last 500 alerts
  } catch {
    // Persistence failure must not block the response
  }

  // Mark this IP as an attacker for entropy injection
  await markAttacker(hashedIp)

  // Increment threat score
  let threatResult = { score: 0, level: 'CLEAN' }
  try {
    threatResult = await incrementThreatScore(hashedIp, THREAT_REASONS.HONEYTOKEN_ACCESS.reason, THREAT_REASONS.HONEYTOKEN_ACCESS.points, userAgent)
  } catch {
    // Threat scoring failure must not block the response
  }

  // Record incident in attacker profile
  try {
    await recordIncident(hashedIp, {
      type: 'honeytoken_access',
      key,
      method,
      userAgent,
      threatScore: threatResult.score,
      threatLevel: threatResult.level,
      timestamp: detectedAt,
    })
  } catch {
    // Profile recording failure must not block the response
  }

  // Load settings once — used for alerting and zip bomb checks below
  const settings = await kv.get<SecuritySettings>('nk-security-settings').catch(() => null)

  // Send security alert if enabled
  try {
    if (settings?.alertingEnabled) {
      await sendSecurityAlert({
        type: 'HONEYTOKEN ACCESS',
        key,
        method,
        hashedIp,
        userAgent,
        timestamp: detectedAt,
        threatScore: threatResult.score,
        threatLevel: threatResult.level,
        severity: 'critical',
      })
    }
  } catch {
    // Alerting failure must not block the response
  }

  // Serve zip bomb if enabled and response object provided
  let responseSent = false
  try {
    if (res && settings?.zipBombEnabled) {
      await serveZipBomb(res)
      responseSent = true
    }
  } catch {
    // Zip bomb failure must not block the response
  }

  // Unified structured log — written last so threatResult is available
  await logSecurityEvent({
    event: 'HONEYTOKEN_ACCESS',
    severity: 'critical',
    hashedIp,
    userAgent,
    method,
    geo: { countryCode: geo.countryCode, region: geo.region, city: geo.city },
    countermeasure: responseSent ? 'ZIP_BOMB' : 'TAUNT_403',
    threatScore: threatResult.score,
    threatLevel: threatResult.level,
    details: {
      key,
      evidenceHash,
      legalBasis: baseEntry.legalBasis,
    },
  })

  return responseSent
}

/** KV prefix and TTL for flagged attacker IPs */
const FLAGGED_PREFIX = 'nk-flagged:'
const FLAGGED_TTL = 86400 // 24 hours

/**
 * Mark an IP hash as a known attacker in KV.
 * Flagged IPs receive entropy-injected responses to confuse scanners.
 */
export async function markAttacker(hashedIp: string): Promise<void> {
  try {
    await kv.set(`${FLAGGED_PREFIX}${hashedIp}`, true, { ex: FLAGGED_TTL })
  } catch {
    // Marking failure must not block the response
  }
}

/**
 * Check whether the request originates from an IP previously flagged as an attacker.
 */
export async function isMarkedAttacker(req: VercelLikeRequest): Promise<boolean> {
  try {
    const ip = getClientIp(req)
    const hashedIp = hashIp(ip)
    const flagged = await kv.get(`${FLAGGED_PREFIX}${hashedIp}`)
    return !!flagged
  } catch {
    return false
  }
}

/**
 * Confrontational taunt messages returned to detected attackers.
 * Displayed in JSON error responses when honeytokens are triggered.
 */
export const TAUNT_MESSAGES = [
  'Nice try, mf. Your IP hash is now a permanent resident in our blacklist.',
  'CONNECTION_TERMINATED: You\'re not half as fast as you think you are.',
  'FATAL_ERROR: Neural link severed. Go back to the playground.',
  'NOOB_DETECTED: Next time, try changing your User-Agent before hacking a band.',
]

/** Pick a random taunt message */
export function getRandomTaunt(): string {
  return TAUNT_MESSAGES[Math.floor(Math.random() * TAUNT_MESSAGES.length)]
}

/**
 * Set confrontational defense warning headers on responses to flagged attackers.
 * Many scanners log response headers — these will appear in their output.
 */
export function setDefenseHeaders(res: VercelLikeResponse): void {
  res.setHeader('X-Neural-Defense', 'Active. Target identified.')
  res.setHeader('X-Netrunner-Status', 'Nice try, but you\'re barking up the wrong tree.')
  res.setHeader('X-Warning', 'Stop poking the Baphomet. It might poke back.')
}

/**
 * Entropy Injection counter-measure against automated scanners.
 *
 * Injects a large number of random custom headers into the response to
 * confuse automated scanners and fuzzing tools that rely on clean,
 * predictable HTTP headers.  Each header contains cryptographically
 * random hex data so the output cannot be predicted or filtered easily.
 */
export function injectEntropyHeaders(res: VercelLikeResponse, count = 200): void {
  for (let i = 0; i < count; i++) {
    const idx = String(i).padStart(3, '0')
    res.setHeader(`X-Neural-Noise-${idx}`, randomBytes(16).toString('hex'))
  }
}

/**
 * 1×1 transparent PNG pixel (89 bytes).
 * Served to flagged attackers through the image proxy instead of the real image
 * to collect browser fingerprinting information via response headers.
 */
const TRACKING_PIXEL = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVQI12NgAAIABQAB' +
  'Nl7BcQAAAABJRU5ErkJggg==',
  'base64'
)

/**
 * Serve a 1×1 transparent tracking pixel with fingerprinting headers.
 * The response includes headers that encourage the browser to reveal
 * rendering capabilities, helping identify the attacker across sessions.
 */
export function serveFingerprintPixel(res: VercelLikeResponse): unknown {
  res.setHeader('Content-Type', 'image/png')
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate')
  res.setHeader('Accept-CH', 'Sec-CH-UA, Sec-CH-UA-Platform, Sec-CH-UA-Mobile, Sec-CH-UA-Full-Version-List, Sec-CH-UA-Arch, Sec-CH-UA-Bitness, Sec-CH-UA-Model, Device-Memory, DPR, Viewport-Width, Width')
  res.setHeader('Critical-CH', 'Sec-CH-UA-Full-Version-List, Sec-CH-UA-Arch, Sec-CH-UA-Bitness, Sec-CH-UA-Model')
  res.setHeader('Vary', 'Sec-CH-UA, Sec-CH-UA-Platform, Sec-CH-UA-Arch, Sec-CH-UA-Model')
  setDefenseHeaders(res)
  return res.status(200).send(TRACKING_PIXEL)
}

/**
 * Seed honeytoken records into KV.
 *
 * Called once at deploy / startup.  The values look like real hashes so an
 * attacker who dumps the DB won't immediately recognize them as decoys.
 */
export async function seedHoneytokens(): Promise<void> {
  const decoyValues: Record<string, string> = {
    'admin_backup': 'b2a4f8e1c3d5a7b9e0f2c4d6a8b0e1f3c5d7a9b1e3f5c7d9a1b3e5f7c9d1a3',
    'admin-backup-hash': '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
    'db-credentials': '{"host":"internal-db.prod","user":"root","pass":"s3cret-fake"}',
    'api-master-key': 'sk_live_fake_4eC39HqLyjWDarjtT1zdp7dc',
    'backup-admin-password': 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
  }

  for (const [key, value] of Object.entries(decoyValues)) {
    try {
      // Only seed if the key doesn't already exist (don't overwrite on every call)
      const existing = await kv.get(key)
      if (existing == null) {
        await kv.set(key, value)
      }
    } catch {
      // Seeding failure is non-critical
    }
  }
}
