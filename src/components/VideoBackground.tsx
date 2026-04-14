import { useEffect, useRef, useState, memo } from 'react'
import { shouldUseLiteMode } from '@/lib/device-capability'
import { toDirectImageUrl } from '@/lib/image-cache'
import { useLenisContext } from '@/contexts/LenisContext'

interface VideoBackgroundProps {
  /** URL of the video file (MP4/WebM). Must be a Vercel Blob URL for reliable playback. */
  videoUrl: string
  /**
   * Fallback image URL shown when:
   *   - Device is in lite mode (reduced-motion / slow connection / low-end HW)
   *   - Video fails to load or play
   *   - While the video is buffering (poster)
   */
  fallbackImageUrl?: string
  /** Overall layer opacity (0–1). Default: 1. */
  opacity?: number
  /** CSS object-fit for the video/image. Default: 'cover'. */
  fit?: 'cover' | 'contain' | 'fill' | 'none'
  /**
   * When true: video currentTime is driven by scroll position instead of autoplay.
   * Requires the video to be faststart-encoded (moov atom at start).
   * Default: false
   */
  scrollMode?: boolean
}

/**
 * VideoBackground — fixed full-screen video at `--z-bg-animated` (z=1).
 *
 * Supports two modes:
 *   - **loop** (default): `autoPlay muted loop playsInline`
 *   - **scroll**: video `currentTime` is driven by Lenis scroll position
 *     (top of page = frame 0, bottom = last frame). Requires faststart MP4.
 *
 * **Fallback chain (highest → lowest priority):**
 * 1. Lite mode detected at mount (reduced-motion / slow connection / low-end HW)
 *    → render `<img>` only, never attempt video load
 * 2. Video `onError` or `onStalled` → switch from video to `<img>`
 * 3. No fallback image provided → render nothing when video is not available
 *
 * The `poster` attribute is always set to the fallback image URL so the
 * browser renders the static image instantly while the video buffers.
 *
 * Videos must be uploaded to Vercel Blob for reliable playback and seeking support.
 */
const VideoBackground = memo(function VideoBackground({
  videoUrl,
  fallbackImageUrl,
  opacity = 1,
  fit = 'cover',
  scrollMode = false,
}: VideoBackgroundProps) {
  const [useFallback, setUseFallback] = useState<boolean>(() => shouldUseLiteMode())
  const videoRef = useRef<HTMLVideoElement>(null)

  // Always call useLenisContext (hooks must not be called conditionally).
  // scrollY is only used when scrollMode === true.
  const { scrollY } = useLenisContext()

  // ── Loop mode: attempt autoplay ──────────────────────────────────────────
  useEffect(() => {
    if (useFallback || scrollMode) return
    const video = videoRef.current
    if (!video) return

    const handleError = () => setUseFallback(true)
    video.addEventListener('error', handleError)

    // If the video stalls for >10s, fall back to image so the page doesn't look broken.
    let stallTimer: ReturnType<typeof setTimeout>
    const handleStall = () => {
      stallTimer = setTimeout(() => setUseFallback(true), 10_000)
    }
    const handleProgress = () => clearTimeout(stallTimer)

    video.addEventListener('stalled', handleStall)
    video.addEventListener('progress', handleProgress)
    video.addEventListener('playing', handleProgress)

    video.play()?.catch(() => {
      // Autoplay was blocked — show fallback image
      setUseFallback(true)
    })

    return () => {
      clearTimeout(stallTimer)
      video.removeEventListener('error', handleError)
      video.removeEventListener('stalled', handleStall)
      video.removeEventListener('progress', handleProgress)
      video.removeEventListener('playing', handleProgress)
    }
  }, [useFallback, scrollMode, videoUrl])

  // ── Scroll mode: drive currentTime from Lenis scrollY ────────────────────
  useEffect(() => {
    if (!scrollMode || useFallback) return
    const video = videoRef.current
    if (!video) return

    // Only scrub when the video is sufficiently loaded (HAVE_CURRENT_DATA)
    if (video.readyState < 2) return

    requestAnimationFrame(() => {
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight
      const progress = maxScroll > 0 ? Math.max(0, Math.min(1, scrollY / maxScroll)) : 0
      video.currentTime = progress * (video.duration || 0)
    })
  }, [scrollY, scrollMode, useFallback])

  // ── Scroll mode: error handler ───────────────────────────────────────────
  useEffect(() => {
    if (!scrollMode || useFallback) return
    const video = videoRef.current
    if (!video) return

    const handleError = () => setUseFallback(true)
    video.addEventListener('error', handleError)

    return () => {
      video.removeEventListener('error', handleError)
    }
  }, [scrollMode, useFallback])

  const sharedStyle: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    width: '100%',
    height: '100%',
    objectFit: fit,
    objectPosition: 'center',
    pointerEvents: 'none',
    opacity,
    display: 'block',
  }

  // Lite mode or fallback: render static image only
  if (useFallback) {
    if (!fallbackImageUrl) return null
    return (
      <img
        src={toDirectImageUrl(fallbackImageUrl, { output: 'webp', q: 80 })}
        alt=""
        aria-hidden="true"
        style={sharedStyle}
        loading="eager"
        fetchPriority="high"
        decoding="async"
      />
    )
  }

  const posterUrl = fallbackImageUrl
    ? toDirectImageUrl(fallbackImageUrl, { output: 'webp', q: 80 })
    : undefined

  if (scrollMode) {
    return (
      <video
        ref={videoRef}
        src={videoUrl}
        muted
        playsInline
        aria-hidden="true"
        poster={posterUrl}
        preload="auto"
        style={{
          ...sharedStyle,
          willChange: 'auto',
        }}
      />
    )
  }

  return (
    <video
      ref={videoRef}
      src={videoUrl}
      autoPlay
      muted
      loop
      playsInline
      aria-hidden="true"
      poster={posterUrl}
      style={sharedStyle}
      preload="auto"
    />
  )
})

export default VideoBackground
