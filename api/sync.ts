/**
 * Sync Timestamps API for Vercel KV storage
 * Handles iTunes and Bandsintown sync timestamps
 * NO localStorage - all stored in Vercel KV
 */

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { Redis } from '@upstash/redis'

interface SyncTimestamps {
  lastReleasesSync: number
  lastGigsSync: number
}

// Initialize Redis client
let redis: Redis | null = null

function getRedisClient(): Redis | null {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    console.warn('[Sync API] Upstash Redis not configured')
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

/**
 * Sync Timestamps API Handler
 * 
 * GET /api/sync - Get sync timestamps
 * POST /api/sync - Update sync timestamps
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const kv = getRedisClient()

  if (!kv) {
    return res.status(503).json({
      error: 'Service unavailable',
      message: 'Sync storage is not configured',
    })
  }

  try {
    // GET: Retrieve sync timestamps
    if (req.method === 'GET') {
      const data = await kv.get<SyncTimestamps>('sync-timestamps')
      
      if (!data) {
        return res.status(200).json({
          lastReleasesSync: 0,
          lastGigsSync: 0,
        })
      }

      return res.status(200).json(data)
    }

    // POST: Update sync timestamps
    if (req.method === 'POST') {
      const { lastReleasesSync, lastGigsSync } = req.body as Partial<SyncTimestamps>

      // Get current timestamps
      const current = await kv.get<SyncTimestamps>('sync-timestamps') || {
        lastReleasesSync: 0,
        lastGigsSync: 0,
      }

      // Update only provided timestamps
      const updated: SyncTimestamps = {
        lastReleasesSync: lastReleasesSync ?? current.lastReleasesSync,
        lastGigsSync: lastGigsSync ?? current.lastGigsSync,
      }

      // Store with 90-day TTL
      await kv.set('sync-timestamps', updated, { ex: 90 * 24 * 60 * 60 })

      return res.status(200).json({ success: true, timestamps: updated })
    }

    return res.status(405).json({
      error: 'Method not allowed',
      message: `Method ${req.method} is not supported`,
    })

  } catch (error) {
    console.error('[Sync API] Error:', error)
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}
