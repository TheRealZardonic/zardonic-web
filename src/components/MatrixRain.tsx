import { useEffect, useRef, memo } from 'react'

/**
 * MatrixRain – Canvas-based cascading character rain inspired by the Matrix.
 * Renders on a transparent canvas so the site background colour shows through.
 * Respects `prefers-reduced-motion` and pauses when the tab is hidden.
 */
const MatrixRain = memo(function MatrixRain() {
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

    const primaryColor = getComputedStyle(document.documentElement)
      .getPropertyValue('--primary')
      .trim() || 'oklch(0.50 0.22 25)'

    let frameCount = 0
    const draw = () => {
      frameCount++
      // Only draw every other frame for performance
      if (frameCount % 2 !== 0) {
        animId = requestAnimationFrame(draw)
        return
      }

      ctx.fillStyle = 'rgba(0, 0, 0, 0.05)'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      ctx.font = `${fontSize}px monospace`

      drops.forEach((y, i) => {
        const char = chars[Math.floor(Math.random() * chars.length)]
        const x = i * fontSize

        // Brightest (leading) character
        ctx.fillStyle = `color-mix(in srgb, ${primaryColor} 90%, white)`
        ctx.fillText(char, x, y * fontSize)

        // Trail characters in primary colour, slightly dimmer
        if (Math.random() > 0.975) {
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
      window.removeEventListener('resize', handleResize)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-0 pointer-events-none opacity-20"
      aria-hidden="true"
    />
  )
})

export default MatrixRain
