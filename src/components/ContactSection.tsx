import { motion, useInView } from 'framer-motion'
import { PaperPlaneTilt, CheckCircle, Warning, PencilSimple, Plus, Trash } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import EditableHeading from '@/components/EditableHeading'
import { useState, useRef, useEffect } from 'react'
import { useLocale } from '@/contexts/LocaleContext'
import type { ContactSettings, SectionLabels, AdminSettings } from '@/lib/types'
import {
  SECTION_GLITCH_PROBABILITY,
  SECTION_GLITCH_DURATION_MS,
  SECTION_GLITCH_INTERVAL_MS,
} from '@/lib/config'

const DEFAULT_CONTACT_SUBJECTS = [
  'Booking Request',
  'Remix Request',
  'Mix & Master Request',
  'Music Production Request',
  'Interview Request',
  'Other Requests',
]

interface ContactSectionProps {
  onUpdate?: (settings: ContactSettings) => void
  contactSettings?: ContactSettings
  editMode?: boolean
  sectionLabels?: SectionLabels
  onLabelChange?: (key: keyof SectionLabels, value: string) => void
  adminSettings?: AdminSettings | null
}

type FormStatus = 'idle' | 'loading' | 'success' | 'error'

const inputClass =
  'flex-1 bg-transparent border border-primary/30 px-3 py-2 text-xs font-mono text-foreground placeholder:text-foreground/30 focus:outline-none focus:border-primary'

export default function ContactSection({
  onUpdate,
  contactSettings,
  editMode,
  sectionLabels,
  onLabelChange,
  adminSettings,
}: ContactSectionProps) {
  const { t } = useLocale()
  const [glitchActive, setGlitchActive] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [status, setStatus] = useState<FormStatus>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [showEditPanel, setShowEditPanel] = useState(false)

  const sectionRef = useRef(null)
  const isInView = useInView(sectionRef, { once: true, amount: 0.2 })
  const titleText = sectionLabels?.contact || t('contact.defaultTitle')
  const showCursor = adminSettings?.background?.blinkingCursor !== false

  // Resolved subject list: use configured subjects, fall back to built-in defaults
  const subjectOptions = contactSettings?.contactSubjects?.length
    ? contactSettings.contactSubjects
    : DEFAULT_CONTACT_SUBJECTS

  useEffect(() => {
    const interval = setInterval(() => {
      if (Math.random() > SECTION_GLITCH_PROBABILITY) {
        setGlitchActive(true)
        setTimeout(() => setGlitchActive(false), SECTION_GLITCH_DURATION_MS)
      }
    }, SECTION_GLITCH_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !email.trim() || !subject.trim() || !message.trim()) {
      setStatus('error')
      setErrorMsg(t('contact.sendError') || 'Please fill in all required fields.')
      return
    }
    if (!email.includes('@')) {
      setStatus('error')
      setErrorMsg('Please enter a valid email address.')
      return
    }
    setStatus('loading')
    setErrorMsg('')
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, subject, message }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Request failed')
      }
      setStatus('success')
      setName('')
      setEmail('')
      setSubject('')
      setMessage('')
    } catch (err: unknown) {
      setStatus('error')
      setErrorMsg(err instanceof Error ? err.message : 'Unknown error')
    }
  }

  if (!editMode && contactSettings?.enabled === false) return null
  if (!editMode && contactSettings?.showSection === false) return null

  return (
    <section ref={sectionRef} className="py-24 px-4 bg-gradient-to-b from-secondary/5 via-background to-background" id="contact" data-theme-color="input border ring primary">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, x: -30, filter: 'blur(10px)', clipPath: 'polygon(0 0, 0 0, 0 100%, 0 100%)' }}
          animate={isInView ? { opacity: 1, x: 0, filter: 'blur(0px)', clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 100%)' } : {}}
          transition={{ duration: 1, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          <div className="flex items-center justify-between mb-12">
            <h2
              className={`text-4xl md:text-6xl font-bold uppercase tracking-tighter text-foreground font-mono hover-chromatic hover-glitch cyber2077-scan-build cyber2077-data-corrupt${glitchActive ? ' glitch-text-effect' : ''}`}
              data-text={titleText}
            >
              <EditableHeading
                onChange={(val) => onLabelChange?.('contact', val)}
                text={titleText}
                defaultText="CONTACT"
                editMode={editMode ?? false}
                glitchEnabled={adminSettings?.terminal?.glitchText?.enabled !== false}
                glitchIntervalMs={adminSettings?.terminal?.glitchText?.intervalMs}
                glitchDurationMs={adminSettings?.terminal?.glitchText?.durationMs}
              />
              {showCursor && <span className="animate-pulse">_</span>}
            </h2>
            {editMode && onUpdate && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowEditPanel(!showEditPanel)}
                className="gap-2 border-primary/30 font-mono tracking-wider text-xs shrink-0"
              >
                <PencilSimple className="w-4 h-4" />
                {showEditPanel ? t('contact.closePanel') : t('contact.editSection')}
              </Button>
            )}
          </div>
        </motion.div>

        <Separator className="mb-8 bg-primary/10" />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="max-w-xl"
        >
          {contactSettings?.description && (
            <p className="font-mono text-sm text-foreground/60 mb-6">
              {contactSettings.description}
            </p>
          )}

          {status === 'success' ? (
            <div className="border border-primary/20 bg-primary/5 p-6 text-center space-y-3">
              <CheckCircle size={32} className="text-primary mx-auto" />
              <p className="font-mono text-sm text-primary">
                {contactSettings?.successMessage || t('contact.success')}
              </p>
              <Button
                variant="outline"
                onClick={() => setStatus('idle')}
                className="font-mono text-xs"
              >
                {t('contact.newMessage')}
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              <div className="space-y-1.5">
                <Label className="font-mono text-xs text-foreground/60">
                  {contactSettings?.formNameLabel || t('contact.nameLabel')}
                </Label>
                <Input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={contactSettings?.formNamePlaceholder || t('contact.namePlaceholder')}
                  className={inputClass}
                />
              </div>

              <div className="space-y-1.5">
                <Label className="font-mono text-xs text-foreground/60">
                  {contactSettings?.formEmailLabel || t('contact.emailLabel')}
                </Label>
                <Input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={contactSettings?.formEmailPlaceholder || t('contact.emailPlaceholder')}
                  className={inputClass}
                />
              </div>

              <div className="space-y-1.5">
                <Label className="font-mono text-xs text-foreground/60">
                  {contactSettings?.formSubjectLabel || t('contact.subjectLabel')}
                </Label>
                <select
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  aria-label={contactSettings?.formSubjectLabel || t('contact.subjectLabel') || 'Subject'}
                  className={`${inputClass} w-full appearance-none`}
                >
                  <option value="" disabled>{contactSettings?.formSubjectPlaceholder || t('contact.subjectPlaceholder') || 'Select a subject...'}</option>
                  {subjectOptions.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label className="font-mono text-xs text-foreground/60">
                  {contactSettings?.formMessageLabel || t('contact.messageLabel')}
                </Label>
                <textarea
                  required
                  rows={5}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={contactSettings?.formMessagePlaceholder || t('contact.messagePlaceholder')}
                  className={`${inputClass} w-full resize-y`}
                />
              </div>

              {status === 'error' && (
                <div className="flex items-center gap-2 text-red-400 font-mono text-xs">
                  <Warning size={16} />
                  <span>{errorMsg || t('contact.sendError')}</span>
                </div>
              )}

              <Button
                type="submit"
                disabled={status === 'loading'}
                className="bg-primary hover:bg-accent active:scale-95 transition-transform touch-manipulation font-mono text-xs"
              >
                <PaperPlaneTilt className="mr-2" size={16} />
                {contactSettings?.formButtonText || (status === 'loading' ? t('contact.sending') : t('contact.send'))}
              </Button>
            </form>
          )}
        </motion.div>

        {editMode && onUpdate && showEditPanel && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-8 border border-primary/20 bg-card/30 p-4 space-y-3"
          >
            <p className="font-mono text-xs text-primary/70 uppercase tracking-wider">{t('contact.settings')}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="font-mono text-xs text-foreground/50">{t('contact.titleLabel')}</Label>
                <Input
                  value={contactSettings?.title || ''}
                  onChange={(e) => onUpdate({ ...contactSettings, title: e.target.value })}
                  placeholder={t('contact.titlePlaceholder')}
                  className={inputClass}
                />
              </div>
              <div className="space-y-1">
                <Label className="font-mono text-xs text-foreground/50">{t('contact.emailForward')}</Label>
                <Input
                  type="email"
                  value={contactSettings?.emailForwardTo || ''}
                  onChange={(e) => onUpdate({ ...contactSettings, emailForwardTo: e.target.value })}
                  placeholder={t('contact.emailForwardPlaceholder')}
                  className={inputClass}
                />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label className="font-mono text-xs text-foreground/50">{t('contact.descriptionLabel')}</Label>
                <Input
                  value={contactSettings?.description || ''}
                  onChange={(e) => onUpdate({ ...contactSettings, description: e.target.value })}
                  placeholder={t('contact.descriptionPlaceholder')}
                  className={inputClass}
                />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label className="font-mono text-xs text-foreground/50">{t('contact.successLabel')}</Label>
                <Input
                  value={contactSettings?.successMessage || ''}
                  onChange={(e) => onUpdate({ ...contactSettings, successMessage: e.target.value })}
                  placeholder={t('contact.successPlaceholder')}
                  className={inputClass}
                />
              </div>

              {/* Form field labels & placeholders */}
              <p className="font-mono text-xs text-primary/50 uppercase tracking-wider sm:col-span-2 pt-2 border-t border-border/30">{t('contact.formFieldLabels')}</p>
              <div className="space-y-1">
                <Label className="font-mono text-xs text-foreground/50">{t('contact.nameLabelField')}</Label>
                <Input
                  value={contactSettings?.formNameLabel || ''}
                  onChange={(e) => onUpdate({ ...contactSettings, formNameLabel: e.target.value })}
                  placeholder="Name"
                  className={inputClass}
                />
              </div>
              <div className="space-y-1">
                <Label className="font-mono text-xs text-foreground/50">{t('contact.namePlaceholderField')}</Label>
                <Input
                  value={contactSettings?.formNamePlaceholder || ''}
                  onChange={(e) => onUpdate({ ...contactSettings, formNamePlaceholder: e.target.value })}
                  placeholder="Your name"
                  className={inputClass}
                />
              </div>
              <div className="space-y-1">
                <Label className="font-mono text-xs text-foreground/50">{t('contact.emailLabelField')}</Label>
                <Input
                  value={contactSettings?.formEmailLabel || ''}
                  onChange={(e) => onUpdate({ ...contactSettings, formEmailLabel: e.target.value })}
                  placeholder="Email"
                  className={inputClass}
                />
              </div>
              <div className="space-y-1">
                <Label className="font-mono text-xs text-foreground/50">{t('contact.emailPlaceholderField')}</Label>
                <Input
                  value={contactSettings?.formEmailPlaceholder || ''}
                  onChange={(e) => onUpdate({ ...contactSettings, formEmailPlaceholder: e.target.value })}
                  placeholder="your@email.com"
                  className={inputClass}
                />
              </div>
              <div className="space-y-1">
                <Label className="font-mono text-xs text-foreground/50">{t('contact.subjectLabelField')}</Label>
                <Input
                  value={contactSettings?.formSubjectLabel || ''}
                  onChange={(e) => onUpdate({ ...contactSettings, formSubjectLabel: e.target.value })}
                  placeholder="Subject"
                  className={inputClass}
                />
              </div>
              <div className="space-y-1">
                <Label className="font-mono text-xs text-foreground/50">{t('contact.subjectPlaceholderField')}</Label>
                <Input
                  value={contactSettings?.formSubjectPlaceholder || ''}
                  onChange={(e) => onUpdate({ ...contactSettings, formSubjectPlaceholder: e.target.value })}
                  placeholder="Message subject"
                  className={inputClass}
                />
              </div>
              <div className="space-y-1">
                <Label className="font-mono text-xs text-foreground/50">{t('contact.messageLabelField')}</Label>
                <Input
                  value={contactSettings?.formMessageLabel || ''}
                  onChange={(e) => onUpdate({ ...contactSettings, formMessageLabel: e.target.value })}
                  placeholder="Message"
                  className={inputClass}
                />
              </div>
              <div className="space-y-1">
                <Label className="font-mono text-xs text-foreground/50">{t('contact.messagePlaceholderField')}</Label>
                <Input
                  value={contactSettings?.formMessagePlaceholder || ''}
                  onChange={(e) => onUpdate({ ...contactSettings, formMessagePlaceholder: e.target.value })}
                  placeholder="Your message..."
                  className={inputClass}
                />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label className="font-mono text-xs text-foreground/50">{t('contact.submitButtonField')}</Label>
                <Input
                  value={contactSettings?.formButtonText || ''}
                  onChange={(e) => onUpdate({ ...contactSettings, formButtonText: e.target.value })}
                  placeholder="Send"
                  className={inputClass}
                />
              </div>

              {/* Subject options editor */}
              <div className="space-y-2 sm:col-span-2 pt-2 border-t border-border/30">
                <p className="font-mono text-xs text-primary/50 uppercase tracking-wider">Subject Options</p>
                <div className="space-y-1">
                  {subjectOptions.map((opt, idx) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <Input
                        value={opt}
                        onChange={(e) => {
                          const next = [...subjectOptions]
                          next[idx] = e.target.value
                          onUpdate({ ...contactSettings, contactSubjects: next })
                        }}
                        className={inputClass}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const next = subjectOptions.filter((_, i) => i !== idx)
                          onUpdate({ ...contactSettings, contactSubjects: next })
                        }}
                        className="text-destructive/70 hover:text-destructive shrink-0"
                        aria-label={`Remove subject ${opt}`}
                      >
                        <Trash size={14} />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => onUpdate({ ...contactSettings, contactSubjects: [...subjectOptions, ''] })}
                    className="flex items-center gap-1 text-xs font-mono text-primary/50 hover:text-primary transition-colors mt-1"
                  >
                    <Plus size={12} /> Add subject
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </section>
  )
}
