import { motion, useInView } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { ChromaticText } from '@/components/ChromaticText'
import FontSizePicker from '@/components/FontSizePicker'
import type { SocialLinks, FontSizeSettings, SectionLabels } from '@/lib/types'
import { useState, useRef, useEffect } from 'react'
import SocialEditDialog from './SocialEditDialog'
import { useTypingEffect } from '@/hooks/use-typing-effect'
import { trackSocialClick } from '@/lib/analytics'
import {
  TITLE_TYPING_SPEED_MS,
  TITLE_TYPING_START_DELAY_MS,
  SECTION_GLITCH_PROBABILITY,
  SECTION_GLITCH_DURATION_MS,
  SECTION_GLITCH_INTERVAL_MS,
} from '@/lib/config'

import instagramIcon from '@/assets/images/icons/instagram.png'
import facebookIcon from '@/assets/images/icons/facebook.png'
import spotifyIcon from '@/assets/images/icons/spotify.png'
import soundcloudIcon from '@/assets/images/icons/soundcloud.png'
import youtubeIcon from '@/assets/images/icons/youtube.png'
import bandcampIcon from '@/assets/images/icons/bandcamp.png'
import linkIcon from '@/assets/images/icons/link.png'

interface SocialSectionProps {
  socialLinks: SocialLinks
  editMode: boolean
  onUpdate: (socialLinks: SocialLinks) => void
  fontSizes?: FontSizeSettings
  onFontSizeChange?: (key: keyof FontSizeSettings, value: string) => void
  sectionLabels?: SectionLabels
  onLabelChange?: (key: keyof SectionLabels, value: string) => void
}

const socialPlatforms = [
  { key: 'instagram' as keyof SocialLinks, icon: instagramIcon, label: 'Instagram' },
  { key: 'facebook' as keyof SocialLinks, icon: facebookIcon, label: 'Facebook' },
  { key: 'spotify' as keyof SocialLinks, icon: spotifyIcon, label: 'Spotify' },
  { key: 'soundcloud' as keyof SocialLinks, icon: soundcloudIcon, label: 'SoundCloud' },
  { key: 'youtube' as keyof SocialLinks, icon: youtubeIcon, label: 'YouTube' },
  { key: 'tiktok' as keyof SocialLinks, icon: linkIcon, label: 'TikTok' },
  { key: 'twitter' as keyof SocialLinks, icon: linkIcon, label: 'Twitter' },
  { key: 'linktr' as keyof SocialLinks, icon: linkIcon, label: 'Linktree' },
  { key: 'bandcamp' as keyof SocialLinks, icon: bandcampIcon, label: 'Bandcamp' }
]

function SocialButton({ iconSrc, url, label, index, isInView, onClick }: { iconSrc: string; url?: string; label: string; index: number; isInView: boolean; onClick?: () => void }) {
  const [hovered, setHovered] = useState(false)

  return (
    <motion.div
      key={label}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.8 }}
      transition={{ duration: 0.5, delay: index * 0.08 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <Button
        asChild
        variant="outline"
        className="w-full h-44 md:h-52 flex flex-col items-center justify-center gap-3 rounded-none border-primary/30 hover:border-primary hover:bg-primary/10 active:border-primary active:bg-primary/20 active:scale-[0.92] transition-all group relative overflow-hidden touch-manipulation hud-element hud-corner hud-scanline social-cyber-card"
        style={{
          textShadow: '0 0 6px oklch(1 0 0 / 0.3), 0 0 12px oklch(0.50 0.22 25 / 0.2)',
          boxShadow: hovered
            ? '0 0 20px oklch(0.50 0.22 25 / 0.4), inset 0 0 20px oklch(0.50 0.22 25 / 0.1)'
            : '0 0 8px oklch(0.50 0.22 25 / 0.15), inset 0 0 8px oklch(0.50 0.22 25 / 0.03)',
        }}
      >
        <a href={url} target="_blank" rel="noopener noreferrer" onClick={onClick}>
          <span className="corner-bl"></span>
          <span className="corner-br"></span>
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-opacity duration-300" />
          <div className="absolute inset-0 bg-primary/0 group-active:bg-primary/10 transition-colors duration-100 pointer-events-none" />
          <div className={`relative z-10 transition-all ${hovered ? 'red-glitch-element chromatic-aberration-hover' : ''}`}>
            <img
              src={iconSrc}
              alt={label}
              className="w-16 h-16 md:w-20 md:h-20 object-contain group-hover:scale-110 group-active:scale-125 transition-transform duration-200 select-none"
              draggable={false}
              style={{
                filter: `drop-shadow(2px 0 0 oklch(0.50 0.22 25 / 0.8)) drop-shadow(-2px 0 0 oklch(0.50 0.22 25 / 0.8)) drop-shadow(0 0 10px oklch(0.50 0.22 25 / 0.4))`
              }}
            />
          </div>
          <span className="text-xs md:text-sm font-medium tracking-wider uppercase relative z-10 font-mono">{label}</span>
        </a>
      </Button>
    </motion.div>
  )
}

export default function SocialSection({ socialLinks, editMode, onUpdate, fontSizes, onFontSizeChange, sectionLabels, onLabelChange }: SocialSectionProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [glitchActive, setGlitchActive] = useState(false)
  const sectionRef = useRef(null)
  const isInView = useInView(sectionRef, { once: true, amount: 0.2 })
  const titleText = sectionLabels?.connect || 'CONNECT'
  const headingPrefix = sectionLabels?.headingPrefix ?? '>'
  const { displayedText: displayedTitle } = useTypingEffect(
    isInView ? titleText : '',
    TITLE_TYPING_SPEED_MS,
    TITLE_TYPING_START_DELAY_MS
  )

  useEffect(() => {
    const interval = setInterval(() => {
      if (Math.random() > SECTION_GLITCH_PROBABILITY) {
        setGlitchActive(true)
        setTimeout(() => setGlitchActive(false), SECTION_GLITCH_DURATION_MS)
      }
    }, SECTION_GLITCH_INTERVAL_MS)

    return () => clearInterval(interval)
  }, [])

  const safeSocialLinks = socialLinks || {}
  const activePlatforms = socialPlatforms.filter(platform => safeSocialLinks[platform.key])

  return (
    <section ref={sectionRef} className="py-24 px-4 bg-gradient-to-b from-background to-secondary/10" id="social">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-12">
          <motion.h2 
            className={`text-4xl md:text-5xl lg:text-6xl font-bold font-mono scanline-text dot-matrix-text ${glitchActive ? 'glitch-text-effect' : ''}`}
            data-text={`${headingPrefix} ${displayedTitle}`}
            initial={{ opacity: 0, x: -20 }}
            animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -20 }}
            transition={{ duration: 0.6 }}
            style={{
              textShadow: '0 0 6px oklch(1 0 0 / 0.5), 0 0 12px oklch(0.50 0.22 25 / 0.3), 0 0 18px oklch(0.50 0.22 25 / 0.2)'
            }}
          >
            <ChromaticText intensity={1.5}>
              {headingPrefix} {displayedTitle}
            </ChromaticText>
            <span className="animate-pulse">_</span>
          </motion.h2>
          {editMode && (
            <div className="flex gap-2 items-center w-full sm:w-auto">
              {onLabelChange && (
                <input
                  type="text"
                  value={sectionLabels?.connect || ''}
                  onChange={(e) => onLabelChange('connect', e.target.value)}
                  placeholder="CONNECT"
                  className="bg-transparent border border-primary/30 px-2 py-1 text-xs font-mono text-primary w-32 focus:outline-none focus:border-primary"
                />
              )}
              <Button
                onClick={() => setIsEditing(true)}
                className="bg-primary hover:bg-accent active:scale-95 transition-transform touch-manipulation"
              >
                Edit Links
              </Button>
            </div>
          )}
        </div>

        <Separator className="bg-gradient-to-r from-primary via-primary/50 to-transparent mb-16 h-0.5" />

        {editMode && onFontSizeChange && (
          <div className="mb-6 flex gap-2 flex-wrap">
            <FontSizePicker label="CONNECT" value={fontSizes?.connectText} onChange={(v) => onFontSizeChange('connectText', v)} />
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
          {activePlatforms.map((platform, index) => {
            const url = safeSocialLinks[platform.key]

            return (
              <SocialButton key={platform.key} iconSrc={platform.icon} url={url} label={platform.label} index={index} isInView={isInView} onClick={() => trackSocialClick(platform.key, url || '')} />
            )
          })}
        </div>

        {activePlatforms.length === 0 && (
          <motion.div 
            className="text-center py-20"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <p className="text-muted-foreground text-lg">No social links added yet.</p>
          </motion.div>
        )}
      </div>

      {isEditing && (
        <SocialEditDialog
          socialLinks={safeSocialLinks}
          onSave={(updated) => {
            onUpdate(updated)
            setIsEditing(false)
          }}
          onClose={() => setIsEditing(false)}
        />
      )}
    </section>
  )
}
