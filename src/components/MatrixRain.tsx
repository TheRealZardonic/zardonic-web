import React, { useEffect, useRef, memo } from 'react'

/**
 * MatrixRain – Canvas-based cascading character rain inspired by the Matrix.
 * Renders on a transparent canvas so the site background colour shows through.
 * Respects `prefers-reduced-motion` and pauses when the tab is hidden.
 */
interface MatrixRainProps {
  transparent?: boolean
  /** Speed multiplier: 0.5 (slow) – 3 (fast). Default 1. */
  speed?: number
  /** Character spawn density: 0.3 (sparse) – 1 (dense). Default 0.7. */
  density?: number
  /** Override colour (CSS colour string). Defaults to --primary CSS variable. */
  color?: string
}

const MatrixRain = memo(function MatrixRain({ transparent, speed = 1, density = 0.7, color }: MatrixRainProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReduced) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const chars = 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン0123456789ABCDEF'
    const fontSize = 14
    let animId: number
    let drops: number[] = []

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
      const cols = Math.floor(canvas.width / fontSize)
      drops = Array.from({ length: cols }, () => Math.random() * -50)
    }

    resize()
    const handleResize = () => resize()
    window.addEventListener('resize', handleResize)

    // Resolve color once (outside the animation loop) and cache it.
    // Re-reading getComputedStyle on every rAF frame forces a synchronous
    // layout recalculation — expensive and unnecessary since the CSS variable
    // changes only when the admin saves new theme settings.
    const getColor = () => color ?? (getComputedStyle(document.documentElement).getPropertyValue('--primary').trim() || '#cc3300')
    let cachedColor = getColor()

    const resolveColor = (): string => cachedColor

    // Refresh the cached color whenever the --primary theme CSS variable changes.
    // MutationObserver on <html> style attribute detects setProperty() calls
    // from useAppTheme without polling. We check whether --primary actually
    // changed to avoid redundant work on unrelated style mutations.
    const observer = new MutationObserver(() => {
      const newColor = getColor()
      if (newColor !== cachedColor) {
        cachedColor = newColor
      }
    })
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['style'] })

    const applyColor = (ctx2d: CanvasRenderingContext2D, base: string, baseColorRatio = 0.9) => {
      const supportsColorMix = typeof CSS !== 'undefined' &&
        CSS.supports('color', 'color-mix(in srgb, red 50%, blue)')
      if (supportsColorMix) {
        ctx2d.fillStyle = `color-mix(in srgb, ${base} ${Math.round(baseColorRatio * 100)}%, white)`
      } else {
        ctx2d.fillStyle = base
      }
    }

    // Speed controls how often a drop advances: higher speed = advance more often
    // We use a fractional frame accumulator so sub-1 speed works correctly.
    let frameCount = 0
    // Threshold for skipping: speed=1 → every 2nd frame, speed=2 → every frame
    const frameSkip = Math.max(1, Math.round(2 / speed))

    const draw = () => {
      frameCount++
      if (frameCount % frameSkip !== 0) {
        animId = requestAnimationFrame(draw)
        return
      }

      // Fade previous frame
      if (transparent) {
        ctx.clearRect(0, 0, canvas.width, canvas.height)
      } else {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.05)'
        ctx.fillRect(0, 0, canvas.width, canvas.height)
      }

      const primaryColor = resolveColor()
      ctx.font = `${fontSize}px monospace`

      drops.forEach((y, i) => {
        const char = chars[Math.floor(Math.random() * chars.length)]
        const x = i * fontSize

        applyColor(ctx, primaryColor, 0.9)
        ctx.fillText(char, x, y * fontSize)

        // Density controls reset probability: higher density = less frequent resets
        const resetThreshold = 1 - (density * 0.025)
        if (Math.random() > resetThreshold) {
          drops[i] = 0
        } else {
          drops[i] += 1
        }
      })
    }

    let running = true
    const loop = () => {
      if (running && !document.hidden) draw()
      animId = requestAnimationFrame(loop)
    }

    const handleVisibility = () => {
      running = !document.hidden
    }
    document.addEventListener('visibilitychange', handleVisibility)

    animId = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(animId)
      observer.disconnect()
      window.removeEventListener('resize', handleResize)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [transparent, speed, density, color])

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none opacity-20"
      style={{ zIndex: 'var(--z-bg-animated)' } as React.CSSProperties}
      aria-hidden="true"
    />
  )
})

export default MatrixRain
