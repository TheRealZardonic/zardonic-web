import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { PencilSimple, Check, Plus, Trash } from '@phosphor-icons/react'
import { toDirectImageUrl } from '@/lib/image-cache'
import type { SiteData } from '@/App'
import type { SectionLabels } from '@/lib/types'

interface CreditHighlightsSectionProps {
  siteData: SiteData
  editMode: boolean
  sectionOrder: number
  visible: boolean
  sectionLabel: string
  onLabelChange?: (key: keyof SectionLabels, value: string) => void
  onUpdateSiteData?: (updater: SiteData | ((prev: SiteData) => SiteData)) => void
}

export default function CreditHighlightsSection({
  siteData,
  editMode,
  sectionOrder,
  visible,
  sectionLabel,
  onLabelChange,
  onUpdateSiteData,
}: CreditHighlightsSectionProps) {
  const [editingLabel, setEditingLabel] = useState(false)
  const [labelDraft, setLabelDraft] = useState('')

  const startEditLabel = () => {
    setLabelDraft(sectionLabel || 'CREDIT.HIGHLIGHTS')
    setEditingLabel(true)
  }

  const saveLabel = () => {
    onLabelChange?.('creditHighlights', labelDraft)
    setEditingLabel(false)
  }

  const addLogo = () => {
    onUpdateSiteData?.((prev) => ({
      ...prev,
      creditHighlights: [...(prev.creditHighlights || []), { src: '', alt: '' }],
    }))
  }

  const removeLogo = (idx: number) => {
    onUpdateSiteData?.((prev) => ({
      ...prev,
      creditHighlights: prev.creditHighlights.filter((_, i) => i !== idx),
    }))
  }

  const updateLogo = (idx: number, field: 'src' | 'alt', value: string) => {
    onUpdateSiteData?.((prev) => ({
      ...prev,
      creditHighlights: prev.creditHighlights.map((c, i) => i === idx ? { ...c, [field]: value } : c),
    }))
  }

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
          {/* Editable data-label */}
          <div className="data-label mb-6 flex items-center justify-center gap-2">
            {editMode && editingLabel ? (
              <>
                <span className="opacity-70">//</span>
                <input
                  value={labelDraft}
                  onChange={(e) => setLabelDraft(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') saveLabel() }}
                  className="bg-transparent border-b border-accent/50 outline-none font-mono text-[10px] tracking-widest uppercase text-accent w-40 text-center"
                  autoFocus
                />
                <button onClick={saveLabel} className="text-accent/70 hover:text-accent" aria-label="Save label">
                  <Check size={12} />
                </button>
              </>
            ) : (
              <>
                <span>// {sectionLabel || 'CREDIT.HIGHLIGHTS'}</span>
                {editMode && (
                  <button onClick={startEditLabel} className="opacity-40 hover:opacity-100" aria-label="Edit label">
                    <PencilSimple size={10} />
                  </button>
                )}
              </>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-8 md:gap-12 opacity-60 hover:opacity-90 transition-opacity duration-500">
            {siteData.creditHighlights.filter(logo => logo.src).map((logo, index) => (
              <div key={`credit-${index}`} className="relative group">
                <motion.img
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
                {editMode && (
                  <button
                    onClick={() => removeLogo(index)}
                    className="absolute -top-2 -right-2 bg-destructive/80 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-label="Remove logo"
                  >
                    <Trash size={10} className="text-white" />
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Edit mode: show all entries (including those without src) */}
          {editMode && onUpdateSiteData && (
            <div className="mt-6 space-y-2 max-w-2xl mx-auto text-left">
              {siteData.creditHighlights.map((logo, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <input
                    type="text"
                    value={logo.src}
                    onChange={(e) => updateLogo(idx, 'src', e.target.value)}
                    placeholder="Image URL"
                    className="flex-1 bg-transparent border border-primary/20 px-2 py-1 text-xs font-mono text-foreground placeholder:text-foreground/30 focus:outline-none focus:border-primary/50"
                  />
                  <input
                    type="text"
                    value={logo.alt}
                    onChange={(e) => updateLogo(idx, 'alt', e.target.value)}
                    placeholder="Alt text"
                    className="w-32 bg-transparent border border-primary/20 px-2 py-1 text-xs font-mono text-foreground placeholder:text-foreground/30 focus:outline-none focus:border-primary/50"
                  />
                  <button onClick={() => removeLogo(idx)} className="text-destructive/70 hover:text-destructive" aria-label="Remove">
                    <Trash size={14} />
                  </button>
                </div>
              ))}
              <button
                onClick={addLogo}
                className="flex items-center gap-1 text-xs font-mono text-primary/50 hover:text-primary transition-colors mt-2"
              >
                <Plus size={12} /> Add logo
              </button>
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
