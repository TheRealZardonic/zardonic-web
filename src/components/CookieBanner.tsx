import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export default function CookieBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const consent = localStorage.getItem('nk-cookie-consent')
    if (!consent) {
      const timer = setTimeout(() => setVisible(true), 1500)
      return () => clearTimeout(timer)
    }
  }, [])

  const handleAccept = () => {
    localStorage.setItem('nk-cookie-consent', 'accepted')
    setVisible(false)
  }

  const handleDecline = () => {
    localStorage.setItem('nk-cookie-consent', 'declined')
    setVisible(false)
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:bottom-6 md:max-w-md z-[9998] pointer-events-auto"
        >
          <div className="relative bg-card/95 backdrop-blur-md border border-primary/30 hud-corner overflow-hidden">
            <span className="corner-bl"></span>
            <span className="corner-br"></span>

            {/* Subtle scanline */}
            <div className="absolute inset-0 pointer-events-none opacity-10"
              style={{
                backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 2px, oklch(0.50 0.22 25 / 0.15) 2px, oklch(0.50 0.22 25 / 0.15) 3px)`
              }}
            />

            {/* Top accent line */}
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />

            <div className="relative p-4 md:p-5">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-2 h-2 bg-primary rounded-full animate-pulse mt-1 flex-shrink-0" style={{ boxShadow: '0 0 6px var(--color-primary)' }} />
                <div>
                  <p className="font-mono text-[10px] text-primary/60 tracking-wider mb-1">SYSTEM_NOTICE</p>
                  <p className="font-mono text-xs text-foreground/80 leading-relaxed">
                    Diese Website verwendet technisch notwendige lokale Speicherung (Local Storage, IndexedDB) für Einstellungen und Bildcaching. Es werden keine Tracking-Cookies gesetzt. Weitere Informationen finden Sie in unserer Datenschutzerklärung.
                  </p>
                </div>
              </div>

              <div className="flex gap-2 justify-end">
                <button
                  onClick={handleDecline}
                  className="font-mono text-[10px] md:text-xs text-muted-foreground/50 hover:text-foreground/70 transition-colors px-3 py-1.5 border border-border/50 hover:border-border tracking-wider"
                >
                  ABLEHNEN
                </button>
                <button
                  onClick={handleAccept}
                  className="font-mono text-[10px] md:text-xs text-primary-foreground bg-primary/80 hover:bg-primary transition-colors px-3 py-1.5 border border-primary/50 tracking-wider"
                  style={{ boxShadow: '0 0 8px var(--color-primary, oklch(0.50 0.22 25))' }}
                >
                  AKZEPTIEREN
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
