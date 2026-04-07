import type { VercelRequest, VercelResponse } from '@vercel/node'
import { Redis } from '@upstash/redis'
import { createRequire } from 'node:module'

const _require = createRequire(import.meta.url)
const { version: VERSION } = _require('../package.json') as { version: string }

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  let kvStatus: 'ok' | 'unavailable' = 'ok'

  // Check KV (Upstash Redis) reachability
  const kvUrl = process.env.UPSTASH_REDIS_REST_URL
  const kvToken = process.env.UPSTASH_REDIS_REST_TOKEN

  if (kvUrl && kvToken) {
    try {
      const redis = new Redis({ url: kvUrl, token: kvToken })
      await redis.ping()
    } catch {
      kvStatus = 'unavailable'
    }
  } else {
    kvStatus = 'unavailable'
  }

  const overallStatus = kvStatus === 'ok' ? 'ok' : 'degraded'

  const body = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    services: {
      kv: kvStatus,
      spotify: process.env.SPOTIFY_CLIENT_ID && process.env.SPOTIFY_CLIENT_SECRET ? 'configured' : 'unconfigured',
      bandsintown: process.env.BANDSINTOWN_API_KEY ? 'configured' : 'unconfigured',
      imageProxy: 'ok',
    },
    version: VERSION,
  }

  // Always return 200 — the `status` field communicates degraded state.
  // Returning 503 here was causing uptime monitors and load balancers to
  // consider the entire application unreachable when only KV was down.
  return res.status(200).json(body)
}
