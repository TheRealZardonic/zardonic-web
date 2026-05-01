import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { PencilSimple, Check, Plus, Trash, Eye, EyeSlash, ArrowUp, ArrowDown } from '@phosphor-icons/react'
import { toDirectImageUrl } from '@/lib/image-cache'
import type { SiteData } from '@/App'
import type { AdminSettings, SectionLabels } from '@/lib/types'

interface CreditHighlightsSectionProps {
  siteData: SiteData
  editMode: boolean
  sectionOrder: number
  visible: boolean
  sectionLabel: string
  sectionLabels?: SectionLabels
  adminSettings?: AdminSettings
  onLabelChange?: (key: keyof SectionLabels, value: string | boolean) => void
  onUpdateSiteData?: (updater: SiteData | ((prev: SiteData) => SiteData)) => void
}

export default function CreditHighlightsSection({
  siteData,
  editMode,
  sectionOrder,
  visible,
  sectionLabel,
  sectionLabels,
  adminSettings,
  onLabelChange,
  onUpdateSiteData,
}: CreditHighlightsSectionProps) {
  const [editingLabel, setEditingLabel] = useState(false)
  const [labelDraft, setLabelDraft] = useState('')
  const [editingPrefix, setEditingPrefix] = useState(false)
  const [prefixDraft, setPrefixDraft] = useState('')

  const headingVisible = sectionLabels?.creditHighlightsHeadingVisible !== false
  const headingPrefix = sectionLabels?.creditHighlightsPrefix ?? '//'

  // Style overrides
  const styleOverrides = adminSettings?.sections?.styleOverrides?.['creditHighlights']
  const logoBrightness = styleOverrides?.logoBrightness ?? 1
  const backgroundOpacity = styleOverrides?.backgroundOpacity
  const sectionStyle = backgroundOpacity !== undefined
    ? { backgroundColor: `color-mix(in srgb, var(--card) ${Math.round(backgroundOpacity * 100)}%, transparent)` }
    : undefined

  const startEditLabel = () => {
    setLabelDraft(sectionLabel || 'CREDIT.HIGHLIGHTS')
    setEditingLabel(true)
  }

  const saveLabel = () => {
    onLabelChange?.('creditHighlights', labelDraft)
    setEditingLabel(false)
  }

  const startEditPrefix = () => {
    setPrefixDraft(headingPrefix)
    setEditingPrefix(true)
  }

  const savePrefix = () => {
    onLabelChange?.('creditHighlightsPrefix', prefixDraft)
    setEditingPrefix(false)
  }

  const toggleHeadingVisible = () => {
    onLabelChange?.('creditHighlightsHeadingVisible', !headingVisible)
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

  const moveLogo = (idx: number, dir: 'up' | 'down') => {
    onUpdateSiteData?.((prev) => {
      const arr = [...prev.creditHighlights]
      const target = dir === 'up' ? idx - 1 : idx + 1
      if (target < 0 || target >= arr.length) return prev
      ;[arr[idx], arr[target]] = [arr[target], arr[idx]]
      return { ...prev, creditHighlights: arr }
    })
  }

  return (
    <div style={{ order: sectionOrder }}>
    {visible && (
    <>
    <section
      className={`py-16 px-4 noise-effect overflow-hidden${backgroundOpacity === undefined ? ' bg-card/50' : ''}`}
      style={sectionStyle}
      data-theme-color="primary accent card border"
    >
      <div className="container mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center"
        >
          {/* Editable data-label heading */}
          {headingVisible && (
            <div className="data-label mb-6 flex items-center justify-center gap-2">
              {editMode && editingPrefix ? (
                <>
                  <input
                    value={prefixDraft}
                    onChange={(e) => setPrefixDraft(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') savePrefix() }}
                    className="bg-transparent border-b border-accent/50 outline-none font-mono text-[10px] tracking-widest uppercase text-accent w-10 text-center"
                    autoFocus
                    aria-label="Edit prefix"
                  />
                  <button onClick={savePrefix} className="text-accent/70 hover:text-accent" aria-label="Save prefix">
                    <Check size={12} />
                  </button>
                </>
              ) : editMode && editingLabel ? (
                <>
                  <span
                    className="opacity-70 cursor-pointer hover:opacity-100"
                    onClick={startEditPrefix}
                    title="Click to edit prefix"
                  >{headingPrefix}</span>
                  <input
                    value={labelDraft}
                    onChange={(e) => setLabelDraft(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') saveLabel() }}
                    className="bg-transparent border-b border-accent/50 outline-none font-mono text-[10px] tracking-widest uppercase text-accent w-40 text-center"
                    autoFocus
                    aria-label="Edit heading label"
                  />
                  <button onClick={saveLabel} className="text-accent/70 hover:text-accent" aria-label="Save label">
                    <Check size={12} />
                  </button>
                </>
              ) : (
                <>
                  <span
                    className={editMode ? 'cursor-pointer hover:text-primary/80 transition-colors' : ''}
                    onClick={editMode ? startEditPrefix : undefined}
                    title={editMode ? 'Click to edit prefix' : undefined}
                  >{headingPrefix}</span>
                  {' '}
                  <span>{sectionLabel || 'CREDIT.HIGHLIGHTS'}</span>
                  {editMode && (
                    <>
                      <button onClick={startEditLabel} className="opacity-40 hover:opacity-100" aria-label="Edit label">
                        <PencilSimple size={10} />
                      </button>
                      <button onClick={toggleHeadingVisible} className="opacity-40 hover:opacity-100 ml-1" aria-label="Hide heading">
                        <EyeSlash size={10} />
                      </button>
                    </>
                  )}
                </>
              )}
            </div>
          )}

          {/* Show heading toggle when heading is hidden */}
          {editMode && !headingVisible && (
            <div className="mb-4 flex items-center justify-center">
              <button
                onClick={toggleHeadingVisible}
                className="flex items-center gap-1 text-xs font-mono text-muted-foreground/50 hover:text-primary/70 transition-colors"
                aria-label="Show heading"
              >
                <Eye size={12} />
                <span>Show heading</span>
              </button>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-center gap-8 md:gap-12">
            {siteData.creditHighlights.filter(logo => logo.src).map((logo, index) => (
              <div key={`credit-${index}`} className="relative group">
                {/*
                 * Filter-Hinweis: FM verwaltet den `filter` inline (initial + whileInView + whileHover).
                 * Das überschreibt den `filter` der CSS-Klasse `logo-white` absichtlich, damit
                 * FM den Hover-Exit (chromatic → base) korrekt interpolieren kann.
                 * logoBrightness-Änderungen werden reaktiv übernommen.
                 */}
                <motion.img
                  src={toDirectImageUrl(logo.src, { w: 300 }) || logo.src}
                  alt={logo.alt}
                  className="logo-white h-10 md:h-14 w-auto object-contain"
                  style={{ '--logo-brightness': logoBrightness } as React.CSSProperties}
                  initial={{ opacity: 0, y: 10, filter: `brightness(0) invert(1) brightness(${logoBrightness})` }}
                  whileInView={{ opacity: 1, y: 0, filter: `brightness(0) invert(1) brightness(${logoBrightness})` }}
                  viewport={{ once: true }}
                  transition={{
                    duration: 0.5,
                    delay: index * 0.1,
                    filter: { duration: 0.18 },
                  }}
                  whileHover={{
                    filter: 'brightness(0) invert(1) drop-shadow(-2px 0 1.5px var(--chromatic-color-left, rgba(255,50,50,0.85))) drop-shadow(2px 0 1.5px var(--chromatic-color-right, rgba(50,100,255,0.85)))',
                  }}
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
                  <div className="flex flex-col gap-0.5 shrink-0">
                    <button
                      onClick={() => moveLogo(idx, 'up')}
                      disabled={idx === 0}
                      className="text-muted-foreground/50 hover:text-primary disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                      aria-label={`Move credit ${idx + 1} up`}
                    >
                      <ArrowUp size={12} />
                    </button>
                    <button
                      onClick={() => moveLogo(idx, 'down')}
                      disabled={idx === siteData.creditHighlights.length - 1}
                      className="text-muted-foreground/50 hover:text-primary disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                      aria-label={`Move credit ${idx + 1} down`}
                    >
                      <ArrowDown size={12} />
                    </button>
                  </div>
                  <input
                    type="text"
                    value={logo.src}
                    onChange={(e) => updateLogo(idx, 'src', e.target.value)}
                    placeholder="Image URL"
                    className="flex-1 bg-transparent border border-primary/20 px-2 py-1 text-xs font-mono text-foreground placeholder:text-foreground/30 focus:outline-none focus:border-primary/50"
                    aria-label={`Credit ${idx + 1} image URL`}
                  />
                  <input
                    type="text"
                    value={logo.alt}
                    onChange={(e) => updateLogo(idx, 'alt', e.target.value)}
                    placeholder="Alt text"
                    className="w-32 bg-transparent border border-primary/20 px-2 py-1 text-xs font-mono text-foreground placeholder:text-foreground/30 focus:outline-none focus:border-primary/50"
                    aria-label={`Credit ${idx + 1} alt text`}
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
