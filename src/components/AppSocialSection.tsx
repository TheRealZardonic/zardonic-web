import React, { memo, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import EditableHeading from '@/components/EditableHeading'
import {
  InstagramLogo,
  FacebookLogo,
  SpotifyLogo,
  YoutubeLogo,
  SoundcloudLogo,
  TiktokLogo,
  Storefront,
  ApplePodcastsLogo,
  MusicNote,
  Envelope,
  Link,
  Plus,
  Trash,
} from '@phosphor-icons/react'
import type { AdminSettings, CustomSocialLink, SectionLabels } from '@/lib/types'
import type { SiteData } from '@/lib/app-types'
import { useLocale } from '@/contexts/LocaleContext'

interface AppSocialSectionProps {
  social: SiteData['social']
  sectionOrder: number
  visible: boolean
  editMode: boolean
  sectionLabel: string
  headingPrefix?: string
  adminSettings: AdminSettings | undefined
  onContactClick: () => void
  sectionLabels?: SectionLabels
  onLabelChange?: (key: keyof SectionLabels, value: string | boolean) => void
  setAdminSettings?: (s: AdminSettings) => void
}

function AppSocialSection({ social, sectionOrder, visible, editMode, sectionLabel, headingPrefix, adminSettings, onContactClick, setAdminSettings }: AppSocialSectionProps) {
  const { t } = useLocale()
  const prefersReducedMotion = useReducedMotion()
  const [newLinkLabel, setNewLinkLabel] = useState('')
  const [newLinkUrl, setNewLinkUrl] = useState('')
  if (!visible) return null

  const customLinks: CustomSocialLink[] = adminSettings?.customSocialLinks ?? []

  const addCustomLink = () => {
    if (!newLinkLabel.trim() || !newLinkUrl.trim()) return
    const link: CustomSocialLink = {
      id: Date.now().toString(),
      label: newLinkLabel.trim(),
      url: newLinkUrl.trim(),
    }
    setAdminSettings?.({ ...(adminSettings ?? {}), customSocialLinks: [...customLinks, link] })
    setNewLinkLabel('')
    setNewLinkUrl('')
  }

  const removeCustomLink = (id: string) => {
    setAdminSettings?.({ ...(adminSettings ?? {}), customSocialLinks: customLinks.filter(l => l.id !== id) })
  }

  return (
    <div style={{ order: sectionOrder }}>
      <Separator className="bg-border" />
      <section id="connect" className="py-24 px-4 bg-card/50 scanline-effect" data-theme-color="primary accent">
        <div className="container mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0, x: -30, filter: 'blur(10px)', clipPath: 'polygon(0 0, 0 0, 0 100%, 0 100%)' }}
            whileInView={{ opacity: 1, x: 0, filter: 'blur(0px)', clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 100%)' }}
            viewport={{ once: true }}
            transition={{ duration: prefersReducedMotion ? 0 : 1, ease: [0.25, 0.46, 0.45, 0.94] }}
            className=""
          >
            <div className="flex items-center justify-between mb-12">
            <h2 className="text-4xl md:text-6xl font-bold uppercase tracking-tighter text-foreground font-mono hover-chromatic hover-glitch cyber2077-scan-build cyber2077-crt-interference" data-text={`${headingPrefix ? headingPrefix + ' ' : ''}${sectionLabel || 'CONNECT'}`}>
              {headingPrefix && <span className="text-primary/70 mr-2">{headingPrefix}</span>}
              <EditableHeading onChange={() => {}}
                text={sectionLabel}
                defaultText="CONNECT"
                editMode={editMode}
                glitchEnabled={adminSettings?.terminal?.glitchText?.enabled !== false}
                glitchIntervalMs={adminSettings?.terminal?.glitchText?.intervalMs}
                glitchDurationMs={adminSettings?.terminal?.glitchText?.durationMs}
              />
              {adminSettings?.background?.blinkingCursor !== false && <span className="animate-pulse">_</span>}
            </h2>
            </div>

            <div className="flex flex-wrap justify-center gap-6">
              {([
                { key: 'instagram', Icon: InstagramLogo, label: 'Instagram' },
                { key: 'facebook', Icon: FacebookLogo, label: 'Facebook' },
                { key: 'spotify', Icon: SpotifyLogo, label: 'Spotify' },
                { key: 'youtube', Icon: YoutubeLogo, label: 'YouTube' },
                { key: 'soundcloud', Icon: SoundcloudLogo, label: 'SoundCloud' },
                { key: 'tiktok', Icon: TiktokLogo, label: 'TikTok' },
                { key: 'bandcamp', Icon: Storefront, label: 'Bandcamp' },
                { key: 'appleMusic', Icon: ApplePodcastsLogo, label: 'Apple Music' },
                { key: 'twitter', Icon: MusicNote, label: 'X' },
                { key: 'twitch', Icon: MusicNote, label: 'Twitch' },
                { key: 'beatport', Icon: MusicNote, label: 'Beatport' },
                { key: 'linktree', Icon: MusicNote, label: 'Linktree' },
              ] as { key: keyof typeof social; Icon: React.ComponentType<{ className?: string; weight?: string }>; label: string }[]).map(({ key, Icon, label }, index) => (
                social[key] ? (
                  <motion.a
                    key={key}
                    href={social[key]}
                    target="_blank"
                    rel="noopener noreferrer"
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: 0.1 + index * 0.08, ease: [0.25, 0.46, 0.45, 0.94] }}
                    className="text-foreground hover:text-primary transition-colors hover-glitch hover-chromatic relative flex flex-col items-center gap-1"
                    title={label}
                  >
                    <Icon className="w-12 h-12" weight="fill" />
                    <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">{label}</span>
                  </motion.a>
                ) : null
              ))}

              {/* Custom social links */}
              {customLinks.map((link, index) => (
                <motion.div
                  key={link.id}
                  className="relative group"
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: 0.1 + index * 0.08 }}
                >
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-foreground hover:text-primary transition-colors hover-glitch hover-chromatic relative flex flex-col items-center gap-1"
                    title={link.label}
                  >
                    <Link className="w-12 h-12" weight="fill" />
                    <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">{link.label}</span>
                  </a>
                  {editMode && (
                    <button
                      onClick={() => removeCustomLink(link.id)}
                      className="absolute -top-2 -right-2 bg-destructive/80 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                      aria-label={`Remove custom link ${link.label}`}
                    >
                      <Trash size={10} className="text-white" />
                    </button>
                  )}
                </motion.div>
              ))}
            </div>

            {/* Edit mode: add custom links */}
            {editMode && setAdminSettings && (
              <div className="mt-8 max-w-md mx-auto space-y-2">
                <p className="text-[10px] font-mono text-muted-foreground/60 uppercase tracking-wider text-center">Add custom social link</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newLinkLabel}
                    onChange={(e) => setNewLinkLabel(e.target.value)}
                    placeholder="Label (e.g. Patreon)"
                    className="flex-1 bg-transparent border border-primary/20 px-2 py-1 text-xs font-mono text-foreground placeholder:text-foreground/30 focus:outline-none focus:border-primary/50"
                    aria-label="New custom link label"
                  />
                  <input
                    type="url"
                    value={newLinkUrl}
                    onChange={(e) => setNewLinkUrl(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') addCustomLink() }}
                    placeholder="https://..."
                    className="flex-1 bg-transparent border border-primary/20 px-2 py-1 text-xs font-mono text-foreground placeholder:text-foreground/30 focus:outline-none focus:border-primary/50"
                    aria-label="New custom link URL"
                  />
                  <button
                    onClick={addCustomLink}
                    disabled={!newLinkLabel.trim() || !newLinkUrl.trim()}
                    className="text-primary/50 hover:text-primary disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    aria-label="Add custom link"
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </div>
            )}

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.8 }}
              className="mt-12 flex flex-wrap justify-center gap-4"
            >
              {social.merch && (
                <Button asChild size="lg" variant="outline" className="uppercase font-mono hover-glitch cyber-border">
                  <a href={social.merch} target="_blank" rel="noopener noreferrer">
                    <Storefront className="w-5 h-5 mr-2" />
                    <span className="hover-chromatic">{t('social.merchShop')}</span>
                  </a>
                </Button>
              )}
              <Button
                size="lg"
                variant="outline"
                className="uppercase font-mono hover-glitch cyber-border"
                onClick={onContactClick}
              >
                <Envelope className="w-5 h-5 mr-2" />
                <span className="hover-chromatic">{t('social.contactButton')}</span>
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </section>
    </div>
  )
}
export default memo(AppSocialSection)
