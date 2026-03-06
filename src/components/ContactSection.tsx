import { motion, useInView } from 'framer-motion'
import { PaperPlaneTilt, CheckCircle, Warning } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import ChromaticText from '@/components/ChromaticText'
import { useState, useRef, useEffect } from 'react'
import { useTypingEffect } from '@/hooks/use-typing-effect'
import { useLocale } from '@/contexts/LocaleContext'
import type { ContactSettings, SectionLabels } from '@/lib/types'
import {
  SECTION_GLITCH_PROBABILITY,
  SECTION_GLITCH_DURATION_MS,
  SECTION_GLITCH_INTERVAL_MS,
} from '@/lib/config'

const TITLE_TYPING_SPEED_MS = 80
const TITLE_TYPING_START_DELAY_MS = 200

interface ContactSectionProps {
  contactSettings?: ContactSettings
  editMode?: boolean
  onUpdate?: (settings: ContactSettings) => void
  sectionLabels?: SectionLabels
  onLabelChange?: (key: keyof SectionLabels, value: string) => void
}

type FormStatus = 'idle' | 'loading' | 'success' | 'error'

const inputClass =
  'flex-1 bg-transparent border border-primary/30 px-3 py-2 text-xs font-mono text-foreground placeholder:text-foreground/30 focus:outline-none focus:border-primary'

export default function ContactSection({
  contactSettings,
  editMode,
  onUpdate,
  sectionLabels,
  onLabelChange,
}: ContactSectionProps) {
  const { t } = useLocale()
  const [glitchActive, setGlitchActive] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [status, setStatus] = useState<FormStatus>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  const sectionRef = useRef(null)
  const isInView = useInView(sectionRef, { once: true, amount: 0.2 })
  const titleText = sectionLabels?.contact || t('contact.defaultTitle')
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
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
    <section ref={sectionRef} className="py-24 px-4 bg-gradient-to-b from-secondary/5 via-background to-background" id="contact">
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
          {editMode && onLabelChange && (
            <input
              type="text"
              value={sectionLabels?.contact || ''}
              onChange={(e) => onLabelChange('contact', e.target.value)}
              placeholder={t('contact.defaultTitle')}
              className="bg-transparent border border-primary/30 px-2 py-1 text-xs font-mono text-primary w-32 focus:outline-none focus:border-primary"
            />
          )}
        </div>

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
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label className="font-mono text-xs text-foreground/60">{t('contact.nameLabel')}</Label>
                <Input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t('contact.namePlaceholder')}
                  className={inputClass}
                />
              </div>

              <div className="space-y-1.5">
                <Label className="font-mono text-xs text-foreground/60">{t('contact.emailLabel')}</Label>
                <Input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t('contact.emailPlaceholder')}
                  className={inputClass}
                />
              </div>

              <div className="space-y-1.5">
                <Label className="font-mono text-xs text-foreground/60">{t('contact.subjectLabel')}</Label>
                <Input
                  type="text"
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder={t('contact.subjectPlaceholder')}
                  className={inputClass}
                />
              </div>

              <div className="space-y-1.5">
                <Label className="font-mono text-xs text-foreground/60">{t('contact.messageLabel')}</Label>
                <textarea
                  required
                  rows={5}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={t('contact.messagePlaceholder')}
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
                {status === 'loading' ? t('contact.sending') : t('contact.send')}
              </Button>
            </form>
          )}
        </motion.div>

        {editMode && onUpdate && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
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
            </div>
          </motion.div>
        )}
      </div>
    </section>
  )
}
