import React, { type ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from '@phosphor-icons/react'

interface ThemeModalWrapperProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: ReactNode
}

export default function ThemeModalWrapper({
  isOpen,
  onClose,
  title,
  children
}: ThemeModalWrapperProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 bg-black/90 z-[100] backdrop-blur-sm"
            style={{
              background: `
                repeating-linear-gradient(
                  0deg,
                  rgba(255, 255, 255, 0.01) 0px,
                  rgba(0, 0, 0, 0.2) 1px,
                  rgba(0, 0, 0, 0.2) 2px,
                  rgba(255, 255, 255, 0.01) 3px
                ),
                radial-gradient(ellipse at center, transparent 0%, rgba(0, 0, 0, 0.3) 100%)
              `
            }}
            onClick={onClose}
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-[101] flex items-center justify-center p-4 md:p-8 pointer-events-none"
            style={{ perspective: '1000px' }}
          >
            <motion.div 
              initial={{ boxShadow: '0 0 0px rgba(180, 50, 50, 0)' }}
              animate={{ 
                boxShadow: [
                  '0 0 20px oklch(0.55 0.25 25 / 0.3)',
                  '0 0 40px oklch(0.55 0.25 25 / 0.4)',
                  '0 0 20px oklch(0.55 0.25 25 / 0.3)',
                ]
              }}
              transition={{ 
                duration: 2,
                repeat: Infinity,
                ease: 'easeInOut'
              }}
              className="relative max-w-4xl w-full bg-background/98 border border-primary/30 pointer-events-auto overflow-hidden max-h-[90vh] zardonic-theme-scanline-effect zardonic-theme-cyber-card"
              onClick={(e) => e.stopPropagation()}
            >
              {/* HUD Corners */}
              <motion.div 
                className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-primary"
                initial={{ opacity: 0, x: -10, y: -10 }}
                animate={{ opacity: 1, x: 0, y: 0 }}
                transition={{ delay: 0.15, duration: 0.3 }}
              />
              <motion.div 
                className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-primary"
                initial={{ opacity: 0, x: 10, y: -10 }}
                animate={{ opacity: 1, x: 0, y: 0 }}
                transition={{ delay: 0.2, duration: 0.3 }}
              />
              <motion.div 
                className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-primary"
                initial={{ opacity: 0, x: -10, y: 10 }}
                animate={{ opacity: 1, x: 0, y: 0 }}
                transition={{ delay: 0.25, duration: 0.3 }}
              />
              <motion.div 
                className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-primary"
                initial={{ opacity: 0, x: 10, y: 10 }}
                animate={{ opacity: 1, x: 0, y: 0 }}
                transition={{ delay: 0.3, duration: 0.3 }}
              />
              
              {/* System Label */}
              <motion.div 
                className="absolute top-2 left-1/2 -translate-x-1/2"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35, duration: 0.3 }}
              >
                <div className="zardonic-theme-data-label">// SYSTEM.INTERFACE.v2.0</div>
              </motion.div>

              {/* Top/Bottom Bars */}
              <motion.div 
                className="absolute top-0 left-0 right-0 h-1 bg-primary/20"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 0.4, delay: 0.1 }}
                style={{ transformOrigin: 'left' }}
              />
              <motion.div 
                className="absolute bottom-0 left-0 right-0 h-1 bg-primary/20"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 0.4, delay: 0.15 }}
                style={{ transformOrigin: 'right' }}
              />

              {/* Content */}
              <div className="relative overflow-y-auto max-h-[90vh] p-8 md:p-12 pt-12">
                <button
                  onClick={onClose}
                  className="absolute top-4 right-4 text-foreground hover:text-primary transition-colors"
                  style={{ zIndex: 'var(--z-content)' } as React.CSSProperties}
                >
                  <X className="w-6 h-6" />
                </button>

                {title && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="mb-6"
                  >
                    <div className="zardonic-theme-data-label mb-2">// MODAL.CONTENT</div>
                    <h2 className="text-4xl md:text-5xl font-bold uppercase mb-4 zardonic-theme-hover-chromatic">
                      {title}
                    </h2>
                  </motion.div>
                )}

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5, duration: 0.6 }}
                >
                  {children}
                </motion.div>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
