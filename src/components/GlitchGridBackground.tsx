import { useEffect, useRef, memo } from 'react'

/**
 * GlitchGridBackground – Dark grid/scanline background with glitch artifacts.
 * Matches the "DIGICIDE" visual aesthetic: deep black, fine crosshatch grid,
 * horizontal scan beam, chromatic aberration strips, and occasional pixel tears.
 */
const GlitchGridBackground = memo(function GlitchGridBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animFrame: number
    let tick = 0

    function resize() {
      if (!canvas) return
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }

    resize()
    window.addEventListener('resize', resize)

    // Glitch strip state
    const strips: { y: number; h: number; dx: number; life: number; maxLife: number }[] = []

    function spawnStrip() {
      if (!canvas) return
      const h = 1 + Math.floor(Math.random() * 4)
      strips.push({
        y: Math.floor(Math.random() * canvas.height),
        h,
        dx: (Math.random() - 0.5) * 40,
        life: 0,
        maxLife: 4 + Math.floor(Math.random() * 10),
      })
    }

    function draw() {
      if (!canvas || !ctx) return
      tick++

      const W = canvas.width
      const H = canvas.height

      // Base: near-pure black
      ctx.fillStyle = 'rgb(4, 4, 6)'
      ctx.fillRect(0, 0, W, H)

      // Fine crosshatch grid
      const gridSize = 28
      ctx.strokeStyle = 'rgba(160, 170, 200, 0.045)'
      ctx.lineWidth = 0.5
      for (let x = 0; x < W; x += gridSize) {
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, H)
        ctx.stroke()
      }
      for (let y = 0; y < H; y += gridSize) {
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(W, y)
        ctx.stroke()
      }

      // Subtle diagonal grid lines (45°)
      ctx.strokeStyle = 'rgba(160, 170, 200, 0.018)'
      ctx.lineWidth = 0.5
      const diagSpacing = 56
      for (let d = -H; d < W + H; d += diagSpacing) {
        ctx.beginPath()
        ctx.moveTo(d, 0)
        ctx.lineTo(d + H, H)
        ctx.stroke()
        ctx.beginPath()
        ctx.moveTo(d, 0)
        ctx.lineTo(d - H, H)
        ctx.stroke()
      }

      // Concentric ellipses (like the arc lines in the image, bottom-left)
      ctx.strokeStyle = 'rgba(140, 160, 200, 0.06)'
      ctx.lineWidth = 0.6
      const cx = W * 0.08
      const cy = H * 0.82
      for (let r = 60; r < Math.max(W, H) * 1.2; r += 70) {
        ctx.beginPath()
        ctx.arc(cx, cy, r, 0, Math.PI * 2)
        ctx.stroke()
      }

      // Slow vertical scan beam
      const scanX = ((tick * 0.3) % (W + 80)) - 40
      const scanGrad = ctx.createLinearGradient(scanX - 30, 0, scanX + 30, 0)
      scanGrad.addColorStop(0, 'rgba(180,200,255,0)')
      scanGrad.addColorStop(0.5, 'rgba(180,200,255,0.04)')
      scanGrad.addColorStop(1, 'rgba(180,200,255,0)')
      ctx.fillStyle = scanGrad
      ctx.fillRect(scanX - 30, 0, 60, H)

      // Horizontal glitch strips with chromatic offset
      if (tick % 8 === 0 && Math.random() < 0.4) spawnStrip()

      for (let i = strips.length - 1; i >= 0; i--) {
        const s = strips[i]
        s.life++
        const progress = s.life / s.maxLife
        const alpha = Math.sin(progress * Math.PI) * 0.6

        // Grab a strip from a slightly different x position (chromatic tear)
        try {
          const srcX = Math.max(0, Math.min(W - 1, s.dx > 0 ? 0 : Math.abs(s.dx)))
          const srcW = W - Math.abs(s.dx)
          if (srcW > 0 && s.h > 0 && s.y >= 0 && s.y + s.h <= H) {
            const imgData = ctx.getImageData(srcX, s.y, srcW, s.h)
            // Red channel shift
            ctx.save()
            ctx.globalAlpha = alpha * 0.5
            ctx.putImageData(imgData, srcX + s.dx + 2, s.y)
            // Blue channel shift
            ctx.globalAlpha = alpha * 0.4
            ctx.putImageData(imgData, srcX + s.dx - 2, s.y)
            ctx.restore()
          }
        } catch {
          // ignore out-of-bounds
        }

        if (s.life >= s.maxLife) strips.splice(i, 1)
      }

      // Dense horizontal noise lines (CRT-style)
      for (let y = 0; y < H; y += 2) {
        const noiseAlpha = Math.random() * 0.025
        if (noiseAlpha > 0.015) {
          ctx.fillStyle = `rgba(255,255,255,${noiseAlpha})`
          ctx.fillRect(0, y, W, 1)
        }
      }

      // Sparse bright pixel noise
      for (let i = 0; i < 60; i++) {
        const px = Math.floor(Math.random() * W)
        const py = Math.floor(Math.random() * H)
        const bri = 120 + Math.floor(Math.random() * 136)
        ctx.fillStyle = `rgba(${bri},${bri + 20},${bri + 30},${Math.random() * 0.4})`
        ctx.fillRect(px, py, 1, 1)
      }

      // Vignette
      const vig = ctx.createRadialGradient(W / 2, H / 2, H * 0.2, W / 2, H / 2, H * 0.9)
      vig.addColorStop(0, 'rgba(0,0,0,0)')
      vig.addColorStop(1, 'rgba(0,0,4,0.65)')
      ctx.fillStyle = vig
      ctx.fillRect(0, 0, W, H)

      animFrame = requestAnimationFrame(draw)
    }

    animFrame = requestAnimationFrame(draw)

    return () => {
      cancelAnimationFrame(animFrame)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full pointer-events-none"
      style={{ zIndex: 0, opacity: 1 }}
      aria-hidden="true"
    />
  )
})

export default GlitchGridBackground
