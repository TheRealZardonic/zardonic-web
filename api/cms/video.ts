import type { VercelRequest, VercelResponse } from '@vercel/node'
import { put } from '@vercel/blob'
import { applyRateLimit } from '../_ratelimit.js'
import { validateSession } from '../auth.js'

const MAX_BODY_SIZE = 200 * 1024 * 1024 // 200 MB

const ALLOWED_MIME_TYPES = new Set(['video/mp4', 'video/webm'])

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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // OWASP A07:2021 — Authentication check
  const authenticated = await validateSession(req)
  if (!authenticated) return res.status(401).json({ error: 'Unauthorized' })

  // OWASP A07:2021 — Rate limiting
  const allowed = await applyRateLimit(req, res)
  if (!allowed) return

  // Check that Vercel Blob storage is configured
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return res.status(503).json({
      error: 'Service Unavailable',
      details: ['BLOB_READ_WRITE_TOKEN environment variable is not set. Please configure Vercel Blob storage.'],
    })
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  try {
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
      return res.status(400).json({ error: 'Bad Request', details: ['Only video/mp4 and video/webm are allowed'] })
    }

    // Rough body-size guard (base64 is ~33% larger than binary)
    const approxSize = dataUrl.length * 0.75
    if (approxSize > MAX_BODY_SIZE) {
      return res.status(413).json({ error: 'Payload Too Large', details: ['Maximum video size is 200 MB'] })
    }

    // Decode base64 data URL to buffer
    const commaIdx = dataUrl.indexOf(',')
    if (commaIdx === -1) {
      return res.status(400).json({ error: 'Bad Request', details: ['Invalid dataUrl format'] })
    }
    const base64 = dataUrl.slice(commaIdx + 1)
    const buffer = Buffer.from(base64, 'base64')

    // Sanitise filename — keep only safe characters
    const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 255)
    const uniqueName = `videos/${Date.now()}-${safeName}`

    // Upload to Vercel Blob
    const blob = await put(uniqueName, buffer, {
      access: 'public',
      contentType: mimeType,
    })

    return res.status(201).json({
      url: blob.url,
      fileName: safeName,
      mimeType,
      size: buffer.byteLength,
    })
  } catch (err) {
    console.error('[cms/video] error:', err)
    return res.status(500).json({ error: 'Internal Server Error' })
  }
}
