import { useEffect, useRef } from 'react'

interface SafeTextProps {
  text: string
  className?: string
  fontSize?: number
}

/**
 * SafeText — renders sensitive text (emails, phone numbers) via Canvas.
 *
 * Text rendered to a <canvas> element is invisible to DOM scrapers and
 * most automated harvesting bots, while remaining fully visible to users.
 *
 * Falls back to a <span> if Canvas is not supported.
 */
export default function SafeText({ text, className = '', fontSize = 14 }: SafeTextProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Resolve current computed styles for font and color so the canvas
    // text inherits the page theme rather than using hard-coded values.
    const computed = window.getComputedStyle(canvas)
    const color = computed.color || '#ffffff'
    const fontFamily = computed.fontFamily || 'monospace'

    const font = `${fontSize}px ${fontFamily}`
    ctx.font = font
    const metrics = ctx.measureText(text)
    const width = Math.ceil(metrics.width) + 4
    const height = Math.ceil(fontSize * 1.5)

    // Set canvas dimensions — this also clears the canvas
    const dpr = window.devicePixelRatio || 1
    canvas.width = width * dpr
    canvas.height = height * dpr
    canvas.style.width = `${width}px`
    canvas.style.height = `${height}px`

    ctx.scale(dpr, dpr)
    ctx.font = font
    ctx.fillStyle = color
    ctx.textBaseline = 'middle'
    ctx.fillText(text, 2, height / 2)
  }, [text, fontSize])

  // Canvas availability check (SSR / old browser fallback)
  const supportsCanvas = typeof window !== 'undefined' && !!window.HTMLCanvasElement

  if (!supportsCanvas) {
    return <span className={className}>{text}</span>
  }

  return (
    <canvas
      ref={canvasRef}
      className={className}
      aria-label={text}
      role="img"
      style={{ display: 'inline-block', verticalAlign: 'middle' }}
    />
  )
}
