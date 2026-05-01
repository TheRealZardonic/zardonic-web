import { useEffect, useRef, useState, memo } from 'react'
import { shouldUseLiteMode } from '@/lib/device-capability'
import { toDirectImageUrl } from '@/lib/image-cache'
import { useLenisContext } from '@/contexts/LenisContext'
import { useIsMobile } from '@/hooks/use-mobile'

interface VideoBackgroundProps {
  /** URL of the video file (MP4/WebM). Must be a Vercel Blob URL for reliable playback. */
  videoUrl: string
  /** Optional separate video URL for mobile viewports (< 768px). Falls back to videoUrl if not set. */
  mobileVideoUrl?: string
  /**
   * Fallback image URL shown when:
   *   - Device is in lite mode (reduced-motion / slow connection / low-end HW)
   *   - Video fails to load or play
   */
  fallbackImageUrl?: string
  /** Overall layer opacity applied to the video element only (0–1). Default: 1. */
  opacity?: number
  /** CSS object-fit for the video/image. Default: 'cover'. */
  fit?: 'cover' | 'contain' | 'fill' | 'none'
  /**
   * When true: video currentTime is driven by scroll position instead of autoplay.
   * Requires the video to be faststart-encoded. The component waits for `loadeddata`
   * before the first scrub, so the correct frame is shown even if the video is still
   * loading when the first scroll event fires.
   * Default: false
   */
  scrollMode?: boolean
}

const wrapperStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 'var(--z-bg-video)' as React.CSSProperties['zIndex'],
  pointerEvents: 'none',
}

const sharedMediaStyle: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  width: '100%',
  height: '100%',
  objectPosition: 'center',
  display: 'block',
}

/**
 * VideoBackground — fixed full-screen video at `--z-bg-video` (z=1).
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
 * The fallback image is **only** rendered when video is not possible (lite mode,
 * error, or autoplay blocked). When the video is playing, the fallback image is
 * never rendered — reducing video opacity does not reveal a background image.
 *
 * Videos must be uploaded to Vercel Blob for reliable playback and seeking support.
 */
const VideoBackground = memo(function VideoBackground({
  videoUrl,
  mobileVideoUrl,
  fallbackImageUrl,
  opacity = 1,
  fit = 'cover',
  scrollMode = false,
}: VideoBackgroundProps) {
  const [useFallback, setUseFallback] = useState<boolean>(() => shouldUseLiteMode())
  const videoRef = useRef<HTMLVideoElement>(null)

  // Always call hooks unconditionally.
  // scrollY is only used when scrollMode === true.
  const { scrollY } = useLenisContext()
  const isMobile = useIsMobile()

  // Select desktop or mobile video URL based on viewport width
  const activeVideoUrl = (isMobile && mobileVideoUrl) ? mobileVideoUrl : videoUrl

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
  }, [useFallback, scrollMode, activeVideoUrl])

  // ── Scroll mode: drive currentTime from Lenis scrollY ────────────────────
  useEffect(() => {
    if (!scrollMode || useFallback) return
    const video = videoRef.current
    if (!video) return

    const scrub = () => {
      requestAnimationFrame(() => {
        const maxScroll = document.documentElement.scrollHeight - window.innerHeight
        const progress = maxScroll > 0 ? Math.max(0, Math.min(1, scrollY / maxScroll)) : 0
        video.currentTime = progress * (video.duration || 0)
      })
    }

    // Video noch nicht bereit: warten und danach einmalig scrubben
    if (video.readyState < 2) {
      video.addEventListener('loadeddata', scrub, { once: true })
      return () => video.removeEventListener('loadeddata', scrub)
    }

    scrub()
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

  const fallbackImgNode = fallbackImageUrl ? (
    <img
      src={toDirectImageUrl(fallbackImageUrl, { output: 'webp', q: 80 })}
      alt=""
      aria-hidden="true"
      style={{ ...sharedMediaStyle, objectFit: fit, opacity: 1 }}
      loading="eager"
      fetchPriority="high"
      decoding="async"
    />
  ) : null

  // Lite mode or video error fallback: render wrapper with static image only
  if (useFallback) {
    if (!fallbackImageUrl) return null
    return (
      <div aria-hidden="true" style={wrapperStyle}>
        {fallbackImgNode}
      </div>
    )
  }

  if (scrollMode) {
    return (
      <div aria-hidden="true" style={wrapperStyle}>
        <video
          ref={videoRef}
          src={activeVideoUrl}
          muted
          playsInline
          aria-hidden="true"
          preload="auto"
          style={{
            ...sharedMediaStyle,
            objectFit: fit,
            opacity,
            willChange: 'auto',
          }}
        />
      </div>
    )
  }

  return (
    <div aria-hidden="true" style={wrapperStyle}>
      <video
        ref={videoRef}
        src={activeVideoUrl}
        autoPlay
        muted
        loop
        playsInline
        aria-hidden="true"
        preload="auto"
        style={{
          ...sharedMediaStyle,
          objectFit: fit,
          opacity,
          willChange: 'transform',
          transform: 'translateZ(0)',
        }}
      />
    </div>
  )
})

export default VideoBackground
