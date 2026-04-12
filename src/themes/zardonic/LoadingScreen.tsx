import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'

interface LoadingScreenProps {
  onLoadComplete?: () => void
  precacheUrls?: string[]
}

const LOADING_TEXTS = [
  '> INITIALIZING SYSTEM...',
  '> LOADING AUDIO DRIVERS...',
  '> ESTABLISHING CONNECTION...',
  '> READY TO ROCK',
]

export default function LoadingScreen({ onLoadComplete, precacheUrls = [] }: LoadingScreenProps) {
  const [loadingText, setLoadingText] = useState(LOADING_TEXTS[0])
  const [progress, setProgress] = useState(0)
  const [phase, setPhase] = useState<'loading' | 'complete'>('loading')

  useEffect(() => {
    let idx = 0
    const textInterval = setInterval(() => {
      idx += 1
      if (idx < LOADING_TEXTS.length) {
        setLoadingText(LOADING_TEXTS[idx])
        setProgress((idx / LOADING_TEXTS.length) * 100)
      } else {
        clearInterval(textInterval)
        setProgress(100)
        setPhase('complete')
      }
    }, 600)

    const completeTimer = setTimeout(() => {
      onLoadComplete?.()
    }, 2800)

    return () => {
      clearInterval(textInterval)
      clearTimeout(completeTimer)
    }
  }, [onLoadComplete])

  useEffect(() => {
    if (precacheUrls.length > 0) {
      precacheUrls.forEach(url => {
        const img = new Image()
        img.src = url
      })
    }
  }, [precacheUrls])

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-background"
    >
      <div className="zardonic-theme-full-page-noise zardonic-theme-periodic-noise-glitch" />
      <div className="zardonic-theme-crt-overlay" style={{ opacity: 0.6 }} />
      <div className="zardonic-theme-crt-vignette" style={{ opacity: 0.3 }} />

      <div className="relative flex flex-col items-center space-y-8 px-4" style={{ zIndex: 'var(--z-content)' } as React.CSSProperties}>
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="relative"
        >
          <div className="relative w-32 h-32">
            <div className="absolute inset-0 border-2 border-primary/30 rounded-sm zardonic-theme-scanline-effect">
              <div className="zardonic-theme-hud-corner top-left" />
              <div className="zardonic-theme-hud-corner top-right" />
              <div className="zardonic-theme-hud-corner bottom-left" />
              <div className="zardonic-theme-hud-corner bottom-right" />
            </div>
            <div className="absolute inset-4 flex items-center justify-center">
              <div className="zardonic-loader-ring">
                <div className="zardonic-loader-ring-inner" />
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="space-y-4 w-full max-w-md"
        >
          <div className="zardonic-theme-data-label text-center">
            {loadingText}
          </div>

          <div className="h-1 bg-border/30 relative overflow-hidden rounded-none">
            <motion.div
              className="absolute inset-0 bg-primary"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: progress / 100 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              style={{ transformOrigin: 'left' }}
            />
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-primary-foreground/20 to-transparent"
              animate={{ x: ['-100%', '200%'] }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            />
          </div>

          <div className="flex gap-2 font-mono text-xs text-muted-foreground justify-center">
            <motion.span animate={{ opacity: [0, 1, 0] }} transition={{ duration: 0.8, repeat: Infinity, delay: 0 }}>▸</motion.span>
            <motion.span animate={{ opacity: [0, 1, 0] }} transition={{ duration: 0.8, repeat: Infinity, delay: 0.2 }}>▸</motion.span>
            <motion.span animate={{ opacity: [0, 1, 0] }} transition={{ duration: 0.8, repeat: Infinity, delay: 0.4 }}>▸</motion.span>
          </div>
        </motion.div>

        {phase === 'complete' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute inset-0 flex items-center justify-center"
          >
            <div className="text-2xl font-bold font-mono text-primary zardonic-theme-data-label">
              ✓ SYSTEM READY
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  )
}
