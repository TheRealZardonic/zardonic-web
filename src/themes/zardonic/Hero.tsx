import React from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'

interface HeroProps {
  logo?: string | React.ReactNode
  brandName?: string
  tagline?: string
  ctaButtons?: { label: string; href: string; variant?: 'default' | 'outline' }[]
  backgroundImage?: string
  onCtaClick?: (href: string) => void
}

const defaultCtaButtons = [
  { label: 'Listen Now', href: '#music', variant: 'default' as const },
  { label: 'Tour Dates', href: '#gigs', variant: 'outline' as const },
]

export default function Hero({
  logo,
  brandName = '{{BAND_NAME}}',
  tagline,
  ctaButtons = defaultCtaButtons,
  backgroundImage,
  onCtaClick
}: HeroProps) {
  const handleCtaClick = (href: string) => {
    if (onCtaClick) {
      onCtaClick(href)
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
    <section className="relative min-h-screen flex items-center justify-center pt-20 overflow-hidden zardonic-theme-scanline-effect">
      {/* Background Layer */}
      <div className="absolute inset-0 bg-black" />
      {backgroundImage && (
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-30"
          style={{ backgroundImage: `url(${backgroundImage})` }}
        />
      )}
      
      {/* Noise overlay */}
      <div className="absolute inset-0 zardonic-theme-noise-effect" />
      
      {/* Content */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.15 }}
        className="relative text-center px-4"
        style={{ zIndex: 'var(--z-content)' } as React.CSSProperties}
      >
        {/* Logo */}
        <motion.div 
          className="mb-8 relative"
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
        >
          <div className="relative mx-auto w-fit zardonic-theme-hero-logo-glitch">
            {typeof logo === 'string' ? (
              <>
                <img 
                  src={logo}
                  alt={brandName} 
                  className="h-32 md:h-48 lg:h-64 w-auto object-contain brightness-110 zardonic-theme-hover-chromatic-image"
                />
                <img 
                  src={logo}
                  alt="" 
                  aria-hidden="true"
                  className="absolute inset-0 h-32 md:h-48 lg:h-64 w-auto object-contain brightness-110 zardonic-theme-hero-logo-r"
                />
                <img 
                  src={logo}
                  alt="" 
                  aria-hidden="true"
                  className="absolute inset-0 h-32 md:h-48 lg:h-64 w-auto object-contain brightness-110 zardonic-theme-hero-logo-b"
                />
              </>
            ) : logo ? (
              logo
            ) : (
              <h1 className="text-6xl md:text-8xl lg:text-9xl font-bold uppercase tracking-tighter zardonic-theme-hover-chromatic">
                {brandName}
              </h1>
            )}
          </div>
        </motion.div>

        {/* Tagline */}
        {tagline && (
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.8 }}
            className="text-xl md:text-2xl text-muted-foreground font-mono mb-12 zardonic-theme-hover-chromatic"
          >
            {tagline}
          </motion.p>
        )}

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2, duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="mt-12 flex gap-4 justify-center flex-wrap"
        >
          {ctaButtons.map((button, index) => (
            <Button
              key={index}
              onClick={() => handleCtaClick(button.href)}
              size="lg"
              variant={button.variant || 'default'}
              className="uppercase font-mono zardonic-theme-hover-glitch zardonic-theme-hover-noise relative zardonic-theme-cyber-border"
            >
              <span className="zardonic-theme-hover-chromatic">{button.label}</span>
            </Button>
          ))}
        </motion.div>
      </motion.div>
    </section>
  )
}
