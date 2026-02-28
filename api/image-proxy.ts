import { kv } from '@vercel/kv'
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

const MAX_CACHEABLE_IMAGE_SIZE = 4 * 1024 * 1024 // 4 MB — larger images are served but not cached
const MAX_IMAGE_SIZE = 16 * 1024 * 1024 // 16 MB — absolute maximum, rejects larger payloads
const CACHE_TTL_SECONDS = 60 * 60 * 24 * 30 // 30 days
const CORS_ORIGIN = process.env.ALLOWED_ORIGIN || '*'

/** Block requests to private/internal networks to prevent SSRF */
const BLOCKED_HOST_PATTERNS = [
  /^localhost$/i,
  /^127\./,
  /^10\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^0\./,
  /^169\.254\./,
  /^\[::1\]/,
  /^\[::ffff:/i,
  /^\[fe80:/i,
  /^\[fc/i,
  /^\[fd/i,
  /^metadata\.google\.internal$/i,
  /^0x[0-9a-f]+$/i,
  /^0[0-7]+\./,
]

/** Allowed URL protocols */
const ALLOWED_PROTOCOLS = new Set(['http:', 'https:'])

function isBlockedHost(hostname) {
  if (BLOCKED_HOST_PATTERNS.some(p => p.test(hostname))) return true
  // Block numeric-only hostnames (decimal IP like 2130706433 = 127.0.0.1)
  if (/^\d+$/.test(hostname)) return true
  // Block hostnames without a dot (e.g. "internal", "localhost")
  if (!hostname.includes('.') && !hostname.startsWith('[')) return true
  return false
}

/** Patterns for checking resolved IP addresses against private/internal ranges */
const BLOCKED_IP_PATTERNS = [
  /^127\./,
  /^10\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^0\./,
  /^169\.254\./,
  /^::1$/,
  /^::ffff:(127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/i,
  /^fe80:/i,
  /^fc/i,
  /^fd/i,
]

/**
 * DNS rebinding protection: resolve the hostname and check all resolved IPs
 * against blocked private/internal ranges before making the actual fetch.
 * This mitigates TOCTOU attacks where DNS returns a safe IP during our
 * hostname check but a private IP when fetch resolves it.
 */
async function hasBlockedResolvedIP(hostname) {
  // Skip DNS check for IP literals (already checked by isBlockedHost)
  if (/^\d+\.\d+\.\d+\.\d+$/.test(hostname) || hostname.startsWith('[')) return false

  try {
    const [ipv4, ipv6] = await Promise.all([
      resolve4(hostname).catch(() => []),
      resolve6(hostname).catch(() => []),
    ])
    const allIPs = [...ipv4, ...ipv6]
    return allIPs.some(ip => BLOCKED_IP_PATTERNS.some(p => p.test(ip)))
  } catch {
    // DNS resolution failure — let fetch handle it
    return false
  }
}

function toDirectUrl(url) {
  const driveFile = url.match(/drive\.google\.com\/file\/d\/([^/?#]+)/)
  if (driveFile) return `https://drive.google.com/uc?export=view&id=${driveFile[1]}`
  const driveOpen = url.match(/drive\.google\.com\/open\?id=([^&#]+)/)
  if (driveOpen) return `https://drive.google.com/uc?export=view&id=${driveOpen[1]}`
  // Handle all uc URLs (both export=view and export=download) by extracting the ID
  const driveUc = url.match(/drive\.google\.com\/uc\?[^#]*?id=([^&#]+)/)
  if (driveUc) return `https://drive.google.com/uc?export=view&id=${driveUc[1]}`
  // Handle lh3 CDN URLs — convert back to reliable export URL
  const lh3Match = url.match(/lh3\.googleusercontent\.com\/d\/([^/?#]+)/)
  if (lh3Match) return `https://drive.google.com/uc?export=view&id=${lh3Match[1]}`
  return url
}

function cacheKey(url) {
  return `img-cache:${url}`
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Hard-block check — immediate rejection
  const blocked = await isHardBlocked(req)
  if (blocked) {
    return res.status(403).json({ error: 'FORBIDDEN' })
  }

  // Rate limiting — blocks image proxy abuse (GDPR-compliant, IP is hashed)
  const allowed = await applyRateLimit(req, res)
  if (!allowed) return

  // Fingerprinting counter-measure: serve a tracking pixel to flagged attackers
  // instead of the real image, collecting browser Client Hints for identification
  if (await isMarkedAttacker(req)) {
    return serveFingerprintPixel(res)
  }

  // Zod validation
  const qParsed = validate(imageProxyQuerySchema, req.query)
  if (!qParsed.success) return res.status(400).json({ error: qParsed.error })
  const { url } = qParsed.data

  // Validate and block dangerous URLs
  let parsed
  try {
    parsed = new URL(url)
  } catch {
    return res.status(400).json({ error: 'Invalid URL' })
  }
  // Only allow http(s) protocols (blocks file://, data://, javascript://, etc.)
  if (!ALLOWED_PROTOCOLS.has(parsed.protocol)) {
    return res.status(400).json({ error: 'Invalid URL protocol' })
  }
  // Block requests to private/internal networks (SSRF prevention)
  if (isBlockedHost(parsed.hostname)) {
    return res.status(400).json({ error: 'Blocked host' })
  }

  const directUrl = toDirectUrl(url)

  // Re-validate the transformed URL as well
  let parsedDirect
  try {
    parsedDirect = new URL(directUrl)
    if (!ALLOWED_PROTOCOLS.has(parsedDirect.protocol) || isBlockedHost(parsedDirect.hostname)) {
      return res.status(400).json({ error: 'Blocked host' })
    }
  } catch {
    return res.status(400).json({ error: 'Invalid URL' })
  }

  // DNS rebinding protection: resolve the hostname and check all IPs
  // before fetch to mitigate TOCTOU attacks
  if (await hasBlockedResolvedIP(parsedDirect.hostname)) {
    return res.status(400).json({ error: 'Blocked host' })
  }

  const key = cacheKey(directUrl)

  try {
    // Check KV cache first
    const cached = await kv.get<{ data: string; contentType: string }>(key)
    if (cached && cached.data && cached.contentType) {
      const buf = Buffer.from(cached.data, 'base64')
      res.setHeader('Content-Type', cached.contentType)
      res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=2592000')
      res.setHeader('Access-Control-Allow-Origin', CORS_ORIGIN)
      return res.status(200).send(buf)
    }
  } catch (e) {
    console.warn('KV cache read failed:', e)
  }

  try {
    const response = await fetch(directUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; NeuroklastImageProxy/1.0)' },
      redirect: 'follow',
    })

    // Validate the final URL after redirects to prevent SSRF via redirect
    if (response.url) {
      try {
        const finalUrl = new URL(response.url)
        if (!ALLOWED_PROTOCOLS.has(finalUrl.protocol) || isBlockedHost(finalUrl.hostname)) {
          return res.status(400).json({ error: 'Blocked redirect target' })
        }
        // DNS rebinding protection: also resolve the final hostname after redirect
        // to mitigate TOCTOU attacks where DNS changes between our check and fetch
        if (await hasBlockedResolvedIP(finalUrl.hostname)) {
          return res.status(400).json({ error: 'Blocked redirect target' })
        }
      } catch {
        return res.status(400).json({ error: 'Invalid redirect URL' })
      }
    }

    if (!response.ok) {
      return res.status(502).json({ error: 'Failed to fetch image' })
    }

    const contentType = response.headers.get('content-type') || 'image/jpeg'
    // Only allow raster image content types through the image proxy.
    // Reject text/html, application/javascript, image/svg+xml, etc. to prevent XSS.
    if (!contentType.startsWith('image/') || contentType.includes('svg')) {
      return res.status(400).json({ error: 'Unsupported content type' })
    }

    // Check Content-Length header before loading body into memory to prevent
    // image bombs from exhausting serverless function memory.
    const contentLength = parseInt(response.headers.get('content-length') || '0', 10)
    if (contentLength > MAX_IMAGE_SIZE) {
      return res.status(413).json({ error: 'Image too large' })
    }

    const arrayBuf = await response.arrayBuffer()

    // Double-check actual size (Content-Length can be missing or lie)
    if (arrayBuf.byteLength > MAX_IMAGE_SIZE) {
      return res.status(413).json({ error: 'Image too large' })
    }
    if (arrayBuf.byteLength > MAX_CACHEABLE_IMAGE_SIZE) {
      // Serve but don't cache very large images
      res.setHeader('Content-Type', contentType)
      res.setHeader('Cache-Control', 'public, max-age=86400')
      res.setHeader('Access-Control-Allow-Origin', CORS_ORIGIN)
      return res.status(200).send(Buffer.from(arrayBuf))
    }

    const base64 = Buffer.from(arrayBuf).toString('base64')

    // Cache in KV (fire-and-forget)
    kv.set(key, { data: base64, contentType }, { ex: CACHE_TTL_SECONDS }).catch((e) => {
      console.warn('KV cache write failed:', e)
    })

    res.setHeader('Content-Type', contentType)
    res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=2592000')
    res.setHeader('Access-Control-Allow-Origin', CORS_ORIGIN)
    return res.status(200).send(Buffer.from(arrayBuf))
  } catch (error) {
    console.error('Image proxy error:', error)
    return res.status(502).json({ error: 'Failed to fetch image' })
  }
}
