import React from 'react'
import logoImage from '@/assets/images/meta_eyJzcmNCdWNrZXQiOiJiemdsZmlsZXMifQ==.webp'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Upload, Storefront } from '@phosphor-icons/react'

interface AppHeroSectionProps {
  contentLoaded: boolean
  editMode: boolean
  scrollToSection: (id: string) => void
  artistName: string
}

export default function AppHeroSection({
  contentLoaded,
  editMode,
  scrollToSection,
  artistName,
}: AppHeroSectionProps) {
  return (
    <section className="relative min-h-screen flex items-center justify-center pt-20 overflow-hidden scanline-effect">
      <div className="absolute inset-0 bg-black" />
      
      <div className="absolute inset-0 noise-effect" />
      
      <motion.div
        initial={{ opacity: 0 }}
        animate={contentLoaded ? { opacity: 1 } : { opacity: 0 }}
        transition={{ duration: 0.15 }}
        className="relative z-10 text-center px-4"
      >
        <motion.div 
          className="mb-8 relative"
          initial={{ opacity: 1 }}
          animate={contentLoaded ? { opacity: 1 } : { opacity: 0 }}
        >
          <div className="relative mx-auto w-fit hero-logo-glitch">
            <img 
              src={logoImage} 
              alt={artistName} 
              className="h-32 md:h-48 lg:h-64 w-auto object-contain brightness-110 hover-chromatic-image"
            />
            <img 
              src={logoImage} 
              alt="" 
              aria-hidden="true"
              className="absolute inset-0 h-32 md:h-48 lg:h-64 w-auto object-contain brightness-110 hero-logo-r"
            />
            <img 
              src={logoImage} 
              alt="" 
              aria-hidden="true"
              className="absolute inset-0 h-32 md:h-48 lg:h-64 w-auto object-contain brightness-110 hero-logo-b"
            />
          </div>
        </motion.div>

        {editMode && (
          <div className="mt-8">
            <label className="cursor-pointer">
              <Button variant="outline" size="lg" asChild>
                <span>
                  <Upload className="w-5 h-5 mr-2" />
                  Upload Hero Image
                </span>
              </Button>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleImageUpload(e, 'hero')}
              />
            </label>
          </div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={contentLoaded ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ delay: 1.2, duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="mt-12 flex gap-4 justify-center flex-wrap"
        >
          <Button onClick={() => scrollToSection('music')} size="lg" className="uppercase font-mono hover-glitch hover-noise relative cyber-border">
            <span className="hover-chromatic">Listen Now</span>
          </Button>
          <Button onClick={() => scrollToSection('gigs')} size="lg" variant="outline" className="uppercase font-mono hover-glitch hover-noise relative cyber-border">
            <span className="hover-chromatic">Tour Dates</span>
          </Button>
          <Button asChild size="lg" variant="outline" className="uppercase font-mono hover-glitch hover-noise relative cyber-border">
            <a href="https://zardonic.channl.co/merch" target="_blank" rel="noopener noreferrer">
              <Storefront className="w-5 h-5 mr-2" />
              <span className="hover-chromatic">Merch</span>
            </a>
          </Button>
        </motion.div>
      </motion.div>
    </section>
  )
}
