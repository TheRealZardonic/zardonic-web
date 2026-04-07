import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { VercelRequest, VercelResponse } from '@vercel/node';

// ---------------------------------------------------------------------------
// Mock @upstash/redis
// ---------------------------------------------------------------------------
const mockKvLpush = vi.fn()
const mockKvLtrim = vi.fn()
const mockKvSet = vi.fn()

vi.mock('@upstash/redis', () => {
  const Redis = function () {
    return { lpush: mockKvLpush, ltrim: mockKvLtrim, set: mockKvSet }
  }
  return { Redis }
})

// Mock blocklist
vi.mock('../../api/_blocklist.js', () => ({
  isHardBlocked: vi.fn().mockResolvedValue(false),
}))

// Mock threat score
vi.mock('../../api/_threat-score.js', () => ({
  incrementThreatScore: vi.fn().mockResolvedValue({ score: 5, level: 'WARN' }),
  THREAT_REASONS: {
    ROBOTS_VIOLATION: { reason: 'robots_violation', points: 3 },
  },
}))

// Mock attacker profile
vi.mock('../../api/_attacker-profile.js', () => ({
  recordIncident: vi.fn().mockResolvedValue(undefined),
}))

// Mock zipbomb
vi.mock('../../api/_zipbomb.js', () => ({
  serveZipBomb: vi.fn().mockReturnValue(false),
}))

// Mock rate limiter
vi.mock('../../api/_ratelimit.js', () => ({
  getClientIp: vi.fn().mockReturnValue('1.2.3.4'),
  hashIp: vi.fn().mockReturnValue('hashed-ip-test'),
}))

// Mock honeytokens — track calls
const mockMarkAttacker = vi.fn().mockResolvedValue(undefined)
const mockInjectEntropy = vi.fn()
const mockSetDefenseHeaders = vi.fn()

vi.mock('../../api/_honeytokens.js', () => ({
  markAttacker: mockMarkAttacker,
  injectEntropyHeaders: mockInjectEntropy,
  setDefenseHeaders: mockSetDefenseHeaders,
}))

function mockRes() {
  const res: any = {
    status: vi.fn(),
    send: vi.fn(),
    setHeader: vi.fn(),
  }
  res.status.mockReturnValue(res)
  res.send.mockReturnValue(res)
  return res as unknown as unknown as VercelResponse
}

const { default: deniedHandler } = await import('../../api/denied.js')

// ---------------------------------------------------------------------------
describe('Denied handler: robots.txt access violation response', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.UPSTASH_REDIS_REST_URL = 'https://fake-kv.test'
    process.env.UPSTASH_REDIS_REST_TOKEN = 'fake-token'
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  /** Run the handler with fake timers: start the async call, advance time, then await */
  async function runHandler(req: Parameters<typeof deniedHandler>[0], res: VercelResponse) {
    const promise = deniedHandler(req, res)
    await vi.advanceTimersByTimeAsync(10000)
    return promise
  }

  it('returns 403 with HTML content', async () => {
    const res = mockRes()
    await runHandler(
      { method: 'GET', query: { _src: '/admin/login' }, headers: { 'user-agent': 'TestBot/1.0' }, url: '/api/denied' } as unknown as VercelRequest,
      res,
    )
    expect(res.status).toHaveBeenCalledWith(403)
    expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'text/html; charset=utf-8')
    expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', 'no-store, no-cache, must-revalidate')
    expect(res.send).toHaveBeenCalledWith(expect.stringContaining('403'))
  })

  it('flags the requesting IP as an attacker', async () => {
    const res = mockRes()
    await runHandler(
      { method: 'GET', query: { _src: '/wp-admin/' }, headers: {}, url: '/api/denied' } as unknown as VercelRequest,
      res,
    )
    expect(mockMarkAttacker).toHaveBeenCalledWith('hashed-ip-test')
  })

  it('persists the violation alert to KV', async () => {
    mockKvLpush.mockResolvedValue(1)
    mockKvLtrim.mockResolvedValue('OK')
    const res = mockRes()
    await runHandler(
      { method: 'GET', query: { _src: '/backup/db' }, headers: { 'user-agent': 'Scanner/2.0' }, url: '/api/denied' } as unknown as VercelRequest,
      res,
    )
    expect(mockKvLpush).toHaveBeenCalledWith(
      'nk-honeytoken-alerts',
      expect.stringContaining('"key":"robots:/backup/db"'),
    )
    expect(mockKvLtrim).toHaveBeenCalledWith('nk-honeytoken-alerts', 0, 499)
  })

  it('injects entropy headers into the response', async () => {
    const res = mockRes()
    await runHandler(
      { method: 'GET', query: {}, headers: {}, url: '/api/denied' } as unknown as VercelRequest,
      res,
    )
    expect(mockInjectEntropy).toHaveBeenCalledWith(res, 50)
    expect(mockSetDefenseHeaders).toHaveBeenCalledWith(res)
  })

  it('includes navigation links in response for crawler recursion', async () => {
    const res = mockRes()
    await runHandler(
      { method: 'GET', query: { _src: '/config/' }, headers: {}, url: '/api/denied' } as unknown as VercelRequest,
      res,
    )
    const html = (res as any).send.mock.calls[0][0] as string
    expect(html).toContain('<a href=')
    expect(html).toMatch(/href="\/[a-z]+/)
  })

  it('does not throw when KV persistence fails', async () => {
    mockKvLpush.mockRejectedValue(new Error('KV unavailable'))
    const res = mockRes()
    await expect(
      runHandler(
        { method: 'GET', query: { _src: '/debug/' }, headers: {}, url: '/api/denied' } as unknown as VercelRequest,
        res,
      ),
    ).resolves.not.toThrow()
    expect(res.status).toHaveBeenCalledWith(403)
  })

  it('uses _src query param as the reported path', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const res = mockRes()
    await runHandler(
      { method: 'POST', query: { _src: '/phpmyadmin/index.php' }, headers: {}, url: '/api/denied' } as unknown as VercelRequest,
      res,
    )
    expect(consoleSpy).toHaveBeenCalledWith(
      '[ACCESS VIOLATION]',
      expect.stringContaining('/phpmyadmin/index.php'),
    )
    consoleSpy.mockRestore()
  })
})
