import { useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import EditableHeading from '@/components/EditableHeading'
import { CaretDown, CaretUp, FloppyDisk, PencilSimple, X } from '@phosphor-icons/react'
import type { AdminSettings, SectionLabels } from '@/lib/types'
import { getBioBodyFontSize } from '@/lib/admin-settings'
import { toast } from 'sonner'

interface AppBioSectionProps {
  bio: string
  sectionOrder: number
  visible: boolean
  editMode: boolean
  sectionLabel: string
  headingPrefix?: string
  adminSettings: AdminSettings | undefined
  sectionLabels?: SectionLabels
  onLabelChange?: (key: keyof SectionLabels, value: string) => void
  onUpdate?: (bio: string) => void
}

export default function AppBioSection({ bio, sectionOrder, visible, editMode, sectionLabel, headingPrefix, adminSettings, sectionLabels, onLabelChange: _onLabelChange, onUpdate }: AppBioSectionProps) {
  const [bioExpanded, setBioExpanded] = useState(false)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(bio)

  const readMoreText = sectionLabels?.bioReadMoreText ?? 'Read More'
  const showLessText = sectionLabels?.bioShowLessText ?? 'Show Less'
  const bioTextSize = getBioBodyFontSize(adminSettings)

  const typography = adminSettings?.design?.typography
  const hasCustomHeadingSize = !!typography?.headingFontSize
  const hasCustomHeadingWeight = !!typography?.headingFontWeight
  const hasCustomHeadingLetterSpacing = !!typography?.headingLetterSpacing
  const hasCustomBodyLineHeight = !!typography?.bodyLineHeight

  const headingClasses = [
    'text-foreground hover-chromatic hover-glitch cyber2077-scan-build cyber2077-data-corrupt uppercase',
    !hasCustomHeadingSize ? 'text-4xl md:text-6xl' : '',
    !hasCustomHeadingWeight ? 'font-bold' : '',
    !hasCustomHeadingLetterSpacing ? 'tracking-tighter' : '',
    !typography?.headingFontFamily ? 'font-mono' : '',
  ].filter(Boolean).join(' ')

  const bodyClasses = [
    bioTextSize,
    'text-muted-foreground overflow-hidden font-light',
    !hasCustomBodyLineHeight ? 'leading-relaxed' : '',
    !bioExpanded ? 'max-h-[280px]' : 'max-h-none'
  ].filter(Boolean).join(' ')

  const handleSave = useCallback(() => {
    onUpdate?.(draft)
    setEditing(false)
    toast.success('Biography saved')
  }, [draft, onUpdate])

  const handleCancel = useCallback(() => {
    setDraft(bio)
    setEditing(false)
  }, [bio])

  const handleEditClick = useCallback(() => {
    setDraft(bio)
    setEditing(true)
  }, [bio])

  if (!visible) return null

  return (
    <div style={{ order: sectionOrder }}>
      <Separator className="bg-border" />
      <section id="bio" className="py-24 px-4" data-theme-color="foreground muted-foreground card border">
        <div className="container mx-auto max-w-4xl">
          <motion.div
            initial={{ opacity: 0, x: -30, filter: 'blur(10px)', clipPath: 'polygon(0 0, 0 0, 0 100%, 0 100%)' }}
            whileInView={{ opacity: 1, x: 0, filter: 'blur(0px)', clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 100%)' }}
            viewport={{ once: true }}
            transition={{ duration: 1, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="relative"
          >
            <div className="flex items-center justify-between mb-12 flex-wrap gap-4">
              <h2 className={headingClasses} data-text={`${headingPrefix ? headingPrefix + ' ' : ''}${sectionLabel || 'BIOGRAPHY'}`}>
                {headingPrefix && <span className="text-primary/70 mr-2">{headingPrefix}</span>}
                <EditableHeading onChange={() => {}}
                  text={sectionLabel}
                  defaultText="BIOGRAPHY"
                  editMode={editMode}
                  glitchEnabled={adminSettings?.terminal?.glitchText?.enabled !== false}
                  glitchIntervalMs={adminSettings?.terminal?.glitchText?.intervalMs}
                  glitchDurationMs={adminSettings?.terminal?.glitchText?.durationMs}
                />
                {adminSettings?.background?.blinkingCursor !== false && <span className="animate-pulse">_</span>}
              </h2>
              {editMode && !editing && (
                <Button
                  variant="outline"
                  size="sm"
                  className="font-mono border-primary/30 hover:bg-primary/10"
                  onClick={handleEditClick}
                >
                  <PencilSimple className="w-4 h-4 mr-2" />
                  Edit Bio
                </Button>
              )}
            </div>

            {editMode && editing ? (
              <div className="space-y-4">
                <Textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  className="min-h-[240px] font-mono text-sm bg-card border-border"
                  placeholder="Write the artist biography here…"
                  aria-label="Artist biography"
                />
                <div className="flex gap-2">
                  <Button variant="default" size="sm" className="font-mono" onClick={handleSave}>
                    <FloppyDisk className="w-4 h-4 mr-2" />
                    Save
                  </Button>
                  <Button variant="outline" size="sm" className="font-mono" onClick={handleCancel}>
                    <X className="w-4 h-4 mr-2" />
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div>
                {/* fontFamily is intentionally on a plain div — not on the motion.div —
                    so framer-motion's style merging can never interfere with the font.
                    The CSS variable --font-body is set by useAppTheme and restored on
                    every page load by theme-restore.js. */}
                <div
                  className={bodyClasses}
                  style={{
                    fontFamily: 'var(--font-body)',
                    maskImage: !bioExpanded ? 'linear-gradient(to bottom, black 60%, transparent 100%)' : 'none',
                    WebkitMaskImage: !bioExpanded ? 'linear-gradient(to bottom, black 60%, transparent 100%)' : 'none',
                    transition: 'max-height 0.4s cubic-bezier(0.16, 1, 0.3, 1), mask-image 0.3s ease, -webkit-mask-image 0.3s ease',
                  }}
                >
                <motion.div
                  initial={{ opacity: 0, x: -30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.8, delay: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
                >
                  {bio}
                </motion.div>
                </div>
                <motion.div
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: 0.4 }}
                  className="mt-6"
                >
                  <Button
                    onClick={() => setBioExpanded(!bioExpanded)}
                    variant="outline"
                    className="font-mono hover-glitch cyber-border"
                  >
                    {bioExpanded ? (
                      <>
                        <CaretUp className="w-4 h-4 mr-2" />
                        {showLessText}
                      </>
                    ) : (
                      <>
                        <CaretDown className="w-4 h-4 mr-2" />
                        {readMoreText}
                      </>
                    )}
                  </Button>
                </motion.div>
              </div>
            )}
          </motion.div>
        </div>
      </section>
    </div>
  )
}
