import { motion } from 'framer-motion'
import { useEffect, useState, useRef, useMemo } from 'react'
import logoImage from '@/assets/images/baphomet no text.svg'
import {
  LOADER_PROGRESS_INCREMENT_MULTIPLIER,
  LOADER_COMPLETE_DELAY_MS,
  LOADER_PROGRESS_INTERVAL_MS,
} from '@/lib/config'
import { cacheImage } from '@/lib/image-cache'
import type { LoaderTexts } from '@/lib/types'

interface CyberpunkLoaderProps {
  onLoadComplete: () => void
  precacheUrls?: string[]
  loaderTexts?: LoaderTexts
}

const DEFAULT_HACKING_TEXTS = [
  '> INITIALIZING RENDER ENGINE...',
  '> LOADING FONT FAMILIES...',
  '> ESTABLISHING API LINK...',
  '> FETCHING EVENT DATA...',
  '> COMPILING AUDIO EMBEDS...',
  '> SYNCING RELEASE CATALOG...',
  '> ACTIVATING HUD OVERLAY...',
  '> LOADING GALLERY ASSETS...',
  '> PROCESSING THEME VARS...',
  '> CALIBRATING SCROLL ENGINE...',
  '> FINALIZING BOOT SEQUENCE...',
  '> SYSTEM ONLINE // ACCESS GRANTED'
]

/** Build version string from Vite defines */
const APP_VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '1.0.0'
const GIT_HASH = typeof __GIT_HASH__ !== 'undefined' ? __GIT_HASH__ : 'dev'

const DEFAULT_CODE_FRAGMENTS = [
  'fn init_renderer() -> Result<()> {',
  '  let theme = load_css_vars();',
  '  hud.render(metrics)?;',
  '  audio.connect(output)?;',
  '  events.sync(bandsintown)?;',
  `const VERSION = "${APP_VERSION}";`,
  'import { useRealMetrics } from hooks;',
  'export default App;',
  'syscall.exec("vite build")',
  '  releases.fetch(catalog);',
  'class SystemMonitorHUD extends React {',
  '  this.sector = timezone.resolve();',
  '  this.session = crypto.randomUUID();',
  '00110101 01001110 01001011',
  'BUILD: vite.config.ts [OK]',
  'SUBSYS: react-dom [OK]',
  'NODE: framer-motion v11',
  `HASH: 0x${GIT_HASH.toUpperCase().padEnd(8, '0')}`,
  '██████░░░░ 60%',
  '> npm run build',
  'export NODE_ENV=production',
]

const DEFAULT_BOOT_LABEL = `SYS [v${APP_VERSION}] // BOOT SEQUENCE`

export default function CyberpunkLoader({ onLoadComplete, precacheUrls = [], loaderTexts }: CyberpunkLoaderProps) {
  const hackingTexts = useMemo(
    () => (loaderTexts?.hackingTexts?.length ? loaderTexts.hackingTexts : DEFAULT_HACKING_TEXTS),
    [loaderTexts?.hackingTexts]
  )
  const codeFragments = useMemo(
    () => (loaderTexts?.codeFragments?.length ? loaderTexts.codeFragments : DEFAULT_CODE_FRAGMENTS),
    [loaderTexts?.codeFragments]
  )
  const bootLabel = loaderTexts?.bootLabel ?? DEFAULT_BOOT_LABEL
  const [progress, setProgress] = useState(0)
  const [hackingText, setHackingText] = useState(hackingTexts[0])
  const [cachingDone, setCachingDone] = useState(precacheUrls.length === 0)
  const onCompleteRef = useRef(onLoadComplete)
  onCompleteRef.current = onLoadComplete

  const codeFragmentStyles = useMemo(
    () => Array.from({ length: 50 }, () => ({
      opacity: [0.05 + Math.random() * 0.35, 0.05] as [number, number],
      duration: Math.random() * 3 + 1,
      delay: Math.random() * 2,
      translateX: Math.random() * 20 - 10,
    })),
    []
  )

  const hexAddressStyles = useMemo(
    () => Array.from({ length: 8 }, () => ({
      left: `${Math.random() * 90}%`,
      top: `${Math.random() * 90}%`,
      duration: Math.random() * 3 + 2,
      delay: Math.random() * 3,
      text: `0x${Math.random().toString(16).slice(2, 10).toUpperCase().padEnd(8, '0')}`,
    })),
    []
  )

  // Background data caching during the loading screen
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

  // Progress bar animation
  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        const newProgress = prev + Math.random() * LOADER_PROGRESS_INCREMENT_MULTIPLIER
        const progressIndex = Math.floor((newProgress / 100) * hackingTexts.length)
        if (progressIndex < hackingTexts.length) {
          setHackingText(hackingTexts[progressIndex])
        }
        if (prev >= 100) {
          clearInterval(interval)
          return 100
        }
        return Math.min(newProgress, 100)
      })
    }, LOADER_PROGRESS_INTERVAL_MS)

    return () => clearInterval(interval)
  }, [hackingTexts])

  // Complete when both progress animation and background caching are done
  useEffect(() => {
    if (progress >= 100 && cachingDone) {
      const timeout = setTimeout(() => onCompleteRef.current(), LOADER_COMPLETE_DELAY_MS)
      return () => clearTimeout(timeout)
    }
  }, [progress, cachingDone])

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background overflow-hidden"
      exit={{ opacity: 0 }}
      transition={{ duration: 0.8 }}
    >
      {/* Code rain background */}
      <div className="absolute inset-0 opacity-10 pointer-events-none overflow-hidden">
        <div className="text-primary font-mono text-xs leading-tight">
          {Array.from({ length: 50 }).map((_, i) => (
            <motion.div
              key={i}
              className="whitespace-nowrap"
              animate={{ opacity: codeFragmentStyles[i].opacity }}
              transition={{ duration: codeFragmentStyles[i].duration, repeat: Infinity, delay: codeFragmentStyles[i].delay }}
              style={{ 
                transform: `translateX(${codeFragmentStyles[i].translateX}px)`,
              }}
            >
              {codeFragments[i % codeFragments.length]}
            </motion.div>
          ))}
        </div>
      </div>

      {/* Scanline overlay on loader */}
      <div className="absolute inset-0 pointer-events-none z-20">
        <div className="absolute inset-0 hud-scanline opacity-40" />
      </div>

      {/* Floating hex addresses */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {Array.from({ length: 8 }).map((_, i) => (
          <motion.div
            key={`hex-${i}`}
            className="absolute text-primary/10 font-mono text-xs"
            style={{
              left: hexAddressStyles[i].left,
              top: hexAddressStyles[i].top,
            }}
            animate={{ 
              opacity: [0, 0.2, 0],
              y: [0, -30],
            }}
            transition={{ 
              duration: hexAddressStyles[i].duration,
              repeat: Infinity,
              delay: hexAddressStyles[i].delay,
            }}
          >
            {hexAddressStyles[i].text}
          </motion.div>
        ))}
      </div>

      <div className="flex flex-col items-center gap-8 relative z-10">
        <motion.img
          src={logoImage}
          alt="NEUROKLAST"
          className="w-40 h-40 object-contain"
          style={{ 
            filter: 'drop-shadow(0 0 20px oklch(0.50 0.22 25 / 0.4)) drop-shadow(0 0 40px oklch(0.50 0.22 25 / 0.15))',
          }}
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ 
            opacity: [0.7, 1, 0.7],
            scale: 1,
          }}
          transition={{
            opacity: { duration: 2, repeat: Infinity, ease: "easeInOut" },
            scale: { duration: 0.8 },
          }}
        />
        
        <div className="relative w-80 h-2 bg-secondary/30 overflow-hidden border border-primary/20">
          <motion.div
            className="absolute inset-0 bg-primary"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.1 }}
          />
          {/* Glow effect on progress bar */}
          <motion.div
            className="absolute inset-0 bg-primary/30 blur-sm"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.1 }}
          />
        </div>
        
        <div className="flex flex-col gap-3 items-center">
          <motion.div
            className="text-primary font-mono text-base tracking-[0.08em]"
            animate={{ opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            {Math.floor(progress)}%
          </motion.div>
          
          <motion.div
            className="text-primary/50 font-mono text-xs max-w-md text-center h-6"
            key={hackingText}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            {hackingText}
          </motion.div>

          {/* Extra code fragment line */}
          <motion.div
            className="text-primary/20 font-mono text-xs tracking-wider"
            animate={{ opacity: [0.1, 0.3, 0.1] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            {codeFragments[Math.floor(progress / 100 * codeFragments.length) % codeFragments.length]}
          </motion.div>
        </div>
      </div>

      <div className="absolute bottom-8 left-0 right-0 text-center">
        <motion.div
          className="text-muted-foreground/30 font-mono text-xs tracking-[0.08em]"
          animate={{ opacity: [0.2, 0.4, 0.2] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          {bootLabel}
        </motion.div>
      </div>
    </motion.div>
  )
}
