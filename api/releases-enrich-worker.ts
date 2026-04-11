/**
 * POST /api/releases-enrich-worker
 *
 * Queue-based single-release enrichment worker.
 *
 * Each call processes exactly ONE release from the `releases-enrich-queue` key
 * in Redis, then returns. Intended to be called by a Vercel cron every 2 minutes
 * so the queue drains automatically without hitting the 300s timeout.
 *
 * Workflow per call:
 *  1. Read `releases-enrich-queue` from Redis.
 *  2. If queue is empty/missing → return { ok: true, done: true }.
 *  3. Take the next unprocessed release (tracked by processedCount).
 *  4. Enrich it with Odesli first (Apple Music URL), then MusicBrainz metadata
 *     (type + date from pre-fetched map). Same logic as enrichRelease().
 *  5. Append the enriched release to `releases-enrich-results`.
 *  6. Increment processedCount in the queue and save it back.
 *  7. If all releases are processed: merge results into band-data, clean up keys.
 *  8. Return status.
 *
 * Authorization: Bearer <CRON_SECRET> or valid admin session.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getRedisOrNull, isRedisConfigured } from './_redis.js'
import { validateSession } from './auth.js'
import {
  verifyCronSecret,
  enrichRelease,
  BAND_DATA_KEY,
  type EnrichQueuePayload,
  type Release,
  type SiteData,
} from './releases-enrich.js'
import { type MbReleaseData } from './_musicbrainz.js'

const RESULTS_KEY = 'releases-enrich-results'
const QUEUE_KEY = 'releases-enrich-queue'
const QUEUE_TTL = 3600 // 1 hour self-cleanup TTL

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  res.setHeader('Access-Control-Allow-Origin', 'https://zardonic.com')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') { res.status(200).end(); return }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return }

  const authHeader = req.headers.authorization ?? ''
  const isCron = authHeader.startsWith('Bearer ') && verifyCronSecret(authHeader.slice(7))

  if (!isCron) {
    const sessionValid = await validateSession(req)
    if (!sessionValid) { res.status(401).json({ error: 'Unauthorized' }); return }
  }

  if (!isRedisConfigured()) {
    res.status(503).json({ error: 'Redis not configured' }); return
  }

  const redis = getRedisOrNull()!

  try {
    // 1. Read the queue
    const queue = await redis.get<EnrichQueuePayload>(QUEUE_KEY)

    if (!queue || !queue.releases || queue.releases.length === 0) {
      res.status(200).json({ ok: true, done: true, message: 'Queue empty' })
      return
    }

    const { releases, mbMap: mbMapRecord, processedCount } = queue
    const total = releases.length

    // 2. Check if already done
    if (processedCount >= total) {
      // Finalize: merge results into band-data and clean up
      await finalizeEnrichment(redis, total)
      res.status(200).json({ ok: true, done: true, total, message: 'Already complete, finalized.' })
      return
    }

    // 3. Rebuild Map from stored Record (Redis serializes Map as plain object)
    const mbMap = new Map<string, MbReleaseData>(
      Object.entries(mbMapRecord ?? {}) as [string, MbReleaseData][]
    )

    // 4. Process the next release
    const release = releases[processedCount]
    let enrichedRelease: Release = release
    try {
      const result = await enrichRelease(release, redis, mbMap)
      enrichedRelease = result.release
    } catch (enrichErr) {
      console.warn(`[releases-enrich-worker] Failed to enrich release "${release.title}", keeping original:`, enrichErr)
    }

    // 5. Append enriched release to results
    try {
      const existing = await redis.get<Release[]>(RESULTS_KEY) ?? []
      existing.push(enrichedRelease)
      await redis.set(RESULTS_KEY, existing, { ex: QUEUE_TTL })
    } catch (appendErr) {
      console.error('[releases-enrich-worker] Failed to append result to Redis:', appendErr)
      res.status(500).json({ error: 'Failed to save enrichment result' })
      return
    }

    // 6. Increment processedCount and save queue back
    const newProcessedCount = processedCount + 1
    const updatedQueue: EnrichQueuePayload = { ...queue, processedCount: newProcessedCount }
    try {
      await redis.set(QUEUE_KEY, updatedQueue, { ex: QUEUE_TTL })
    } catch (queueErr) {
      console.error('[releases-enrich-worker] Failed to update queue in Redis:', queueErr)
    }

    // 7. If all releases processed, finalize
    if (newProcessedCount >= total) {
      const enriched = await finalizeEnrichment(redis, total)
      res.status(200).json({
        ok: true,
        done: true,
        total,
        enriched,
        message: 'All releases processed and merged into band-data.',
      })
      return
    }

    // 8. Still more to process
    res.status(200).json({
      ok: true,
      done: false,
      processed: newProcessedCount,
      remaining: total - newProcessedCount,
    })
  } catch (error) {
    console.error('[releases-enrich-worker] Unexpected error:', error)
    res.status(500).json({ error: 'Worker failed' })
  }
}

/**
 * Merge `releases-enrich-results` into `band-data` and clean up queue/result keys.
 * Returns the count of enriched releases written.
 */
async function finalizeEnrichment(
  redis: NonNullable<ReturnType<typeof getRedisOrNull>>,
  expectedTotal: number,
): Promise<number> {
  try {
    const enrichedReleases = await redis.get<Release[]>(RESULTS_KEY) ?? []
    const existing = await redis.get<SiteData>(BAND_DATA_KEY)
    const updatedSiteData: SiteData = {
      ...(existing ?? {}),
      releases: enrichedReleases,
    }
    await redis.set(BAND_DATA_KEY, updatedSiteData)
    console.log(`[releases-enrich-worker] Finalized: wrote ${enrichedReleases.length}/${expectedTotal} releases to band-data`)

    // Clean up temporary keys
    try { await redis.del(QUEUE_KEY) } catch { /* non-fatal */ }
    try { await redis.del(RESULTS_KEY) } catch { /* non-fatal */ }

    return enrichedReleases.length
  } catch (err) {
    console.error('[releases-enrich-worker] Finalization failed:', err)
    return 0
  }
}
