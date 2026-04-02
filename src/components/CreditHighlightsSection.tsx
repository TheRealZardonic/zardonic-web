import React from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus, Trash } from '@phosphor-icons/react'
import { normalizeImageUrl, toDirectImageUrl } from '@/lib/image-cache'
import type { SiteData } from '@/App'
import { SKIP_UPDATE } from '@/hooks/use-kv'
import type { SectionLabels } from '@/lib/types'

interface CreditHighlightsSectionProps {
  siteData: SiteData
  editMode: boolean
  setSiteData: (updater: ((data: SiteData | undefined) => SiteData | typeof SKIP_UPDATE | undefined) | SiteData) => void
  sectionOrder: number
  visible: boolean
  sectionLabel: string
  updateSectionLabel: (key: keyof SectionLabels, value: string) => void
}

export default function CreditHighlightsSection({
  siteData,
  editMode,
  setSiteData,
  sectionOrder,
  visible,
  sectionLabel,
  updateSectionLabel,
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
            {editMode ? (
              <Input
                value={sectionLabel}
                onChange={(e) => updateSectionLabel('creditHighlights', e.target.value)}
                placeholder="// CREDIT.HIGHLIGHTS"
                className="bg-transparent border-border font-mono text-xs text-center max-w-xs mx-auto"
              />
            ) : (
              <>// {sectionLabel || 'CREDIT.HIGHLIGHTS'}</>
            )}
          </div>

          {editMode && (
            <div className="mb-8 space-y-3 max-w-xl mx-auto text-left">
              {siteData.creditHighlights.map((highlight, index) => (
                <div key={index} className="flex items-end gap-2">
                  <div className="flex-1 space-y-1">
                    <Label className="font-mono text-xs">Image URL</Label>
                    <Input
                      value={highlight.src}
                      onChange={(e) => {
                        const updated = [...siteData.creditHighlights]
                        updated[index] = { ...updated[index], src: e.target.value }
                        setSiteData((data) => data ? { ...data, creditHighlights: updated } : data)
                      }}
                      onBlur={(e) => {
                        const normalized = normalizeImageUrl(e.target.value)
                        if (normalized !== e.target.value) {
                          const updated = [...siteData.creditHighlights]
                          updated[index] = { ...updated[index], src: normalized }
                          setSiteData((data) => data ? { ...data, creditHighlights: updated } : data)
                        }
                      }}
                      placeholder="https://drive.google.com/file/d/... or image URL"
                      className="bg-card border-border font-mono text-xs"
                    />
                  </div>
                  <div className="w-32 space-y-1">
                    <Label className="font-mono text-xs">Label</Label>
                    <Input
                      value={highlight.alt}
                      onChange={(e) => {
                        const updated = [...siteData.creditHighlights]
                        updated[index] = { ...updated[index], alt: e.target.value }
                        setSiteData((data) => data ? { ...data, creditHighlights: updated } : data)
                      }}
                      placeholder="Name"
                      className="bg-card border-border font-mono text-xs"
                    />
                  </div>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => {
                      const updated = siteData.creditHighlights.filter((_, i) => i !== index)
                      setSiteData((data) => data ? { ...data, creditHighlights: updated } : data)
                    }}
                  >
                    <Trash className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setSiteData((data) => data ? { ...data, creditHighlights: [...data.creditHighlights, { src: '', alt: '' }] } : data)
                }}
                className="font-mono"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Logo
              </Button>
            </div>
          )}

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
