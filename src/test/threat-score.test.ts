import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---------------------------------------------------------------------------
// Mock @upstash/redis
// ---------------------------------------------------------------------------
const mockIncrby = vi.fn()
const mockExpire = vi.fn()
const mockGet = vi.fn()
const mockSet = vi.fn()

vi.mock('@upstash/redis', () => ({
  Redis: class {
    incrby = mockIncrby
    expire = mockExpire
    get = mockGet
    set = mockSet
  },
}))

// Mock _ratelimit helpers used by _threat-score
vi.mock('../../api/_ratelimit.ts', () => ({
  getClientIp: vi.fn().mockReturnValue('10.0.0.1'),
  hashIp: vi.fn().mockReturnValue('aabbccddeeff00112233445566778899aabbccddeeff00112233445566778899'),
}))

const {
  THREAT_LEVELS,
  THREAT_REASONS,
  classifyThreatLevel,
  incrementThreatScore,
  getThreatScore,
  getThreatScoreFromReq,
  incrementThreatScoreFromReq,
} = await import('../../api/_threat-score.ts')

// ---------------------------------------------------------------------------
describe('THREAT_LEVELS constants', () => {
  it('has CLEAN = 0', () => expect(THREAT_LEVELS.CLEAN).toBe(0))
  it('has WARN = 3', () => expect(THREAT_LEVELS.WARN).toBe(3))
  it('has TARPIT = 7', () => expect(THREAT_LEVELS.TARPIT).toBe(7))
  it('has BLOCK = 12', () => expect(THREAT_LEVELS.BLOCK).toBe(12))
})

describe('THREAT_REASONS constants', () => {
  it('ROBOTS_VIOLATION has 3 points', () => expect(THREAT_REASONS.ROBOTS_VIOLATION.points).toBe(3))
  it('HONEYTOKEN_ACCESS has 5 points', () => expect(THREAT_REASONS.HONEYTOKEN_ACCESS.points).toBe(5))
  it('SUSPICIOUS_UA has 4 points', () => expect(THREAT_REASONS.SUSPICIOUS_UA.points).toBe(4))
  it('MISSING_BROWSER_HEADERS has 2 points', () => expect(THREAT_REASONS.MISSING_BROWSER_HEADERS.points).toBe(2))
  it('GENERIC_ACCEPT has 1 point', () => expect(THREAT_REASONS.GENERIC_ACCEPT.points).toBe(1))
  it('RATE_LIMIT_EXCEEDED has 2 points', () => expect(THREAT_REASONS.RATE_LIMIT_EXCEEDED.points).toBe(2))
})

// ---------------------------------------------------------------------------
describe('classifyThreatLevel()', () => {
  it('returns CLEAN for score 0', () => expect(classifyThreatLevel(0)).toBe('CLEAN'))
  it('returns CLEAN for score 2', () => expect(classifyThreatLevel(2)).toBe('CLEAN'))
  it('returns WARN for score 3', () => expect(classifyThreatLevel(3)).toBe('WARN'))
  it('returns WARN for score 6', () => expect(classifyThreatLevel(6)).toBe('WARN'))
  it('returns TARPIT for score 7', () => expect(classifyThreatLevel(7)).toBe('TARPIT'))
  it('returns TARPIT for score 11', () => expect(classifyThreatLevel(11)).toBe('TARPIT'))
  it('returns BLOCK for score 12', () => expect(classifyThreatLevel(12)).toBe('BLOCK'))
  it('returns BLOCK for score 100', () => expect(classifyThreatLevel(100)).toBe('BLOCK'))
})

// ---------------------------------------------------------------------------
describe('incrementThreatScore()', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.UPSTASH_REDIS_REST_URL = 'https://fake.upstash.io'
    process.env.UPSTASH_REDIS_REST_TOKEN = 'token'
    mockIncrby.mockResolvedValue(3)
    mockExpire.mockResolvedValue(1)
    mockSet.mockResolvedValue('OK')
  })

  it('returns score and level', async () => {
    mockIncrby.mockResolvedValue(3)
    const result = await incrementThreatScore('hashxyz', 'robots_violation', 3)
    expect(result.score).toBe(3)
    expect(result.level).toBe('WARN')
    expect(result.reason).toBe('robots_violation')
  })

  it('calls incrby with the given points', async () => {
    await incrementThreatScore('hashxyz', 'honeytoken_access', 5)
    expect(mockIncrby).toHaveBeenCalledWith('zd-threat:hashxyz', 5)
  })

  it('sets TTL on the threat key', async () => {
    await incrementThreatScore('hashxyz', 'test', 1)
    expect(mockExpire).toHaveBeenCalledWith('zd-threat:hashxyz', 3600)
  })

  it('auto-blocks when score reaches BLOCK threshold', async () => {
    mockIncrby.mockResolvedValue(12)
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const result = await incrementThreatScore('hashxyz', 'honeytoken_access', 5)
    expect(result.level).toBe('BLOCK')
    expect(mockSet).toHaveBeenCalledWith(
      'zd-blocked:hashxyz',
      expect.objectContaining({ autoBlocked: true }),
      { ex: 604800 }
    )
    expect(consoleSpy).toHaveBeenCalledWith('[AUTO BLOCK]', expect.any(String))
    consoleSpy.mockRestore()
  })

  it('does NOT block when score is below BLOCK threshold', async () => {
    mockIncrby.mockResolvedValue(11)
    await incrementThreatScore('hashxyz', 'test', 2)
    expect(mockSet).not.toHaveBeenCalled()
  })

  it('returns CLEAN on Redis error (fail-open for scoring)', async () => {
    mockIncrby.mockRejectedValue(new Error('Redis error'))
    const result = await incrementThreatScore('hashxyz', 'test', 2)
    expect(result.score).toBe(0)
    expect(result.level).toBe('CLEAN')
  })
})

// ---------------------------------------------------------------------------
describe('getThreatScore()', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.UPSTASH_REDIS_REST_URL = 'https://fake.upstash.io'
    process.env.UPSTASH_REDIS_REST_TOKEN = 'token'
  })

  it('returns score and classified level', async () => {
    mockGet.mockResolvedValue(7)
    const result = await getThreatScore('hashxyz')
    expect(result.score).toBe(7)
    expect(result.level).toBe('TARPIT')
  })

  it('returns 0/CLEAN when no score stored', async () => {
    mockGet.mockResolvedValue(null)
    const result = await getThreatScore('hashxyz')
    expect(result.score).toBe(0)
    expect(result.level).toBe('CLEAN')
  })

  it('returns CLEAN on Redis error', async () => {
    mockGet.mockRejectedValue(new Error('fail'))
    const result = await getThreatScore('hashxyz')
    expect(result.score).toBe(0)
    expect(result.level).toBe('CLEAN')
  })

  it('returns CLEAN when Redis not configured', async () => {
    delete process.env.UPSTASH_REDIS_REST_URL
    const result = await getThreatScore('hashxyz')
    expect(result.score).toBe(0)
  })
})

// ---------------------------------------------------------------------------
describe('getThreatScoreFromReq()', () => {
  beforeEach(() => {
    process.env.UPSTASH_REDIS_REST_URL = 'https://fake.upstash.io'
    process.env.UPSTASH_REDIS_REST_TOKEN = 'token'
    mockGet.mockResolvedValue(5)
  })

  it('extracts IP from request and returns score', async () => {
    const req = { headers: {} } as any
    const result = await getThreatScoreFromReq(req)
    expect(result.score).toBe(5)
  })
})

// ---------------------------------------------------------------------------
describe('incrementThreatScoreFromReq()', () => {
  beforeEach(() => {
    process.env.UPSTASH_REDIS_REST_URL = 'https://fake.upstash.io'
    process.env.UPSTASH_REDIS_REST_TOKEN = 'token'
    mockIncrby.mockResolvedValue(3)
    mockExpire.mockResolvedValue(1)
  })

  it('extracts IP from request and increments score', async () => {
    const req = { headers: {} } as any
    const result = await incrementThreatScoreFromReq(req, THREAT_REASONS.ROBOTS_VIOLATION)
    expect(result.score).toBe(3)
    expect(result.reason).toBe('robots_violation')
  })
})
