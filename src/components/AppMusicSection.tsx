import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Card } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import EditableHeading from '@/components/EditableHeading'
import { SpotifyEmbed } from '@/components/SpotifyEmbed'
import type { AdminSettings, SectionLabels } from '@/lib/types'

interface AppMusicSectionProps {
  sectionOrder: number
  visible: boolean
  editMode: boolean
  sectionLabel: string
  adminSettings: AdminSettings | undefined
  sectionLabels?: SectionLabels
  onLabelChange?: (key: keyof SectionLabels, value: string) => void
}

export default function AppMusicSection({
  sectionOrder,
  visible,
  editMode,
  sectionLabel,
  adminSettings,
  sectionLabels,
  onLabelChange,
}: AppMusicSectionProps) {
  const [spotifyTheme, setSpotifyTheme] = useState<'0' | '1'>('0')

  useEffect(() => {
    const updateTheme = () => {
      const computedBg = getComputedStyle(document.documentElement).getPropertyValue('--background').trim()
      const match = computedBg.match(/^([\d.]+)/)
      if (match) {
        const lightness = parseFloat(match[1])
        setSpotifyTheme(lightness > 0.6 ? '1' : '0')
      }
    }
    updateTheme()
    const observer = new MutationObserver(updateTheme)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['style', 'class'] })
    return () => observer.disconnect()
  }, [])

  if (!visible) return null

  const headingPrefix = sectionLabels?.headingPrefix
  const streamLabel = sectionLabels?.musicStreamLabel ?? '// SPOTIFY.STREAM.INTERFACE'
  const statusLabel = sectionLabels?.musicStatusLabel ?? '// STATUS: [STREAMING]'

  return (
    <div style={{ order: sectionOrder }}>
      <Separator className="bg-border" />
      <section id="music" className="py-24 px-4 bg-card/50 scanline-effect crt-effect" data-theme-color="card">
        <div className="container mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0, x: -30, filter: 'blur(10px)', clipPath: 'polygon(0 0, 0 0, 0 100%, 0 100%)' }}
            whileInView={{ opacity: 1, x: 0, filter: 'blur(0px)', clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 100%)' }}
            viewport={{ once: true }}
            transition={{ duration: 1, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            <h2 className="text-4xl md:text-6xl font-bold mb-12 uppercase tracking-tighter text-foreground font-mono hover-chromatic hover-glitch cyber2077-scan-build cyber2077-crt-interference" data-text={`${headingPrefix ? headingPrefix + ' ' : ''}${sectionLabel || 'MUSIC PLAYER'}`} data-theme-color="foreground primary">
              {headingPrefix && <span className="text-primary/70 mr-2">{headingPrefix}</span>}
              <EditableHeading onChange={() => {}}
                text={sectionLabel}
                defaultText="MUSIC PLAYER"
                editMode={editMode}
                glitchEnabled={adminSettings?.glitchTextSettings?.enabled !== false}
                glitchIntervalMs={adminSettings?.glitchTextSettings?.intervalMs}
                glitchDurationMs={adminSettings?.glitchTextSettings?.durationMs}
              />
              {adminSettings?.animations?.blinkingCursor !== false && <span className="animate-pulse">_</span>}
            </h2>

            <Card className="p-0 bg-card border-border relative cyber-card hover-noise overflow-hidden rounded-none" data-theme-color="card border">
              <div className="scan-line"></div>
              <div className="p-4 pb-0">
                {editMode && onLabelChange ? (
                  <input
                    className="data-label mb-2 bg-transparent border border-primary/30 px-2 py-1 text-xs font-mono w-full focus:outline-none focus:border-primary/60"
                    value={streamLabel}
                    onChange={e => onLabelChange('musicStreamLabel', e.target.value)}
                    aria-label="Stream interface label"
                  />
                ) : (
                  <div className="data-label mb-2" data-theme-color="data-label">{streamLabel}</div>
                )}
              </div>
              <div className="spotify-player-wrapper spotify-ci-embed bg-card">
                <SpotifyEmbed
                  uri="spotify:artist:7BqEidErPMNiUXCRE0dV2n"
                  width="100%"
                  height={352}
                  theme={spotifyTheme}
                />
              </div>
              <div className="p-4 pt-2">
                {editMode && onLabelChange ? (
                  <input
                    className="data-label bg-transparent border border-primary/30 px-2 py-1 text-xs font-mono w-full focus:outline-none focus:border-primary/60"
                    value={statusLabel}
                    onChange={e => onLabelChange('musicStatusLabel', e.target.value)}
                    aria-label="Stream status label"
                  />
                ) : (
                  <div className="data-label" data-theme-color="data-label">{statusLabel}</div>
                )}
              </div>
            </Card>
          </motion.div>
        </div>
      </section>
    </div>
  )
}
