/**
 * Extracts a Google Drive file ID from various URL formats.
 * Returns null if the URL is not a recognizable Google Drive link.
 */
export function extractDriveFileId(url: string): string | null {
  if (!url) return null
  try {
    // Format: https://drive.google.com/file/d/{fileId}/...
    const fileMatch = url.match(/drive\.google\.com\/file\/d\/([A-Za-z0-9_-]+)/)
    if (fileMatch) return fileMatch[1]

    // Format: https://drive.google.com/open?id={fileId}
    const openMatch = url.match(/drive\.google\.com\/open\?id=([A-Za-z0-9_-]+)/)
    if (openMatch) return openMatch[1]

    // Format: https://drive.google.com/uc?id={fileId}&export=download
    const ucMatch = url.match(/drive\.google\.com\/uc\?.*id=([A-Za-z0-9_-]+)/)
    if (ucMatch) return ucMatch[1]
  } catch {
    // Ignore parse errors
  }
  return null
}

export interface DownloadProgress {
  state: 'idle' | 'downloading' | 'complete' | 'error'
  progress: number // 0 to 1
  error?: string
}

/**
 * Download a file through the Drive API proxy with progress tracking.
 * Falls back to direct link if it's not a Google Drive URL.
 */
export async function downloadFile(
  url: string,
  fileName: string,
  onProgress: (progress: DownloadProgress) => void,
): Promise<void> {
  const fileId = extractDriveFileId(url)

  if (fileId) {
    // Use the proxy API for Google Drive files
    return downloadViaDriveProxy(fileId, fileName, onProgress)
  }

  // For non-Drive URLs, use a fetch-based download with progress
  return downloadDirect(url, fileName, onProgress)
}

async function downloadViaDriveProxy(
  fileId: string,
  fileName: string,
  onProgress: (progress: DownloadProgress) => void,
): Promise<void> {
  // The API endpoint returns a 307 redirect to drive.google.com.
  // We cannot fetch() cross-origin redirects to Google (CORS).
  // Instead, trigger the download via a hidden <a> tag pointing to our API endpoint.
  // The browser follows the redirect natively and downloads the file.
  onProgress({ state: 'downloading', progress: 0 })

  const downloadUrl = `/api/drive-download?fileId=${encodeURIComponent(fileId)}`
  const a = document.createElement('a')
  a.href = downloadUrl
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)

  // Since we cannot track native browser download progress,
  // mark as complete immediately after triggering
  onProgress({ state: 'complete', progress: 1 })
}

async function downloadDirect(
  url: string,
  fileName: string,
  onProgress: (progress: DownloadProgress) => void,
): Promise<void> {
  onProgress({ state: 'downloading', progress: 0 })

  try {
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Download failed: ${response.status}`)
    }

    const blob = await trackResponseProgress(response, onProgress)
    triggerBlobDownload(blob, fileName)
    onProgress({ state: 'complete', progress: 1 })
  } catch (err) {
    // If fetch-based download fails (e.g. CORS), fall back to window.open
    const message = err instanceof Error ? err.message : 'Download failed'
    onProgress({ state: 'error', progress: 0, error: message })
  }
}

async function trackResponseProgress(
  response: Response,
  onProgress: (progress: DownloadProgress) => void,
): Promise<Blob> {
  const contentLength = response.headers.get('Content-Length')
  const total = contentLength ? parseInt(contentLength, 10) : 0

  if (!response.body || !total) {
    // No streaming support or unknown size – just get the whole blob
    const blob = await response.blob()
    onProgress({ state: 'downloading', progress: 0.95 })
    return blob
  }

  const reader = response.body.getReader()
  const chunks: Uint8Array[] = []
  let received = 0

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(value)
    received += value.length
    onProgress({ state: 'downloading', progress: Math.min(received / total, 0.99) })
  }

  return new Blob(chunks)
}

function triggerBlobDownload(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
