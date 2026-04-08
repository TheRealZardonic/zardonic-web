import React from 'react'
import { motion } from 'framer-motion'
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
} from '@phosphor-icons/react'
import type { AdminSettings } from '@/lib/types'
import type { SiteData } from '@/lib/app-types'

interface AppSocialSectionProps {
  social: SiteData['social']
  sectionOrder: number
  visible: boolean
  editMode: boolean
  sectionLabel: string
  adminSettings: AdminSettings | undefined
  onContactClick: () => void
}

export default function AppSocialSection({ social, sectionOrder, visible, editMode, sectionLabel, adminSettings, onContactClick }: AppSocialSectionProps) {
  if (!visible) return null

  return (
    <div style={{ order: sectionOrder }}>
      <Separator className="bg-border" />
      <section id="connect" className="py-24 px-4 bg-card/50 scanline-effect crt-effect">
        <div className="container mx-auto max-w-4xl">
          <motion.div
            initial={{ opacity: 0, x: -30, filter: 'blur(10px)', clipPath: 'polygon(0 0, 0 0, 0 100%, 0 100%)' }}
            whileInView={{ opacity: 1, x: 0, filter: 'blur(0px)', clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 100%)' }}
            viewport={{ once: true }}
            transition={{ duration: 1, ease: [0.25, 0.46, 0.45, 0.94] }}
            className=""
          >
            <div className="flex items-center justify-between mb-12">
            <h2 className="text-4xl md:text-6xl font-bold uppercase tracking-tighter text-foreground font-mono hover-chromatic hover-glitch cyber2077-scan-build cyber2077-crt-interference" data-text="CONNECT">
              <EditableHeading onChange={() => {}}
                text={sectionLabel}
                defaultText="CONNECT"
                editMode={editMode}
                glitchEnabled={adminSettings?.glitchTextSettings?.enabled !== false}
                glitchIntervalMs={adminSettings?.glitchTextSettings?.intervalMs}
                glitchDurationMs={adminSettings?.glitchTextSettings?.durationMs}
              />
              {adminSettings?.animations?.blinkingCursor !== false && <span className="animate-pulse">_</span>}
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
            </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.8 }}
              className="mt-12 flex flex-wrap justify-center gap-4"
            >
              <Button asChild size="lg" variant="outline" className="uppercase font-mono hover-glitch cyber-border">
                <a href="https://zardonic.channl.co/merch" target="_blank" rel="noopener noreferrer">
                  <Storefront className="w-5 h-5 mr-2" />
                  <span className="hover-chromatic">Merch Shop</span>
                </a>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="uppercase font-mono hover-glitch cyber-border"
                onClick={onContactClick}
              >
                <Envelope className="w-5 h-5 mr-2" />
                <span className="hover-chromatic">Contact</span>
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </section>
    </div>
  )
}
