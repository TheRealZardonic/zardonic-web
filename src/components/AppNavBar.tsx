import React from 'react'
import logoImage from '@/assets/images/meta_eyJzcmNCdWNrZXQiOiJiemdsZmlsZXMifQ==.webp'
import { motion, AnimatePresence } from 'framer-motion'
import { List, X } from '@phosphor-icons/react'
import type { SectionLabels, SectionVisibility } from '@/lib/types'
import { useLocale } from '@/contexts/LocaleContext'

interface AppNavBarProps {
  artistName: string
  editMode: boolean
  isOwner: boolean
  setEditMode: (v: boolean) => void
  hasPassword: boolean
  setShowLoginDialog: (v: boolean) => void
  mobileMenuOpen: boolean
  setMobileMenuOpen: (v: boolean) => void
  scrollToSection: (id: string) => void
  sectionLabels?: SectionLabels
  sectionVisibility?: SectionVisibility
}

export default function AppNavBar({
  artistName,
  editMode: _editMode,
  isOwner: _isOwner,
  setEditMode: _setEditMode,
  hasPassword: _hasPassword,
  setShowLoginDialog: _setShowLoginDialog,
  mobileMenuOpen,
  setMobileMenuOpen,
  scrollToSection,
  sectionLabels,
  sectionVisibility,
}: AppNavBarProps) {
  const { t } = useLocale()
  const allNavItems: { id: string; label: string }[] = [
    { id: 'bio', label: sectionLabels?.biography || t('nav.biography') },
    { id: 'music', label: sectionLabels?.musicPlayer || t('nav.music') },
    { id: 'gigs', label: sectionLabels?.upcomingGigs || t('nav.gigs') },
    { id: 'releases', label: sectionLabels?.releases || t('nav.releases') },
    { id: 'gallery', label: sectionLabels?.gallery || t('nav.gallery') },
    { id: 'connect', label: sectionLabels?.connect || t('nav.connect') },
  ]
  // Hide nav items whose sections are explicitly disabled
  const navItems = allNavItems.filter(({ id }) => {
    if (!sectionVisibility) return true
    const key = id as keyof SectionVisibility
    return sectionVisibility[key] !== false
  })
  return (
    <motion.nav
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.8, delay: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="fixed top-0 left-0 right-0 bg-background/98 backdrop-blur-sm border-b border-border scanline-effect"
      style={{ position: 'fixed', top: 0, zIndex: 'var(--z-nav)' } as React.CSSProperties}
      data-theme-color="background border"
    >
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <motion.div
          className="text-2xl md:text-3xl font-bold tracking-tighter text-foreground uppercase"
        >
            <img 
              src={logoImage} 
              alt={artistName} 
              className="h-10 md:h-12 w-auto object-contain logo-glitch brightness-110 hover-chromatic-image"
            />
        </motion.div>

        <div className="hidden md:flex items-center gap-6">
          {navItems.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => scrollToSection(id)}
              className="text-sm uppercase tracking-wide hover:text-primary transition-colors font-mono hover-chromatic hover-glitch"
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-4">
          <button
            className="md:hidden text-foreground"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <List className="w-6 h-6" />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="md:hidden bg-card/95 border-t border-border overflow-hidden"
          >
            <div className="container mx-auto px-4 py-4 flex flex-col gap-4">
              {navItems.map(({ id, label }) => (
                <button
                  key={id}
                  onClick={() => scrollToSection(id)}
                  className="text-left text-sm uppercase tracking-wide hover:text-primary transition-colors font-mono"
                >
                  {label}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  )
}
