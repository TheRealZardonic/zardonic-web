/**
 * video-url.ts — Utility for normalising video source URLs.
 *
 * Google Drive streaming has CORS limitations:
 *   - Drive does NOT support HTTP Range requests reliably, which means seeking
 *     (required for scroll-video mode) will often fail or be very slow.
 *   - Videos should ideally be self-hosted or stored in Vercel Blob for
 *     reliable playback and seeking support.
 *
 * This utility converts known Drive share-link formats to the direct download
 * URL (`uc?export=download&id=…`) so at least basic playback works. For
 * scroll-driven video, Vercel Blob upload is strongly recommended.
 */

/**
 * Converts a Google Drive share URL to a direct download URL.
 * All other URLs are returned unchanged.
 *
 * Supported Google Drive patterns:
 *   - `/file/d/{id}/view` (and `/file/d/{id}/edit`, `/file/d/{id}/preview`)
 *   - `open?id={id}`
 *   - `uc?...id={id}` (already a direct URL but may be `export=view`)
 */
export function toDirectVideoUrl(url: string): string {
  if (!url) return url

  // Google Drive: /file/d/{fileId}/… → direct download URL
  const driveFileMatch = url.match(/drive\.google\.com\/file\/d\/([^/?#]+)/)
  if (driveFileMatch) {
    return `https://drive.google.com/uc?export=download&id=${driveFileMatch[1]}`
  }

  // Google Drive: open?id={fileId}
  const driveOpenMatch = url.match(/drive\.google\.com\/open\?id=([^&#]+)/)
  if (driveOpenMatch) {
    return `https://drive.google.com/uc?export=download&id=${driveOpenMatch[1]}`
  }

  // Google Drive: uc?export=view&id={fileId} or uc?id={fileId}&…
  const driveUcMatch = url.match(/drive\.google\.com\/uc\?[^#]*?id=([^&#]+)/)
  if (driveUcMatch) {
    return `https://drive.google.com/uc?export=download&id=${driveUcMatch[1]}`
  }

  return url
}
