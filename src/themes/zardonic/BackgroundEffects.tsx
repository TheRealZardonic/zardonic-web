import React from 'react'

export default function BackgroundEffects() {
  return (
    <>
      {/* Full-page grain/noise texture */}
      <div className="zardonic-theme-full-page-noise zardonic-theme-periodic-noise-glitch" />
      
      {/* CRT monitor effects */}
      <div className="zardonic-theme-crt-overlay" style={{ opacity: 0.6 }} />
      <div className="zardonic-theme-crt-vignette" style={{ opacity: 0.3 }} />
      
      {/* Animated scanline moving down the viewport */}
      <div 
        className="fixed inset-0 pointer-events-none"
        style={{ zIndex: 'var(--z-bg-scanline)' } as React.CSSProperties}>
        <div 
          className="absolute left-0 w-full h-[6px]"
          style={{
            background: 'linear-gradient(180deg, transparent 0%, rgba(255, 255, 255, 0.04) 50%, transparent 100%)',
            animation: 'scanline-drift 6s linear infinite',
            willChange: 'transform',
            transform: 'translateZ(0)'
          }}
        />
      </div>

      {/* Circuit board pattern background */}
      <div className="fixed inset-0 opacity-15 pointer-events-none" style={{ zIndex: 'var(--z-bg-image)' } as React.CSSProperties}>
        <div 
          className="absolute inset-0"
          style={{
            backgroundImage: `
              linear-gradient(90deg, transparent 98%, oklch(0.55 0.25 25 / 0.4) 98%),
              linear-gradient(0deg, transparent 98%, oklch(0.55 0.25 25 / 0.4) 98%),
              radial-gradient(circle at 10% 20%, oklch(0.55 0.25 25 / 0.3) 2px, transparent 2px),
              radial-gradient(circle at 80% 40%, oklch(0.55 0.25 25 / 0.3) 2px, transparent 2px),
              radial-gradient(circle at 30% 70%, oklch(0.55 0.25 25 / 0.3) 2px, transparent 2px),
              radial-gradient(circle at 90% 80%, oklch(0.55 0.25 25 / 0.3) 2px, transparent 2px),
              radial-gradient(circle at 60% 30%, oklch(0.55 0.25 25 / 0.3) 2px, transparent 2px),
              radial-gradient(circle at 20% 50%, oklch(0.55 0.25 25 / 0.3) 2px, transparent 2px),
              radial-gradient(circle at 70% 90%, oklch(0.55 0.25 25 / 0.3) 2px, transparent 2px),
              radial-gradient(circle at 50% 10%, oklch(0.55 0.25 25 / 0.3) 2px, transparent 2px)
            `,
            backgroundSize: '80px 80px, 80px 80px, 100% 100%, 100% 100%, 100% 100%, 100% 100%, 100% 100%, 100% 100%, 100% 100%, 100% 100%',
            animation: 'zardonic-theme-circuit-pulse 4s ease-in-out infinite'
          }}
        />
      </div>
    </>
  )
}
