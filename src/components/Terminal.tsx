import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Terminal as TerminalIcon } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import {
  OVERLAY_LOADING_TEXT_INTERVAL_MS,
  OVERLAY_GLITCH_PHASE_DELAY_MS,
  OVERLAY_REVEAL_PHASE_DELAY_MS,
} from '@/lib/config'

const TERMINAL_LOADING_TEXTS = [
  '> ACCESSING TERMINAL...',
  '> DECRYPTING DATA...',
  '> IDENTITY VERIFIED',
]

interface TerminalProps {
  isOpen: boolean
  onClose: () => void
}

export function Terminal({ isOpen, onClose }: TerminalProps) {
  const [input, setInput] = useState('')
  const [history, setHistory] = useState<string[]>([
    '> SYSTEM INITIALIZED',
    '> ACCESS GRANTED',
    '> TYPE "HELP" FOR COMMANDS',
  ])

  // 3-phase terminal loading state
  const [phase, setPhase] = useState<'loading' | 'glitch' | 'revealed'>('loading')
  const [loadingText, setLoadingText] = useState(TERMINAL_LOADING_TEXTS[0])

  useEffect(() => {
    if (!isOpen) return
    
    setPhase('loading')
    setLoadingText(TERMINAL_LOADING_TEXTS[0])
    
    let idx = 0
    const txtInterval = setInterval(() => {
      idx += 1
      if (idx <= TERMINAL_LOADING_TEXTS.length - 1) {
        setLoadingText(TERMINAL_LOADING_TEXTS[idx])
      }
    }, OVERLAY_LOADING_TEXT_INTERVAL_MS)

    const glitchTimer = setTimeout(() => {
      clearInterval(txtInterval)
      setPhase('glitch')
    }, OVERLAY_GLITCH_PHASE_DELAY_MS)

    const revealTimer = setTimeout(() => {
      setPhase('revealed')
    }, OVERLAY_REVEAL_PHASE_DELAY_MS)

    return () => {
      clearInterval(txtInterval)
      clearTimeout(glitchTimer)
      clearTimeout(revealTimer)
    }
  }, [isOpen])

  const handleCommand = (cmd: string) => {
    const command = cmd.toLowerCase().trim()
    const newHistory = [...history, `> ${cmd}`]

    switch (command) {
      case 'help':
        newHistory.push('AVAILABLE COMMANDS:', 'ABOUT - Artist information', 'SOCIAL - Social media links', 'CLEAR - Clear terminal', 'EXIT - Close terminal')
        break
      case 'about':
        newHistory.push('ZARDONIC - METAL & BASS ARTIST', 'GENRE: INDUSTRIAL / DRUM & BASS', 'STATUS: ACTIVE')
        break
      case 'social':
        newHistory.push('INSTAGRAM | FACEBOOK | SPOTIFY | YOUTUBE')
        break
      case 'clear':
        setHistory([])
        setInput('')
        return
      case 'exit':
        onClose()
        return
      default:
        newHistory.push(`UNKNOWN COMMAND: ${cmd}`, 'TYPE "HELP" FOR COMMANDS')
    }

    setHistory(newHistory)
    setInput('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && input) {
      handleCommand(input)
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 bg-black/90 z-[100] backdrop-blur-sm cyberpunk-overlay-bg"
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
                  '0 0 20px rgba(180, 50, 50, 0.3)',
                  '0 0 40px rgba(180, 50, 50, 0.4)',
                  '0 0 20px rgba(180, 50, 50, 0.3)',
                ]
              }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              className="relative w-full max-w-3xl max-h-[80vh] bg-black border border-primary/30 pointer-events-auto overflow-hidden scanline-effect cyber-card"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Cyberpunk corner decorations */}
              <motion.div
                className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-accent"
                initial={{ opacity: 0, x: -10, y: -10 }}
                animate={{ opacity: 1, x: 0, y: 0 }}
                transition={{ delay: 0.15, duration: 0.3 }}
              />
              <motion.div
                className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-accent"
                initial={{ opacity: 0, x: 10, y: -10 }}
                animate={{ opacity: 1, x: 0, y: 0 }}
                transition={{ delay: 0.2, duration: 0.3 }}
              />
              <motion.div
                className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-accent"
                initial={{ opacity: 0, x: -10, y: 10 }}
                animate={{ opacity: 1, x: 0, y: 0 }}
                transition={{ delay: 0.25, duration: 0.3 }}
              />
              <motion.div
                className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-accent"
                initial={{ opacity: 0, x: 10, y: 10 }}
                animate={{ opacity: 1, x: 0, y: 0 }}
                transition={{ delay: 0.3, duration: 0.3 }}
              />

              {/* Top/bottom border scan lines */}
              <motion.div
                className="absolute top-0 left-0 right-0 h-[1px] bg-accent/40"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 0.4, delay: 0.1 }}
                style={{ transformOrigin: 'left' }}
              />
              <motion.div
                className="absolute bottom-0 left-0 right-0 h-[1px] bg-accent/40"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 0.4, delay: 0.15 }}
                style={{ transformOrigin: 'right' }}
              />

              <div className="h-full flex flex-col max-h-[80vh]">
                <div className="flex items-center justify-between p-4 border-b border-accent/30">
                  <div className="flex items-center gap-3">
                    <TerminalIcon className="w-6 h-6 text-accent" weight="fill" />
                    <span className="font-mono text-accent uppercase tracking-wider text-sm">
                      TERMINAL v1.0 // NK-SYS
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <motion.div
                      className="w-2 h-2 rounded-full bg-accent"
                      animate={{ opacity: [1, 0.3, 1] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    />
                    <Button variant="ghost" size="icon" onClick={onClose} className="hover:bg-accent/10">
                      <X className="w-5 h-5 text-accent" />
                    </Button>
                  </div>
                </div>

                {/* 3-phase content loading */}
                <div className="flex-1 overflow-y-auto p-6 font-mono text-sm text-accent space-y-2">
                  {phase === 'loading' && (
                    <div className="flex items-center justify-center h-full">
                      <motion.span 
                        className="text-accent font-mono text-base"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                      >
                        {loadingText}
                      </motion.span>
                    </div>
                  )}
                  {phase === 'glitch' && (
                    <div className="flex items-center justify-center h-full">
                      <motion.div
                        className="glitch-effect text-accent font-mono text-base"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: [0, 1, 0, 1, 0, 1] }}
                        transition={{ duration: 0.4 }}
                      >
                        {loadingText}
                      </motion.div>
                    </div>
                  )}
                  {phase === 'revealed' && (
                    <>
                      {history.map((line, index) => (
                        <motion.div
                          key={index}
                          className="whitespace-pre-wrap"
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.15, delay: index * 0.02 }}
                        >
                          {line}
                        </motion.div>
                      ))}
                      <div className="flex items-center gap-2">
                        <span>{'>'}</span>
                        <input
                          type="text"
                          value={input}
                          onChange={(e) => setInput(e.target.value)}
                          onKeyDown={handleKeyDown}
                          className="flex-1 bg-transparent border-none outline-none text-accent font-mono"
                          autoFocus
                          spellCheck={false}
                        />
                        <span className="animate-pulse">_</span>
                      </div>
                    </>
                  )}
                </div>

                <div className="px-4 py-2 border-t border-accent/20">
                  <div className="flex justify-between font-mono text-[10px] text-accent/40 uppercase tracking-wider">
                    <span>STATUS: CONNECTED</span>
                    <span>ACCESS: GRANTED</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
