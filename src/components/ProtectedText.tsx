import { useRef, useEffect } from 'react'

interface ProtectedTextProps {
  text: string
  className?: string
  fontSize?: number
}

/**
 * Renders text as a canvas image to prevent scraping by bots.
 * The text is never present in the DOM as plain text.
 */
export default function ProtectedText({ text, className, fontSize = 14 }: ProtectedTextProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const dpr = window.devicePixelRatio || 1
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const font = `${fontSize}px 'JetBrains Mono', monospace`
    ctx.font = font
    const metrics = ctx.measureText(text)
    const width = Math.ceil(metrics.width) + 4
    const height = Math.ceil(fontSize * 1.5)

    canvas.width = width * dpr
    canvas.height = height * dpr
    canvas.style.width = `${width}px`
    canvas.style.height = `${height}px`
    ctx.scale(dpr, dpr)

    ctx.clearRect(0, 0, width, height)
    ctx.font = font
    ctx.fillStyle = 'oklch(0.85 0 0)'
    ctx.textBaseline = 'middle'
    ctx.fillText(text, 0, height / 2)
  }, [text, fontSize])

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ display: 'inline-block', verticalAlign: 'middle' }}
      aria-label={text.replace(/./g, '•')}
      role="img"
    />
  )
}
