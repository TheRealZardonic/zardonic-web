import { MotionConfig } from 'framer-motion'
import { ReactNode } from 'react'

interface PerformanceProviderProps {
  children: ReactNode
}

/**
 * Optimizes framer-motion performance globally
 * - Reduces motion on lower-end devices
 * - Configures transition defaults for better performance
 */
export function PerformanceProvider({ children }: PerformanceProviderProps) {
  return (
    <MotionConfig
      // Reduce motion for better performance
      reducedMotion="user"
      // Use GPU-accelerated transforms by default
      transition={{
        type: "tween",
        ease: "easeOut",
        duration: 0.3,
      }}
    >
      {children}
    </MotionConfig>
  )
}
