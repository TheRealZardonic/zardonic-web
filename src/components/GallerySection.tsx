import React from 'react'
import { motion } from 'framer-motion'
import { Separator } from '@/components/ui/separator'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { MagnifyingGlassPlus, Upload, Plus, Trash } from '@phosphor-icons/react'
import EditableHeading from '@/components/EditableHeading'
import { normalizeImageUrl, toDirectImageUrl } from '@/lib/image-cache'
import type { SiteData } from '@/App'
import type { SectionLabels, AdminSettings } from '@/lib/types'
import { toast } from 'sonner'

interface GallerySectionProps {
  siteData: SiteData
  editMode: boolean
  sectionOrder: number
  visible: boolean
  sectionLabel: string
  setGalleryIndex: (index: number) => void
  adminSettings: AdminSettings | undefined
}

export default function GallerySection({
  siteData,
  editMode,
  sectionOrder,
  visible,
  sectionLabel,
  setGalleryIndex,
  adminSettings,
}: GallerySectionProps) {
  return (
    <div style={{ order: sectionOrder }}>
    {visible && (
    <>
    <Separator className="bg-border" />
    <section id="gallery" className="py-24 px-4 crt-effect">
      <div className="container mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, x: -30, filter: 'blur(10px)', clipPath: 'polygon(0 0, 0 0, 0 100%, 0 100%)' }}
          whileInView={{ opacity: 1, x: 0, filter: 'blur(0px)', clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 100%)' }}
          viewport={{ once: true }}
          transition={{ duration: 1, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          <div className="flex items-center justify-between mb-12">
            <h2 className="text-4xl md:text-6xl font-bold uppercase tracking-tighter text-foreground font-mono hover-chromatic hover-glitch cyber2077-scan-build cyber2077-data-corrupt" data-text="GALLERY">
              <EditableHeading onChange={() => {}}  onChange={() => {}}
                text={sectionLabel || ''}
                defaultText="GALLERY"
                editMode={editMode}
                glitchEnabled={adminSettings?.glitchTextSettings?.enabled !== false}
                glitchIntervalMs={adminSettings?.glitchTextSettings?.intervalMs}
                glitchDurationMs={adminSettings?.glitchTextSettings?.durationMs}
              />
            </h2>
          </div>

          {siteData.gallery.length === 0 ? (
            <Card className="p-12 text-center bg-card/50 border-border">
              <p className="text-xl text-muted-foreground uppercase tracking-wide font-mono">
                Gallery coming soon
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {siteData.gallery.map((image, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, clipPath: 'inset(0 0 100% 0)' }}
                  whileInView={{ opacity: 1, clipPath: 'inset(0 0 0% 0)' }}
                  viewport={{ once: true }}
                  transition={{ 
                    duration: 0.6,
                    delay: index * 0.08,
                    ease: [0.25, 0.46, 0.45, 0.94]
                  }}
                  className="aspect-square bg-muted overflow-hidden cursor-pointer relative group glitch-image"
                  onClick={() => setGalleryIndex(index)}
                >
                  <img 
                    src={toDirectImageUrl(image) || image} 
                    alt={`Gallery ${index + 1}`} 
                    className="w-full h-full object-cover hover-chromatic-image" 
                    crossOrigin="anonymous"
                    loading="lazy"
                    decoding="async"
                  />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <MagnifyingGlassPlus className="w-8 h-8 text-foreground" />
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </section>
    </>
    )}
    </div>
  )
}
