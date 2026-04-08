import { motion, AnimatePresence } from 'framer-motion'
import { useEffect, useState, memo } from 'react'
import { cacheImage } from '@/lib/image-cache'
import type { LoaderTexts, LoadingScreenMode } from '@/lib/types'

interface MinimalBarLoaderProps {
  onLoadComplete: () => void
  precacheUrls?: string[]
  loaderTexts?: LoaderTexts
  mode?: LoadingScreenMode
  duration?: number
}

const MinimalBarLoader = memo(function MinimalBarLoader({
  onLoadComplete,
  precacheUrls = [],
  loaderTexts,
  mode = 'real',
  duration = 3,
}: MinimalBarLoaderProps) {
  const [progress, setProgress] = useState(0)
  const [cachingDone, setCachingDone] = useState(precacheUrls.length === 0)

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
      const t = setTimeout(() => onLoadComplete(), 600)
      return () => clearTimeout(t)
    }
  }, [progress, cachingDone, mode, onLoadComplete])

  const label = loaderTexts?.titleLabel ?? 'LOADING'

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className="fixed inset-0 z-[9999] bg-background flex flex-col items-center justify-center overflow-hidden"
    >
      <div className="w-full max-w-sm px-8 space-y-6">
        <motion.div
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="font-mono text-xs text-primary uppercase tracking-[0.3em] text-center"
        >
          {label}
        </motion.div>

        <div className="relative h-px bg-border/30">
          <motion.div
            className="absolute inset-y-0 left-0 bg-primary"
            style={{ width: `${progress}%` }}
            transition={{ duration: 0.2 }}
          />
          <motion.div
            className="absolute inset-y-[-1px] bg-primary/50 blur-sm"
            style={{ width: `${progress}%` }}
            transition={{ duration: 0.2 }}
          />
        </div>

        <div className="flex justify-between font-mono text-[10px] text-muted-foreground">
          <span>0x0000</span>
          <span className="text-primary">{Math.floor(progress)}%</span>
          <span>0xFFFF</span>
        </div>
      </div>
    </motion.div>
  )
})

export default MinimalBarLoader
