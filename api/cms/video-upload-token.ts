import type { VercelRequest, VercelResponse } from '@vercel/node'
import { handleUpload } from '@vercel/blob/client'
import { applyRateLimit } from '../_ratelimit.js'
import { validateSession } from '../auth.js'

const MAX_VIDEO_SIZE = 500 * 1024 * 1024 // 500 MB
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm']

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

  try {
    const jsonResponse = await handleUpload({
      request: req,
      body: req.body,
      onBeforeGenerateToken: async (_pathname) => {
        // pathname is the client-provided destination path; we ignore it here because
        // the client already sets it to `videos/<timestamp>-<safeName>` and
        // addRandomSuffix:true guarantees uniqueness on the Vercel Blob side.
        return {
          allowedContentTypes: ALLOWED_VIDEO_TYPES,
          maximumSizeInBytes: MAX_VIDEO_SIZE,
          addRandomSuffix: true,
        }
      },
      onUploadCompleted: async ({ blob }) => {
        // Nothing to do here — the client receives the blob URL directly
        console.log('[cms/video-upload-token] upload completed:', blob.url)
      },
    })
    return res.json(jsonResponse)
  } catch (err) {
    console.error('[cms/video-upload-token] error:', err)
    return res.status(500).json({ error: 'Internal Server Error' })
  }
}
