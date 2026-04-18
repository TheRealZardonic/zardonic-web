import { Suspense } from 'react'
import { m, useScroll, useTransform } from 'framer-motion'
import VideoBackground from '@/components/VideoBackground'
import type { BackgroundType, HudTexts, AnimationSettings } from '@/lib/types'
import React from 'react'
import { toDirectImageUrl } from '@/lib/image-cache'

const CircuitBackground = React.lazy(() =>
  import('@/components/CircuitBackground').then(m => ({ default: m.CircuitBackground }))
)
const CyberpunkBackground = React.lazy(() => import('@/components/CyberpunkBackground'))
const MatrixRain = React.lazy(() => import('@/components/MatrixRain'))
const StarField = React.lazy(() => import('@/components/StarField'))
const CloudChamberBackground = React.lazy(() => import('@/components/CloudChamberBackground'))
const GlitchGridBackground = React.lazy(() => import('@/components/GlitchGridBackground'))

/** Fixed (non-scrolling) background image. Depth layer --z-bg-image. */
function FixedBackgroundImage({ url, fit, opacity }: {
  url: string
  fit?: 'cover' | 'contain' | 'fill' | 'none'
  opacity: number
}) {
  return (
    <div
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 'var(--z-bg-image)' as React.CSSProperties['zIndex'], opacity }}
      aria-hidden="true"
    >
      <img
        src={toDirectImageUrl(url)}
        alt=""
        className="w-full h-full"
        style={{ objectFit: fit ?? 'cover', objectPosition: 'center', display: 'block' }}
        loading="eager"
        fetchPriority="high"
        decoding="async"
      />
    </div>
  )
}

/** Parallax background image — moves upward as scroll progresses so it
 *  always covers the viewport. Depth layer --z-bg-image. */
function ParallaxBackgroundImage({ url, fit, opacity }: {
  url: string
  fit?: 'cover' | 'contain' | 'fill' | 'none'
  opacity: number
}) {
  const { scrollYProgress } = useScroll()
  const y = useTransform(scrollYProgress, [0, 1], ['0%', '-15%'])
  return (
    <div
      className="fixed inset-0 overflow-hidden pointer-events-none"
      style={{ zIndex: 'var(--z-bg-image)' as React.CSSProperties['zIndex'], opacity }}
      aria-hidden="true"
    >
      <m.div
        style={{ y, willChange: 'transform', position: 'absolute', top: '-15%', left: 0, right: 0, bottom: '-15%' }}
      >
        <img
          src={toDirectImageUrl(url)}
          alt=""
          className="w-full h-full"
          style={{ objectFit: fit ?? 'cover', objectPosition: 'center', display: 'block' }}
          loading="eager"
          fetchPriority="high"
          decoding="async"
        />
      </m.div>
    </div>
  )
}

/** Renders the background image in either fixed or parallax mode. */
function BackgroundImage({ url, fit, opacity, parallax }: {
  url: string
  fit?: 'cover' | 'contain' | 'fill' | 'none'
  opacity: number
  parallax: boolean
}) {
  if (parallax) {
    return <ParallaxBackgroundImage url={url} fit={fit} opacity={opacity} />
  }
  return <FixedBackgroundImage url={url} fit={fit} opacity={opacity} />
}

/** Renders the correct animated background component for the configured type. */
function AnimatedBackgroundLayer({ type, hudTexts, transparent, animSettings }: {
  type: BackgroundType | undefined
  hudTexts?: HudTexts
  transparent?: boolean
  animSettings?: AnimationSettings
}) {
  const bg = type ?? 'circuit'
  if (bg === 'circuit') return <Suspense fallback={null}><CircuitBackground speed={animSettings?.circuitSpeed} glow={animSettings?.circuitGlow} /></Suspense>
  if (bg === 'cyberpunk-hud') return <Suspense fallback={null}><CyberpunkBackground hudTexts={hudTexts} /></Suspense>
  if (bg === 'matrix') return <Suspense fallback={null}><MatrixRain transparent={transparent} speed={animSettings?.matrixSpeed} density={animSettings?.matrixDensity} color={animSettings?.matrixColor} /></Suspense>
  if (bg === 'stars') return <Suspense fallback={null}><StarField transparent={transparent} starCount={animSettings?.starCount} starSpeed={animSettings?.starSpeed} /></Suspense>
  if (bg === 'cloud-chamber') return <Suspense fallback={null}><CloudChamberBackground glowColor={animSettings?.cloudGlowColor} /></Suspense>
  if (bg === 'glitch-grid') return <Suspense fallback={null}><GlitchGridBackground transparent={transparent} gridSize={animSettings?.glitchGridSize} scanSpeed={animSettings?.glitchScanSpeed} glitchFrequency={animSettings?.glitchFrequency} /></Suspense>
  // 'minimal' or 'video' handled at BackgroundStack level — no fallback here
  return null
}

interface BackgroundStackProps {
  backgroundImageUrl?: string
  backgroundImageFit?: 'cover' | 'contain' | 'fill' | 'none'
  backgroundImageOpacity?: number
  backgroundImageParallax?: boolean
  backgroundImageOverlay?: boolean
  backgroundType?: BackgroundType
  /** Controls all animated backgrounds (matrix, stars, circuit, video, etc.).
   * Mapped from AnimationSettings.circuitBackgroundEnabled which is kept for backwards compatibility with stored settings. */
  animatedBackgroundEnabled?: boolean
  hudTexts?: HudTexts
  animSettings?: AnimationSettings
}

/**
 * BackgroundStack — consolidates all background layers behind page content.
 *
 * Rendering order (bottom to top):
 *   1. Background image (--z-bg-image = 0)     — parallax-optional static photo
 *   2. Video background (--z-bg-video = 1)      — full-screen video with fallback image embedded
 *   3. Animated overlay (--z-bg-animated = 2)   — MatrixRain, CircuitBg, etc. or video overlay effect
 *
 * All elements are `position: fixed; pointer-events: none`.
 */
export function BackgroundStack({
  backgroundImageUrl,
  backgroundImageFit,
  backgroundImageOpacity = 1,
  backgroundImageParallax = false,
  backgroundImageOverlay = false,
  backgroundType,
  animatedBackgroundEnabled = true,
  hudTexts,
  animSettings,
}: BackgroundStackProps) {
  return (
    <>
      {/* Layer 0 (--z-bg-image): Static background image — always render when set */}
      {backgroundImageUrl && (
        <BackgroundImage
          url={backgroundImageUrl}
          fit={backgroundImageFit}
          opacity={backgroundImageOpacity}
          parallax={backgroundImageParallax}
        />
      )}

      {/* Layer 1 (--z-bg-video): Video — independent of background image, has its own z-index.
          VideoBackground manages its own zIndex via --z-bg-video internally. */}
      {animatedBackgroundEnabled && backgroundType === 'video' && animSettings?.backgroundVideoUrl && (
        <VideoBackground
          videoUrl={animSettings.backgroundVideoUrl}
          mobileVideoUrl={animSettings.backgroundVideoMobileUrl}
          fallbackImageUrl={animSettings.backgroundImageUrl}
          opacity={animSettings.backgroundVideoOpacity ?? 1}
          scrollMode={animSettings.backgroundVideoMode === 'scroll'}
          fit={animSettings.backgroundImageFit}
        />
      )}

      {/* Layer 2 (--z-bg-animated): Animated effect.
          Case A: No video active — render effect as sole animated layer */}
      {animatedBackgroundEnabled && backgroundType !== 'video' && backgroundType !== 'minimal' && (
        <div
          className="fixed inset-0 pointer-events-none"
          style={{ zIndex: 'var(--z-bg-animated)' as React.CSSProperties['zIndex'] }}
        >
          <AnimatedBackgroundLayer
            type={backgroundType}
            hudTexts={hudTexts}
            transparent={Boolean(backgroundImageUrl && backgroundImageOverlay)}
            animSettings={animSettings}
          />
        </div>
      )}

      {/* Layer 2 (--z-bg-animated): Animated effect.
          Case B: Video active AND an overlay effect selected — render effect above the video */}
      {animatedBackgroundEnabled &&
        backgroundType === 'video' &&
        animSettings?.backgroundVideoOverlayEffect &&
        animSettings.backgroundVideoOverlayEffect !== 'none' && (
        <div
          className="fixed inset-0 pointer-events-none"
          style={{ zIndex: 'var(--z-bg-animated)' as React.CSSProperties['zIndex'] }}
        >
          <AnimatedBackgroundLayer
            type={animSettings.backgroundVideoOverlayEffect as BackgroundType}
            hudTexts={hudTexts}
            transparent={true}
            animSettings={animSettings}
          />
        </div>
      )}
    </>
  )
}
