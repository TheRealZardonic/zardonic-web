import React from 'react'

interface GlobalOverlayLayerProps {
  crtIntensity?: number
  vignetteIntensity?: number
  noiseIntensity?: number
  scanlineIntensity?: number
}

export default function GlobalOverlayLayer({
  crtIntensity = 0.6,
  vignetteIntensity = 0.3,
  noiseIntensity = 0.4,
  scanlineIntensity = 1
}: GlobalOverlayLayerProps) {
  return (
    <>
      {/* Full-page grain/noise texture */}
      <div 
        className="zardonic-theme-full-page-noise zardonic-theme-periodic-noise-glitch" 
        style={{ opacity: noiseIntensity }}
      />
      
      {/* CRT monitor effects */}
      <div 
        className="zardonic-theme-crt-overlay" 
        style={{ opacity: crtIntensity }}
      />
      <div 
        className="zardonic-theme-crt-vignette" 
        style={{ opacity: vignetteIntensity }}
      />
      
      {/* Animated scanline moving down the viewport */}
      {scanlineIntensity > 0 && (
        <div 
          className="fixed inset-0 pointer-events-none"
          style={{
            background: 'repeating-linear-gradient(0deg, transparent 0px, rgba(255, 255, 255, 0.015) 1px, transparent 2px, transparent 4px)',
            transform: 'translateZ(0)',
            opacity: scanlineIntensity,
            zIndex: 'var(--z-bg-scanline)'
          } as React.CSSProperties}
        >
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
      )}
    </>
  )
}
