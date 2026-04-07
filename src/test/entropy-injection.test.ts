import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { VercelRequest, VercelResponse } from '@vercel/node';

// ---------------------------------------------------------------------------
// Mock @upstash/redis — must be declared before importing modules
// ---------------------------------------------------------------------------
const mockKvGet = vi.fn()
const mockKvSet = vi.fn()
const mockKvLpush = vi.fn()
const mockKvLtrim = vi.fn()

vi.mock('@upstash/redis', () => {
  const Redis = function () {
    return { get: mockKvGet, set: mockKvSet, lpush: mockKvLpush, ltrim: mockKvLtrim }
  }
  return { Redis }
})

// Mock alerting
vi.mock('../../api/_alerting.js', () => ({
  sendSecurityAlert: vi.fn().mockResolvedValue(undefined),
}))

// Mock zipbomb
vi.mock('../../api/_zipbomb.js', () => ({
  serveZipBomb: vi.fn().mockReturnValue(false),
}))

// Mock threat score
vi.mock('../../api/_threat-score.js', () => ({
  incrementThreatScore: vi.fn().mockResolvedValue({ score: 5, level: 'WARN' }),
  THREAT_REASONS: {
    HONEYTOKEN_ACCESS: { reason: 'honeytoken_access', points: 5 },
    ROBOTS_VIOLATION: { reason: 'robots_violation', points: 3 },
    SUSPICIOUS_UA: { reason: 'suspicious_ua', points: 4 },
  },
}))

// Mock attacker profile
vi.mock('../../api/_attacker-profile.js', () => ({
  recordIncident: vi.fn().mockResolvedValue(undefined),
}))

// Mock rate limiter
vi.mock('../../api/_ratelimit.js', () => ({
  applyRateLimit: vi.fn().mockResolvedValue(true),
  getClientIp: vi.fn().mockReturnValue('1.2.3.4'),
  hashIp: vi.fn().mockReturnValue('hashed-ip-1234'),
}))

// Set env vars before import so the singleton Redis is properly initialized
process.env.UPSTASH_REDIS_REST_URL = 'https://fake-kv.test'
process.env.UPSTASH_REDIS_REST_TOKEN = 'fake-token'

const {
  markAttacker,
  isMarkedAttacker,
  injectEntropyHeaders,
  triggerHoneytokenAlarm,
  TAUNT_MESSAGES,
  getRandomTaunt,
  setDefenseHeaders,
  serveFingerprintPixel,
} = await import('../../api/_honeytokens.js')

// ---------------------------------------------------------------------------
describe('Entropy Injection: markAttacker', () => {
  beforeEach(() => vi.clearAllMocks())

  it('flags an IP hash in KV with 24h TTL', async () => {
    mockKvSet.mockResolvedValue('OK')
    await markAttacker('abc123hash')
    expect(mockKvSet).toHaveBeenCalledWith('nk-flagged:abc123hash', true, { ex: 86400 })
  })

  it('does not throw when KV write fails', async () => {
    mockKvSet.mockRejectedValue(new Error('KV unavailable'))
    await expect(markAttacker('abc123hash')).resolves.not.toThrow()
  })
})

// ---------------------------------------------------------------------------
describe('Entropy Injection: isMarkedAttacker', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns true when the IP hash is flagged in KV', async () => {
    mockKvGet.mockResolvedValue(true)
    const result = await isMarkedAttacker({ headers: {} } as unknown as VercelRequest)
    expect(result).toBe(true)
    expect(mockKvGet).toHaveBeenCalledWith('nk-flagged:hashed-ip-1234')
  })

  it('returns false when the IP hash is not flagged', async () => {
    mockKvGet.mockResolvedValue(null)
    const result = await isMarkedAttacker({ headers: {} } as unknown as VercelRequest)
    expect(result).toBe(false)
  })

  it('returns false when KV read fails', async () => {
    mockKvGet.mockRejectedValue(new Error('KV unavailable'))
    const result = await isMarkedAttacker({ headers: {} } as unknown as VercelRequest)
    expect(result).toBe(false)
  })
})

// ---------------------------------------------------------------------------
describe('Entropy Injection: injectEntropyHeaders', () => {
  it('injects 200 random headers by default', () => {
    const headers: Record<string, string> = {}
    const res: any = { setHeader: vi.fn((k: string, v: string) => { headers[k] = v }) } as unknown as unknown as VercelResponse
    injectEntropyHeaders(res)
    expect((res as any).setHeader).toHaveBeenCalledTimes(200)
    // Check naming pattern
    expect((res as any).setHeader).toHaveBeenCalledWith('X-Neural-Noise-000', expect.any(String))
    expect((res as any).setHeader).toHaveBeenCalledWith('X-Neural-Noise-199', expect.any(String))
  })

  it('injects configurable number of headers', () => {
    const res: any = { setHeader: vi.fn() } as unknown as unknown as VercelResponse
    injectEntropyHeaders(res, 10)
    expect((res as any).setHeader).toHaveBeenCalledTimes(10)
  })

  it('generates hex values of expected length (32 hex chars = 16 bytes)', () => {
    const values: string[] = []
    const res: any = { setHeader: vi.fn((_k: string, v: string) => { values.push(v) }) } as unknown as unknown as VercelResponse
    injectEntropyHeaders(res, 5)
    for (const val of values) {
      expect(val).toMatch(/^[0-9a-f]{32}$/)
    }
  })

  it('generates unique values across headers', () => {
    const values: string[] = []
    const res: any = { setHeader: vi.fn((_k: string, v: string) => { values.push(v) }) } as unknown as unknown as VercelResponse
    injectEntropyHeaders(res, 50)
    const unique = new Set(values)
    // Cryptographically random — extremely unlikely to have duplicates
    expect(unique.size).toBe(50)
  })
})

// ---------------------------------------------------------------------------
describe('Entropy Injection: triggerHoneytokenAlarm marks attacker', () => {
  beforeEach(() => vi.clearAllMocks())

  it('marks the IP as an attacker when a honeytoken is triggered', async () => {
    mockKvSet.mockResolvedValue('OK')
    mockKvLpush.mockResolvedValue(1)
    mockKvLtrim.mockResolvedValue('OK')
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    await triggerHoneytokenAlarm(
      { method: 'GET', headers: { 'user-agent': 'TestBot' } } as unknown as VercelRequest,
      'admin_backup'
    )

    // Should have called kv.set for the flagged IP
    expect(mockKvSet).toHaveBeenCalledWith('nk-flagged:hashed-ip-1234', true, { ex: 86400 })
    consoleSpy.mockRestore()
  })
})

// ---------------------------------------------------------------------------
describe('Taunting messages: TAUNT_MESSAGES and getRandomTaunt', () => {
  it('contains 4 taunt messages', () => {
    expect(TAUNT_MESSAGES).toHaveLength(4)
  })

  it('includes the expected confrontational messages', () => {
    expect(TAUNT_MESSAGES).toContain('Nice try, mf. Your IP hash is now a permanent resident in our blacklist.')
    expect(TAUNT_MESSAGES).toContain('CONNECTION_TERMINATED: You\'re not half as fast as you think you are.')
    expect(TAUNT_MESSAGES).toContain('FATAL_ERROR: Neural link severed. Go back to the playground.')
    expect(TAUNT_MESSAGES).toContain('NOOB_DETECTED: Next time, try changing your User-Agent before hacking a band.')
  })

  it('getRandomTaunt returns one of the taunt messages', () => {
    const result = getRandomTaunt()
    expect(TAUNT_MESSAGES).toContain(result)
  })
})

// ---------------------------------------------------------------------------
describe('Defense headers: setDefenseHeaders', () => {
  it('sets X-Neural-Defense, X-Netrunner-Status, and X-Warning headers', () => {
    const res: any = { setHeader: vi.fn() } as unknown as unknown as VercelResponse
    setDefenseHeaders(res)
    expect((res as any).setHeader).toHaveBeenCalledWith('X-Neural-Defense', 'Active. Target identified.')
    expect((res as any).setHeader).toHaveBeenCalledWith('X-Netrunner-Status', 'Nice try, but you\'re barking up the wrong tree.')
    expect((res as any).setHeader).toHaveBeenCalledWith('X-Warning', 'Stop poking the Baphomet. It might poke back.')
    expect((res as any).setHeader).toHaveBeenCalledTimes(3)
  })
})

// ---------------------------------------------------------------------------
describe('Fingerprint pixel: serveFingerprintPixel', () => {
  it('returns a 200 PNG response with fingerprinting headers', () => {
    const resMock = {
      setHeader: vi.fn(),
      status: vi.fn(),
      send: vi.fn(),
    }
    resMock.status.mockReturnValue(resMock)
    resMock.send.mockReturnValue(resMock)
    const res = resMock as unknown as unknown as VercelResponse

    serveFingerprintPixel(res)

    expect(resMock.setHeader).toHaveBeenCalledWith('Content-Type', 'image/png')
    expect(resMock.setHeader).toHaveBeenCalledWith('Cache-Control', 'no-store, no-cache, must-revalidate')
    // Accept-CH header requests Client Hints for browser fingerprinting
    expect(resMock.setHeader).toHaveBeenCalledWith('Accept-CH', expect.stringContaining('Sec-CH-UA'))
    expect(resMock.setHeader).toHaveBeenCalledWith('Critical-CH', expect.stringContaining('Sec-CH-UA'))
    // Defense headers also set
    expect(resMock.setHeader).toHaveBeenCalledWith('X-Neural-Defense', 'Active. Target identified.')
    expect(resMock.status).toHaveBeenCalledWith(200)
    expect(resMock.send).toHaveBeenCalledWith(expect.any(Buffer))
  })

  it('sends a valid PNG (starts with PNG magic bytes)', () => {
    const resMock = {
      setHeader: vi.fn(),
      status: vi.fn(),
      send: vi.fn(),
    }
    resMock.status.mockReturnValue(resMock)
    resMock.send.mockReturnValue(resMock)
    const res = resMock as unknown as unknown as VercelResponse

    serveFingerprintPixel(res)

    expect(resMock.send).toHaveBeenCalledTimes(1)
    const sentData: Buffer = resMock.send.mock.calls[0][0]
    // PNG starts with \x89PNG
    expect(sentData[0]).toBe(0x89)
    expect(sentData[1]).toBe(0x50) // 'P'
    expect(sentData[2]).toBe(0x4E) // 'N'
    expect(sentData[3]).toBe(0x47) // 'G'
  })
})
