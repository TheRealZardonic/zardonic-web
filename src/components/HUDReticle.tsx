import { useEffect, useState } from 'react'
import { motion, useSpring } from 'framer-motion'
import { useIsMobile } from '@/hooks/use-mobile'

export const CyberpunkCursor = () => {
  const isMobile = useIsMobile()
  const springConfig = { stiffness: 500, damping: 28 }
  const x = useSpring(0, springConfig)
  const y = useSpring(0, springConfig)
  
  const [isActive, setIsActive] = useState(false)

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      x.set(e.clientX)
      y.set(e.clientY)
    }

    const handleMouseDown = () => setIsActive(true)
    const handleMouseUp = () => setIsActive(false)

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mousedown', handleMouseDown)
    window.addEventListener('mouseup', handleMouseUp)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mousedown', handleMouseDown)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [x, y])

  if (isMobile) {
    return null
  }

  return (
    <motion.div
      style={{
        x,
        y,
        position: 'fixed',
        top: 0,
        left: 0,
        zIndex: 9999,
        pointerEvents: 'none',
        translateX: '-50%',
        translateY: '-50%',
      }}
    >
      {/* Inneres Fadenkreuz (skaliert bei Klick) */}
      <motion.div
        animate={{ scale: isActive ? 0.8 : 1 }}
        transition={{ duration: 0.1 }}
        className="relative flex items-center justify-center"
      >
        <svg width="60" height="60" viewBox="0 0 60 60">
          <circle cx="30" cy="30" r="20" fill="none" stroke="oklch(0.60 0.24 20)" strokeWidth="1" opacity="0.8" />
          <circle cx="30" cy="30" r="2" fill="oklch(0.60 0.24 20)" />

          {/* Dekorative Linien aus deinem Fragment */}
          <line x1="30" y1="5" x2="30" y2="15" stroke="oklch(0.60 0.24 20)" />
          <line x1="30" y1="55" x2="30" y2="45" stroke="oklch(0.60 0.24 20)" />
          <line x1="5" y1="30" x2="15" y2="30" stroke="oklch(0.60 0.24 20)" />
          <line x1="55" y1="30" x2="45" y2="30" stroke="oklch(0.60 0.24 20)" />
          
          {/* Diagonale Linie (aus deinem Code-Schnipsel) */}
          <line x1="48" y1="12" x2="42" y2="18" stroke="oklch(0.60 0.24 20)" strokeWidth="2" />
        </svg>
      </motion.div>

      {/* Äußerer rotierender Rahmen (HUD Effekt) */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-30">
        <svg width="120" height="120" viewBox="0 0 120 120">
          <rect x="10" y="10" width="100" height="100" fill="none" stroke="currentColor" strokeDasharray="4 4" strokeWidth="1">
            <animate attributeName="stroke-dashoffset" from="0" to="8" dur="2s" repeatCount="indefinite" />
          </rect>
        </svg>
      </div>
    </motion.div>
  )
}

export default CyberpunkCursor