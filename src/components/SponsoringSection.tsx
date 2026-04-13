import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { PencilSimple, Check, Plus, Trash, Eye, EyeSlash } from '@phosphor-icons/react'
import { toDirectImageUrl } from '@/lib/image-cache'
import type { SiteData } from '@/App'
import type { AdminSettings, SectionLabels } from '@/lib/types'

const DEFAULT_LABEL = 'SPONSORING'

interface SponsoringSectionProps {
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

export default function SponsoringSection({
  siteData,
  editMode,
  sectionOrder,
  visible,
  sectionLabel,
  sectionLabels,
  adminSettings,
  onLabelChange,
  onUpdateSiteData,
}: SponsoringSectionProps) {
  const [editingLabel, setEditingLabel] = useState(false)
  const [labelDraft, setLabelDraft] = useState('')
  const [editingPrefix, setEditingPrefix] = useState(false)
  const [prefixDraft, setPrefixDraft] = useState('')

  const headingVisible = sectionLabels?.sponsoringHeadingVisible !== false
  const headingPrefix = sectionLabels?.sponsoringPrefix ?? '//'
  const logos = siteData.sponsoring ?? []

  // Style overrides
  const styleOverrides = adminSettings?.sections?.styleOverrides?.['sponsoring']
  const logoBrightness = styleOverrides?.logoBrightness ?? 1
  const backgroundOpacity = styleOverrides?.backgroundOpacity
  const sectionStyle = backgroundOpacity !== undefined
    ? { backgroundColor: `color-mix(in srgb, var(--card) ${Math.round(backgroundOpacity * 100)}%, transparent)` }
    : undefined

  const startEditLabel = () => {
    setLabelDraft(sectionLabel || DEFAULT_LABEL)
    setEditingLabel(true)
  }

  const saveLabel = () => {
    onLabelChange?.('sponsoring', labelDraft)
    setEditingLabel(false)
  }

  const startEditPrefix = () => {
    setPrefixDraft(headingPrefix)
    setEditingPrefix(true)
  }

  const savePrefix = () => {
    onLabelChange?.('sponsoringPrefix', prefixDraft)
    setEditingPrefix(false)
  }

  const toggleHeadingVisible = () => {
    onLabelChange?.('sponsoringHeadingVisible', !headingVisible)
  }

  const addLogo = () => {
    onUpdateSiteData?.((prev) => ({
      ...prev,
      sponsoring: [...(prev.sponsoring ?? []), { src: '', alt: '' }],
    }))
  }

  const removeLogo = (idx: number) => {
    onUpdateSiteData?.((prev) => ({
      ...prev,
      sponsoring: (prev.sponsoring ?? []).filter((_, i) => i !== idx),
    }))
  }

  const updateLogo = (idx: number, field: 'src' | 'alt' | 'caption' | 'url', value: string) => {
    onUpdateSiteData?.((prev) => ({
      ...prev,
      sponsoring: (prev.sponsoring ?? []).map((c, i) => i === idx ? { ...c, [field]: value } : c),
    }))
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
                  <span>{sectionLabel || DEFAULT_LABEL}</span>
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

          <div className="flex flex-wrap items-center justify-center gap-8 md:gap-12 opacity-60 hover:opacity-90 transition-opacity duration-500">
            {(() => {
              const filterBase = `brightness(0) invert(1) brightness(${logoBrightness})`
              const filterHover = `brightness(0) invert(1) brightness(${logoBrightness}) drop-shadow(2px 0 0 rgba(255,0,100,0.5)) drop-shadow(-2px 0 0 rgba(0,255,255,0.5))`
              return logos.filter(logo => logo.src).map((logo, index) => {
                const imgMotionProps = {
                  initial: { opacity: 0, y: 10, filter: filterBase },
                  whileInView: { opacity: 0.7, y: 0, filter: filterBase },
                  viewport: { once: true } as const,
                  transition: { duration: 0.5, delay: index * 0.1 },
                  whileHover: { opacity: 1, filter: filterHover },
                  loading: 'lazy' as const,
                  src: toDirectImageUrl(logo.src, { w: 300 }) || logo.src,
                  alt: logo.alt,
                  className: 'h-10 md:h-14 w-auto object-contain',
                }
                return (
                <div key={`sponsor-${index}`} className="relative group flex flex-col items-center gap-1">
                  {logo.url ? (
                    <a
                      href={logo.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={logo.alt || logo.caption || 'Sponsor'}
                      className="block"
                    >
                      <motion.img {...imgMotionProps} className="h-10 md:h-14 w-auto object-contain cursor-pointer" />
                    </a>
                  ) : (
                    <motion.img {...imgMotionProps} />
                  )}
                  {logo.caption && (
                    <span className="font-mono text-[10px] text-muted-foreground/70 text-center leading-tight max-w-[120px]">
                      {logo.caption}
                    </span>
                  )}
                  {editMode && (
                    <button
                      onClick={() => removeLogo(index)}
                      className="absolute -top-2 -right-2 bg-destructive/80 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                      aria-label="Remove sponsor logo"
                    >
                      <Trash size={10} className="text-white" />
                    </button>
                  )}
                </div>
                )
              })
            })()}
          </div>

          {/* Edit mode: show all entries (including those without src) */}
          {editMode && onUpdateSiteData && (
            <div className="mt-6 space-y-3 max-w-2xl mx-auto text-left">
              {logos.map((logo, idx) => (
                <div key={idx} className="space-y-1 border border-primary/10 p-2 rounded">
                  <div className="flex gap-2 items-center">
                    <input
                      type="text"
                      value={logo.src}
                      onChange={(e) => updateLogo(idx, 'src', e.target.value)}
                      placeholder="Image URL"
                      className="flex-1 bg-transparent border border-primary/20 px-2 py-1 text-xs font-mono text-foreground placeholder:text-foreground/30 focus:outline-none focus:border-primary/50"
                      aria-label={`Sponsor ${idx + 1} image URL`}
                    />
                    <input
                      type="text"
                      value={logo.alt}
                      onChange={(e) => updateLogo(idx, 'alt', e.target.value)}
                      placeholder="Alt text"
                      className="w-28 bg-transparent border border-primary/20 px-2 py-1 text-xs font-mono text-foreground placeholder:text-foreground/30 focus:outline-none focus:border-primary/50"
                      aria-label={`Sponsor ${idx + 1} alt text`}
                    />
                    <button onClick={() => removeLogo(idx)} className="text-destructive/70 hover:text-destructive" aria-label="Remove">
                      <Trash size={14} />
                    </button>
                  </div>
                  <div className="flex gap-2 items-center">
                    <input
                      type="text"
                      value={logo.caption ?? ''}
                      onChange={(e) => updateLogo(idx, 'caption', e.target.value)}
                      placeholder="Caption (optional)"
                      className="flex-1 bg-transparent border border-primary/10 px-2 py-1 text-xs font-mono text-foreground placeholder:text-foreground/30 focus:outline-none focus:border-primary/50"
                      aria-label={`Sponsor ${idx + 1} caption`}
                    />
                    <input
                      type="url"
                      value={logo.url ?? ''}
                      onChange={(e) => updateLogo(idx, 'url', e.target.value)}
                      placeholder="Link URL (optional)"
                      className="flex-1 bg-transparent border border-primary/10 px-2 py-1 text-xs font-mono text-foreground placeholder:text-foreground/30 focus:outline-none focus:border-primary/50"
                      aria-label={`Sponsor ${idx + 1} link URL`}
                    />
                  </div>
                </div>
              ))}
              <button
                onClick={addLogo}
                className="flex items-center gap-1 text-xs font-mono text-primary/50 hover:text-primary transition-colors mt-2"
              >
                <Plus size={12} /> Add sponsor
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
