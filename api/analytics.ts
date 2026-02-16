/**
 * Analytics API endpoint for Vercel KV storage
 * Handles analytics data persistence with proper data model
 */

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { Redis } from '@upstash/redis'

// Type definitions for analytics data
interface HeatmapPoint {
  x: number
  y: number
  el: string
  ts: number
}

interface AnalyticsData {
  pageViews: number
  sectionViews: Record<string, number>
  clicks: Record<string, number>
  visitors: string[]
  redirects: Record<string, number>
  devices: Record<string, number>
  referrers: Record<string, number>
  browsers: Record<string, number>
  screenResolutions: Record<string, number>
  heatmap: HeatmapPoint[]
  countries: Record<string, number>
  languages: Record<string, number>
  firstTracked?: string
  lastTracked?: string
}

// Initialize Redis client
let redis: Redis | null = null

function getRedisClient(): Redis | null {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    console.warn('[Analytics API] Upstash Redis not configured')
    return null
  }
  
  if (!redis) {
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
  }
  
  return redis
}

// Helper: Validate admin token (timing-safe comparison)
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let result = 0
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return result === 0
}

async function validateAdminToken(req: VercelRequest): Promise<boolean> {
  const adminToken = req.headers['x-admin-token'] as string
  if (!adminToken) return false

  const kv = getRedisClient()
  if (!kv) return false

  try {
    const storedHash = await kv.get<string>('admin-password-hash')
    if (!storedHash) return false
    return timingSafeEqual(adminToken, storedHash)
  } catch (error) {
    console.error('[Analytics API] Token validation error:', error)
    return false
  }
}

/**
 * Main handler for analytics API
 * 
 * GET /api/analytics - Retrieve analytics data (public)
 * POST /api/analytics - Update analytics data (requires admin token)
 * DELETE /api/analytics - Reset analytics data (requires admin token)
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const kv = getRedisClient()

  // Handle case where Redis is not configured
  if (!kv) {
    return res.status(503).json({
      error: 'Service unavailable',
      message: 'Analytics storage is not configured. Data will be stored locally.',
    })
  }

  try {
    // GET: Retrieve analytics data
    if (req.method === 'GET') {
      const data = await kv.get<AnalyticsData>('zardonic-analytics')
      
      if (!data) {
        // Return empty analytics data structure
        const emptyData: AnalyticsData = {
          pageViews: 0,
          sectionViews: {},
          clicks: {},
          visitors: [],
          redirects: {},
          devices: {},
          referrers: {},
          browsers: {},
          screenResolutions: {},
          heatmap: [],
          countries: {},
          languages: {},
        }
        return res.status(200).json({ value: emptyData })
      }

      return res.status(200).json({ value: data })
    }

    // POST: Update analytics data (requires admin token)
    if (req.method === 'POST') {
      const isAdmin = await validateAdminToken(req)
      
      if (!isAdmin) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Valid admin token required for analytics updates',
        })
      }

      const { data } = req.body as { data: AnalyticsData }

      if (!data) {
        return res.status(400).json({
          error: 'Bad request',
          message: 'Analytics data is required',
        })
      }

      // Limit heatmap size to prevent storage bloat
      if (data.heatmap && data.heatmap.length > 500) {
        data.heatmap = data.heatmap.slice(-500)
      }

      // Store with 30-day TTL
      await kv.set('zardonic-analytics', data, { ex: 30 * 24 * 60 * 60 })

      return res.status(200).json({ success: true })
    }

    // DELETE: Reset analytics data (requires admin token)
    if (req.method === 'DELETE') {
      const isAdmin = await validateAdminToken(req)
      
      if (!isAdmin) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Valid admin token required for analytics reset',
        })
      }

      await kv.del('zardonic-analytics')

      return res.status(200).json({ success: true })
    }

    // Unsupported method
    return res.status(405).json({
      error: 'Method not allowed',
      message: `Method ${req.method} is not supported`,
    })

  } catch (error) {
    console.error('[Analytics API] Error:', error)
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}
