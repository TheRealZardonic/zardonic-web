import React from 'react'
import { motion } from 'framer-motion'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import EditableHeading from '@/components/EditableHeading'
import { User, Plus, Upload, Trash } from '@phosphor-icons/react'
import type { AdminSettings, SectionLabels } from '@/lib/types'

interface ShellSectionProps {
  editMode: boolean
  adminSettings: AdminSettings | undefined
  sectionOrder: number
  visible: boolean
  sectionLabel: string
}

export default function ShellSection({
  editMode,
  adminSettings,
  sectionOrder,
  visible,
  sectionLabel,
}: ShellSectionProps) {
  return (
    <div style={{ order: sectionOrder }}>
    {visible && (
    <>
    <Separator className="bg-border" />
    <section id="shell" className="py-24 px-4 scanline-effect crt-effect">
      <div className="container mx-auto max-w-4xl">
        <motion.div
          initial={{ opacity: 0, x: -30, filter: 'blur(10px)', clipPath: 'polygon(0 0, 0 0, 0 100%, 0 100%)' }}
          whileInView={{ opacity: 1, x: 0, filter: 'blur(0px)', clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 100%)' }}
          viewport={{ once: true }}
          transition={{ duration: 1, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          <div className="flex items-center justify-between mb-12 flex-wrap gap-4">
            <h2 className="text-4xl md:text-6xl font-bold uppercase tracking-tighter text-foreground font-mono hover-chromatic hover-glitch cyber2077-scan-build cyber2077-data-corrupt" data-text={sectionLabel || 'SHELL'}>
              <EditableHeading
                text={sectionLabel || ''}
                defaultText="SHELL"
                editMode={editMode}
                glitchEnabled={adminSettings?.glitchTextSettings?.enabled !== false}
                glitchIntervalMs={adminSettings?.glitchTextSettings?.intervalMs}
                glitchDurationMs={adminSettings?.glitchTextSettings?.durationMs}
              />
            </h2>
          </div>

          <div className="space-y-12">
            {(adminSettings?.shellMembers || (adminSettings?.shellMember ? [adminSettings.shellMember] : [])).map((member, memberIndex) => (
              <div key={memberIndex} className="grid md:grid-cols-[280px_1fr] gap-8 items-start">
                <motion.div
                  className="relative aspect-square bg-muted border border-primary/30 overflow-hidden cyber-card"
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: 0.1 }}
                >
                  {member?.photo ? (
                    <img
                      src={member.photo}
                      alt={member.name || 'Member'}
                      className="w-full h-full object-cover glitch-image hover-chromatic-image"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <User className="w-20 h-20 text-muted-foreground" />
                    </div>
                  )}
                  <div className="absolute top-0 left-0 w-3 h-3 border-t border-l border-primary/60" />
                  <div className="absolute top-0 right-0 w-3 h-3 border-t border-r border-primary/60" />
                  <div className="absolute bottom-0 left-0 w-3 h-3 border-b border-l border-primary/60" />
                  <div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-primary/60" />
                </motion.div>

                <motion.div
                  className="space-y-4"
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                >
                  <div className="data-label mb-2">// PROFILE.DATA.STREAM [{String(memberIndex).padStart(2, '0')}]</div>
                  <div className="cyber-grid p-4">
                    <div className="data-label mb-2">Subject</div>
                    {editMode ? (
                      <Input
                        value={member?.name || ''}
                        onChange={(e) => setAdminSettings((prev) => {
                          const members = [...(prev?.shellMembers || (prev?.shellMember ? [prev.shellMember] : []))]
                          members[memberIndex] = { ...members[memberIndex], name: e.target.value }
                          return { ...(prev || {}), shellMembers: members }
                        })}
                        className="bg-card border-border font-mono text-xl"
                        placeholder="Member name"
                      />
                    ) : (
                      <p className="text-xl font-bold font-mono hover-chromatic">{member?.name || 'Unknown'}</p>
                    )}
                  </div>

                  <div className="cyber-grid p-4">
                    <div className="data-label mb-2">Role</div>
                    {editMode ? (
                      <Input
                        value={member?.role || ''}
                        onChange={(e) => setAdminSettings((prev) => {
                          const members = [...(prev?.shellMembers || (prev?.shellMember ? [prev.shellMember] : []))]
                          members[memberIndex] = { ...members[memberIndex], role: e.target.value }
                          return { ...(prev || {}), shellMembers: members }
                        })}
                        className="bg-card border-border font-mono"
                        placeholder="Member role"
                      />
                    ) : (
                      <p className="text-muted-foreground font-mono">{member?.role || ''}</p>
                    )}
                  </div>

                  <div className="cyber-grid p-4">
                    <div className="data-label mb-2">Bio</div>
                    {editMode ? (
                      <Textarea
                        value={member?.bio || ''}
                        onChange={(e) => setAdminSettings((prev) => {
                          const members = [...(prev?.shellMembers || (prev?.shellMember ? [prev.shellMember] : []))]
                          members[memberIndex] = { ...members[memberIndex], bio: e.target.value }
                          return { ...(prev || {}), shellMembers: members }
                        })}
                        className="bg-card border-border font-mono min-h-[100px]"
                        placeholder="Member bio"
                      />
                    ) : (
                      <p className="text-foreground/90 leading-relaxed font-mono text-sm">{member?.bio || ''}</p>
                    )}
                  </div>

                  {editMode && (
                    <div className="cyber-grid p-4">
                      <div className="data-label mb-2">Social Links</div>
                      <div className="space-y-2">
                        {(['instagram', 'spotify', 'youtube', 'soundcloud', 'twitter', 'website'] as const).map((platform) => (
                          <div key={platform} className="flex gap-2 items-center">
                            <Label className="font-mono text-xs w-24">{platform}</Label>
                            <Input
                              value={member?.social?.[platform] || ''}
                              onChange={(e) => setAdminSettings((prev) => {
                                const members = [...(prev?.shellMembers || (prev?.shellMember ? [prev.shellMember] : []))]
                                members[memberIndex] = {
                                  ...members[memberIndex],
                                  social: { ...(members[memberIndex]?.social || {}), [platform]: e.target.value },
                                }
                                return { ...(prev || {}), shellMembers: members }
                              })}
                              className="bg-card border-border font-mono text-xs flex-1"
                              placeholder={`https://${platform}.com/...`}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {!editMode && member?.social && (
                    <div className="flex flex-wrap gap-3 pt-2">
                      {Object.entries(member.social).filter(([, url]) => url).map(([platform, url]) => (
                        <a
                          key={platform}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-mono text-muted-foreground hover:text-primary transition-colors uppercase tracking-wider hover-chromatic"
                        >
                          [{platform}]
                        </a>
                      ))}
                    </div>
                  )}

                  {editMode && (
                    <Button
                      variant="destructive"
                      size="sm"
                      className="mt-2"
                      onClick={() => setAdminSettings((prev) => {
                        const members = [...(prev?.shellMembers || (prev?.shellMember ? [prev.shellMember] : []))]
                        members.splice(memberIndex, 1)
                        return { ...(prev || {}), shellMembers: members }
                      })}
                    >
                      <Trash className="w-4 h-4 mr-1" />
                      Remove Member
                    </Button>
                  )}

                  <div className="flex items-center gap-2 text-xs text-primary/40 pt-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-pulse" />
                    <span>SESSION ACTIVE</span>
                  </div>
                </motion.div>
              </div>
            ))}

            {(adminSettings?.shellMembers || (adminSettings?.shellMember ? [adminSettings.shellMember] : [])).length === 0 && !editMode && (
              <div className="text-center py-8">
                <p className="text-muted-foreground font-mono">No members configured</p>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </section>
    </>
    )}
    </div>
  )
}
