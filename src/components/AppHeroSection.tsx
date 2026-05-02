import React, { useRef, useEffect } from 'react'
import logoImage from '@/assets/images/meta_eyJzcmNCdWNrZXQiOiJiemdsZmlsZXMifQ==.webp'
import { m, AnimatePresence, useReducedMotion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Upload, Storefront, Plus, Trash, PencilSimple, Check, Images } from '@phosphor-icons/react'
import type { SiteData, HeroLink } from '@/lib/app-types'
import type { AdminSettings } from '@/lib/types'
import { toDirectImageUrl } from '@/lib/image-cache'
import { useState } from 'react'

const DEFAULT_HERO_LINKS: HeroLink[] = [
  { id: 'listen', label: 'Listen Now', type: 'section', target: 'music' },
  { id: 'tour', label: 'Tour Dates', type: 'section', target: 'gigs' },
]

interface AppHeroSectionProps {
  contentLoaded: boolean
  editMode: boolean
  scrollToSection: (id: string) => void
  artistName: string
  adminSettings?: AdminSettings
  sectionVisibility?: Record<string, boolean>
  onUpdateSiteData?: (updater: SiteData | ((current: SiteData) => SiteData)) => void
  siteData?: SiteData
  hasCustomBackground?: boolean
}

export default function AppHeroSection({
  contentLoaded,
  editMode,
  scrollToSection,
  artistName,
  adminSettings,
  sectionVisibility,
  onUpdateSiteData,
  siteData,
  hasCustomBackground,
}: AppHeroSectionProps) {
  const heroLinks = siteData?.heroLinks ?? DEFAULT_HERO_LINKS
  const [editingLinks, setEditingLinks] = useState(false)
  const [linksDraft, setLinksDraft] = useState<HeroLink[]>(heroLinks)
  const prefersReducedMotion = useReducedMotion()
  const artworkInputRef = useRef<HTMLInputElement>(null)
  const extraInputRef = useRef<HTMLInputElement>(null)

  const MAX_HERO_IMAGES = 5
  const MAX_EXTRA_IMAGES = MAX_HERO_IMAGES - 1 // 4 extras + 1 primary = 5 total

  // All hero images: primary + extras (max MAX_HERO_IMAGES total)
  const primaryImage = siteData?.heroImage || ''
  const extraImages = siteData?.heroImages ?? []
  const allImages = [primaryImage, ...extraImages].filter(Boolean)

  // Slideshow state
  const [slideshowIndex, setSlideshowIndex] = useState(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (allImages.length <= 1 || prefersReducedMotion) return
    intervalRef.current = setInterval(() => {
      setSlideshowIndex(prev => (prev + 1) % allImages.length)
    }, 5000)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [allImages.length, prefersReducedMotion])

  const heroImageOpacity = adminSettings?.sections?.styleOverrides?.hero?.heroImageOpacity ?? 0.5
  const heroImageBlur = adminSettings?.sections?.styleOverrides?.hero?.heroImageBlur ?? 0
  const heroMinHeight = adminSettings?.sections?.styleOverrides?.hero?.minHeight ?? 'min-h-screen'
  const heroPaddingTop = adminSettings?.sections?.styleOverrides?.hero?.paddingTop

  const handlePrimaryUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      onUpdateSiteData?.((prev) => ({ ...prev, heroImage: reader.result as string }))
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const handleExtraUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      onUpdateSiteData?.((prev) => {
        const current = prev.heroImages ?? []
        if (current.length >= MAX_EXTRA_IMAGES) return prev
        return { ...prev, heroImages: [...current, reader.result as string] }
      })
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const removeExtraImage = (idx: number) => {
    onUpdateSiteData?.((prev) => ({
      ...prev,
      heroImages: (prev.heroImages ?? []).filter((_, i) => i !== idx),
    }))
  }

  const removePrimaryImage = () => {
    onUpdateSiteData?.((prev) => ({ ...prev, heroImage: '' }))
  }

  const startEditLinks = () => {
    setLinksDraft(siteData?.heroLinks ?? DEFAULT_HERO_LINKS)
    setEditingLinks(true)
  }

  const saveLinks = () => {
    onUpdateSiteData?.((prev) => ({ ...prev, heroLinks: linksDraft }))
    setEditingLinks(false)
  }

  const genId = () => (typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : Math.random().toString(36).slice(2))

  const currentImageUrl = allImages[slideshowIndex]
    ? toDirectImageUrl(allImages[slideshowIndex], { output: 'webp', q: 85 })
    : undefined

  return (
    <section
      className={`relative ${heroMinHeight} flex items-center justify-center pt-20 overflow-hidden scanline-effect`}
      style={heroPaddingTop ? { paddingTop: heroPaddingTop } : undefined}
      data-theme-color="foreground primary"
    >
      {!hasCustomBackground && allImages.length === 0 && <div className="absolute inset-0 bg-black" />}

      {/* Crossfade slideshow */}
      {allImages.length > 0 && (
        <AnimatePresence mode="wait">
          <m.div
            key={slideshowIndex}
            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{
              backgroundImage: currentImageUrl ? `url(${currentImageUrl})` : undefined,
              filter: heroImageBlur > 0 ? `blur(${heroImageBlur}px)` : undefined,
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: heroImageOpacity }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.2, ease: 'easeInOut' }}
            aria-hidden="true"
          />
        </AnimatePresence>
      )}
      
      <div className="absolute inset-0 noise-effect" />
      
      <m.div
        initial={{ opacity: 0 }}
        animate={contentLoaded ? { opacity: 1 } : { opacity: 0 }}
        transition={{ duration: prefersReducedMotion ? 0 : 0.15 }}
        className="relative z-10 text-center px-4"
      >
        <m.div 
          className="mb-8 relative"
          initial={{ opacity: 1 }}
          animate={contentLoaded ? { opacity: 1 } : { opacity: 0 }}
        >
          <div className="relative mx-auto w-fit hero-logo-glitch hover-glitch cyber2077-scan-build">
            <img 
              src={logoImage} 
              alt={artistName} 
              className="h-32 md:h-48 lg:h-64 w-auto object-contain brightness-110 hover-chromatic-image"
              fetchPriority="high"
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
        </m.div>

        {editMode && onUpdateSiteData && (
          <div className="mt-6 space-y-3">
            {/* Primary hero image upload */}
            <div className="flex items-center justify-center gap-2 flex-wrap">
              <label className="cursor-pointer">
                <Button variant="outline" size="sm" asChild>
                  <span>
                    <Upload className="w-4 h-4 mr-2" />
                    {primaryImage ? 'Change Hero Image' : 'Upload Hero Image'}
                  </span>
                </Button>
                <input
                  ref={artworkInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handlePrimaryUpload}
                />
              </label>
              {primaryImage && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={removePrimaryImage}
                  className="text-destructive/70 hover:text-destructive"
                  aria-label="Remove hero image"
                >
                  <Trash className="w-4 h-4 mr-1" />
                  Remove
                </Button>
              )}
            </div>

            {/* Extra images (slideshow) */}
            {primaryImage && (
              <div className="space-y-2">
                <p className="text-xs font-mono text-muted-foreground text-center">
                  Slideshow images ({allImages.length}/5)
                  {allImages.length > 1 && ' — auto-crossfade every 5s'}
                </p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {extraImages.map((img, idx) => (
                    <div key={idx} className="relative group w-12 h-12 rounded overflow-hidden border border-border">
                      <img src={img} alt={`Hero ${idx + 2}`} className="w-full h-full object-cover" />
                      <button
                        onClick={() => removeExtraImage(idx)}
                        className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity"
                        aria-label={`Remove image ${idx + 2}`}
                      >
                        <Trash className="w-3 h-3 text-white" />
                      </button>
                    </div>
                  ))}
                  {allImages.length < MAX_HERO_IMAGES && (
                    <label className="cursor-pointer w-12 h-12 rounded border border-dashed border-primary/30 flex items-center justify-center hover:border-primary/60 transition-colors">
                      <Images className="w-4 h-4 text-primary/50" />
                      <input
                        ref={extraInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleExtraUpload}
                      />
                    </label>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        <m.div
          initial={{ opacity: 0, y: 20 }}
          animate={contentLoaded ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ delay: prefersReducedMotion ? 0 : 1.2, duration: prefersReducedMotion ? 0 : 0.8, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="mt-12 flex gap-4 justify-center flex-wrap"
        >
          {heroLinks.map((link) => {
            // If this link targets a section that is explicitly hidden, don't render it
            if (link.type === 'section' && sectionVisibility) {
              const key = link.target as string
              if (sectionVisibility[key] === false) return null
            }
            const isExternal = link.type === 'url'
            const commonClass = "uppercase font-mono hover-glitch hover-noise relative cyber-border"
            if (isExternal) {
              return (
                <Button key={link.id} asChild size="lg" variant="outline" className={commonClass}>
                  <a href={link.target} target="_blank" rel="noopener noreferrer">
                    {link.icon === 'Storefront' && <Storefront className="w-5 h-5 mr-2" />}
                    <span className="hover-chromatic">{link.label}</span>
                  </a>
                </Button>
              )
            }
            return (
              <Button
                key={link.id}
                onClick={() => scrollToSection(link.target)}
                size="lg"
                variant={link.id === 'listen' ? 'default' : 'outline'}
                className={commonClass}
              >
                <span className="hover-chromatic">{link.label}</span>
              </Button>
            )
          })}

          {editMode && onUpdateSiteData && (
            <Button
              onClick={startEditLinks}
              size="lg"
              variant="ghost"
              className="uppercase font-mono border border-dashed border-primary/40 hover:border-primary"
              aria-label="Edit hero links"
            >
              <PencilSimple className="w-5 h-5 mr-2" />
              Edit Links
            </Button>
          )}
        </m.div>
      </m.div>

      {/* Edit hero links dialog */}
      {editingLinks && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center p-4"
          style={{ zIndex: 'var(--z-overlay)' } as React.CSSProperties}
          onClick={() => setEditingLinks(false)}
        >
          <div
            className="bg-card border border-primary/30 p-6 w-full max-w-lg font-mono space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div className="data-label">// HERO.LINKS.EDITOR</div>
              <button onClick={() => setEditingLinks(false)} className="text-muted-foreground hover:text-foreground" aria-label="Close">✕</button>
            </div>

            {linksDraft.map((link, idx) => (
              <div key={link.id} className="border border-border/50 p-3 space-y-2">
                <div className="flex gap-2">
                  <input
                    value={link.label}
                    onChange={(e) => setLinksDraft(d => d.map((l, i) => i === idx ? { ...l, label: e.target.value } : l))}
                    placeholder="Button label"
                    className="flex-1 bg-transparent border border-primary/30 px-2 py-1 text-xs focus:outline-none focus:border-primary"
                  />
                  <select
                    value={link.type}
                    onChange={(e) => setLinksDraft(d => d.map((l, i) => i === idx ? { ...l, type: e.target.value as HeroLink['type'] } : l))}
                    className="bg-card border border-primary/30 px-2 py-1 text-xs focus:outline-none"
                  >
                    <option value="section">Scroll to section</option>
                    <option value="url">External URL</option>
                  </select>
                  <button
                    onClick={() => setLinksDraft(d => d.filter((_, i) => i !== idx))}
                    className="text-destructive hover:text-destructive/80 p-1"
                    aria-label="Remove link"
                  >
                    <Trash className="w-4 h-4" />
                  </button>
                </div>
                <input
                  value={link.target}
                  onChange={(e) => setLinksDraft(d => d.map((l, i) => i === idx ? { ...l, target: e.target.value } : l))}
                  placeholder={link.type === 'section' ? 'Section ID (e.g. music, gigs)' : 'https://...'}
                  className="w-full bg-transparent border border-primary/30 px-2 py-1 text-xs focus:outline-none focus:border-primary"
                />
              </div>
            ))}

            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setLinksDraft(d => [...d, { id: genId(), label: 'New Link', type: 'section', target: '' }])}
                className="gap-1 text-xs font-mono"
              >
                <Plus className="w-3 h-3" /> Add Link
              </Button>
              <Button size="sm" onClick={saveLinks} className="gap-1 text-xs font-mono ml-auto">
                <Check className="w-3 h-3" /> Save
              </Button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
