import { useState, useEffect, useMemo, useRef } from 'react'
import type React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { X } from '@phosphor-icons/react'
import type { AdminSettings } from '@/lib/types'
import type { CyberpunkOverlayState } from '@/lib/app-types'
import {
  OVERLAY_LOADING_TEXT_INTERVAL_MS,
  OVERLAY_GLITCH_PHASE_DELAY_MS,
  OVERLAY_REVEAL_PHASE_DELAY_MS,
} from '@/lib/config'
import { getRandomOverlayAnimation } from '@/lib/overlay-animations'
import { getRandomProgressiveMode } from '@/lib/progressive-overlay-modes'
import { ImpressumOverlayContent } from '@/components/overlays/ImpressumOverlayContent'
import { PrivacyOverlayContent } from '@/components/overlays/PrivacyOverlayContent'
import { ContactOverlayContent } from '@/components/overlays/ContactOverlayContent'
import { MemberOverlayContent } from '@/components/overlays/MemberOverlayContent'
import { GigOverlayContent } from '@/components/overlays/GigOverlayContent'
import { ReleaseOverlayContent } from '@/components/overlays/ReleaseOverlayContent'

const OVERLAY_LOADING_TEXTS = [
  '> ACCESSING PROFILE...',
  '> DECRYPTING DATA...',
  '> IDENTITY VERIFIED',
]

interface CyberpunkOverlayProps {
  overlay: CyberpunkOverlayState | null
  onClose: () => void
  adminSettings: AdminSettings | undefined
  artistName?: string
}

export default function CyberpunkOverlay({ overlay, onClose, adminSettings, artistName = '' }: CyberpunkOverlayProps) {
  const [overlayPhase, setOverlayPhase] = useState<'loading' | 'glitch' | 'revealed'>('loading')
  const [loadingText, setLoadingText] = useState(OVERLAY_LOADING_TEXTS[0])
  const [progressiveMode, setProgressiveMode] = useState(() => getRandomProgressiveMode())
  const decorativeTexts = adminSettings?.decorative

  // Use a ref so the progressive modes config is always current inside the effect
  // without it being a dependency — prevents a re-run (and phase reset) whenever
  // adminSettings changes while the overlay is already open.
  const progressiveOverlayModesRef = useRef(adminSettings?.progressiveOverlayModes)
  // Update the ref after every render so the effect always reads the latest value.
  // This pattern (assigning .current in render) is safe: refs are not reactive.
  progressiveOverlayModesRef.current = adminSettings?.progressiveOverlayModes

  // Pick a new random animation each time the overlay opens (overlay goes null→truthy).
  // NOTE: `overlay` is intentionally in the dep array even though getRandomOverlayAnimation()
  // does not close over it — we rely on the reference change to trigger a new random pick.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const anim = useMemo(() => getRandomOverlayAnimation(), [overlay])
  const systemLabel = decorativeTexts?.overlaySystemLabel ?? `// ${artistName ? `${artistName.toUpperCase()}.NET` : 'SYSTEM.INTERFACE'} // v${typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '1.0.0'}`

  useEffect(() => {
    if (!overlay) return
    // Pick a new random progressive content reveal mode using the ref so this
    // effect only re-runs when `overlay` itself changes, not when adminSettings
    // updates (which would reset the phase and create an endless loading loop).
    setProgressiveMode(getRandomProgressiveMode(progressiveOverlayModesRef.current))

    setOverlayPhase('loading')
    setLoadingText(OVERLAY_LOADING_TEXTS[0])

    let idx = 0
    const txtInterval = setInterval(() => {
      idx += 1
      if (idx <= OVERLAY_LOADING_TEXTS.length - 1) {
        setLoadingText(OVERLAY_LOADING_TEXTS[idx])
      }
    }, OVERLAY_LOADING_TEXT_INTERVAL_MS)

    const glitchTimer = setTimeout(() => {
      clearInterval(txtInterval)
      setOverlayPhase('glitch')
    }, OVERLAY_GLITCH_PHASE_DELAY_MS)

    const revealTimer = setTimeout(() => {
      setOverlayPhase('revealed')
    }, OVERLAY_REVEAL_PHASE_DELAY_MS)

    return () => {
      clearInterval(txtInterval)
      clearTimeout(glitchTimer)
      clearTimeout(revealTimer)
    }
  }, [overlay])

  return (
    <AnimatePresence>
      {overlay && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={anim.backdrop.initial}
            animate={anim.backdrop.animate}
            exit={anim.backdrop.exit}
            transition={anim.backdrop.transition ?? { duration: 0.3 }}
            className="fixed inset-0 bg-black/90 backdrop-blur-sm cyberpunk-overlay-bg"
            style={{ zIndex: 'var(--z-modal-backdrop)' } as React.CSSProperties}
            onClick={onClose}
          />

          {/* Modal container */}
          <motion.div
            initial={anim.modal.initial}
            animate={anim.modal.animate}
            exit={anim.modal.exit}
            transition={anim.modal.transition ?? { duration: 0.3 }}
            className="fixed inset-0 flex items-center justify-center p-4 md:p-8 pointer-events-none"
            style={{ zIndex: 'var(--z-overlay)', perspective: '1000px' } as React.CSSProperties}
          >
            <motion.div
              initial={{ boxShadow: '0 0 0px rgba(0, 0, 0, 0)' }}
              animate={{
                boxShadow: [
                  `0 0 20px ${adminSettings?.design?.theme?.modalGlowColor ?? 'rgba(180, 50, 50, 0.3)'}`,
                  `0 0 40px ${adminSettings?.design?.theme?.modalGlowColor ?? 'rgba(180, 50, 50, 0.4)'}`,
                  `0 0 20px ${adminSettings?.design?.theme?.modalGlowColor ?? 'rgba(180, 50, 50, 0.3)'}`,
                ],
              }}
              data-theme-color="card card-foreground border"
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              className="relative max-w-4xl w-full bg-background/98 border border-primary/30 pointer-events-auto overflow-hidden max-h-[90vh] flex flex-col scanline-effect cyber-card"
              style={{ borderRadius: 'var(--radius)' } as React.CSSProperties}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Corner decorations */}
              <motion.div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-primary" initial={{ opacity: 0, x: -10, y: -10 }} animate={{ opacity: 1, x: 0, y: 0 }} transition={{ delay: 0.15, duration: 0.3 }} />
              <motion.div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-primary" initial={{ opacity: 0, x: 10, y: -10 }} animate={{ opacity: 1, x: 0, y: 0 }} transition={{ delay: 0.2, duration: 0.3 }} />
              <motion.div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-primary" initial={{ opacity: 0, x: -10, y: 10 }} animate={{ opacity: 1, x: 0, y: 0 }} transition={{ delay: 0.25, duration: 0.3 }} />
              <motion.div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-primary" initial={{ opacity: 0, x: 10, y: 10 }} animate={{ opacity: 1, x: 0, y: 0 }} transition={{ delay: 0.3, duration: 0.3 }} />

              {/* Top label */}
              <motion.div className="absolute top-2 left-1/2 -translate-x-1/2" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35, duration: 0.3 }}>
                <div className="data-label">{systemLabel}</div>
              </motion.div>

              {/* Scan lines */}
              <motion.div className="absolute top-0 left-0 right-0 h-1 bg-primary/20" initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 0.4, delay: 0.1 }} style={{ transformOrigin: 'left' }} />
              <motion.div className="absolute bottom-0 left-0 right-0 h-1 bg-primary/20" initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 0.4, delay: 0.15 }} style={{ transformOrigin: 'right' }} />

              {/* Content phases */}
              <div className="relative overflow-y-auto flex-1 min-h-0">
                {overlayPhase === 'loading' && (
                  <div className="flex items-center justify-center min-h-[400px]">
                    <motion.span className="progressive-loading-label text-primary font-mono text-lg" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                      {loadingText}
                    </motion.span>
                  </div>
                )}

                {overlayPhase === 'glitch' && (
                  <div className="flex items-center justify-center min-h-[400px]">
                    <motion.div className="glitch-effect text-primary font-mono text-lg" initial={{ opacity: 0 }} animate={{ opacity: [0, 1, 0, 1, 0, 1] }} transition={{ duration: 0.2 }}>
                      {loadingText}
                    </motion.div>
                  </div>
                )}

                {overlayPhase === 'revealed' && (
                  <div className="p-8 md:p-12 pt-12">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-4 right-4 text-foreground hover:text-primary hover:bg-primary/10 z-10"
                      onClick={onClose}
                    >
                      <X className="w-6 h-6" />
                    </Button>

                    <AnimatePresence mode="wait">
                      {overlayPhase === 'revealed' && (
                        <motion.div
                          key={overlay.type}
                          className={progressiveMode.className}
                          initial={progressiveMode.containerVariants.loading}
                          animate={progressiveMode.containerVariants.loaded}
                          transition={progressiveMode.transition}
                        >
                          {overlay.type === 'impressum' && (
                            <ImpressumOverlayContent adminSettings={adminSettings} onClose={onClose} decorativeTexts={decorativeTexts} />
                          )}

                          {overlay.type === 'privacy' && (
                            <PrivacyOverlayContent adminSettings={adminSettings} artistName={artistName} decorativeTexts={decorativeTexts} />
                          )}

                          {overlay.type === 'contact' && (
                            <ContactOverlayContent adminSettings={adminSettings} decorativeTexts={decorativeTexts} />
                          )}

                          {overlay.type === 'member' && overlay.data && (
                            <MemberOverlayContent data={overlay.data} decorativeTexts={decorativeTexts} />
                          )}

                          {overlay.type === 'gig' && overlay.data && (
                            <GigOverlayContent data={overlay.data} artistName={artistName} decorativeTexts={decorativeTexts} />
                          )}

                          {overlay.type === 'release' && overlay.data && (
                            <ReleaseOverlayContent data={overlay.data} sectionLabels={adminSettings?.labels} mainArtistName={artistName} />
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
