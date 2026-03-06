/**
 * API route that redirects file downloads to Google Drive.
 *
 * GET /api/drive-download?fileId=<id>
 *
 * Redirects the browser to the public Google Drive download URL.
 * This works for all publicly shared files without any API key.
 * The browser follows the redirect and downloads the file directly from Google.
 */

import { applyRateLimit } from './_ratelimit.js'
import { driveDownloadQuerySchema, validate } from './_schemas.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Rate limiting (GDPR-compliant, IP is hashed)
  const allowed = await applyRateLimit(req, res)
  if (!allowed) return

  // Zod validation
  const parsed = validate(driveDownloadQuerySchema, req.query)
  if (!parsed.success) return res.status(400).json({ error: parsed.error })
  const { fileId } = parsed.data

  // Simply redirect the browser to the public Google Drive download URL.
  // This works for all publicly shared files without any API key.
  // The browser follows the redirect and downloads the file directly from Google.
  // Note: fileId is validated via regex in _schemas.js to only allow [A-Za-z0-9_-]+
  const downloadUrl = `https://drive.google.com/uc?export=download&id=${encodeURIComponent(fileId)}`
  return res.redirect(307, downloadUrl)
}
