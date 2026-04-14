import { Suspense } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'
import { CircuitBackground } from '@/components/CircuitBackground'
import CyberpunkBackground from '@/components/CyberpunkBackground'
import VideoBackground from '@/components/VideoBackground'
import type { BackgroundType, HudTexts, AnimationSettings } from '@/lib/types'
import React from 'react'
import { toDirectImageUrl } from '@/lib/image-cache'

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
      <motion.div
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
      </motion.div>
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
  if (bg === 'circuit') return <CircuitBackground speed={animSettings?.circuitSpeed} glow={animSettings?.circuitGlow} />
  if (bg === 'cyberpunk-hud') return <CyberpunkBackground hudTexts={hudTexts} />
  if (bg === 'matrix') return <Suspense fallback={null}><MatrixRain transparent={transparent} speed={animSettings?.matrixSpeed} density={animSettings?.matrixDensity} color={animSettings?.matrixColor} /></Suspense>
  if (bg === 'stars') return <Suspense fallback={null}><StarField transparent={transparent} starCount={animSettings?.starCount} starSpeed={animSettings?.starSpeed} /></Suspense>
  if (bg === 'cloud-chamber') return <Suspense fallback={null}><CloudChamberBackground glowColor={animSettings?.cloudGlowColor} /></Suspense>
  if (bg === 'glitch-grid') return <Suspense fallback={null}><GlitchGridBackground transparent={transparent} gridSize={animSettings?.glitchGridSize} scanSpeed={animSettings?.glitchScanSpeed} glitchFrequency={animSettings?.glitchFrequency} /></Suspense>
  if (bg === 'video') {
    if (!animSettings?.backgroundVideoUrl) return null
    return (
      <VideoBackground
        videoUrl={animSettings.backgroundVideoUrl}
        fallbackImageUrl={animSettings.backgroundVideoFallbackImageUrl ?? animSettings.backgroundImageUrl}
        opacity={animSettings.backgroundVideoOpacity ?? 1}
        scrollMode={animSettings.backgroundVideoMode === 'scroll'}
      />
    )
  }
  // 'minimal' – no decorative background
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
 *   1. Background image (--z-bg-image = 0)  — parallax-optional static photo
 *   2. Animated overlay (--z-bg-animated = 1) — MatrixRain, CircuitBg, VideoBackground, etc.
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
      {/* Depth layer --z-bg-image — background image (deepest). */}
      {backgroundImageUrl && (
        <BackgroundImage
          url={backgroundImageUrl}
          fit={backgroundImageFit}
          opacity={backgroundImageOpacity}
          parallax={backgroundImageParallax}
        />
      )}
      {/* Depth layer --z-bg-animated — animated overlay (above image, below content).
          All animated background types (including VideoBackground) render inside this
          wrapper so z-index is managed in one place. */}
      {animatedBackgroundEnabled && (!backgroundImageUrl || backgroundImageOverlay) && (
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
    </>
  )
}
