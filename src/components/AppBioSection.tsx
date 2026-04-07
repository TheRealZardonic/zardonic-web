import { useState } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import EditableHeading from '@/components/EditableHeading'
import { CaretDown, CaretUp } from '@phosphor-icons/react'
import type { AdminSettings } from '@/lib/types'

interface AppBioSectionProps {
  bio: string
  sectionOrder: number
  visible: boolean
  editMode: boolean
  sectionLabel: string
  adminSettings: AdminSettings | undefined
}

export default function AppBioSection({ bio, sectionOrder, visible, editMode, sectionLabel, adminSettings }: AppBioSectionProps) {
  const [bioExpanded, setBioExpanded] = useState(false)

  if (!visible) return null

  return (
    <div style={{ order: sectionOrder }}>
      <Separator className="bg-border" />
      <section id="bio" className="py-24 px-4">
        <div className="container mx-auto max-w-4xl">
          <motion.div
            initial={{ opacity: 0, x: -30, filter: 'blur(10px)', clipPath: 'polygon(0 0, 0 0, 0 100%, 0 100%)' }}
            whileInView={{ opacity: 1, x: 0, filter: 'blur(0px)', clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 100%)' }}
            viewport={{ once: true }}
            transition={{ duration: 1, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="relative"
          >
            <h2 className="text-4xl md:text-6xl font-bold mb-12 uppercase tracking-tighter text-foreground font-mono hover-chromatic hover-glitch cyber2077-scan-build cyber2077-data-corrupt" data-text="BIOGRAPHY">
              <EditableHeading onChange={() => {}}
                text={sectionLabel}
                defaultText="BIOGRAPHY"
                editMode={editMode}
                glitchEnabled={adminSettings?.glitchTextSettings?.enabled !== false}
                glitchIntervalMs={adminSettings?.glitchTextSettings?.intervalMs}
                glitchDurationMs={adminSettings?.glitchTextSettings?.durationMs}
              />
            </h2>

            <div>
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
                className={`text-lg leading-relaxed text-muted-foreground font-light overflow-hidden ${
                  !bioExpanded ? 'max-h-[280px]' : 'max-h-[2000px]'
                }`}
                style={{
                  maskImage: !bioExpanded ? 'linear-gradient(to bottom, black 60%, transparent 100%)' : 'none',
                  WebkitMaskImage: !bioExpanded ? 'linear-gradient(to bottom, black 60%, transparent 100%)' : 'none',
                  transition: 'max-height 0.4s cubic-bezier(0.16, 1, 0.3, 1), mask-image 0.3s ease, -webkit-mask-image 0.3s ease',
                }}
              >
                {bio}
              </motion.div>
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
                      Show Less
                    </>
                  ) : (
                    <>
                      <CaretDown className="w-4 h-4 mr-2" />
                      Read More
                    </>
                  )}
                </Button>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  )
}
