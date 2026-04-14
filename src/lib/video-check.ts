/**
 * video-check.ts — Client-side heuristic check for scroll-video optimisation.
 *
 * A video must have its `moov` atom at the beginning of the file (MP4 faststart)
 * to support reliable seeking. This utility attempts a quick seek to the
 * midpoint of the video and reports whether it succeeds within a timeout.
 */

export interface VideoOptimizationResult {
  isOptimized: boolean
  warnings: string[]
  recommendations: string[]
}

const SEEK_TIMEOUT_MS = 2000

/**
 * Checks whether a video element is suitable for scroll-driven playback.
 *
 * Performs a client-side heuristic check:
 *   1. Verifies the video has seekable ranges after `canplay`
 *   2. Attempts to seek to 50 % of duration and waits up to 2 s for
 *      `readyState >= 2` (HAVE_CURRENT_DATA) to confirm the seek succeeded
 *
 * NOTE: The video element must already have `src` set and `preload="auto"` or
 * `preload="metadata"` before calling this function.
 */
export async function checkVideoScrollOptimization(
  videoElement: HTMLVideoElement,
): Promise<VideoOptimizationResult> {
  const warnings: string[] = []
  const recommendations: string[] = []

  // Wait for the video to be ready enough to inspect metadata
  await new Promise<void>((resolve) => {
    if (videoElement.readyState >= 1) {
      resolve()
      return
    }
    const onMeta = () => {
      videoElement.removeEventListener('loadedmetadata', onMeta)
      videoElement.removeEventListener('error', onMeta)
      resolve()
    }
    videoElement.addEventListener('loadedmetadata', onMeta)
    videoElement.addEventListener('error', onMeta)
  })

  // Check format (warn if neither MP4 nor WebM)
  const src = videoElement.currentSrc || videoElement.src || ''
  const lowerSrc = src.toLowerCase().split('?')[0]
  if (src && !lowerSrc.endsWith('.mp4') && !lowerSrc.endsWith('.webm') && !lowerSrc.includes('video/mp4') && !lowerSrc.includes('video/webm')) {
    warnings.push('Das Video-Format könnte nicht für alle Browser kompatibel sein. MP4 (H.264) oder WebM (VP9) werden empfohlen.')
  }

  // Check seekable ranges
  if (!videoElement.seekable || videoElement.seekable.length === 0) {
    warnings.push('Das Video hat keine seekable Ranges — Scrubbing ist nicht möglich.')
    recommendations.push('Stelle sicher, dass der Server HTTP Range Requests unterstützt (Accept-Ranges: bytes).')
    return { isOptimized: false, warnings, recommendations }
  }

  const duration = videoElement.duration
  if (!duration || !isFinite(duration)) {
    warnings.push('Die Video-Dauer konnte nicht ermittelt werden. Das Video ist möglicherweise nicht korrekt geladen.')
    return { isOptimized: false, warnings, recommendations }
  }

  // Try seeking to 50 % of the video
  const targetTime = duration * 0.5
  videoElement.currentTime = targetTime

  const seekSucceeded = await new Promise<boolean>((resolve) => {
    const timeout = setTimeout(() => resolve(false), SEEK_TIMEOUT_MS)

    const onSeeked = () => {
      clearTimeout(timeout)
      videoElement.removeEventListener('seeked', onSeeked)
      videoElement.removeEventListener('error', onError)
      resolve(videoElement.readyState >= 2)
    }
    const onError = () => {
      clearTimeout(timeout)
      videoElement.removeEventListener('seeked', onSeeked)
      videoElement.removeEventListener('error', onError)
      resolve(false)
    }

    videoElement.addEventListener('seeked', onSeeked)
    videoElement.addEventListener('error', onError)
  })

  if (!seekSucceeded) {
    warnings.push(
      'Das Video ist möglicherweise nicht für Seeking optimiert. Das moov-Atom liegt möglicherweise am Ende der Datei.',
    )
    recommendations.push(
      'Optimiere das Video mit: ffmpeg -i input.mp4 -movflags +faststart -c copy output.mp4',
    )
    return { isOptimized: false, warnings, recommendations }
  }

  return { isOptimized: true, warnings, recommendations }
}
