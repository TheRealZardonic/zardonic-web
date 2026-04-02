import type { VercelRequest, VercelResponse } from '@vercel/node'
import { Redis } from '@upstash/redis'
import { applyRateLimit } from '../_ratelimit.js'
import { validateSession } from '../auth.js'
import { mediaItemSchema } from '../../src/cms/schemas.js'
import sharp from 'sharp'
import { v4 as uuidv4 } from 'uuid'
import type { MediaItem } from '../../src/cms/schemas.js'

const MAX_BODY_SIZE = 5 * 1024 * 1024 // 5 MB
const MAX_WIDTH = 2048
const THUMB_WIDTH = 400
const MEDIA_INDEX_KEY = 'zd-cms:media:index'

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
])

let _redis: Redis | null = null
function getRedis(): Redis {
  if (_redis) return _redis
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) throw new Error('Missing Redis config')
  _redis = new Redis({ url, token })
  return _redis
}

const uploadBodySchema = {
  parse(body: unknown): { fileName: string; mimeType: string; dataUrl: string } {
    if (!body || typeof body !== 'object') throw new Error('Body must be an object')
    const b = body as Record<string, unknown>
    if (typeof b.fileName !== 'string' || !b.fileName) throw new Error('fileName is required')
    if (typeof b.mimeType !== 'string' || !b.mimeType) throw new Error('mimeType is required')
    if (typeof b.dataUrl !== 'string' || !b.dataUrl) throw new Error('dataUrl is required')
    return { fileName: b.fileName, mimeType: b.mimeType, dataUrl: b.dataUrl }
  },
}

async function processImage(dataUrl: string): Promise<{
  webpBuffer: Buffer
  thumbBuffer: Buffer
  width: number
  height: number
  webpSize: number
}> {
  // Strip "data:image/xxx;base64," prefix
  const commaIdx = dataUrl.indexOf(',')
  if (commaIdx === -1) throw new Error('Invalid dataUrl format')
  const base64 = dataUrl.slice(commaIdx + 1)
  const inputBuffer = Buffer.from(base64, 'base64')

  const pipeline = sharp(inputBuffer).rotate() // auto-rotate from EXIF

  const metadata = await pipeline.metadata()
  const origWidth = metadata.width ?? MAX_WIDTH

  const resized = pipeline.resize({ width: Math.min(origWidth, MAX_WIDTH), withoutEnlargement: true })

  const [webpBuffer, thumbBuffer, outputMeta] = await Promise.all([
    resized.clone().webp({ quality: 85 }).toBuffer(),
    resized.clone().resize({ width: THUMB_WIDTH, withoutEnlargement: true }).webp({ quality: 75 }).toBuffer(),
    resized.clone().metadata(),
  ])

  return {
    webpBuffer,
    thumbBuffer,
    width: outputMeta.width ?? origWidth,
    height: outputMeta.height ?? 0,
    webpSize: webpBuffer.byteLength,
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // OWASP A07:2021 — Authentication check
  const authenticated = await validateSession(req)
  if (!authenticated) return res.status(401).json({ error: 'Unauthorized' })

  // OWASP A07:2021 — Rate limiting
  const allowed = await applyRateLimit(req, res)
  if (!allowed) return

  const kv = getRedis()

  try {
    if (req.method === 'GET') {
      // OWASP A03:2021 — Input validation
      const page = Math.max(1, parseInt(String(req.query.page ?? '1'), 10) || 1)
      const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit ?? '20'), 10) || 20))

      const index = await kv.get<string[]>(MEDIA_INDEX_KEY) ?? []
      const total = index.length
      const start = (page - 1) * limit
      const pageIds = index.slice(start, start + limit)

      const items: MediaItem[] = []
      for (const id of pageIds) {
        const item = await kv.get<MediaItem>(`zd-cms:media:${id}`)
        if (item) items.push(item)
      }

      return res.json({ items, total, page, limit })
    }

    if (req.method === 'POST') {
      if (!req.body || typeof req.body !== 'object') {
        return res.status(400).json({ error: 'Bad Request', details: ['Body is required'] })
      }

      // OWASP A03:2021 — Input validation
      let uploadData: { fileName: string; mimeType: string; dataUrl: string }
      try {
        uploadData = uploadBodySchema.parse(req.body)
      } catch (e) {
        return res.status(400).json({ error: 'Bad Request', details: [(e as Error).message] })
      }

      const { fileName, mimeType, dataUrl } = uploadData

      // OWASP A04:2021 — Restrict allowed MIME types
      if (!ALLOWED_MIME_TYPES.has(mimeType)) {
        return res.status(400).json({ error: 'Bad Request', details: ['Unsupported file type'] })
      }

      // Rough body-size guard (base64 is ~33% larger than binary)
      const approxSize = dataUrl.length * 0.75
      if (approxSize > MAX_BODY_SIZE) {
        return res.status(413).json({ error: 'Payload Too Large' })
      }

      const { webpBuffer, thumbBuffer, width, height, webpSize } = await processImage(dataUrl)

      const id = uuidv4()
      const webpBase64 = `data:image/webp;base64,${webpBuffer.toString('base64')}`
      const thumbBase64 = `data:image/webp;base64,${thumbBuffer.toString('base64')}`

      const mediaItem: MediaItem = {
        id,
        fileName: (fileName.includes('.') && !fileName.startsWith('.') ? fileName.replace(/\.[^.]+$/, '') : fileName) + '.webp',
        mimeType: 'image/webp',
        size: webpSize,
        width,
        height,
        url: webpBase64,
        thumbnailUrl: thumbBase64,
        uploadedAt: new Date().toISOString(),
      }

      // Validate final shape before storing
      const validation = mediaItemSchema.safeParse(mediaItem)
      if (!validation.success) {
        return res.status(500).json({ error: 'Internal Server Error' })
      }

      await kv.set(`zd-cms:media:${id}`, mediaItem)

      // Prepend new id to the index list
      const index = await kv.get<string[]>(MEDIA_INDEX_KEY) ?? []
      await kv.set(MEDIA_INDEX_KEY, [id, ...index])

      return res.status(201).json({ item: mediaItem })
    }

    if (req.method === 'DELETE') {
      // OWASP A03:2021 — Input validation
      const idParam = req.query.id
      if (typeof idParam !== 'string' || !idParam) {
        return res.status(400).json({ error: 'Bad Request', details: ['id is required'] })
      }

      const itemKey = `zd-cms:media:${idParam}`
      const exists = await kv.get(itemKey)
      if (!exists) return res.status(404).json({ error: 'Not Found' })

      await kv.del(itemKey)

      // Remove from index
      const index = await kv.get<string[]>(MEDIA_INDEX_KEY) ?? []
      await kv.set(MEDIA_INDEX_KEY, index.filter(i => i !== idParam))

      return res.json({ success: true })
    }

    return res.status(405).json({ error: 'Method Not Allowed' })
  } catch (err) {
    console.error('[cms/media] error:', err)
    return res.status(500).json({ error: 'Internal Server Error' })
  }
}
