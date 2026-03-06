import { useEffect, useRef, useState } from 'react'
import { getFrequencyData } from '@/lib/audio-context'
import {
  VISUALIZER_BAR_COUNT,
  VISUALIZER_TIME_INCREMENT,
  VISUALIZER_GLITCH_PROBABILITY,
  VISUALIZER_GLITCH_OFFSET,
  VISUALIZER_GLITCH_DURATION_FRAMES,
  VISUALIZER_GLITCH_DECAY,
  VISUALIZER_HEIGHT_SCALE,
  VISUALIZER_BAR_GLITCH_PROBABILITY,
  VISUALIZER_BAR_GLITCH_OFFSET,
} from '@/lib/config'

/** Target ~20fps instead of 60fps to reduce GPU load */
const FRAME_INTERVAL_MS = 50

export default function AudioVisualizer() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number | undefined>(undefined)
  const lastFrameTime = useRef(0)
  const isVisible = useRef(true)
  const [bars] = useState<Array<{
    height: number
    speed: number
    phase: number
    glitchOffset: number
    glitchTime: number
  }>>(() => 
    Array.from({ length: VISUALIZER_BAR_COUNT }, () => ({
      height: Math.random() * 0.5 + 0.2,
      speed: Math.random() * 0.02 + 0.01,
      phase: Math.random() * Math.PI * 2,
      glitchOffset: 0,
      glitchTime: 0
    }))
  )

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    // Pause animation when tab is not visible
    const handleVisibility = () => { isVisible.current = !document.hidden }
    document.addEventListener('visibilitychange', handleVisibility)

    let time = 0

    const animate = (now: number) => {
      animationRef.current = requestAnimationFrame(animate)

      if (!isVisible.current) return
      if (now - lastFrameTime.current < FRAME_INTERVAL_MS) return
      lastFrameTime.current = now

      if (!ctx || !canvas) return

      ctx.clearRect(0, 0, canvas.width, canvas.height)

      const barWidth = canvas.width / bars.length
      const centerY = canvas.height / 2

      time += VISUALIZER_TIME_INCREMENT

      const frequencyData = getFrequencyData()
      bars.forEach((bar, i) => {
        if (frequencyData && frequencyData.length > 0) {
          const binIndex = Math.floor((i / bars.length) * frequencyData.length)
          const rawValue = frequencyData[binIndex] / 255
          bar.height = bar.height * 0.3 + rawValue * 0.7
        } else {
          bar.height = Math.sin(time * bar.speed + bar.phase) * 0.3 + 0.5
        }
        
        if (Math.random() < VISUALIZER_GLITCH_PROBABILITY) {
          bar.glitchOffset = (Math.random() - 0.5) * VISUALIZER_GLITCH_OFFSET
          bar.glitchTime = VISUALIZER_GLITCH_DURATION_FRAMES
        }
        
        if (bar.glitchTime > 0) {
          bar.glitchTime--
        } else {
          bar.glitchOffset *= VISUALIZER_GLITCH_DECAY
        }

        const x = i * barWidth + bar.glitchOffset
        const height = bar.height * (canvas.height * VISUALIZER_HEIGHT_SCALE)
        
        const gradient = ctx.createLinearGradient(x, centerY - height, x, centerY + height)
        gradient.addColorStop(0, 'oklch(0.50 0.22 25 / 0.05)')
        gradient.addColorStop(0.5, 'oklch(0.50 0.22 25 / 0.15)')
        gradient.addColorStop(1, 'oklch(0.50 0.22 25 / 0.05)')

        ctx.fillStyle = gradient
        ctx.fillRect(x, centerY - height, barWidth - 2, height * 2)

        if (bar.glitchTime > 0 && Math.random() < 0.5) {
          ctx.fillStyle = 'oklch(0.60 0.24 25 / 0.3)'
          ctx.fillRect(x + (Math.random() - 0.5) * 15, centerY - height, barWidth - 2, height * 2)
        }
      })

      if (Math.random() < VISUALIZER_BAR_GLITCH_PROBABILITY) {
        const randomBar = bars[Math.floor(Math.random() * bars.length)]
        randomBar.glitchOffset = (Math.random() - 0.5) * VISUALIZER_BAR_GLITCH_OFFSET
        randomBar.glitchTime = 15
      }
    }

    animationRef.current = requestAnimationFrame(animate)

    return () => {
      window.removeEventListener('resize', resize)
      document.removeEventListener('visibilitychange', handleVisibility)
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [bars])

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-[1] opacity-40 mix-blend-screen blur-[1px]"
    />
  )
}
