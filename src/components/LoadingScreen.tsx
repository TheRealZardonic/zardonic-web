import { motion, AnimatePresence } from 'framer-motion'
import { useEffect, useState, useMemo, memo, useRef } from 'react'
import { cacheImage } from '@/lib/image-cache'
import type { LoaderTexts, LoadingScreenMode } from '@/lib/types'

interface LoadingScreenProps {
  onLoadComplete: () => void
  precacheUrls?: string[]
  loaderTexts?: LoaderTexts
  mode?: LoadingScreenMode
  duration?: number
}

const DEFAULT_MESSAGES = [
  'INITIALIZING NEURAL INTERFACE',
  'LOADING CORE SYSTEMS',
  'SYNCHRONIZING WETWARE',
  'ESTABLISHING CONNECTION',
  'SYSTEM READY'
] as const

/** Read the current value of a CSS custom property from the document root. */
function getCssVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim()
}

export const LoadingScreen = memo(function LoadingScreen({ onLoadComplete, precacheUrls = [], loaderTexts, mode = 'real', duration = 3 }: LoadingScreenProps) {
  const [loadingProgress, setLoadingProgress] = useState(0)
  const [loadingStage, setLoadingStage] = useState(0)
  const [cachingDone, setCachingDone] = useState(precacheUrls.length === 0)
  const prefersReducedMotion = useReducedMotion()

  // Read the primary colour once at mount so glow/indicator animations match
  // the current CI preset even before admin settings arrive from the KV store.
  const primaryColorRef = useRef(getCssVar('--primary') || 'oklch(0.55 0.25 25)')
  const primaryColor = primaryColorRef.current

  // Simulated progress so the bar always moves
  useEffect(() => {
    if (mode === 'timed') {
      // Timed mode: progress from 0 to 100 over `duration` seconds
      const totalMs = (duration ?? 3) * 1000
      const intervalMs = 50
      const increment = 100 / (totalMs / intervalMs)
      const interval = setInterval(() => {
        setLoadingProgress((prev) => {
          const next = Math.min(prev + increment, 100)
          return next
        })
      }, intervalMs)
      return () => clearInterval(interval)
    }
    const interval = setInterval(() => {
      setLoadingProgress((prev) => {
        if (prev >= 95) return prev
        // Slow down as we approach completion
        const increment = prev < 50 ? 3 : prev < 80 ? 1.5 : 0.5
        return Math.min(prev + increment, 95)
      })
    }, 100)
    return () => clearInterval(interval)
  }, [mode, duration])

  // Background data caching during loading screen
  useEffect(() => {
    if (precacheUrls.length === 0) {
      setCachingDone(true)
      return
    }
    setCachingDone(false)
    let cancelled = false
    Promise.allSettled(precacheUrls.map(url => cacheImage(url)))
      .then(() => { if (!cancelled) setCachingDone(true) })
    return () => { cancelled = true }
  }, [precacheUrls])

  // Jump to 100% when caching is done (real mode only)
  useEffect(() => {
    if (mode === 'timed') return
    if (cachingDone && loadingProgress >= 90) {
      setLoadingProgress(100)
    }
  }, [cachingDone, loadingProgress, mode])

  useEffect(() => {
    if (loadingProgress > 20 && loadingStage < 1) setLoadingStage(1)
    if (loadingProgress > 40 && loadingStage < 2) setLoadingStage(2)
    if (loadingProgress > 60 && loadingStage < 3) setLoadingStage(3)
    if (loadingProgress > 80 && loadingStage < 4) setLoadingStage(4)
    if (loadingProgress === 100 && loadingStage < 5) setLoadingStage(5)
  }, [loadingProgress, loadingStage])

  // Memoize messages to prevent recreation
  const messages = useMemo(() => {
    if (loaderTexts?.stageMessages?.length === 5) return loaderTexts.stageMessages
    return DEFAULT_MESSAGES as string[]
  }, [loaderTexts?.stageMessages])

  const systemCheckLabels: [string, string, string] = [
    loaderTexts?.systemChecks?.[0] ?? 'WETWARE',
    loaderTexts?.systemChecks?.[1] ?? 'NEURAL',
    loaderTexts?.systemChecks?.[2] ?? 'CYBERDECK',
  ]

  // Complete when progress reaches 100% and background caching is done
  useEffect(() => {
    if (loadingProgress >= 100 && cachingDone) {
      const timeout = setTimeout(() => onLoadComplete(), 800)
      return () => clearTimeout(timeout)
    }
  }, [loadingProgress, cachingDone, onLoadComplete])

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: prefersReducedMotion ? 1 : 0 }}
      transition={{ duration: prefersReducedMotion ? 0 : 0.5 }}
      className="fixed inset-0 z-[9999] bg-background flex items-center justify-center overflow-hidden"
    >
      <div className="full-page-noise periodic-noise-glitch" />
      <div className="scanline-effect absolute inset-0" />
      <div className="crt-overlay" />
      <div className="crt-vignette" />
      
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
      
      {[...Array(20)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-0.5 h-32 bg-gradient-to-b from-transparent via-primary/30 to-transparent"
          style={{
            left: `${Math.random() * 100}%`,
            top: -128,
          }}
          animate={{
            top: ['0vh', '100vh'],
            opacity: [0, 0.6, 0],
          }}
          transition={{
            duration: 2 + Math.random() * 3,
            repeat: Infinity,
            delay: Math.random() * 5,
            ease: 'linear',
          }}
        />
      ))}

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.15 }}
        className="relative z-10 flex flex-col items-center"
      >
        <div className="mb-8">
          <motion.div
            className="data-label text-center"
            animate={{
              opacity: [0.5, 1, 0.5],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
            }}
          >
            {'>'} {loaderTexts?.titleLabel ?? 'ARTIST.SYS v2.0'} {'<'}
          </motion.div>
        </div>
        
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center w-full max-w-2xl px-4"
        >
          <div className="mb-6 h-8">
            <AnimatePresence mode="wait">
              <motion.p
                key={loadingStage}
                initial={{ opacity: 0, y: 10, filter: 'blur(4px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, y: -10, filter: 'blur(4px)' }}
                transition={{ duration: 0.3 }}
                className="text-primary font-mono text-sm uppercase tracking-widest text-chromatic"
              >
                {'// '}{messages[loadingStage]}
              </motion.p>
            </AnimatePresence>
          </div>
          
          <div className="space-y-3">
            <div className="relative">
              <div className="absolute -top-6 left-0 font-mono text-xs text-muted-foreground">
                0x0000
              </div>
              <div className="absolute -top-6 right-0 font-mono text-xs text-muted-foreground">
                0xFFFF
              </div>
              
              <div className="flex items-center justify-center gap-3">
                <div className="flex-1 h-2 bg-border/20 relative overflow-hidden border border-primary/20">
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-primary via-accent to-primary"
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: loadingProgress / 100 }}
                    style={{ transformOrigin: 'left' }}
                    transition={{ duration: 0.3 }}
                  />
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                    animate={{ x: ['-100%', '200%'] }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                  />
                  
                  {[...Array(10)].map((_, i) => (
                    <div
                      key={i}
                      className="absolute top-0 bottom-0 w-px bg-background/50"
                      style={{ left: `${i * 10}%` }}
                    />
                  ))}
                </div>
                <motion.span
                  className="text-primary font-mono text-sm min-w-[4ch] tabular-nums"
                  animate={{
                    textShadow: [
                      `0 0 10px color-mix(in srgb, ${primaryColor} 50%, transparent)`,
                      `0 0 20px color-mix(in srgb, ${primaryColor} 80%, transparent)`,
                      `0 0 10px color-mix(in srgb, ${primaryColor} 50%, transparent)`,
                    ],
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                  }}
                >
                  {Math.floor(loadingProgress)}%
                </motion.span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 mt-6 font-mono text-xs text-muted-foreground">
              {systemCheckLabels.map((label, idx) => {
                const threshold = idx === 0 ? 10 : idx === 1 ? 40 : 70
                return (
                  <motion.div
                    key={label}
                    className="flex items-center gap-1"
                    animate={{ opacity: loadingProgress > threshold ? 1 : 0.3 }}
                  >
                    <motion.span
                      animate={{
                        color: loadingProgress > threshold ? primaryColor : 'oklch(0.6 0 0)',
                      }}
                    >
                      ▸
                    </motion.span>
                    <span>{label}</span>
                    {loadingProgress > threshold && <span className="text-primary">✓</span>}
                  </motion.div>
                )
              })}
            </div>
          </div>
        </motion.div>
      </motion.div>

      <div className="absolute bottom-8 left-8 font-mono text-xs text-muted-foreground opacity-50">
        <div>{loaderTexts?.buildInfo ?? 'BUILD: 2077.v1.23'}</div>
        <div>{loaderTexts?.platformInfo ?? 'PLATFORM: WEB.NEURAL'}</div>
      </div>

      <div className="absolute bottom-8 right-8 font-mono text-xs text-muted-foreground opacity-50">
        <motion.div
          animate={{ opacity: [0.3, 0.7, 0.3] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          {loaderTexts?.connectionStatus ?? 'CONNECTION: SECURE'}
        </motion.div>
      </div>
    </motion.div>
  )
})
