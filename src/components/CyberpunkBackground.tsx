import { useEffect, useState, useRef } from 'react'
import type { HudTexts } from '@/lib/types'

interface CyberpunkBackgroundProps {
  hudTexts?: HudTexts
}

/**
 * CyberpunkBackground – pure-CSS animated HUD overlay with complex
 * Cyberpunk 2077-style animations: hexagonal grid, glitch blocks,
 * circuit traces, and particle effects.
 */
export default function CyberpunkBackground({ hudTexts }: CyberpunkBackgroundProps) {
  const [time, setTime] = useState(new Date())
  const intervalRef = useRef<ReturnType<typeof setInterval>>(undefined)

  useEffect(() => {
    const tick = () => setTime(new Date())
    intervalRef.current = setInterval(tick, 1000)
    const handleVisibility = () => {
      if (document.hidden) {
        clearInterval(intervalRef.current)
      } else {
        setTime(new Date())
        intervalRef.current = setInterval(tick, 1000)
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => {
      clearInterval(intervalRef.current)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [])

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    })
  }

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0" style={{ contain: 'layout' }}>
      <div className="absolute inset-0 hud-grid-overlay" />
      
      {/* HUD Data readouts */}
      <div className="absolute top-4 left-4 data-readout hidden md:block">
        <div className="mb-1">{hudTexts?.topLeft1 ?? 'SYSTEM: ONLINE'}</div>
        <div>{hudTexts?.topLeft2 !== undefined ? hudTexts.topLeft2 : `TIME: ${formatTime(time)}`}</div>
        <div className="mt-1 flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" style={{ boxShadow: '0 0 6px var(--primary, oklch(0.50 0.22 25))' }}></div>
          <span>{hudTexts?.topLeftStatus ?? 'ACTIVE'}</span>
        </div>
      </div>

      <div className="absolute top-4 right-4 data-readout hidden md:block text-right">
        <div className="mb-1">{hudTexts?.topRight1 ?? 'NEUROKLAST v1.0'}</div>
        <div>{hudTexts?.topRight2 ?? `ID: NK-${Date.now().toString().slice(-6)}`}</div>
      </div>

      <div className="absolute bottom-4 left-4 data-readout hidden md:block">
        <div>{hudTexts?.bottomLeft1 ?? 'PROTOCOL: TECHNO'}</div>
        <div className="mt-1">{hudTexts?.bottomLeft2 ?? 'STATUS: TRANSMITTING'}</div>
      </div>

      <div className="absolute bottom-4 right-4 data-readout hidden md:block text-right">
        <div>{hudTexts?.bottomRight1 ?? 'FREQ: 140-180 BPM'}</div>
        <div className="mt-1">{hudTexts?.bottomRight2 ?? 'MODE: HARD'}</div>
      </div>

      {/* ─── Circuit trace lines (diagonal animated paths) ─── */}
      <svg className="absolute inset-0 w-full h-full opacity-[0.07] text-primary" preserveAspectRatio="none">
        <defs>
          <linearGradient id="circuit-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0" />
            <stop offset="40%" stopColor="currentColor" stopOpacity="0.8" />
            <stop offset="60%" stopColor="currentColor" stopOpacity="0.8" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path
          d="M 0 200 L 150 200 L 180 170 L 350 170 L 380 200 L 500 200"
          stroke="url(#circuit-grad)"
          strokeWidth="1"
          fill="none"
          className="cyberpunk-circuit-trace"
          style={{ animationDelay: '0s' }}
        />
        <path
          d="M 600 400 L 750 400 L 780 370 L 950 370 L 980 340 L 1100 340"
          stroke="url(#circuit-grad)"
          strokeWidth="1"
          fill="none"
          className="cyberpunk-circuit-trace"
          style={{ animationDelay: '2s' }}
        />
        <path
          d="M 200 600 L 350 600 L 380 570 L 550 570 L 580 600 L 700 600"
          stroke="url(#circuit-grad)"
          strokeWidth="1"
          fill="none"
          className="cyberpunk-circuit-trace"
          style={{ animationDelay: '4s' }}
        />
      </svg>

      {/* ─── Glitch blocks – random rectangular flashes ─── */}
      {[0, 1, 2, 3, 4].map(i => (
        <div
          key={`glitch-block-${i}`}
          className="absolute cyberpunk-glitch-block"
          style={{
            top: `${10 + i * 18}%`,
            left: `${5 + (i % 3) * 35}%`,
            width: `${40 + i * 15}px`,
            height: `${3 + (i % 2)}px`,
            animationDelay: `${i * 1.7}s`,
            animationDuration: `${6 + i * 1.5}s`,
          }}
        />
      ))}

      {/* ─── Hex grid overlay ─── */}
      <svg className="absolute inset-0 w-full h-full opacity-[0.04] text-primary" preserveAspectRatio="none">
        <defs>
          <pattern id="hex-pattern" x="0" y="0" width="60" height="52" patternUnits="userSpaceOnUse">
            <polygon
              points="30,2 56,15 56,37 30,50 4,37 4,15"
              stroke="currentColor"
              strokeWidth="0.5"
              fill="none"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#hex-pattern)" className="cyberpunk-hex-fade" />
      </svg>

      {/* ─── Scanning beam (wide, diagonal) ─── */}
      <div className="absolute inset-0 cyberpunk-scan-beam" />

      {/* ─── Data particles (floating dots) ─── */}
      {[0, 1, 2, 3, 4, 5, 6, 7].map(i => (
        <div
          key={`particle-${i}`}
          className="absolute w-1 h-1 rounded-full bg-primary/30 cyberpunk-particle"
          style={{
            left: `${8 + i * 12}%`,
            animationDuration: `${10 + i * 3}s`,
            animationDelay: `${i * 1.5}s`,
          }}
        />
      ))}

      {/* ─── Pulsing rings ─── */}
      {[0, 1, 2].map(i => (
        <div
          key={`ring-${i}`}
          className="absolute cyberpunk-pulse-ring"
          style={{
            top: `${20 + i * 25}%`,
            left: `${15 + (i % 2) * 60}%`,
            animationDelay: `${i * 2.5}s`,
          }}
        />
      ))}

      {/* Ambient radial glow */}
      <div className="absolute inset-0" style={{ background: 'radial-gradient(circle at 50% 50%, var(--primary, oklch(0.50 0.22 25)) 0%, transparent 50%)', opacity: 0.02 }} />
      
      {/* Dot pattern */}
      <svg className="absolute inset-0 w-full h-full opacity-5 text-primary" preserveAspectRatio="none">
        <defs>
          <pattern id="hud-dots" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="0.5" fill="currentColor" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#hud-dots)" />
      </svg>

      {/* ─── Corner brackets (cyberpunk HUD corners) ─── */}
      {[
        { top: '5%', left: '3%' },
        { top: '5%', right: '3%', transform: 'rotate(90deg)' },
        { bottom: '5%', left: '3%', transform: 'rotate(270deg)' },
        { bottom: '5%', right: '3%', transform: 'rotate(180deg)' },
      ].map((pos, i) => (
        <div
          key={`corner-bracket-${i}`}
          className="absolute hidden md:block cyberpunk-corner-bracket"
          style={{ ...pos, animationDelay: `${i * 0.5}s` } as React.CSSProperties}
        >
          <svg width="40" height="40" viewBox="0 0 40 40" className="text-primary">
            <path d="M 0 15 L 0 0 L 15 0" stroke="currentColor" strokeWidth="1" fill="none" opacity="0.3" />
            <path d="M 0 8 L 0 0 L 8 0" stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.5" />
          </svg>
        </div>
      ))}
    </div>
  )
}
