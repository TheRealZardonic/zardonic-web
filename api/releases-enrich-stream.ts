/**
 * GET /api/releases-enrich-stream
 *
 * Server-Sent Events endpoint for real-time Odesli enrichment progress.
 *
 * Replaces the browser-side polling loop in use-site-data-sync.ts.
 * Instead of calling /api/releases-enrich-worker repeatedly every 200 ms,
 * the browser opens ONE EventSource connection and the server pushes progress
 * events as each release is enriched.
 *
 * SSE event types:
 *   { type: 'progress', processed: number, total: number, currentTitle: string }
 *   { type: 'done',     total: number }
 *   { type: 'error',    message: string }
 *
 * Authorization: Valid admin session cookie (GET requests carry cookies
 * automatically, so no extra header is required).
 *
 * Configuration:
 *   maxDuration: 300 – Vercel Pro timeout.  For very large queues (>80
 *   releases at 3 s/release) the client EventSource will reconnect
 *   automatically because the server sends a `retry:` hint.  The queue
 *   pointer is persisted in Redis so each reconnect continues where the
 *   previous one left off.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getRedisOrNull, isRedisConfigured } from './_redis.js'
import { validateSession } from './auth.js'
import {
  enrichRelease,
  BAND_DATA_KEY,
  type EnrichQueuePayload,
  type Release,
  type SiteData,
} from './releases-enrich.js'
import { type MbReleaseData } from './_musicbrainz.js'
import { mergeWithExistingReleases } from './_release-merge.js'

export const config = { maxDuration: 300 }

const RESULTS_KEY = 'releases-enrich-results'
const QUEUE_KEY = 'releases-enrich-queue'
const QUEUE_TTL = 3600

// Budget ≈ 270 s (leaving 30 s margin before Vercel kills the function).
// Each release takes roughly ODESLI_DELAY_MS = 3000 ms of sleep plus I/O.
// With 3.5 s per release, 270 / 3.5 ≈ 77 releases per connection.
const MAX_DURATION_MS = 270_000
const SSE_RETRY_MS = 1_000   // hint to EventSource to reconnect after 1 s

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  res.setHeader('Access-Control-Allow-Origin', 'https://zardonic.com')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  res.setHeader('Access-Control-Allow-Credentials', 'true')

  if (req.method === 'OPTIONS') { res.status(200).end(); return }
  if (req.method !== 'GET') { res.status(405).json({ error: 'Method not allowed' }); return }

  const sessionValid = await validateSession(req)
  if (!sessionValid) { res.status(401).json({ error: 'Unauthorized' }); return }

  if (!isRedisConfigured()) {
    res.status(503).json({ error: 'Redis not configured' }); return
  }

  const redis = getRedisOrNull()!

  // Establish SSE stream
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache, no-transform')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no')  // Disable nginx buffering
  res.flushHeaders()

  const sendEvent = (data: Record<string, unknown>): boolean => {
    try {
      res.write(`retry: ${SSE_RETRY_MS}\n`)
      res.write(`data: ${JSON.stringify(data)}\n\n`)
      // @ts-expect-error - flush is available in Node.js http.ServerResponse
      if (typeof res.flush === 'function') res.flush()
      return true
    } catch {
      return false
    }
  }

  const startTime = Date.now()

  try {
    const queue = await redis.get<EnrichQueuePayload>(QUEUE_KEY)

    if (!queue || !queue.releases || queue.releases.length === 0) {
      sendEvent({ type: 'done', total: 0 })
      res.end()
      return
    }

    const { releases, mbMap: mbMapRecord, processedCount: initialProcessed, artistName } = queue
    const total = releases.length

    if (initialProcessed >= total) {
      await finalizeEnrichment(redis, total)
      sendEvent({ type: 'done', total })
      res.end()
      return
    }

    const mbMap = new Map<string, MbReleaseData>(
      Object.entries(mbMapRecord ?? {}) as [string, MbReleaseData][]
    )

    let processedCount = initialProcessed

    // Check if client closed the connection
    let clientClosed = false
    req.on('close', () => { clientClosed = true })

    while (processedCount < total) {
      // Bail out if client disconnected or we are close to the timeout budget
      if (clientClosed) break
      if (Date.now() - startTime > MAX_DURATION_MS) {
        // Reconnect hint already sent via `retry:` above — just close cleanly
        break
      }

      const release = releases[processedCount]
      let enrichedRelease: Release = release

      try {
        const result = await enrichRelease(release, redis, mbMap, artistName ?? 'Zardonic')
        enrichedRelease = result.release
      } catch (enrichErr) {
        console.warn(`[releases-enrich-stream] Failed to enrich "${release.title}", keeping original:`, enrichErr)
      }

      // Persist enriched release to results key
      try {
        const existing = await redis.get<Release[]>(RESULTS_KEY) ?? []
        existing.push(enrichedRelease)
        await redis.set(RESULTS_KEY, existing, { ex: QUEUE_TTL })
      } catch (redisErr) {
        console.error('[releases-enrich-stream] Failed to store result:', redisErr)
      }

      // Advance the queue pointer
      processedCount++
      try {
        const updatedQueue: EnrichQueuePayload = { ...queue, processedCount }
        await redis.set(QUEUE_KEY, updatedQueue, { ex: QUEUE_TTL })
      } catch (queueErr) {
        console.error('[releases-enrich-stream] Failed to update queue pointer:', queueErr)
      }

      const ok = sendEvent({
        type: 'progress',
        processed: processedCount,
        total,
        currentTitle: releases[processedCount]?.title ?? '',
      })
      if (!ok) break  // client disconnected mid-stream
    }

    // Finalize only when the entire queue has been consumed
    if (processedCount >= total) {
      await finalizeEnrichment(redis, total)
      sendEvent({ type: 'done', total })
    }

    res.end()
  } catch (error) {
    console.error('[releases-enrich-stream] Unexpected error:', error)
    sendEvent({ type: 'error', message: 'Stream failed' })
    res.end()
  }
}

async function finalizeEnrichment(
  redis: NonNullable<ReturnType<typeof getRedisOrNull>>,
  expectedTotal: number,
): Promise<void> {
  try {
    const enrichedReleases = await redis.get<Release[]>(RESULTS_KEY) ?? []
    const existing = await redis.get<SiteData>(BAND_DATA_KEY)
    const existingReleases = existing?.releases ?? []
    const mergedReleases = mergeWithExistingReleases(enrichedReleases, existingReleases)
    const updatedSiteData: SiteData = { ...(existing ?? {}), releases: mergedReleases }
    await redis.set(BAND_DATA_KEY, updatedSiteData)
    console.log(`[releases-enrich-stream] Finalized: ${mergedReleases.length}/${expectedTotal} releases`)
    try { await redis.del(QUEUE_KEY) } catch { /* non-fatal */ }
    try { await redis.del(RESULTS_KEY) } catch { /* non-fatal */ }
  } catch (err) {
    console.error('[releases-enrich-stream] Finalization failed:', err)
  }
}
