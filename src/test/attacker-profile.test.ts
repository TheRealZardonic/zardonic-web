import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---------------------------------------------------------------------------
// Mock @upstash/redis
// ---------------------------------------------------------------------------
const mockKvGet = vi.fn()
const mockKvSet = vi.fn()
const mockKvSadd = vi.fn()
const mockKvSrem = vi.fn()
const mockKvSmembers = vi.fn()
const mockKvDel = vi.fn()

vi.mock('@upstash/redis', () => {
  const Redis = function () {
    return {
      get: mockKvGet,
      set: mockKvSet,
      sadd: mockKvSadd,
      srem: mockKvSrem,
      smembers: mockKvSmembers,
      del: mockKvDel,
    }
  }
  return { Redis }
})

// Mock ratelimit
vi.mock('../../api/_ratelimit.js', () => ({
  hashIp: vi.fn((ip) => `hashed_${ip}`),
  getClientIp: vi.fn(() => '127.0.0.1'),
}))

// Set env vars before import so the singleton Redis is properly initialized
process.env.UPSTASH_REDIS_REST_URL = 'https://fake-kv.test'
process.env.UPSTASH_REDIS_REST_TOKEN = 'fake-token'

import {
  recordIncident,
  getProfile,
  getAllProfiles,
  analyzeUserAgents,
  deleteProfile,
} from '../../api/_attacker-profile.js'
import type { AttackerProfile } from '../../api/_attacker-profile.js'

describe('Attacker Profile Module', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('recordIncident', () => {
    it('should create a new profile for first incident', async () => {
      const hashedIp = 'test_hash_123'
      const incident = {
        type: 'honeytoken_access',
        key: 'admin_backup',
        method: 'GET',
        userAgent: 'Mozilla/5.0',
        threatScore: 5,
        threatLevel: 'WARN',
        timestamp: '2024-01-01T00:00:00Z',
      }

      mockKvGet.mockResolvedValue(null) // No existing profile
      mockKvSet.mockResolvedValue('OK')
      mockKvSadd.mockResolvedValue(1)

      const profile = await recordIncident(hashedIp, incident)

      expect(profile).toBeTruthy()
      expect(profile!.hashedIp).toBe(hashedIp)
      expect(profile!.totalIncidents).toBe(1)
      expect(profile!.attackTypes['honeytoken_access']).toBe(1)
      expect(profile!.threatScoreHistory).toHaveLength(1)
      expect(profile!.threatScoreHistory[0].score).toBe(5)
      expect(mockKvSet).toHaveBeenCalledWith(
        `nk-profile:${hashedIp}`,
        expect.any(Object),
        { ex: 2592000 }
      )
      expect(mockKvSadd).toHaveBeenCalledWith('nk-profile-list', hashedIp)
    })

    it('should update existing profile with new incident', async () => {
      const hashedIp = 'test_hash_123'
      const existingProfile = {
        hashedIp,
        firstSeen: '2024-01-01T00:00:00Z',
        lastSeen: '2024-01-01T00:00:00Z',
        totalIncidents: 1,
        attackTypes: { honeytoken_access: 1 },
        userAgents: { 'Mozilla/5.0': 1 },
        threatScoreHistory: [{ score: 5, level: 'WARN', timestamp: '2024-01-01T00:00:00Z' }],
        incidents: [],
      }

      const newIncident = {
        type: 'robots_violation',
        key: '/admin',
        method: 'GET',
        userAgent: 'curl/7.0',
        threatScore: 8,
        threatLevel: 'TARPIT',
        timestamp: '2024-01-01T01:00:00Z',
      }

      mockKvGet.mockResolvedValue(existingProfile)
      mockKvSet.mockResolvedValue('OK')
      mockKvSadd.mockResolvedValue(1)

      const profile = await recordIncident(hashedIp, newIncident)

      expect(profile!.totalIncidents).toBe(2)
      expect(profile!.attackTypes['honeytoken_access']).toBe(1)
      expect(profile!.attackTypes['robots_violation']).toBe(1)
      expect(profile!.userAgents['Mozilla/5.0']).toBe(1)
      expect(profile!.userAgents['curl/7.0']).toBe(1)
      expect(profile!.threatScoreHistory).toHaveLength(2)
      expect(profile!.lastSeen).toBe('2024-01-01T01:00:00Z')
    })

    it('should limit threat score history to 100 entries', async () => {
      const hashedIp = 'test_hash_123'
      const existingProfile = {
        hashedIp,
        firstSeen: '2024-01-01T00:00:00Z',
        lastSeen: '2024-01-01T00:00:00Z',
        totalIncidents: 100,
        attackTypes: {},
        userAgents: {},
        threatScoreHistory: Array(100).fill({ score: 5, level: 'WARN', timestamp: '2024-01-01T00:00:00Z' }),
        incidents: [],
      }

      const newIncident = {
        type: 'robots_violation',
        key: '/admin',
        method: 'GET',
        userAgent: 'curl/7.0',
        threatScore: 10,
        threatLevel: 'BLOCK',
        timestamp: '2024-01-01T02:00:00Z',
      }

      mockKvGet.mockResolvedValue(existingProfile)
      mockKvSet.mockResolvedValue('OK')
      mockKvSadd.mockResolvedValue(1)

      const profile = await recordIncident(hashedIp, newIncident)

      expect(profile!.threatScoreHistory).toHaveLength(100)
      expect(profile!.threatScoreHistory[99].score).toBe(10)
    })

    it('should handle errors gracefully', async () => {
      const hashedIp = 'test_hash_123'
      const incident = {
        type: 'honeytoken_access',
        key: 'admin_backup',
        method: 'GET',
        userAgent: 'Mozilla/5.0',
        threatScore: 5,
        threatLevel: 'WARN',
        timestamp: '2024-01-01T00:00:00Z',
      }

      mockKvGet.mockRejectedValue(new Error('KV error'))

      const profile = await recordIncident(hashedIp, incident)

      expect(profile).toBeNull()
    })
  })

  describe('getProfile', () => {
    it('should return profile with behavioral patterns', async () => {
      const hashedIp = 'test_hash_123'
      const storedProfile = {
        hashedIp,
        firstSeen: '2024-01-01T00:00:00Z',
        lastSeen: '2024-01-01T01:00:00Z',
        totalIncidents: 15,
        attackTypes: {
          honeytoken_access: 5,
          robots_violation: 5,
          suspicious_ua: 5,
        },
        userAgents: {
          'Mozilla/5.0': 5,
          'curl/7.0': 5,
          'python-requests': 5,
        },
        threatScoreHistory: [
          { score: 0, level: 'CLEAN', timestamp: '2024-01-01T00:00:00Z' },
          { score: 10, level: 'BLOCK', timestamp: '2024-01-01T00:30:00Z' },
        ],
        incidents: [],
      }

      mockKvGet.mockResolvedValue(storedProfile)

      const profile = await getProfile(hashedIp)

      expect(profile).toBeTruthy()
      expect(profile!.behavioralPatterns).toBeDefined()
      expect(Array.isArray(profile!.behavioralPatterns)).toBe(true)
      expect(profile!.behavioralPatterns.length).toBeGreaterThan(0)
    })

    it('should return null for non-existent profile', async () => {
      mockKvGet.mockResolvedValue(null)

      const profile = await getProfile('non_existent_hash')

      expect(profile).toBeNull()
    })

    it('should handle errors gracefully', async () => {
      mockKvGet.mockRejectedValue(new Error('KV error'))

      const profile = await getProfile('test_hash')

      expect(profile).toBeNull()
    })
  })

  describe('getAllProfiles', () => {
    it('should return paginated profiles', async () => {
      const profiles = [
        {
          hashedIp: 'hash1',
          lastSeen: '2024-01-01T02:00:00Z',
          totalIncidents: 10,
        },
        {
          hashedIp: 'hash2',
          lastSeen: '2024-01-01T01:00:00Z',
          totalIncidents: 5,
        },
        {
          hashedIp: 'hash3',
          lastSeen: '2024-01-01T03:00:00Z',
          totalIncidents: 20,
        },
      ]

      mockKvSmembers.mockResolvedValue(['hash1', 'hash2', 'hash3'])
      mockKvGet.mockImplementation((key) => {
        const hash = key.replace('nk-profile:', '')
        return Promise.resolve(profiles.find((p) => p.hashedIp === hash))
      })

      const result = await getAllProfiles(2, 0)

      expect(result.profiles).toHaveLength(2)
      expect(result.total).toBe(3)
      expect(result.profiles[0].hashedIp).toBe('hash3') // Most recent first
      expect(result.profiles[1].hashedIp).toBe('hash1')
    })

    it('should clean up stale entries', async () => {
      mockKvSmembers.mockResolvedValue(['hash1', 'hash2'])
      mockKvGet.mockResolvedValueOnce({ hashedIp: 'hash1' }).mockResolvedValueOnce(null)
      mockKvSrem.mockResolvedValue(1)

      const result = await getAllProfiles(10, 0)

      expect(result.profiles).toHaveLength(1)
      expect(mockKvSrem).toHaveBeenCalledWith('nk-profile-list', 'hash2')
    })

    it('should handle errors gracefully', async () => {
      mockKvSmembers.mockRejectedValue(new Error('KV error'))

      const result = await getAllProfiles()

      expect(result.profiles).toEqual([])
      expect(result.total).toBe(0)
    })
  })

  describe('analyzeUserAgents', () => {
    it('should classify user agents correctly', () => {
      const profile = {
        userAgents: {
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/91.0': 10,
          'curl/7.68.0': 5,
          'python-requests/2.25.1': 3,
          'Googlebot/2.1': 2,
          'sqlmap/1.0': 1,
        },
      }

      const analysis = analyzeUserAgents(profile as unknown as AttackerProfile)

      expect(analysis.total).toBe(21)
      expect(analysis.unique).toBe(5)
      expect(analysis.userAgents).toHaveLength(5)
      expect(analysis.userAgents[0].category).toBe('browser')
      expect(analysis.userAgents[1].category).toBe('script')
      
      const googlebotEntry = analysis.userAgents.find((ua) => ua.userAgent.includes('Googlebot'))
      expect(googlebotEntry).toBeDefined()
      expect(googlebotEntry?.category).toBe('bot')
      
      const sqlmapEntry = analysis.userAgents.find((ua) => ua.userAgent.includes('sqlmap'))
      expect(sqlmapEntry).toBeDefined()
      expect(sqlmapEntry?.category).toBe('attack_tool')
    })

    it('should handle empty user agents', () => {
      const profile = { userAgents: {} }

      const analysis = analyzeUserAgents(profile as unknown as AttackerProfile)

      expect(analysis.total).toBe(0)
      expect(analysis.unique).toBe(0)
      expect(analysis.userAgents).toEqual([])
      expect(analysis.topUserAgent).toBeNull()
    })
  })

  describe('deleteProfile', () => {
    it('should delete profile and index entry', async () => {
      const hashedIp = 'test_hash_123'

      mockKvDel.mockResolvedValue(1)
      mockKvSrem.mockResolvedValue(1)

      const result = await deleteProfile(hashedIp)

      expect(result).toBe(true)
      expect(mockKvDel).toHaveBeenCalledWith(`nk-profile:${hashedIp}`)
      expect(mockKvSrem).toHaveBeenCalledWith('nk-profile-list', hashedIp)
    })

    it('should handle errors gracefully', async () => {
      mockKvDel.mockRejectedValue(new Error('KV error'))

      const result = await deleteProfile('test_hash')

      expect(result).toBe(false)
    })
  })

  describe('Behavioral Pattern Detection', () => {
    it('should detect rapid escalation pattern', async () => {
      const profile = {
        hashedIp: 'test_hash',
        firstSeen: '2024-01-01T00:00:00Z',
        lastSeen: '2024-01-01T00:30:00Z',
        threatScoreHistory: [
          { score: 0, level: 'CLEAN', timestamp: '2024-01-01T00:00:00Z' },
          { score: 8, level: 'TARPIT', timestamp: '2024-01-01T00:30:00Z' },
        ],
      }

      mockKvGet.mockResolvedValue(profile)

      const result = await getProfile('test_hash')

      const rapidEscalation = result!.behavioralPatterns.find((p) => p.type === 'rapid_escalation')
      expect(rapidEscalation).toBeDefined()
      expect(rapidEscalation!.severity).toBe('high')
    })

    it('should detect diverse attacks pattern', async () => {
      const profile = {
        hashedIp: 'test_hash',
        attackTypes: {
          honeytoken_access: 5,
          robots_violation: 5,
          suspicious_ua: 5,
        },
      }

      mockKvGet.mockResolvedValue(profile)

      const result = await getProfile('test_hash')

      const diverseAttacks = result!.behavioralPatterns.find((p) => p.type === 'diverse_attacks')
      expect(diverseAttacks).toBeDefined()
      expect(diverseAttacks!.severity).toBe('high')
    })

    it('should detect UA rotation pattern', async () => {
      const profile = {
        hashedIp: 'test_hash',
        userAgents: {
          'Mozilla/5.0': 5,
          'curl/7.0': 5,
          'python-requests': 5,
        },
      }

      mockKvGet.mockResolvedValue(profile)

      const result = await getProfile('test_hash')

      const uaRotation = result!.behavioralPatterns.find((p) => p.type === 'ua_rotation')
      expect(uaRotation).toBeDefined()
      expect(uaRotation!.severity).toBe('medium')
    })

    it('should detect persistent attacker pattern', async () => {
      const profile = {
        hashedIp: 'test_hash',
        totalIncidents: 15,
      }

      mockKvGet.mockResolvedValue(profile)

      const result = await getProfile('test_hash')

      const persistent = result!.behavioralPatterns.find((p) => p.type === 'persistent')
      expect(persistent).toBeDefined()
      expect(persistent!.severity).toBe('high')
    })

    it('should detect automated scan pattern', async () => {
      const now = Date.now()
      const profile = {
        hashedIp: 'test_hash',
        incidents: [
          { timestamp: new Date(now - 20000).toISOString() },
          { timestamp: new Date(now - 16000).toISOString() },
          { timestamp: new Date(now - 12000).toISOString() },
          { timestamp: new Date(now - 8000).toISOString() },
          { timestamp: new Date(now - 4000).toISOString() },
        ],
      }

      mockKvGet.mockResolvedValue(profile)

      const result = await getProfile('test_hash')

      const automatedScan = result!.behavioralPatterns.find((p) => p.type === 'automated_scan')
      expect(automatedScan).toBeDefined()
      expect(automatedScan!.severity).toBe('high')
    })
  })
})
