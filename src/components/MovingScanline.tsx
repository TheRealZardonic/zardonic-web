import { useEffect, useState } from 'react'
import { get } from '@/lib/config'

/**
 * MovingScanline - CRT-style refresh line that moves from top to bottom
 * Simulates the CRT electron beam refresh effect
 */
export function MovingScanline() {
  const [enabled, setEnabled] = useState(true)

  useEffect(() => {
    const isEnabled = get('SCANLINE_MOVEMENT_ENABLED')
    if (!isEnabled) {
      setEnabled(false)
      return
    }
    const scanlineEnabled = getComputedStyle(document.documentElement).getPropertyValue('--overlay-moving-scanline').trim()
    if (scanlineEnabled === '0') {
      setEnabled(false)
      return
    }
    setEnabled(true)
    // Watch for CSS variable changes
    const observer = new MutationObserver(() => {
      const val = getComputedStyle(document.documentElement).getPropertyValue('--overlay-moving-scanline').trim()
      setEnabled(val !== '0')
    })
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['style'] })
    return () => observer.disconnect()
  }, [])

  if (!enabled) return null

  const duration = get('SCANLINE_ANIMATION_DURATION_S')
  const height = get('SCANLINE_HEIGHT_PX')
  const opacity = get('SCANLINE_OPACITY')

  return (
    <div
      className="pointer-events-none fixed inset-0 z-50"
      style={{
        overflow: 'hidden',
      }}
    >
      <div
        className="absolute left-0 right-0"
        style={{
          height: `${height}px`,
          background: `linear-gradient(90deg, transparent, oklch(0.50 0.22 25 / ${opacity}), transparent)`,
          boxShadow: `0 0 ${height * 2}px oklch(0.50 0.22 25 / ${opacity * 0.5})`,
          animation: `scanline-move ${duration}s linear infinite`,
        }}
      />
      <style>
        {`
          @keyframes scanline-move {
            0% {
              transform: translateY(-${height}px);
            }
            100% {
              transform: translateY(100vh);
            }
          }
        `}
      </style>
    </div>
  )
}
