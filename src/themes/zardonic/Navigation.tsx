import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { List, X } from '@phosphor-icons/react'

interface NavigationProps {
  logo?: string | React.ReactNode
  brandName?: string
  menuItems?: { label: string; href: string }[]
  onNavigate?: (href: string) => void
}

const defaultMenuItems = [
  { label: 'Bio', href: '#bio' },
  { label: 'Music', href: '#music' },
  { label: 'Gigs', href: '#gigs' },
  { label: 'Releases', href: '#releases' },
  { label: 'Gallery', href: '#gallery' },
  { label: 'Connect', href: '#connect' },
]

export default function Navigation({
  logo,
  brandName = '{{BAND_NAME}}',
  menuItems = defaultMenuItems,
  onNavigate
}: NavigationProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const handleNavClick = (href: string) => {
    setMobileMenuOpen(false)
    if (onNavigate) {
      onNavigate(href)
    } else {
      const element = document.querySelector(href)
      if (element) {
        const navHeight = 80
        const y = element.getBoundingClientRect().top + window.scrollY - navHeight
        window.scrollTo({ top: y, behavior: 'smooth' })
      }
    }
  }

  return (
    <motion.nav
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.8, delay: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="fixed top-0 left-0 right-0 bg-background/98 backdrop-blur-sm border-b border-border zardonic-theme-scanline-effect"
      style={{ zIndex: 'var(--z-nav)' } as React.CSSProperties}
    >
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        {/* Logo/Brand */}
        <motion.div
          className="text-2xl md:text-3xl font-bold tracking-tighter text-foreground uppercase"
        >
          {typeof logo === 'string' ? (
            <img 
              src={logo}
              alt={brandName} 
              className="h-10 md:h-12 w-auto object-contain brightness-110 zardonic-theme-hover-chromatic-image"
            />
          ) : logo ? (
            logo
          ) : (
            <span className="zardonic-theme-hover-chromatic">{brandName}</span>
          )}
        </motion.div>

        {/* Desktop Menu */}
        <div className="hidden md:flex items-center gap-6">
          {menuItems.map((item) => (
            <button
              key={item.href}
              onClick={() => handleNavClick(item.href)}
              className="text-sm uppercase tracking-wide hover:text-primary transition-colors font-mono zardonic-theme-hover-chromatic zardonic-theme-hover-glitch"
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Mobile Menu Toggle */}
        <button
          className="md:hidden text-foreground hover:text-primary transition-colors"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <List className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="md:hidden bg-card/95 border-t border-border overflow-hidden zardonic-theme-scanline-effect"
        >
          <div className="container mx-auto px-4 py-4 flex flex-col gap-4">
            {menuItems.map((item) => (
              <button
                key={item.href}
                onClick={() => handleNavClick(item.href)}
                className="text-left text-sm uppercase tracking-wide hover:text-primary transition-colors font-mono"
              >
                {item.label}
              </button>
            ))}
          </div>
        </motion.div>
      )}
    </motion.nav>
  )
}
