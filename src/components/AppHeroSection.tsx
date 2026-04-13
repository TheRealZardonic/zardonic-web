import React from 'react'
import logoImage from '@/assets/images/meta_eyJzcmNCdWNrZXQiOiJiemdsZmlsZXMifQ==.webp'
import { motion, useReducedMotion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Upload, Storefront, Plus, Trash, PencilSimple, Check } from '@phosphor-icons/react'
import type { SiteData, HeroLink } from '@/lib/app-types'
import type { AdminSettings, SectionVisibility } from '@/lib/types'
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
  sectionVisibility?: SectionVisibility
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

  const heroImageUrl = siteData?.heroImage
    ? toDirectImageUrl(siteData.heroImage, { output: 'webp', q: 85 })
    : undefined
  const heroImageOpacity = adminSettings?.sections?.styleOverrides?.hero?.heroImageOpacity ?? 0.5
  const heroImageBlur = adminSettings?.sections?.styleOverrides?.hero?.heroImageBlur ?? 0
  const heroMinHeight = adminSettings?.sections?.styleOverrides?.hero?.minHeight ?? 'min-h-screen'
  const heroPaddingTop = adminSettings?.sections?.styleOverrides?.hero?.paddingTop

  const startEditLinks = () => {
    setLinksDraft(siteData?.heroLinks ?? DEFAULT_HERO_LINKS)
    setEditingLinks(true)
  }

  const saveLinks = () => {
    onUpdateSiteData?.((prev) => ({ ...prev, heroLinks: linksDraft }))
    setEditingLinks(false)
  }

  const genId = () => (typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : Math.random().toString(36).slice(2))

  return (
    <section
      className={`relative ${heroMinHeight} flex items-center justify-center pt-20 overflow-hidden scanline-effect`}
      style={heroPaddingTop ? { paddingTop: heroPaddingTop } : undefined}
      data-theme-color="foreground primary"
    >
      {!hasCustomBackground && !heroImageUrl && <div className="absolute inset-0 bg-black" />}
      {heroImageUrl && (
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: `url(${heroImageUrl})`,
            opacity: heroImageOpacity,
            filter: heroImageBlur > 0 ? `blur(${heroImageBlur}px)` : undefined,
          }}
          aria-hidden="true"
        />
      )}
      
      <div className="absolute inset-0 noise-effect" />
      
      <motion.div
        initial={{ opacity: 0 }}
        animate={contentLoaded ? { opacity: 1 } : { opacity: 0 }}
        transition={{ duration: prefersReducedMotion ? 0 : 0.15 }}
        className="relative z-10 text-center px-4"
      >
        <motion.div 
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
                onChange={(_e) => Promise.resolve("")}
              />
            </label>
          </div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={contentLoaded ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ delay: prefersReducedMotion ? 0 : 1.2, duration: prefersReducedMotion ? 0 : 0.8, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="mt-12 flex gap-4 justify-center flex-wrap"
        >
          {heroLinks.map((link) => {
            // If this link targets a section that is explicitly hidden, don't render it
            if (link.type === 'section' && sectionVisibility) {
              const key = link.target as keyof SectionVisibility
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
        </motion.div>
      </motion.div>

      {/* Edit hero links dialog */}
      {editingLinks && (
        <div
          className="fixed inset-0 z-[300] bg-black/80 flex items-center justify-center p-4"
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
