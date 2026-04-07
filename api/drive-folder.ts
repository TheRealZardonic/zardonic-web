import type { VercelRequest, VercelResponse } from '@vercel/node'
import { applyRateLimit } from './_ratelimit.js'
import { driveFolderQuerySchema, validate } from './_schemas.js'
/**
 * API route that lists image files from a public Google Drive folder.
 *
 * GET /api/drive-folder?folderId=<id>
 *
 * Uses the Google Drive API v3 to list non-folder, non-trashed files in a
 * public folder.  Each file is returned as a GalleryImage-compatible object
 * with a proxied URL so that CORS is not an issue and caching works.
 */
export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  // Rate limiting (GDPR-compliant, IP is hashed)
  const allowed = await applyRateLimit(req, res)
  if (!allowed) return

  // Zod validation
  const parsed = validate(driveFolderQuerySchema, req.query)
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error })
    return
  }
  const { folderId } = parsed.data

  try {
    const apiKey = process.env.GOOGLE_DRIVE_API_KEY
    if (!apiKey) {
      res.status(500).json({ error: 'Drive API key is not configured' })
      return
    }

    const q = `'${folderId}' in parents and mimeType != 'application/vnd.google-apps.folder' and trashed = false`
    const params = new URLSearchParams({
      q,
      fields: 'files(id, name, mimeType)',
      key: apiKey,
    })

    const response = await fetch(`https://www.googleapis.com/drive/v3/files?${params}`)

    if (!response.ok) {
      res.status(502).json({ error: `Drive API returned ${response.status}` })
      return
    }

    const data = await response.json() as { files?: Array<{ id: string; name: string; mimeType: string }> }
    const files = data.files || []

    const images = files.map((file) => {
      const driveImageUrl = `https://lh3.googleusercontent.com/d/${file.id}`
      const resizeUrl = `https://wsrv.nl/?url=${encodeURIComponent(driveImageUrl)}&w=800&q=80`
      return {
        id: `drive-${file.id}`,
        url: `/api/image-proxy?url=${encodeURIComponent(resizeUrl)}`,
        caption: file.name.replace(/\.[^.]+$/, ''),
      }
    })

    res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=600')
    res.json({ images })
  } catch (error) {
    console.error('Drive folder listing error:', error)
    res.status(502).json({ error: 'Failed to list Drive folder' })
  }
}
