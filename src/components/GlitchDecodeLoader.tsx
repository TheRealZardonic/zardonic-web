import { motion, AnimatePresence } from 'framer-motion'
import { useEffect, useState, useRef, memo } from 'react'
import { cacheImage } from '@/lib/image-cache'
import type { LoaderTexts, LoadingScreenMode } from '@/lib/types'

interface GlitchDecodeLoaderProps {
  onLoadComplete: () => void
  precacheUrls?: string[]
  loaderTexts?: LoaderTexts
  mode?: LoadingScreenMode
  duration?: number
}

const GLITCH_CHARS = '!@#$%^&*()[]{}<>/\\|;:,.~`±§ÄÖÜäöü01█▓▒░'

function randomChar() {
  return GLITCH_CHARS[Math.floor(Math.random() * GLITCH_CHARS.length)]
}

function decodeString(target: string, revealedCount: number): string {
  return target
    .split('')
    .map((ch, i) => {
      if (ch === ' ') return ' '
      if (i < revealedCount) return ch
      return randomChar()
    })
    .join('')
}

const GlitchDecodeLoader = memo(function GlitchDecodeLoader({
  onLoadComplete,
  precacheUrls = [],
  loaderTexts,
  mode = 'real',
  duration = 3,
}: GlitchDecodeLoaderProps) {
  const [progress, setProgress] = useState(0)
  const [cachingDone, setCachingDone] = useState(precacheUrls.length === 0)
  const [displayTitle, setDisplayTitle] = useState('')
  const titleRef = useRef(0)

  const targetTitle = loaderTexts?.titleLabel ?? 'SYSTEM BOOT'

  // Decode animation for title
  useEffect(() => {
    setDisplayTitle(decodeString(targetTitle, 0))
    const id = setInterval(() => {
      titleRef.current = Math.min(titleRef.current + 1, targetTitle.length)
      setDisplayTitle(decodeString(targetTitle, titleRef.current))
      if (titleRef.current >= targetTitle.length) clearInterval(id)
    }, 80)
    return () => clearInterval(id)
  }, [targetTitle])

  useEffect(() => {
    if (mode === 'timed') {
      const totalMs = (duration ?? 3) * 1000
      const intervalMs = 50
      const increment = 100 / (totalMs / intervalMs)
      const id = setInterval(() => setProgress(p => Math.min(p + increment, 100)), intervalMs)
      return () => clearInterval(id)
    }
    const id = setInterval(() => {
      setProgress(p => {
        if (p >= 95) return p
        return Math.min(p + (p < 50 ? 3 : p < 80 ? 1.5 : 0.5), 95)
      })
    }, 100)
    return () => clearInterval(id)
  }, [mode, duration])

  useEffect(() => {
    if (precacheUrls.length === 0) { setCachingDone(true); return }
    setCachingDone(false)
    let cancelled = false
    Promise.allSettled(precacheUrls.map(url => cacheImage(url))).then(() => { if (!cancelled) setCachingDone(true) })
    return () => { cancelled = true }
  }, [precacheUrls])

  useEffect(() => {
    if (mode === 'timed') return
    if (cachingDone && progress >= 90) setProgress(100)
  }, [cachingDone, progress, mode])

  useEffect(() => {
    if (progress >= 100 && (mode === 'timed' || cachingDone)) {
      const t = setTimeout(() => onLoadComplete(), 800)
      return () => clearTimeout(t)
    }
  }, [progress, cachingDone, mode, onLoadComplete])

  const pct = Math.floor(progress)
  const barCols = 40
  const filled = Math.floor((pct / 100) * barCols)

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, filter: 'blur(8px)' }}
      transition={{ duration: 0.5 }}
      className="fixed inset-0 z-[9999] bg-background flex flex-col items-center justify-center overflow-hidden"
    >
      {/* Scanline */}
      <div className="scanline-effect absolute inset-0 pointer-events-none" />
      <div className="full-page-noise periodic-noise-glitch pointer-events-none" />

      <div className="relative z-10 font-mono text-sm text-primary px-8 w-full max-w-2xl space-y-4">
        {/* Glitch title */}
        <motion.div
          className="text-2xl md:text-4xl font-bold tracking-widest uppercase text-chromatic"
          animate={{ x: progress < 100 ? [0, -2, 1, 0] : 0 }}
          transition={{ duration: 0.15, repeat: progress < 100 ? Infinity : 0, repeatDelay: 1.2 }}
        >
          {displayTitle}
        </motion.div>

        {/* Progress bar - block style */}
        <div className="space-y-1">
          <div className="text-[11px] text-muted-foreground flex justify-between">
            <span>{'// BOOT SEQUENCE'}</span>
            <span>{pct}%</span>
          </div>
          <div className="text-primary tracking-[0.15em]">
            {'['}
            {Array.from({ length: barCols }).map((_, i) => (
              <span key={i} style={{ opacity: i < filled ? 1 : 0.2 }}>
                {i < filled ? '█' : '░'}
              </span>
            ))}
            {']'}
          </div>
        </div>

        {/* Status lines */}
        <div className="space-y-1 text-[11px] text-muted-foreground">
          <AnimatePresence mode="wait">
            <motion.div
              key={Math.floor(progress / 20)}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              {'> '}
              {progress < 20
                ? 'LOADING FONT FAMILIES'
                : progress < 40
                ? 'FETCHING EVENT DATA'
                : progress < 60
                ? 'PARSING RELEASE CATALOG'
                : progress < 80
                ? 'INIT RENDER PIPELINE'
                : progress < 100
                ? 'FINALIZE BOOT SEQUENCE'
                : 'ACCESS GRANTED'}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Hex addresses */}
        <div className="text-[10px] text-muted-foreground/50 flex gap-6">
          <span>PTR: 0x{Math.floor(progress * 655.35).toString(16).toUpperCase().padStart(4, '0')}</span>
          <span>BUF: {barCols - filled} SECTORS</span>
        </div>
      </div>
    </motion.div>
  )
})

export default GlitchDecodeLoader
