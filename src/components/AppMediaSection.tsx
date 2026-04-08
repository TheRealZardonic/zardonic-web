import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Separator } from '@/components/ui/separator'
import { Folder } from '@phosphor-icons/react'
import EditableHeading from '@/components/EditableHeading'
import { MediaBrowser } from '@/components/MediaBrowser'
import type { AdminSettings, SectionLabels, MediaFile } from '@/lib/types'
import { useLocale } from '@/contexts/LocaleContext'
import { formatFileCount } from '@/lib/i18n'

interface AppMediaSectionProps {
  mediaFiles?: MediaFile[]
  sectionOrder: number
  visible: boolean
  editMode: boolean
  sectionLabel: string
  headingPrefix?: string
  adminSettings: AdminSettings | undefined
  onLabelChange?: (key: keyof SectionLabels, value: string) => void
  onUpdate?: (files: MediaFile[]) => void
}

export default function AppMediaSection({
  mediaFiles = [],
  sectionOrder,
  visible,
  editMode,
  sectionLabel,
  headingPrefix,
  adminSettings,
  onLabelChange,
  onUpdate,
}: AppMediaSectionProps) {
  const [browserOpen, setBrowserOpen] = useState(false)
  const { t, locale } = useLocale()

  const prefix = headingPrefix !== undefined ? headingPrefix : ''
  const displayLabel = sectionLabel || 'MEDIA'

  if (!visible) return null

  return (
    <div style={{ order: sectionOrder }}>
      <Separator className="bg-border" />
      <section id="media" className="py-24 px-4">
        <div className="container mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0, x: -30, filter: 'blur(10px)', clipPath: 'polygon(0 0, 0 0, 0 100%, 0 100%)' }}
            whileInView={{ opacity: 1, x: 0, filter: 'blur(0px)', clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 100%)' }}
            viewport={{ once: true }}
            transition={{ duration: 1, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            <div className="flex items-center justify-between mb-12 flex-wrap gap-4">
              <h2
                className="text-4xl md:text-6xl font-bold uppercase tracking-tighter text-foreground font-mono hover-chromatic hover-glitch cyber2077-scan-build"
                data-text={`${prefix}${prefix ? ' ' : ''}${displayLabel}`}
              >
                {prefix && <span className="text-primary/70 mr-2">{prefix}</span>}
                <EditableHeading
                  text={sectionLabel}
                  defaultText="MEDIA"
                  editMode={editMode && !!onLabelChange}
                  onChange={(v) => onLabelChange?.('media', v)}
                  glitchEnabled={adminSettings?.glitchTextSettings?.enabled !== false}
                  glitchIntervalMs={adminSettings?.glitchTextSettings?.intervalMs}
                  glitchDurationMs={adminSettings?.glitchTextSettings?.durationMs}
                />
                {adminSettings?.animations?.blinkingCursor !== false && <span className="animate-pulse">_</span>}
              </h2>
            </div>

            {/* Clickable trigger to open the media browser overlay */}
            <motion.button
              className="w-full text-left border border-primary/30 bg-card/40 hover:border-primary/60 hover:bg-primary/5 p-6 transition-all group relative"
              onClick={() => setBrowserOpen(true)}
              whileHover={{ scale: 1.005 }}
              whileTap={{ scale: 0.99 }}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              aria-label="Open media archive"
            >
              <span className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-primary/60" />
              <span className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-primary/60" />
              <span className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-primary/60" />
              <span className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-primary/60" />

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 border border-primary/30 flex items-center justify-center bg-primary/5 group-hover:bg-primary/10 transition-colors">
                    <Folder className="w-6 h-6 text-primary/60 group-hover:text-primary transition-colors" weight="fill" />
                  </div>
                  <div className="font-mono">
                    <p className="text-sm text-foreground/90 group-hover:text-primary transition-colors tracking-wider">
                      {t('media.openArchive')}
                    </p>
                    <p className="data-label mt-1">
                      {mediaFiles.length > 0
                        ? formatFileCount(mediaFiles.length, locale)
                        : t('media.pressKits')}
                    </p>
                  </div>
                </div>
                <div className="hidden md:flex items-center gap-2 text-xs text-primary/40 font-mono">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary/40 animate-pulse" />
                  {t('media.clickToAccess')}
                </div>
              </div>
            </motion.button>
          </motion.div>
        </div>
      </section>

      <AnimatePresence>
        {browserOpen && (
          <MediaBrowser
            mediaFiles={mediaFiles}
            editMode={editMode}
            onUpdate={onUpdate}
            isOverlay
            onClose={() => setBrowserOpen(false)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
