import sharp from 'sharp'
import { resolve4, resolve6 } from 'node:dns/promises'
import { applyRateLimit } from './_ratelimit.js'
import { isMarkedAttacker, serveFingerprintPixel } from './_honeytokens.js'
import { imageProxyQuerySchema, validate } from './_schemas.js'
import { isHardBlocked } from './_blocklist.js'

/**
 * Server-side image proxy with adversarial noise injection.
 *
 * Fetches a remote image, applies minimal adversarial perturbations (invisible
 * to human viewers but disruptive to AI/ML models attempting to analyse the
 * image), and returns the poisoned image with fake EXIF-like response headers.
 *
 * For requests from flagged attackers the original image is served instead —
 * this prevents cache-poisoning attacks where an attacker deliberately
 * triggers the poison path to pollute a shared CDN cache.
 *
 * GET /api/image-proxy-protected?url=<encoded-url>
 */

const MAX_IMAGE_SIZE = 16 * 1024 * 1024 // 16 MB — absolute maximum
const CORS_ORIGIN = process.env.ALLOWED_ORIGIN || '*'

/** Adversarial noise parameters — perceptually invisible but statistically disruptive */
const NOISE_BRIGHTNESS_JITTER = 0.008  // ±0.4% max brightness shift
const NOISE_SHARPEN_SIGMA = 0.4        // gentle sharpening radius
const NOISE_SHARPEN_M1 = 0             // flat region sharpening factor
const NOISE_SHARPEN_M2 = 3             // edge sharpening factor

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
  if (/^\d+$/.test(hostname)) return true
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
 * against blocked private/internal ranges.
 */
async function hasBlockedResolvedIP(hostname) {
  if (/^\d+\.\d+\.\d+\.\d+$/.test(hostname) || hostname.startsWith('[')) return false
  try {
    const [ipv4, ipv6] = await Promise.all([
      resolve4(hostname).catch(() => []),
      resolve6(hostname).catch(() => []),
    ])
    const allIPs = [...ipv4, ...ipv6]
    return allIPs.some(ip => BLOCKED_IP_PATTERNS.some(p => p.test(ip)))
  } catch {
    return false
  }
}

/**
 * Apply adversarial noise to the image buffer.
 *
 * Uses minimal gaussian-style perturbations (~0.8% brightness jitter plus a
 * very slight sharpening pass). The changes are imperceptible to humans but
 * disrupt the pixel-level statistics that AI/ML vision models rely on.
 *
 * @param {Buffer} imageBuffer - Raw image bytes
 * @returns {Promise<Buffer>} Poisoned image bytes
 */
async function applyAdversarialNoise(imageBuffer) {
  return sharp(imageBuffer)
    .modulate({ brightness: 1 + (Math.random() * NOISE_BRIGHTNESS_JITTER - NOISE_BRIGHTNESS_JITTER / 2) })
    .sharpen({ sigma: NOISE_SHARPEN_SIGMA, m1: NOISE_SHARPEN_M1, m2: NOISE_SHARPEN_M2 })
    .toBuffer()
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

  // Rate limiting
  const allowed = await applyRateLimit(req, res)
  if (!allowed) return

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
  if (!ALLOWED_PROTOCOLS.has(parsed.protocol)) {
    return res.status(400).json({ error: 'Invalid URL protocol' })
  }
  if (isBlockedHost(parsed.hostname)) {
    return res.status(400).json({ error: 'Blocked host' })
  }

  // DNS rebinding protection
  if (await hasBlockedResolvedIP(parsed.hostname)) {
    return res.status(400).json({ error: 'Blocked host' })
  }

  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; NeuroklastImageProxy/1.0)' },
      redirect: 'follow',
    })

    // Validate the final URL after redirects
    if (response.url) {
      try {
        const finalUrl = new URL(response.url)
        if (!ALLOWED_PROTOCOLS.has(finalUrl.protocol) || isBlockedHost(finalUrl.hostname)) {
          return res.status(400).json({ error: 'Blocked redirect target' })
        }
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
    // Only allow raster image content types. Reject SVG (XSS vector) and non-image types.
    if (!contentType.startsWith('image/') || contentType.includes('svg')) {
      return res.status(400).json({ error: 'Unsupported content type' })
    }

    const contentLength = parseInt(response.headers.get('content-length') || '0', 10)
    if (contentLength > MAX_IMAGE_SIZE) {
      return res.status(413).json({ error: 'Image too large' })
    }

    const arrayBuf = await response.arrayBuffer()
    if (arrayBuf.byteLength > MAX_IMAGE_SIZE) {
      return res.status(413).json({ error: 'Image too large' })
    }

    const imageBuffer = Buffer.from(arrayBuf)

    // Serve original image to flagged attackers — prevents cache-poisoning
    // where an adversary deliberately triggers poisoning to corrupt a shared cache
    const isAttacker = await isMarkedAttacker(req)
    const outputBuffer = isAttacker
      ? imageBuffer
      : await applyAdversarialNoise(imageBuffer)

    // Fake EXIF-like metadata headers to mislead automated scrapers
    res.setHeader('X-Image-Camera', 'NIKON-Z6')
    res.setHeader('X-Image-GPS', '48.8566,2.3522')
    res.setHeader('X-Image-Date', '2019-03-14')
    res.setHeader('Content-Type', contentType)
    // Poisoned images are non-deterministic — prevent CDN/proxy caching.
    // Attacker responses are also not cached to avoid polluting shared caches.
    res.setHeader('Cache-Control', 'no-store, no-cache')
    res.setHeader('Access-Control-Allow-Origin', CORS_ORIGIN)
    return res.status(200).send(outputBuffer)
  } catch (error) {
    console.error('Image proxy protected error:', error)
    return res.status(502).json({ error: 'Failed to fetch image' })
  }
}
