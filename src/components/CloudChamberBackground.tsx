import { useEffect, useRef, memo } from 'react'

interface Particle {
  x1: number
  y1: number
  x2: number
  y2: number
  angle: number
  /** Draw progress 0→1 (trail growing) */
  progress: number
  age: number
  life: number
  phase: 'growing' | 'fading'
  /** Pixels-per-frame the trail grows */
  speed: number
  length: number
  color: string
  secondary: boolean
}

/**
 * Cloud Chamber Background — Wilson/Nebelkammer simulation.
 *
 * Canvas-based component that renders:
 *   1. Subtle, barely-visible fog layer (slow fill fade)
 *   2. Particle tracks that appear at random intervals, grow quickly
 *      (50–100 ms), then fade over 1–2 s — simulating ionising radiation
 *      streaking through a supersaturated cloud chamber.
 *   3. Occasional secondary (branching) tracks for nuclear decay aesthetics.
 *
 * Respects `prefers-reduced-motion` and pauses when the tab is hidden.
 */
const CloudChamberBackground = memo(function CloudChamberBackground({
  glowColor,
}: {
  /** Optional CSS colour to tint the particle tracks. */
  glowColor?: string
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReduced) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animId: number
    let running = true
    let particles: Particle[] = []
    let frameCount = 0
    let nextSpawnFrame = 0

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    const handleResize = () => resize()
    window.addEventListener('resize', handleResize)

    /** Return the current primary colour: prop → CSS variable → safe hex */
    const getColor = (): string => {
      if (glowColor) return glowColor
      const raw = getComputedStyle(document.documentElement)
        .getPropertyValue('--primary')
        .trim()
      return raw || '#cc3300'
    }

    /** Spawn one particle track, optionally branching from a given point. */
    const spawnParticle = (
      secondary = false,
      baseX?: number,
      baseY?: number,
      baseAngle?: number,
    ) => {
      const w = canvas.width
      const h = canvas.height

      let x1: number, y1: number
      if (secondary && baseX !== undefined && baseY !== undefined) {
        x1 = baseX
        y1 = baseY
      } else {
        // Favour edges so tracks appear to shoot through the chamber
        const edge = Math.random()
        if (edge < 0.25)      { x1 = 0; y1 = Math.random() * h }
        else if (edge < 0.5)  { x1 = w; y1 = Math.random() * h }
        else if (edge < 0.75) { x1 = Math.random() * w; y1 = 0 }
        else                  { x1 = Math.random() * w; y1 = h }
      }

      const angle =
        baseAngle !== undefined
          ? baseAngle + (Math.random() - 0.5) * 0.5 // slight branching deviation
          : Math.random() * Math.PI * 2

      const length = secondary
        ? 50 + Math.random() * 100
        : 120 + Math.random() * 320

      // Grow phase: ~3–6 frames (~50–100 ms at 60 fps)
      const growFrames = secondary ? 3 : 3 + Math.random() * 3
      // Fade phase: ~30–120 frames (~0.5–2 s)
      const fadeFrames = secondary
        ? 30 + Math.random() * 30
        : 60 + Math.random() * 60

      particles.push({
        x1,
        y1,
        x2: x1 + Math.cos(angle) * length,
        y2: y1 + Math.sin(angle) * length,
        angle,
        progress: 0,
        age: 0,
        life: growFrames + fadeFrames,
        phase: 'growing',
        speed: length / growFrames,
        length,
        color: getColor(),
        secondary,
      })
    }

    /** Pending branch spawns: each entry is the frame at which to spawn + spawn args */
    type PendingBranch = { spawnAt: number; bx: number; by: number; ba: number }
    let pendingBranches: PendingBranch[] = []

    const draw = () => {
      if (!running || document.hidden) {
        animId = requestAnimationFrame(draw)
        return
      }

      frameCount++

      // Very slow fill-fade creates the barely-visible fog/mist base
      ctx.fillStyle = 'rgba(0,0,0,0.025)'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Spawn any pending branches whose frame has arrived
      pendingBranches = pendingBranches.filter(b => {
        if (frameCount >= b.spawnAt) {
          spawnParticle(true, b.bx, b.by, b.ba)
          return false
        }
        return true
      })

      // Spawn primary track (and maybe a branch)
      if (frameCount >= nextSpawnFrame) {
        spawnParticle(false)

        // ~8 % chance of a secondary branching track spawned slightly later
        if (Math.random() < 0.08) {
          const delay = 6 + Math.floor(Math.random() * 10) // frames
          const parentSnapshot = particles[particles.length - 1]
          if (parentSnapshot) {
            // Schedule branch via the pending queue — no setInterval needed
            pendingBranches.push({
              spawnAt: frameCount + delay,
              bx: parentSnapshot.x1 + (parentSnapshot.x2 - parentSnapshot.x1) * (0.3 + Math.random() * 0.4),
              by: parentSnapshot.y1 + (parentSnapshot.y2 - parentSnapshot.y1) * (0.3 + Math.random() * 0.4),
              ba: parentSnapshot.angle,
            })
          }
        }

        // Next primary track in 60–300 frames (~1–5 s at 60 fps)
        nextSpawnFrame = frameCount + 60 + Math.floor(Math.random() * 240)
      }

      // Update and draw all live particles
      particles = particles.filter(p => {
        p.age++

        const growFrames = p.length / p.speed

        if (p.phase === 'growing') {
          p.progress = Math.min(1, p.age / growFrames)
          if (p.progress >= 1) p.phase = 'fading'
        }

        // Alpha: full during grow, linear fade afterwards
        let alpha: number
        if (p.phase === 'growing') {
          alpha = 0.75
        } else {
          const fadeAge = p.age - growFrames
          const fadeDur = p.life - growFrames
          alpha = Math.max(0, 0.75 * (1 - fadeAge / fadeDur))
        }

        if (alpha <= 0) return false

        const endX = p.x1 + (p.x2 - p.x1) * p.progress
        const endY = p.y1 + (p.y2 - p.y1) * p.progress

        ctx.save()
        ctx.globalAlpha = alpha
        ctx.strokeStyle = p.color
        ctx.lineWidth = p.secondary ? 0.8 : 1.5
        ctx.shadowColor = p.color
        ctx.shadowBlur = p.secondary ? 2 : 5
        ctx.beginPath()
        ctx.moveTo(p.x1, p.y1)
        ctx.lineTo(endX, endY)
        ctx.stroke()
        ctx.restore()

        return true
      })

      animId = requestAnimationFrame(draw)
    }

    const handleVisibility = () => { running = !document.hidden }
    document.addEventListener('visibilitychange', handleVisibility)

    animId = requestAnimationFrame(draw)

    return () => {
      running = false
      cancelAnimationFrame(animId)
      pendingBranches = []
      window.removeEventListener('resize', handleResize)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [glowColor])

  return (
    <div className="fixed inset-0 pointer-events-none" aria-hidden="true">
      <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" />
      {/* Radial edge vignette darkens the chamber borders */}
      <div className="cc-vignette" />
    </div>
  )
})

export default CloudChamberBackground

