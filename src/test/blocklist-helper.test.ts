import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---------------------------------------------------------------------------
// Mock @upstash/redis
// ---------------------------------------------------------------------------
const mockSet = vi.fn()
const mockDel = vi.fn()
const mockGet = vi.fn()
const mockSadd = vi.fn()
const mockSrem = vi.fn()
const mockSmembers = vi.fn()

vi.mock('@upstash/redis', () => ({
  Redis: class {
    set = mockSet
    del = mockDel
    get = mockGet
    sadd = mockSadd
    srem = mockSrem
    smembers = mockSmembers
  },
}))

vi.mock('../../api/_ratelimit.ts', () => ({
  getClientIp: vi.fn().mockReturnValue('1.2.3.4'),
  hashIp: vi.fn().mockReturnValue('deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef'),
}))

const {
  blockIp,
  unblockIp,
  isHardBlocked,
  getAllBlockedIps,
  BLOCK_PREFIX,
  BLOCK_INDEX_KEY,
  BLOCK_TTL,
} = await import('../../api/_blocklist.ts')

// ---------------------------------------------------------------------------
describe('_blocklist constants', () => {
  it('BLOCK_PREFIX is zd-blocked:', () => expect(BLOCK_PREFIX).toBe('zd-blocked:'))
  it('BLOCK_INDEX_KEY is zd-blocked-index', () => expect(BLOCK_INDEX_KEY).toBe('zd-blocked-index'))
  it('BLOCK_TTL is 604800 (7 days)', () => expect(BLOCK_TTL).toBe(604800))
})

// ---------------------------------------------------------------------------
describe('blockIp()', () => {
  const HASH = 'a'.repeat(64)

  beforeEach(() => {
    vi.clearAllMocks()
    process.env.UPSTASH_REDIS_REST_URL = 'https://fake.upstash.io'
    process.env.UPSTASH_REDIS_REST_TOKEN = 'token'
    mockSet.mockResolvedValue('OK')
    mockSadd.mockResolvedValue(1)
  })

  it('sets the block entry with default TTL', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    await blockIp(HASH)
    expect(mockSet).toHaveBeenCalledWith(
      `zd-blocked:${HASH}`,
      expect.objectContaining({ hashedIp: HASH, reason: 'manual', autoBlocked: false }),
      { ex: BLOCK_TTL }
    )
    consoleSpy.mockRestore()
  })

  it('adds IP to the block index set', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    await blockIp(HASH)
    expect(mockSadd).toHaveBeenCalledWith(BLOCK_INDEX_KEY, HASH)
    consoleSpy.mockRestore()
  })

  it('uses custom reason and TTL', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    await blockIp(HASH, 'honeytoken_access', 3600)
    expect(mockSet).toHaveBeenCalledWith(
      `zd-blocked:${HASH}`,
      expect.objectContaining({ reason: 'honeytoken_access' }),
      { ex: 3600 }
    )
    consoleSpy.mockRestore()
  })
})

// ---------------------------------------------------------------------------
describe('unblockIp()', () => {
  const HASH = 'b'.repeat(64)

  beforeEach(() => {
    vi.clearAllMocks()
    process.env.UPSTASH_REDIS_REST_URL = 'https://fake.upstash.io'
    process.env.UPSTASH_REDIS_REST_TOKEN = 'token'
    mockDel.mockResolvedValue(1)
    mockSrem.mockResolvedValue(1)
  })

  it('deletes the block entry', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    await unblockIp(HASH)
    expect(mockDel).toHaveBeenCalledWith(`zd-blocked:${HASH}`)
    consoleSpy.mockRestore()
  })

  it('removes IP from the block index set', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    await unblockIp(HASH)
    expect(mockSrem).toHaveBeenCalledWith(BLOCK_INDEX_KEY, HASH)
    consoleSpy.mockRestore()
  })
})

// ---------------------------------------------------------------------------
describe('isHardBlocked()', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.UPSTASH_REDIS_REST_URL = 'https://fake.upstash.io'
    process.env.UPSTASH_REDIS_REST_TOKEN = 'token'
  })

  it('returns true when block entry exists', async () => {
    mockGet.mockResolvedValue({ hashedIp: 'hash', reason: 'manual' })
    const req = { headers: { 'x-forwarded-for': '1.2.3.4' } } as any
    expect(await isHardBlocked(req)).toBe(true)
  })

  it('returns false when no block entry', async () => {
    mockGet.mockResolvedValue(null)
    const req = { headers: { 'x-forwarded-for': '1.2.3.4' } } as any
    expect(await isHardBlocked(req)).toBe(false)
  })

  it('returns false when Redis is not configured', async () => {
    delete process.env.UPSTASH_REDIS_REST_URL
    const req = { headers: {} } as any
    expect(await isHardBlocked(req)).toBe(false)
  })

  it('returns false on Redis error (fail-open for block check)', async () => {
    mockGet.mockRejectedValue(new Error('timeout'))
    const req = { headers: { 'x-forwarded-for': '1.2.3.4' } } as any
    expect(await isHardBlocked(req)).toBe(false)
  })
})

// ---------------------------------------------------------------------------
describe('getAllBlockedIps()', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.UPSTASH_REDIS_REST_URL = 'https://fake.upstash.io'
    process.env.UPSTASH_REDIS_REST_TOKEN = 'token'
  })

  it('returns empty array when Redis is not configured', async () => {
    delete process.env.UPSTASH_REDIS_REST_URL
    expect(await getAllBlockedIps()).toEqual([])
  })

  it('returns empty array when no blocked IPs in index', async () => {
    mockSmembers.mockResolvedValue([])
    expect(await getAllBlockedIps()).toEqual([])
  })

  it('returns block entries for each hashed IP in the index', async () => {
    const hash = 'c'.repeat(64)
    const entry = { hashedIp: hash, reason: 'manual', blockedAt: '2026-01-01', autoBlocked: false }
    mockSmembers.mockResolvedValue([hash])
    mockGet.mockResolvedValue(entry)
    const result = await getAllBlockedIps()
    expect(result).toEqual([entry])
  })

  it('removes expired entries from the index (cleanup)', async () => {
    const hash = 'd'.repeat(64)
    mockSmembers.mockResolvedValue([hash])
    mockGet.mockResolvedValue(null) // entry expired
    mockSrem.mockResolvedValue(1)
    const result = await getAllBlockedIps()
    expect(result).toEqual([])
    expect(mockSrem).toHaveBeenCalledWith(BLOCK_INDEX_KEY, hash)
  })

  it('returns empty array on Redis error', async () => {
    mockSmembers.mockRejectedValue(new Error('fail'))
    expect(await getAllBlockedIps()).toEqual([])
  })
})
