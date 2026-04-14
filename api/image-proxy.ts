import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getRedis } from './_redis.js'
const kv = new Proxy({} as ReturnType<typeof getRedis>, {
  get (_, prop: string | symbol) { return Reflect.get(getRedis(), prop) },
})
import { resolve4, resolve6 } from 'node:dns/promises'
import { applyRateLimit } from './_ratelimit.js'
import { isMarkedAttacker, serveFingerprintPixel } from './_honeytokens.js'
import { imageProxyQuerySchema, validate } from './_schemas.js'
import { isHardBlocked } from './_blocklist.js'
/**
 * Server-side image proxy that fetches remote images, caches them in Vercel KV,
 * and returns the binary data. Handles Google Drive URLs and other CORS-restricted
 * sources. The KV cache survives deployments.
 *
 * GET /api/image-proxy?url=<encoded-url>
 */

const MAX_CACHEABLE_IMAGE_SIZE = 4 * 1024 * 1024 // 4 MB
const MAX_IMAGE_SIZE = 16 * 1024 * 1024 // 16 MB
const CACHE_TTL_SECONDS = 60 * 60 * 24 * 30 // 30 days
// In production, require ALLOWED_ORIGIN to be explicitly set to prevent
// arbitrary sites from hotlinking through the proxy and consuming quota.
const CORS_ORIGIN = process.env.ALLOWED_ORIGIN ||
  (process.env.VERCEL_ENV === 'production' ? 'null' : '*')

if (process.env.VERCEL_ENV === 'production' && !process.env.ALLOWED_ORIGIN) {
  console.warn('[image-proxy] ALLOWED_ORIGIN env var is not set. CORS defaults to "null" which blocks all cross-origin image requests. Set ALLOWED_ORIGIN to your production domain (e.g. https://yourdomain.com).')
}

const BLOCKED_HOST_PATTERNS = [
  /^localhost$/i, /^127\./, /^10\./, /^172\.(1[6-9]|2\d|3[01])\./, /^192\.168\./,
  /^0\./, /^169\.254\./, /^\[::1\]/, /^\[::ffff:/i, /^\[fe80:/i, /^\[fc/i, /^\[fd/i,
  /^metadata\.google\.internal$/i, /^0x[0-9a-f]+$/i, /^0[0-7]+\./,
]

const ALLOWED_PROTOCOLS = new Set(['http:', 'https:'])

function isBlockedHost(hostname: string): boolean {
  if (BLOCKED_HOST_PATTERNS.some(p => p.test(hostname))) return true
  if (/^\d+$/.test(hostname)) return true
  if (!hostname.includes('.') && !hostname.startsWith('[')) return true
  return false
}

const BLOCKED_IP_PATTERNS = [
  /^127\./, /^10\./, /^172\.(1[6-9]|2\d|3[01])\./, /^192\.168\./, /^0\./, /^169\.254\./,
  /^::1$/, /^::ffff:(127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/i,
  /^fe80:/i, /^fc/i, /^fd/i,
]

async function hasBlockedResolvedIP(hostname: string): Promise<boolean> {
  if (/^\d+\.\d+\.\d+\.\d+$/.test(hostname) || hostname.startsWith('[')) return false
  try {
    const [ipv4, ipv6] = await Promise.all([
      resolve4(hostname).catch(() => [] as string[]),
      resolve6(hostname).catch(() => [] as string[]),
    ])
    const allIPs = [...ipv4, ...ipv6]
    return allIPs.some(ip => BLOCKED_IP_PATTERNS.some(p => p.test(ip)))
  } catch {
    return false
  }
}

function toDirectUrl(url: string): string {
  const driveFile = url.match(/drive\.google\.com\/file\/d\/([^/?#]+)/)
  if (driveFile) return `https://drive.google.com/uc?export=view&id=${driveFile[1]}`
  const driveOpen = url.match(/drive\.google\.com\/open\?id=([^&#]+)/)
  if (driveOpen) return `https://drive.google.com/uc?export=view&id=${driveOpen[1]}`
  const driveUc = url.match(/drive\.google\.com\/uc\?[^#]*?id=([^&#]+)/)
  if (driveUc) return `https://drive.google.com/uc?export=view&id=${driveUc[1]}`
  const lh3Match = url.match(/lh3\.googleusercontent\.com\/d\/([^/?#]+)/)
  if (lh3Match) return `https://drive.google.com/uc?export=view&id=${lh3Match[1]}`
  return url
}

function cacheKey(url: string): string {
  return `img-cache:${url}`
}

interface CachedImage {
  data: string
  contentType: string
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const blocked = await isHardBlocked(req)
  if (blocked) {
    res.status(403).json({ error: 'FORBIDDEN' })
    return
  }

  const allowed = await applyRateLimit(req, res)
  if (!allowed) return

  if (await isMarkedAttacker(req)) {
    serveFingerprintPixel(res)
    return
  }

  const qParsed = validate(imageProxyQuerySchema, req.query)
  if (!qParsed.success) {
    res.status(400).json({ error: qParsed.error })
    return
  }
  const { url } = qParsed.data

  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    res.status(400).json({ error: 'Invalid URL' })
    return
  }
  if (!ALLOWED_PROTOCOLS.has(parsed.protocol)) {
    res.status(400).json({ error: 'Invalid URL protocol' })
    return
  }
  if (isBlockedHost(parsed.hostname)) {
    res.status(400).json({ error: 'Blocked host' })
    return
  }

  const directUrl = toDirectUrl(url)

  let parsedDirect: URL
  try {
    parsedDirect = new URL(directUrl)
    if (!ALLOWED_PROTOCOLS.has(parsedDirect.protocol) || isBlockedHost(parsedDirect.hostname)) {
      res.status(400).json({ error: 'Blocked host' })
      return
    }
  } catch {
    res.status(400).json({ error: 'Invalid URL' })
    return
  }

  if (await hasBlockedResolvedIP(parsedDirect.hostname)) {
    res.status(400).json({ error: 'Blocked host' })
    return
  }

  const key = cacheKey(directUrl)

  try {
    const cached = await kv.get<CachedImage>(key)
    if (cached && cached.data && cached.contentType) {
      const buf = Buffer.from(cached.data, 'base64')
      res.setHeader('Content-Type', cached.contentType)
      res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=2592000')
      res.setHeader('Access-Control-Allow-Origin', CORS_ORIGIN)
      res.status(200).send(buf)
      return
    }
  } catch (e) {
    console.warn('KV cache read failed:', e)
  }

  try {
    const response = await fetch(directUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SiteImageProxy/1.0)' },
      redirect: 'follow',
    })

    if (response.url) {
      try {
        const finalUrl = new URL(response.url)
        if (!ALLOWED_PROTOCOLS.has(finalUrl.protocol) || isBlockedHost(finalUrl.hostname)) {
          res.status(400).json({ error: 'Blocked redirect target' })
          return
        }
        if (await hasBlockedResolvedIP(finalUrl.hostname)) {
          res.status(400).json({ error: 'Blocked redirect target' })
          return
        }
      } catch {
        res.status(400).json({ error: 'Invalid redirect URL' })
        return
      }
    }

    if (!response.ok) {
      res.status(response.status).json({ error: `Upstream returned ${response.status}` })
      return
    }

    const contentType = response.headers.get('content-type') || 'image/jpeg'
    if (!contentType.startsWith('image/')) {
      res.status(400).json({ error: 'Unsupported content type' })
      return
    }

    const contentLength = parseInt(response.headers.get('content-length') || '0', 10)
    if (contentLength > MAX_IMAGE_SIZE) {
      res.status(413).json({ error: 'Image too large' })
      return
    }

    const arrayBuf = await response.arrayBuffer()

    if (arrayBuf.byteLength > MAX_IMAGE_SIZE) {
      res.status(413).json({ error: 'Image too large' })
      return
    }
    if (arrayBuf.byteLength > MAX_CACHEABLE_IMAGE_SIZE) {
      res.setHeader('Content-Type', contentType)
      res.setHeader('Cache-Control', 'public, max-age=86400')
      res.setHeader('Access-Control-Allow-Origin', CORS_ORIGIN)
      res.status(200).send(Buffer.from(arrayBuf))
      return
    }

    const base64 = Buffer.from(arrayBuf).toString('base64')

    kv.set(key, { data: base64, contentType }, { ex: CACHE_TTL_SECONDS }).catch((e) => {
      console.warn('KV cache write failed:', e)
    })

    res.setHeader('Content-Type', contentType)
    res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=2592000')
    res.setHeader('Access-Control-Allow-Origin', CORS_ORIGIN)
    res.status(200).send(Buffer.from(arrayBuf))
  } catch (error) {
    console.error('Image proxy error:', error)
    res.status(502).json({ error: 'Failed to fetch image' })
  }
}
