import { motion } from 'framer-motion'
import { User } from '@phosphor-icons/react'
import CyberCloseButton from '@/components/CyberCloseButton'
import ConsoleLines from '@/components/ConsoleLines'
import { toDirectImageUrl } from '@/lib/image-cache'
import { useState, useRef, useEffect } from 'react'
import type { SectionLabels } from '@/lib/types'
import {
  CONSOLE_TYPING_SPEED_MS,
  CONSOLE_LINE_DELAY_MS,
  PROFILE_LOADING_TEXT_INTERVAL_MS,
  PROFILE_GLITCH_PHASE_DELAY_MS,
  PROFILE_REVEAL_PHASE_DELAY_MS,
} from '@/lib/config'

const LOADING_TEXTS = [
  '> ACCESSING PROFILE...',
  '> DECRYPTING DATA...',
  '> IDENTITY VERIFIED',
]

export interface ProfileOverlayProps {
  name: string
  photoUrl?: string
  resolvePhoto?: (url: string) => string
  dataLines: string[]
  onClose: () => void
  sectionLabels?: SectionLabels
  /** Extra content rendered below the console output (e.g. social links) */
  children?: React.ReactNode
}

/** Shared cyberpunk profile overlay with loading→glitch→reveal phases */
export default function ProfileOverlay({ name, photoUrl, resolvePhoto, dataLines, onClose, sectionLabels, children }: ProfileOverlayProps) {
  const [phase, setPhase] = useState<'loading' | 'glitch' | 'revealed'>('loading')
  const [loadingText, setLoadingText] = useState(LOADING_TEXTS[0])
  const [photoLoaded, setPhotoLoaded] = useState(false)
  const [photoSrc, setPhotoSrc] = useState('')
  const proxyAttempted = useRef(false)

  useEffect(() => {
    if (!photoUrl) return
    const cached = resolvePhoto?.(photoUrl)
    if (cached && cached !== photoUrl) {
      setPhotoSrc(cached)
    } else {
      setPhotoSrc(toDirectImageUrl(photoUrl))
    }
  }, [photoUrl, resolvePhoto])

  useEffect(() => {
    let idx = 0
    const txtInterval = setInterval(() => {
      idx += 1
      if (idx < LOADING_TEXTS.length) {
        setLoadingText(LOADING_TEXTS[idx])
      }
    }, PROFILE_LOADING_TEXT_INTERVAL_MS)

    const glitchTimer = setTimeout(() => {
      clearInterval(txtInterval)
      setPhase('glitch')
    }, PROFILE_GLITCH_PHASE_DELAY_MS)

    const revealTimer = setTimeout(() => setPhase('revealed'), PROFILE_REVEAL_PHASE_DELAY_MS)

    return () => {
      clearInterval(txtInterval)
      clearTimeout(glitchTimer)
      clearTimeout(revealTimer)
    }
  }, [])

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  return (
    <motion.div
      key="profile-overlay"
      className="fixed inset-0 z-[9999] bg-black/95 backdrop-blur-md overflow-y-auto flex items-center justify-center p-4 md:p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="absolute inset-0 hud-scanline opacity-20 pointer-events-none" />

      {phase === 'loading' && (
        <motion.div
          className="flex flex-col items-center gap-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="w-16 h-1 bg-primary/30 overflow-hidden">
            <motion.div
              className="h-full bg-primary"
              animate={{ width: ['0%', '100%'] }}
              transition={{ duration: 0.7, ease: 'easeInOut' }}
            />
          </div>
          <p className="text-primary/70 font-mono text-xs tracking-wider">{loadingText}</p>
        </motion.div>
      )}

      {phase !== 'loading' && (
        <motion.div
          className={`w-full max-w-3xl bg-card border relative overflow-hidden glitch-overlay-enter ${
            phase === 'glitch' ? 'border-primary red-glitch-element' : 'border-primary/30'
          }`}
          initial={{ scale: 0.85, y: 30, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.85, y: 30, opacity: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* HUD corner accents */}
          <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-primary/50" />
          <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-primary/50" />
          <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-primary/50" />
          <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-primary/50" />

          {/* Header bar */}
          <div className="h-10 bg-primary/10 border-b border-primary/30 flex items-center justify-between px-4">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span className="font-mono text-[10px] text-primary/70 tracking-wider uppercase">PROFILE // {name.toUpperCase()}</span>
            </div>
            <CyberCloseButton
              onClick={onClose}
              label={sectionLabels?.closeButtonText || 'CLOSE'}
            />
          </div>

          <div className="flex flex-col md:flex-row">
            {/* Left: Photo */}
            <div className="md:w-2/5 p-4 md:p-6 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-primary/20">
              <motion.div
                className="relative w-full max-w-[220px] aspect-square"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.4, delay: 0.1 }}
              >
                {photoUrl && photoSrc ? (
                  <div className="w-full h-full overflow-hidden border border-primary/40 shadow-[0_0_20px_oklch(0.50_0.22_25/0.3),0_0_40px_oklch(0.50_0.22_25/0.15)] bg-black">
                    {!photoLoaded && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center z-[1] bg-black">
                        <div className="w-3/4 h-[2px] bg-primary/20 overflow-hidden mb-1">
                          <div className="h-full bg-primary animate-progress-bar" />
                        </div>
                        <p className="text-[8px] font-mono text-primary/40 tracking-wider">LOADING IMG...</p>
                      </div>
                    )}
                    <img
                      src={photoSrc}
                      alt={name}
                      className="w-full h-full object-contain"
                      style={{ opacity: photoLoaded ? 1 : 0, transition: 'opacity 0.3s ease-in' }}
                      onLoad={() => setPhotoLoaded(true)}
                      onError={() => {
                        if (photoUrl && !proxyAttempted.current) {
                          proxyAttempted.current = true
                          const directUrl = toDirectImageUrl(photoUrl)
                          setPhotoSrc(`/api/image-proxy?url=${encodeURIComponent(directUrl)}`)
                        }
                      }}
                    />
                    <div className="absolute inset-0 hud-scanline pointer-events-none opacity-20" />
                    <div className="dot-matrix-photo" />
                  </div>
                ) : (
                  <div className="w-full h-full bg-muted flex items-center justify-center border border-primary/40">
                    <User size={72} className="text-muted-foreground" />
                  </div>
                )}
                {/* Corner brackets */}
                <div className="absolute top-0 left-0 w-3 h-3 border-t border-l border-primary/60" />
                <div className="absolute top-0 right-0 w-3 h-3 border-t border-r border-primary/60" />
                <div className="absolute bottom-0 left-0 w-3 h-3 border-b border-l border-primary/60" />
                <div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-primary/60" />
              </motion.div>
            </div>

            {/* Right: Terminal-style data readout */}
            <div className="md:w-3/5 p-4 md:p-6">
              <motion.div
                className="font-mono space-y-3"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: 0.2 }}
              >
                <div className="text-[10px] text-primary/50 tracking-wider mb-3">
                  {'>'} TERMINAL OUTPUT // PROFILE DATA
                </div>
                <div className="bg-black/50 border border-primary/20 p-4 h-[200px] max-h-[40vh] overflow-y-auto">
                  <ConsoleLines lines={dataLines} speed={CONSOLE_TYPING_SPEED_MS} delayBetween={CONSOLE_LINE_DELAY_MS} />
                </div>
                {children}
                <div className="flex items-center gap-2 text-[9px] text-primary/40 pt-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-pulse" />
                  <span>{sectionLabels?.sessionStatusText || 'SESSION ACTIVE'}</span>
                  <span className="ml-auto">NK-SYS v1.3.37</span>
                </div>
              </motion.div>
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  )
}
