import React from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus, Trash } from '@phosphor-icons/react'
import { normalizeImageUrl, toDirectImageUrl } from '@/lib/image-cache'
import type { SiteData } from '@/App'
import type { SectionLabels } from '@/lib/types'

interface CreditHighlightsSectionProps {
  siteData: SiteData
  editMode: boolean
  sectionOrder: number
  visible: boolean
  sectionLabel: string
}

export default function CreditHighlightsSection({
  siteData,
  editMode,
  sectionOrder,
  visible,
  sectionLabel,
}: CreditHighlightsSectionProps) {
  return (
    <div style={{ order: sectionOrder }}>
    {visible && (
    <>
    <section className="py-16 px-4 bg-card/50 noise-effect overflow-hidden">
      <div className="container mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center"
        >
          <div className="data-label mb-6">
              <>// {sectionLabel || 'CREDIT.HIGHLIGHTS'}</>
          </div>


          <div className="flex flex-wrap items-center justify-center gap-8 md:gap-12 opacity-60 hover:opacity-90 transition-opacity duration-500">
            {siteData.creditHighlights.filter(logo => logo.src).map((logo, index) => (
              <motion.img
                key={`credit-${index}`}
                src={toDirectImageUrl(logo.src) || logo.src}
                alt={logo.alt}
                className="h-10 md:h-14 w-auto object-contain brightness-0 invert opacity-70 hover:opacity-100 transition-opacity duration-300 hover-chromatic-image"
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 0.7, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                whileHover={{ opacity: 1 }}
                loading="lazy"
              />
            ))}
          </div>
        </motion.div>
      </div>
    </section>
    </>
    )}
    </div>
  )
}
