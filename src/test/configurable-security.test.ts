import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { VercelRequest, VercelResponse } from '@vercel/node';

// ---------------------------------------------------------------------------
// Mock @vercel/kv (for canary-alerts.ts)
// ---------------------------------------------------------------------------
const mockKvGet = vi.fn()
const mockKvSet = vi.fn()
const mockKvIncrby = vi.fn()
const mockKvExpire = vi.fn()
const mockKvLrange = vi.fn()

vi.mock('@vercel/kv', () => ({
  kv: {
    get: mockKvGet,
    set: mockKvSet,
    incrby: mockKvIncrby,
    expire: mockKvExpire,
    lrange: mockKvLrange,
  },
}))

// Mock @upstash/redis (for _threat-score.ts)
vi.mock('@upstash/redis', () => {
  const Redis = function () {
    return { get: mockKvGet, set: mockKvSet, incrby: mockKvIncrby, expire: mockKvExpire }
  }
  return { Redis }
})

// Mock rate limiter
vi.mock('../../api/_ratelimit.js', () => ({
  applyRateLimit: vi.fn().mockResolvedValue(true),
  getClientIp: vi.fn().mockReturnValue('192.168.1.100'),
  hashIp: vi.fn().mockReturnValue('abc123hashedip'),
}))

// Mock auth
vi.mock('../../api/auth.js', () => ({
  validateSession: vi.fn().mockResolvedValue(true),
}))

// Mock attacker profile
vi.mock('../../api/_attacker-profile.js', () => ({
  recordIncident: vi.fn().mockResolvedValue(undefined),
}))

type Res = { status: ReturnType<typeof vi.fn>; json: ReturnType<typeof vi.fn>; end: ReturnType<typeof vi.fn>; setHeader: ReturnType<typeof vi.fn>; send: ReturnType<typeof vi.fn> }

function mockRes() {
  const res: Res = {
    status: vi.fn(),
    json: vi.fn(),
    end: vi.fn(),
    setHeader: vi.fn(),
    send: vi.fn(),
  }
  res.status.mockReturnValue(res)
  res.json.mockReturnValue(res)
  res.end.mockReturnValue(res)
  res.send.mockReturnValue(res)
  return res as unknown as VercelResponse
}

// ---------------------------------------------------------------------------
// Configurable Threat Score Thresholds & Points
// ---------------------------------------------------------------------------
process.env.UPSTASH_REDIS_REST_URL = 'https://fake-kv.test'
process.env.UPSTASH_REDIS_REST_TOKEN = 'fake-token'

const { classifyThreatLevel, getEffectiveThresholds, getEffectiveReasonPoints, THREAT_LEVELS, THREAT_REASONS } = await import('../../api/_threat-score.js')

describe('Configurable Threat Score: classifyThreatLevel', () => {
  it('uses default thresholds when no custom thresholds provided', () => {
    expect(classifyThreatLevel(0)).toBe('CLEAN')
    expect(classifyThreatLevel(2)).toBe('CLEAN')
    expect(classifyThreatLevel(3)).toBe('WARN')
    expect(classifyThreatLevel(7)).toBe('TARPIT')
    expect(classifyThreatLevel(12)).toBe('BLOCK')
  })

  it('uses custom thresholds when provided', () => {
    const custom = { CLEAN: 0, WARN: 5, TARPIT: 10, BLOCK: 20 }
    expect(classifyThreatLevel(4, custom)).toBe('CLEAN')
    expect(classifyThreatLevel(5, custom)).toBe('WARN')
    expect(classifyThreatLevel(10, custom)).toBe('TARPIT')
    expect(classifyThreatLevel(15, custom)).toBe('TARPIT')
    expect(classifyThreatLevel(20, custom)).toBe('BLOCK')
  })
})

describe('Configurable Threat Score: getEffectiveThresholds', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns defaults when no settings in KV', async () => {
    mockKvGet.mockResolvedValue(null)
    const thresholds = await getEffectiveThresholds()
    expect(thresholds.WARN).toBe(3)
    expect(thresholds.TARPIT).toBe(7)
    expect(thresholds.BLOCK).toBe(12)
  })

  it('returns custom thresholds from KV settings', async () => {
    mockKvGet.mockResolvedValue({
      warnThreshold: 5,
      tarpitThreshold: 10,
      autoBlockThreshold: 20,
    })
    const thresholds = await getEffectiveThresholds()
    expect(thresholds.WARN).toBe(5)
    expect(thresholds.TARPIT).toBe(10)
    expect(thresholds.BLOCK).toBe(20)
  })

  it('falls back to defaults on KV error', async () => {
    mockKvGet.mockRejectedValue(new Error('KV error'))
    const thresholds = await getEffectiveThresholds()
    expect(thresholds.WARN).toBe(THREAT_LEVELS.WARN)
    expect(thresholds.TARPIT).toBe(THREAT_LEVELS.TARPIT)
    expect(thresholds.BLOCK).toBe(THREAT_LEVELS.BLOCK)
  })
})

describe('Configurable Threat Score: getEffectiveReasonPoints', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns defaults when no settings in KV', async () => {
    mockKvGet.mockResolvedValue(null)
    const reasons = await getEffectiveReasonPoints()
    expect(reasons.HONEYTOKEN_ACCESS.points).toBe(5)
    expect(reasons.SUSPICIOUS_UA.points).toBe(4)
    expect(reasons.ROBOTS_VIOLATION.points).toBe(3)
  })

  it('returns custom points from KV settings', async () => {
    mockKvGet.mockResolvedValue({
      pointsHoneytokenAccess: 10,
      pointsSuspiciousUa: 8,
      pointsRobotsViolation: 6,
      pointsMissingHeaders: 3,
      pointsGenericAccept: 2,
      pointsRateLimitExceeded: 4,
    })
    const reasons = await getEffectiveReasonPoints()
    expect(reasons.HONEYTOKEN_ACCESS.points).toBe(10)
    expect(reasons.SUSPICIOUS_UA.points).toBe(8)
    expect(reasons.ROBOTS_VIOLATION.points).toBe(6)
    expect(reasons.MISSING_BROWSER_HEADERS.points).toBe(3)
    expect(reasons.GENERIC_ACCEPT.points).toBe(2)
    expect(reasons.RATE_LIMIT_EXCEEDED.points).toBe(4)
  })

  it('falls back to defaults on KV error', async () => {
    mockKvGet.mockRejectedValue(new Error('KV error'))
    const reasons = await getEffectiveReasonPoints()
    expect(reasons.HONEYTOKEN_ACCESS.points).toBe(THREAT_REASONS.HONEYTOKEN_ACCESS.points)
  })
})

// ---------------------------------------------------------------------------
// Canary Alerts API
// ---------------------------------------------------------------------------
const canaryAlertsHandler = (await import('../../api/canary-alerts.js')).default

describe('Canary Alerts API: GET /api/canary-alerts', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 405 for non-GET methods', async () => {
    const res = mockRes()
    await canaryAlertsHandler({ method: 'POST', headers: {} } as unknown as VercelRequest, res)
    expect(res.status).toHaveBeenCalledWith(405)
  })

  it('returns alerts from KV', async () => {
    const alertData = [
      JSON.stringify({ token: 'abc123', hashedIp: 'hash1', timestamp: '2026-01-01T00:00:00Z' }),
      JSON.stringify({ token: 'def456', hashedIp: 'hash2', timestamp: '2026-01-02T00:00:00Z' }),
    ]
    mockKvLrange.mockResolvedValue(alertData)
    const res = mockRes()
    await canaryAlertsHandler({ method: 'GET', headers: {} } as unknown as VercelRequest, res)
    expect(res.json).toHaveBeenCalledWith({
      alerts: [
        { token: 'abc123', hashedIp: 'hash1', timestamp: '2026-01-01T00:00:00Z' },
        { token: 'def456', hashedIp: 'hash2', timestamp: '2026-01-02T00:00:00Z' },
      ],
    })
  })

  it('returns empty array when no alerts exist', async () => {
    mockKvLrange.mockResolvedValue([])
    const res = mockRes()
    await canaryAlertsHandler({ method: 'GET', headers: {} } as unknown as VercelRequest, res)
    expect(res.json).toHaveBeenCalledWith({ alerts: [] })
  })

  it('handles KV errors gracefully', async () => {
    mockKvLrange.mockRejectedValue(new Error('KV error'))
    const res = mockRes()
    await canaryAlertsHandler({ method: 'GET', headers: {} } as unknown as VercelRequest, res)
    expect(res.status).toHaveBeenCalledWith(500)
  })

  it('returns 200 for OPTIONS (CORS preflight)', async () => {
    const res = mockRes()
    await canaryAlertsHandler({ method: 'OPTIONS', headers: {} } as unknown as VercelRequest, res)
    expect(res.status).toHaveBeenCalledWith(200)
  })
})

// ---------------------------------------------------------------------------
// Security Settings: new configurable fields
// ---------------------------------------------------------------------------
describe('Security Settings: configurable thresholds and points', () => {
  it('DEFAULT_SETTINGS includes threat level thresholds', async () => {
    const { DEFAULT_SETTINGS } = await import('../../src/components/SecuritySettingsDialog')
    expect(DEFAULT_SETTINGS).toHaveProperty('warnThreshold', 3)
    expect(DEFAULT_SETTINGS).toHaveProperty('tarpitThreshold', 7)
  })

  it('DEFAULT_SETTINGS includes threat reason points', async () => {
    const { DEFAULT_SETTINGS } = await import('../../src/components/SecuritySettingsDialog')
    expect(DEFAULT_SETTINGS).toHaveProperty('pointsRobotsViolation', 3)
    expect(DEFAULT_SETTINGS).toHaveProperty('pointsHoneytokenAccess', 5)
    expect(DEFAULT_SETTINGS).toHaveProperty('pointsSuspiciousUa', 4)
    expect(DEFAULT_SETTINGS).toHaveProperty('pointsMissingHeaders', 2)
    expect(DEFAULT_SETTINGS).toHaveProperty('pointsGenericAccept', 1)
    expect(DEFAULT_SETTINGS).toHaveProperty('pointsRateLimitExceeded', 2)
  })

  it('DEFAULT_SETTINGS includes alert channel configuration', async () => {
    const { DEFAULT_SETTINGS } = await import('../../src/components/SecuritySettingsDialog')
    expect(DEFAULT_SETTINGS).toHaveProperty('discordWebhookUrl', '')
    expect(DEFAULT_SETTINGS).toHaveProperty('alertEmail', '')
  })

  it('all new settings are JSON-serializable', async () => {
    const { DEFAULT_SETTINGS } = await import('../../src/components/SecuritySettingsDialog')
    const json = JSON.stringify(DEFAULT_SETTINGS)
    const parsed = JSON.parse(json)
    expect(parsed.warnThreshold).toBe(3)
    expect(parsed.tarpitThreshold).toBe(7)
    expect(parsed.pointsHoneytokenAccess).toBe(5)
    expect(parsed.discordWebhookUrl).toBe('')
    expect(parsed.alertEmail).toBe('')
  })
})

// ---------------------------------------------------------------------------
// i18n: new translation keys
// ---------------------------------------------------------------------------
describe('i18n: new configurable settings translations', () => {
  it('has translations for threat thresholds', async () => {
    const { t } = await import('../../src/lib/i18n-security')
    expect(t('param.warnThreshold', 'en')).toBe('WARN Threshold')
    expect(t('param.warnThreshold', 'de')).toBe('WARN-Schwellenwert')
    expect(t('param.tarpitThreshold', 'en')).toBe('TARPIT Threshold')
    expect(t('param.tarpitThreshold', 'de')).toBe('TARPIT-Schwellenwert')
  })

  it('has translations for reason points', async () => {
    const { t } = await import('../../src/lib/i18n-security')
    expect(t('param.pointsHoneytoken', 'en')).toBe('Honeytoken Access')
    expect(t('param.pointsHoneytoken', 'de')).toBe('Honeytoken-Zugriff')
    expect(t('param.pointsSuspiciousUa', 'en')).toBe('Suspicious User-Agent')
  })

  it('has translations for alert channels', async () => {
    const { t } = await import('../../src/lib/i18n-security')
    expect(t('param.discordWebhook', 'en')).toBe('Discord Webhook URL')
    expect(t('param.discordWebhook', 'de')).toBe('Discord-Webhook-URL')
    expect(t('param.alertEmail', 'en')).toBe('Alert Email')
    expect(t('param.alertEmail', 'de')).toBe('Alarm-E-Mail')
  })
})
