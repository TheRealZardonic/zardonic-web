import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getRedis, isRedisConfigured } from './_redis.js'
import { validateSession } from './auth.js'
import { createRequire } from 'node:module'

const _require = createRequire(import.meta.url)
const { version: VERSION } = _require('../package.json') as { version: string }

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  let kvStatus: 'ok' | 'unavailable' = 'ok'

  if (isRedisConfigured()) {
    try {
      await getRedis().ping()
    } catch {
      kvStatus = 'unavailable'
    }
  } else {
    kvStatus = 'unavailable'
  }

  const overallStatus = kvStatus === 'ok' ? 'ok' : 'degraded'

  // Service-level detail (which third-party APIs are configured) is gated
  // behind session auth to avoid unauthenticated infrastructure enumeration.
  const isAuthenticated = await validateSession(req)

  const body = isAuthenticated
    ? {
        status: overallStatus,
        timestamp: new Date().toISOString(),
        services: {
          kv: kvStatus,
          spotify: process.env.SPOTIFY_CLIENT_ID && process.env.SPOTIFY_CLIENT_SECRET ? 'configured' : 'unconfigured',
          bandsintown: process.env.BANDSINTOWN_API_KEY ? 'configured' : 'unconfigured',
          itunes: process.env.ITUNES_ARTIST_ID ? 'configured' : 'unconfigured',
          musicbrainz: 'ok',
          odesli: 'ok',
          imageProxy: 'ok',
        },
        version: VERSION,
      }
    : {
        status: overallStatus,
        timestamp: new Date().toISOString(),
        version: VERSION,
      }

  // Always return 200 — the `status` field communicates degraded state.
  // Returning 503 here was causing uptime monitors and load balancers to
  // consider the entire application unreachable when only KV was down.
  return res.status(200).json(body)
}
