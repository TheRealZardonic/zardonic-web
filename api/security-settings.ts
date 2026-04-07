import { Redis } from '@upstash/redis'
const kv = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || '',
  token: process.env.UPSTASH_REDIS_REST_TOKEN || ''
})
import { applyRateLimit } from './_ratelimit.js'
import { validateSession } from './auth.js'
import { z } from 'zod'
import { validate } from './_schemas.js'

/**
 * Security settings API — server-persisted security configuration.
 *
 * These settings are stored in KV (Redis) under `nk-security-settings`,
 * NOT in the public band-data JSON.  This ensures sensitive security
 * configuration is never exposed to unauthenticated users.
 *
 * GET  /api/security-settings  → read current settings (admin only)
 * POST /api/security-settings  → update settings (admin only)
 */

interface VercelRequest {
  method?: string
  body?: Record<string, unknown>
  query?: Record<string, string | string[]>
  headers: Record<string, string | string[] | undefined>
}

interface VercelResponse {
  setHeader(key: string, value: string): VercelResponse
  status(code: number): VercelResponse
  json(data: unknown): VercelResponse
  end(): VercelResponse
}

const KV_KEY = 'nk-security-settings'

const isKVConfigured = (): boolean => {
  return !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN)
}

/** Default security settings */
const DEFAULTS = {
  honeytokensEnabled: true,
  rateLimitEnabled: true,
  robotsTrapEnabled: true,
  entropyInjectionEnabled: true,
  suspiciousUaBlockingEnabled: true,
  sessionBindingEnabled: true,
  maxAlertsStored: 500,
  tarpitMinMs: 3000,
  tarpitMaxMs: 8000,
  sessionTtlSeconds: 14400,
  threatScoringEnabled: true,
  zipBombEnabled: false,        // Default OFF — explizit aktivieren erforderlich
  alertingEnabled: false,       // Default OFF — nur wenn DISCORD_WEBHOOK_URL gesetzt
  hardBlockEnabled: true,
  autoBlockThreshold: 12,       // Score ab dem auto-geblockt wird
  underAttackMode: false,       // Emergency mode — disables expensive countermeasures, returns 429
  // Threat level thresholds — configurable
  warnThreshold: 3,
  tarpitThreshold: 7,
  // Threat reason points — configurable
  pointsRobotsViolation: 3,
  pointsHoneytokenAccess: 5,
  pointsSuspiciousUa: 4,
  pointsMissingHeaders: 2,
  pointsGenericAccept: 1,
  pointsRateLimitExceeded: 2,
  // Tarpit & Zip Bomb rules
  tarpitOnWarn: true,
  tarpitOnSuspiciousUa: true,
  tarpitOnRobotsViolation: true,
  tarpitOnHoneytoken: false,
  tarpitOnBlock: false,
  zipBombOnBlock: false,
  zipBombOnHoneytoken: false,
  zipBombOnRepeatOffender: false,
  zipBombOnRobotsViolation: false,
  zipBombOnSuspiciousUa: false,
  zipBombOnRateLimit: false,
  // Countermeasures — Log Poisoning, SQL Backfire, Canary Documents
  sqlBackfireEnabled: false,
  canaryDocumentsEnabled: false,
  logPoisoningEnabled: false,
  // SQL Backfire rules
  sqlBackfireOnScannerDetection: true,
  sqlBackfireOnHoneytokenAccess: false,
  // Canary Document rules
  canaryPhoneHomeOnOpen: true,
  canaryCollectFingerprint: true,
  canaryAlertOnCallback: true,
  // Log Poisoning rules
  logPoisonFakeHeaders: true,
  logPoisonTerminalEscape: true,
  logPoisonFakePaths: true,
  // Alert channels — configurable (overrides env vars when set)
  discordWebhookUrl: '',
  alertEmail: '',
}

/** Zod schema for security settings */
const securitySettingsSchema = z.object({
  honeytokensEnabled: z.boolean().optional(),
  rateLimitEnabled: z.boolean().optional(),
  robotsTrapEnabled: z.boolean().optional(),
  entropyInjectionEnabled: z.boolean().optional(),
  suspiciousUaBlockingEnabled: z.boolean().optional(),
  sessionBindingEnabled: z.boolean().optional(),
  maxAlertsStored: z.number().int().min(10).max(10000).optional(),
  tarpitMinMs: z.number().int().min(0).max(30000).optional(),
  tarpitMaxMs: z.number().int().min(0).max(60000).optional(),
  sessionTtlSeconds: z.number().int().min(300).max(86400).optional(),
  threatScoringEnabled: z.boolean().optional(),
  zipBombEnabled: z.boolean().optional(),
  alertingEnabled: z.boolean().optional(),
  hardBlockEnabled: z.boolean().optional(),
  autoBlockThreshold: z.number().int().min(3).max(50).optional(),
  underAttackMode: z.boolean().optional(),
  // Threat level thresholds — configurable
  warnThreshold: z.number().int().min(1).max(50).optional(),
  tarpitThreshold: z.number().int().min(2).max(50).optional(),
  // Threat reason points — configurable
  pointsRobotsViolation: z.number().int().min(0).max(20).optional(),
  pointsHoneytokenAccess: z.number().int().min(0).max(20).optional(),
  pointsSuspiciousUa: z.number().int().min(0).max(20).optional(),
  pointsMissingHeaders: z.number().int().min(0).max(20).optional(),
  pointsGenericAccept: z.number().int().min(0).max(20).optional(),
  pointsRateLimitExceeded: z.number().int().min(0).max(20).optional(),
  // Tarpit & Zip Bomb rules
  tarpitOnWarn: z.boolean().optional(),
  tarpitOnSuspiciousUa: z.boolean().optional(),
  tarpitOnRobotsViolation: z.boolean().optional(),
  tarpitOnHoneytoken: z.boolean().optional(),
  tarpitOnBlock: z.boolean().optional(),
  zipBombOnBlock: z.boolean().optional(),
  zipBombOnHoneytoken: z.boolean().optional(),
  zipBombOnRepeatOffender: z.boolean().optional(),
  zipBombOnRobotsViolation: z.boolean().optional(),
  zipBombOnSuspiciousUa: z.boolean().optional(),
  zipBombOnRateLimit: z.boolean().optional(),
  // Countermeasures
  sqlBackfireEnabled: z.boolean().optional(),
  canaryDocumentsEnabled: z.boolean().optional(),
  logPoisoningEnabled: z.boolean().optional(),
  // SQL Backfire rules
  sqlBackfireOnScannerDetection: z.boolean().optional(),
  sqlBackfireOnHoneytokenAccess: z.boolean().optional(),
  // Canary Document rules
  canaryPhoneHomeOnOpen: z.boolean().optional(),
  canaryCollectFingerprint: z.boolean().optional(),
  canaryAlertOnCallback: z.boolean().optional(),
  // Log Poisoning rules
  logPoisonFakeHeaders: z.boolean().optional(),
  logPoisonTerminalEscape: z.boolean().optional(),
  logPoisonFakePaths: z.boolean().optional(),
  // Alert channels — configurable (overrides env vars when set)
  discordWebhookUrl: z.string().max(500).optional(),
  alertEmail: z.string().max(200).optional(),
})

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  // Validate session first — authenticated admins bypass rate limiting
  // to prevent 429 errors when the dashboard loads multiple endpoints after login
  const sessionValid = await validateSession(req)
  if (!sessionValid) {
    const allowed = await applyRateLimit(req, res)
    if (!allowed) return
    res.status(403).json({ error: 'Forbidden' })
    return
  }

  if (!isKVConfigured()) {
    res.status(503).json({ error: 'Service unavailable', message: 'KV storage is not configured.' })
    return
  }

  try {
    if (req.method === 'GET') {
      const stored = await kv.get<typeof DEFAULTS>(KV_KEY)
      const settings = { ...DEFAULTS, ...(stored || {}) }
      res.json({ settings })
      return
    }

    if (req.method === 'POST') {
      if (!req.body || typeof req.body !== 'object') {
        res.status(400).json({ error: 'Request body is required' })
        return
      }

      const parsed = validate(securitySettingsSchema, req.body)
      if (!parsed.success) {
        res.status(400).json({ error: parsed.error })
        return
      }

      // Merge with existing settings
      const stored = await kv.get<typeof DEFAULTS>(KV_KEY)
      const updated = { ...DEFAULTS, ...(stored || {}), ...parsed.data }

      await kv.set(KV_KEY, updated)
      res.json({ success: true, settings: updated })
      return
    }

    res.status(405).json({ error: 'Method not allowed' })
  } catch (error) {
    console.error('Security settings API error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}
