import { useEffect, useRef, memo } from 'react'

/**
 * Cloud Chamber Background
 * Simulates a Wilson cloud chamber: noise/static overlay, a terminal-style
 * green-phosphor screen tint, and small drifting particles representing
 * ionised radiation tracks.
 */
const CloudChamberBackground = memo(function CloudChamberBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animRef = useRef<number>(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Resize canvas to viewport
    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    // Particle types
    interface Particle {
      x: number
      y: number
      vx: number
      vy: number
      life: number
      maxLife: number
      size: number
      color: string
      trail: { x: number; y: number }[]
    }

    const PARTICLE_COLORS = [
      'rgba(180,40,40,',
      'rgba(220,60,60,',
      'rgba(120,20,20,',
      'rgba(200,80,80,',
    ]

    const particles: Particle[] = []

    const spawnParticle = () => {
      // Random spawn point anywhere on the canvas
      const angle = Math.random() * Math.PI * 2
      const speed = 0.4 + Math.random() * 1.2
      const col = PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)]
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0,
        maxLife: 80 + Math.random() * 160,
        size: 0.8 + Math.random() * 1.8,
        color: col,
        trail: [],
      })
    }

    // Pre-spawn some particles
    for (let i = 0; i < 40; i++) spawnParticle()

    let frame = 0

    const draw = () => {
      if (!canvas || !ctx) return
      frame++

      // Dark, semi-transparent wipe (trails)
      ctx.fillStyle = 'rgba(0,0,0,0.04)'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Occasionally spawn new particles
      if (frame % 8 === 0 && particles.length < 80) spawnParticle()

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i]
        p.x += p.vx
        p.y += p.vy
        p.life++

        // Slight random deflection (magnetic/scattering)
        p.vx += (Math.random() - 0.5) * 0.06
        p.vy += (Math.random() - 0.5) * 0.06
        // Speed cap
        const spd = Math.hypot(p.vx, p.vy)
        if (spd > 2) { p.vx *= 0.98; p.vy *= 0.98 }

        // Record trail
        p.trail.push({ x: p.x, y: p.y })
        if (p.trail.length > 20) p.trail.shift()

        const progress = p.life / p.maxLife
        const alpha = Math.sin(progress * Math.PI) * 0.7

        // Draw trail
        if (p.trail.length > 1) {
          ctx.beginPath()
          ctx.moveTo(p.trail[0].x, p.trail[0].y)
          for (let j = 1; j < p.trail.length; j++) {
            ctx.lineTo(p.trail[j].x, p.trail[j].y)
          }
          ctx.strokeStyle = `${p.color}${(alpha * 0.4).toFixed(2)})`
          ctx.lineWidth = p.size * 0.5
          ctx.stroke()
        }

        // Draw particle head
        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 3)
        grad.addColorStop(0, `${p.color}${alpha.toFixed(2)})`)
        grad.addColorStop(1, `${p.color}0)`)
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2)
        ctx.fillStyle = grad
        ctx.fill()

        if (p.life >= p.maxLife) particles.splice(i, 1)
      }

      // Scanline / terminal flicker overlay drawn via CSS; just add occasional
      // bright horizontal streak as CRT scan artefact
      if (frame % 120 === 0) {
        const y = Math.random() * canvas.height
        const grad = ctx.createLinearGradient(0, y, canvas.width, y)
        grad.addColorStop(0, 'rgba(180,50,50,0)')
        grad.addColorStop(0.5, 'rgba(180,50,50,0.04)')
        grad.addColorStop(1, 'rgba(180,50,50,0)')
        ctx.fillStyle = grad
        ctx.fillRect(0, y - 1, canvas.width, 2)
      }

      animRef.current = requestAnimationFrame(draw)
    }

    animRef.current = requestAnimationFrame(draw)

    return () => {
      window.removeEventListener('resize', resize)
      cancelAnimationFrame(animRef.current)
    }
  }, [])

  return (
    <>
      {/* Terminal phosphor green tint layer */}
      <div
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          background: 'radial-gradient(ellipse at 50% 50%, rgba(0,40,10,0.35) 0%, rgba(0,0,0,0) 70%)',
          mixBlendMode: 'screen',
        }}
      />
      {/* Noise static overlay */}
      <div className="fixed inset-0 pointer-events-none z-0 full-page-noise opacity-30" />
      {/* Particle canvas */}
      <canvas
        ref={canvasRef}
        className="fixed inset-0 pointer-events-none z-0"
        aria-hidden="true"
      />
    </>
  )
})

export default CloudChamberBackground
