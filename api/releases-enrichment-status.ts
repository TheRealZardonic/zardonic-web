/**
 * GET /api/releases-enrichment-status
 *
 * Returns the total count of releases stored in KV.
 * Requires a valid admin session.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getRedisOrNull, isRedisConfigured } from './_redis.js'
import { validateSession } from './auth.js'

const BAND_DATA_KEY = 'band-data'

interface Release {
  id: string
  title: string
  [key: string]: unknown
}

interface SiteData {
  releases?: Release[]
  [key: string]: unknown
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method === 'OPTIONS') { res.status(200).end(); return }
  if (req.method !== 'GET') { res.status(405).json({ error: 'Method not allowed' }); return }

  const sessionValid = await validateSession(req)
  if (!sessionValid) { res.status(401).json({ error: 'Unauthorized' }); return }

  if (!isRedisConfigured()) {
    res.status(503).json({ error: 'Redis not configured' }); return
  }

  const redis = getRedisOrNull()!
  const data = await redis.get<SiteData>(BAND_DATA_KEY)
  const releases: Release[] = data?.releases ?? []

  res.status(200).json({
    total: releases.length,
    pendingCount: 0,
    pending: [],
  })
}
