import type { VercelRequest, VercelResponse } from '@vercel/node'
import { Readable } from 'node:stream'
import { applyRateLimit } from './_ratelimit.js'
import { driveDownloadQuerySchema, validate } from './_schemas.js'
/**
 * API route that proxies file downloads from Google Drive.
 *
 * GET /api/drive-download?fileId=<id>
 *
 * Fetches the file from Google Drive server-side and streams it back to the
 * client.  This avoids 307 redirects (which break fetch-based progress
 * tracking) and keeps CORS simple because the browser only talks to our own
 * origin.
 *
 * Works for all publicly shared files without any API key.
 */

const MIME_TO_EXT: Record<string, string> = {
  'application/pdf': '.pdf',
  'application/zip': '.zip',
  'application/x-zip-compressed': '.zip',
  'application/x-rar-compressed': '.rar',
  'application/x-7z-compressed': '.7z',
  'application/x-tar': '.tar',
  'application/gzip': '.gz',
  'application/json': '.json',
  'application/xml': '.xml',
  'application/msword': '.doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
  'application/vnd.ms-excel': '.xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
  'application/vnd.ms-powerpoint': '.ppt',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': '.pptx',
  'text/plain': '.txt',
  'text/html': '.html',
  'text/css': '.css',
  'text/csv': '.csv',
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/gif': '.gif',
  'image/webp': '.webp',
  'image/svg+xml': '.svg',
  'audio/mpeg': '.mp3',
  'audio/wav': '.wav',
  'audio/ogg': '.ogg',
  'audio/flac': '.flac',
  'audio/aac': '.aac',
  'video/mp4': '.mp4',
  'video/webm': '.webm',
  'video/ogg': '.ogv',
  'video/quicktime': '.mov',
}

function extensionFromContentType(contentType: string | null): string {
  if (!contentType) return ''
  const base = contentType.split(';')[0].trim().toLowerCase()
  return MIME_TO_EXT[base] || ''
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  // Rate limiting (GDPR-compliant, IP is hashed)
  const allowed = await applyRateLimit(req, res)
  if (!allowed) return

  // Zod validation
  const parsed = validate(driveDownloadQuerySchema, req.query)
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error })
    return
  }
  const { fileId } = parsed.data

  // Fetch the file from Google Drive, following any redirects automatically.
  // Note: fileId is validated via regex in _schemas.js to only allow [A-Za-z0-9_-]+
  const downloadUrl = `https://drive.google.com/uc?export=download&id=${encodeURIComponent(fileId)}`

  let driveRes: Response
  try {
    driveRes = await fetch(downloadUrl, { redirect: 'follow' })
  } catch (err) {
    console.error('Failed to fetch from Google Drive:', err)
    res.status(502).json({ error: 'Failed to fetch file from Google Drive' })
    return
  }

  if (!driveRes.ok) {
    res.status(502).json({ error: `Google Drive returned ${driveRes.status}` })
    return
  }

  // Forward relevant headers so the client can track progress and trigger a
  // proper file-save dialog.
  const contentType = driveRes.headers.get('content-type')
  const contentLength = driveRes.headers.get('content-length')
  const contentDisposition = driveRes.headers.get('content-disposition')

  if (contentType) res.setHeader('Content-Type', contentType)
  if (contentLength) res.setHeader('Content-Length', contentLength)
  if (contentDisposition) {
    res.setHeader('Content-Disposition', contentDisposition)
  } else {
    // fileId is already validated to [A-Za-z0-9_-]+ by Zod; replace any
    // remaining quote characters as defense-in-depth.
    const safeId = fileId.replace(/"/g, '')
    // Derive extension from Content-Type so the fallback filename isn't bare.
    const ext = extensionFromContentType(contentType)
    res.setHeader('Content-Disposition', `attachment; filename="${safeId}${ext}"`)
  }

  // Stream the body to the client.
  if (driveRes.body) {
    const nodeStream = Readable.fromWeb(driveRes.body as import('stream/web').ReadableStream)
    nodeStream.on('data', (chunk: Buffer) => { res.write(chunk) })
    nodeStream.on('end', () => { res.end() })
    nodeStream.on('error', () => { res.status(502).end() })
  } else {
    // Fallback: buffer the entire response (unlikely path).
    const buffer = Buffer.from(await driveRes.arrayBuffer())
    res.end(buffer)
  }
}
