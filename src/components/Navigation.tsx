import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { List, X, MusicNote } from '@phosphor-icons/react'
import type { SectionLabels } from '@/lib/types'
import {
  NAV_GLITCH_PROBABILITY,
  NAV_GLITCH_DURATION_MS,
  NAV_GLITCH_INTERVAL_MS,
  NAV_HEIGHT_PX,
} from '@/lib/config'
import MusicPlayer from '@/components/MusicPlayer'
import type { Track } from '@/components/MusicPlayer'
import { useMorseCode } from '@/hooks/use-morse-code'

/** Local tracks served from public/music/ */
const LOCAL_TRACKS: Track[] = [
  { title: 'IGNITE', src: '/music/Neuroklast - IGNITE.mp3' },
  { title: 'LILITH', src: '/music/Neuroklast - LILITH.mp3' },
  { title: 'SUCCUBUS (DFG Edit)', src: '/music/Neuroklast - SUCCUBUS (DFG Edit).mp3' },
  { title: 'DETHRONE', src: '/music/Neuroklast ft Mechanical Vein - DETHRONE.mp3' },
]

interface NavigationProps {
  sectionLabels?: SectionLabels
  terminalMorseCode?: string
  onTerminalActivation?: () => void
}

export default function Navigation({ sectionLabels, terminalMorseCode, onTerminalActivation }: NavigationProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [glitch, setGlitch] = useState(false)
  const [playerOpen, setPlayerOpen] = useState(false)

  const morseHandlers = useMorseCode({
    targetCode: terminalMorseCode || '',
    onMatch: () => onTerminalActivation?.(),
  })

  useEffect(() => {
    const interval = setInterval(() => {
      if (Math.random() > NAV_GLITCH_PROBABILITY) {
        setGlitch(true)
        setTimeout(() => setGlitch(false), NAV_GLITCH_DURATION_MS)
      }
    }, NAV_GLITCH_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [])

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id)
    if (element) {
      const navHeight = NAV_HEIGHT_PX
      const top = element.getBoundingClientRect().top + window.scrollY - navHeight
      window.scrollTo({ top, behavior: 'smooth' })
      setIsMobileMenuOpen(false)
    }
  }

  const navItems = [
    { label: 'HOME', id: 'hero' },
    { label: sectionLabels?.news || 'NEWS', id: 'news' },
    { label: sectionLabels?.biography || 'BIOGRAPHY', id: 'biography' },
    { label: sectionLabels?.gallery || 'GALLERY', id: 'gallery' },
    { label: sectionLabels?.gigs || 'GIGS', id: 'gigs' },
    { label: sectionLabels?.releases || 'RELEASES', id: 'releases' },
    { label: sectionLabels?.media || 'MEDIA', id: 'media' },
    { label: sectionLabels?.connect || 'CONNECT', id: 'social' }
  ]

  return (
    <>
      <motion.nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 bg-transparent backdrop-blur-sm border-b border-primary/10 ${glitch ? 'red-glitch-element' : ''}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.2 }}
      >
        <div className="max-w-7xl mx-auto px-4 py-3 md:py-4 flex items-center justify-between">
          <button
            onClick={() => scrollToSection('hero')}
            onPointerDown={morseHandlers.onPointerDown}
            onPointerUp={morseHandlers.onPointerUp}
            style={{ touchAction: 'none' }}
            className={`text-base md:text-lg font-mono tracking-[0.08em] hover:text-primary/80 active:text-primary transition-colors touch-manipulation hud-text ${glitch ? 'red-glitch-text' : ''}`}
          >
            <span className="text-primary/60">&gt;</span> NEUROKLAST
          </button>

          <div className="hidden md:flex items-center gap-6">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => scrollToSection(item.id)}
                data-track={`nav::${item.label}`}
                className="text-xs font-mono tracking-[0.08em] hover:text-primary active:text-primary/80 transition-colors relative group"
              >
                <span className="text-primary/40">&gt;:</span> {item.label}
                <span className="absolute -bottom-1 left-0 w-0 h-px bg-primary transition-all duration-200 group-hover:w-full"></span>
              </button>
            ))}
            <button
              onClick={() => setPlayerOpen(o => !o)}
              data-track="nav::MUSIC_PLAYER"
              className={`p-1 transition-colors ${playerOpen ? 'text-primary' : 'text-primary/60 hover:text-primary'}`}
              title={playerOpen ? 'Close music player' : 'Open music player'}
            >
              <MusicNote size={18} weight={playerOpen ? 'fill' : 'regular'} />
            </button>
          </div>

          <div className="flex items-center gap-2 md:hidden">
            <button
              onClick={() => setPlayerOpen(o => !o)}
              data-track="nav::MUSIC_PLAYER"
              className={`p-2 transition-colors ${playerOpen ? 'text-primary' : 'text-primary/60 hover:text-primary'}`}
              title={playerOpen ? 'Close music player' : 'Open music player'}
            >
              <MusicNote size={18} weight={playerOpen ? 'fill' : 'regular'} />
            </button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X size={20} /> : <List size={20} />}
            </Button>
          </div>
        </div>

        {/* Expandable custom music player dropdown */}
        <AnimatePresence>
          {playerOpen && (
            <motion.div
              key="music-player-dropdown"
              className="border-t border-primary/20"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              style={{ overflow: 'hidden' }}
              data-track="music-player"
            >
              <div className="max-w-7xl mx-auto">
                <MusicPlayer tracks={LOCAL_TRACKS} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
      </motion.nav>

      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div
              key="mobile-overlay"
              className="fixed inset-0 z-40 bg-background/95 backdrop-blur-md md:hidden hud-grid-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setIsMobileMenuOpen(false)}
            />
            <motion.div
              key="mobile-panel"
              className="fixed inset-x-0 top-0 z-40 bg-background md:hidden pt-16 pb-8 border-b border-primary/20 hud-element"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
            <div className="flex flex-col gap-1 px-4">
              {navItems.map((item, index) => (
                <motion.button
                  key={item.id}
                  className="text-left py-4 px-4 border-b border-border/50 touch-manipulation font-mono text-base tracking-[0.08em] hover:bg-primary/5 active:bg-primary/10 active:scale-[0.98] transition-all rounded-sm relative overflow-hidden group"
                  onClick={() => scrollToSection(item.id)}
                  data-track={`nav::${item.label}`}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-transparent opacity-0 group-active:opacity-100 transition-opacity duration-150" />
                  <span className="relative z-10"><span className="text-primary/40">&gt;</span> {item.label}</span>
                </motion.button>
              ))}
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-background to-transparent pointer-events-none" />
          </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
