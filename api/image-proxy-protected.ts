import sharp from 'sharp'
import { resolve4, resolve6 } from 'node:dns/promises'
import { applyRateLimit } from './_ratelimit.js'
import { isMarkedAttacker } from './_honeytokens.js'
import { imageProxyQuerySchema, validate } from './_schemas.js'
import { isHardBlocked } from './_blocklist.js'

interface VercelRequest {
  method?: string
  body?: Record<string, unknown>
  query?: Record<string, string | string[]>
  headers: Record<string, string | string[] | undefined>
}

interface VercelResponse {
  setHeader(key: string, value: string): VercelResponse
  status(code: number): VercelResponse
  json(data: unknown): VercelResponse
  end(): VercelResponse
  send(data: unknown): VercelResponse
}

/**
 * Server-side image proxy with adversarial noise injection.
 *
 * GET /api/image-proxy-protected?url=<encoded-url>
 */

const MAX_IMAGE_SIZE = 16 * 1024 * 1024 // 16 MB
const CORS_ORIGIN = process.env.ALLOWED_ORIGIN || '*'

const NOISE_BRIGHTNESS_JITTER = 0.008
const NOISE_SHARPEN_SIGMA = 0.4
const NOISE_SHARPEN_M1 = 0
const NOISE_SHARPEN_M2 = 3

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

async function applyAdversarialNoise(imageBuffer: Buffer): Promise<Buffer> {
  return sharp(imageBuffer)
    .modulate({ brightness: 1 + (Math.random() * NOISE_BRIGHTNESS_JITTER - NOISE_BRIGHTNESS_JITTER / 2) })
    .sharpen({ sigma: NOISE_SHARPEN_SIGMA, m1: NOISE_SHARPEN_M1, m2: NOISE_SHARPEN_M2 })
    .toBuffer()
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

  if (await hasBlockedResolvedIP(parsed.hostname)) {
    res.status(400).json({ error: 'Blocked host' })
    return
  }

  try {
    const response = await fetch(url, {
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

    const imageBuffer = Buffer.from(arrayBuf)

    const isAttacker = await isMarkedAttacker(req)
    const outputBuffer = isAttacker
      ? imageBuffer
      : await applyAdversarialNoise(imageBuffer)

    res.setHeader('X-Image-Camera', 'NIKON-Z6')
    res.setHeader('X-Image-GPS', '48.8566,2.3522')
    res.setHeader('X-Image-Date', '2019-03-14')
    res.setHeader('Content-Type', contentType)
    res.setHeader('Cache-Control', 'no-store, no-cache')
    res.setHeader('Access-Control-Allow-Origin', CORS_ORIGIN)
    res.status(200).send(outputBuffer)
  } catch (error) {
    console.error('Image proxy protected error:', error)
    res.status(502).json({ error: 'Failed to fetch image' })
  }
}
