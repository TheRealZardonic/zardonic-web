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
  if (!visible) return null

  const streamLabel = sectionLabels?.musicStreamLabel ?? '// SPOTIFY.STREAM.INTERFACE'
  const statusLabel = sectionLabels?.musicStatusLabel ?? '// STATUS: [STREAMING]'

  return (
    <div style={{ order: sectionOrder }}>
      <Separator className="bg-border" />
      <section id="music" className="py-24 px-4 bg-card/50 scanline-effect crt-effect">
        <div className="container mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0, x: -30, filter: 'blur(10px)', clipPath: 'polygon(0 0, 0 0, 0 100%, 0 100%)' }}
            whileInView={{ opacity: 1, x: 0, filter: 'blur(0px)', clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 100%)' }}
            viewport={{ once: true }}
            transition={{ duration: 1, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            <h2 className="text-4xl md:text-6xl font-bold mb-12 uppercase tracking-tighter text-foreground font-mono hover-chromatic hover-glitch cyber2077-scan-build cyber2077-crt-interference" data-text="MUSIC PLAYER">
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

            <Card className="p-0 bg-card border-border relative cyber-card hover-noise overflow-hidden">
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
                  <div className="data-label mb-2">{streamLabel}</div>
                )}
              </div>
              <div className="spotify-player-wrapper" style={{
                background: 'linear-gradient(180deg, oklch(0.15 0 0) 0%, oklch(0.1 0 0) 100%)',
                borderRadius: '0',
              }}>
                <SpotifyEmbed
                  uri="spotify:artist:7BqEidErPMNiUXCRE0dV2n"
                  width="100%"
                  height={352}
                  theme="0"
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
                  <div className="data-label">{statusLabel}</div>
                )}
              </div>
            </Card>
          </motion.div>
        </div>
      </section>
    </div>
  )
}
