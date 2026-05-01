import { motion, useInView } from 'framer-motion'
import { EnvelopeSimple, CheckCircle, Warning, PencilSimple } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import EditableHeading from '@/components/EditableHeading'
import { useState, useRef, useEffect } from 'react'
import { useLocale } from '@/contexts/LocaleContext'
import type { NewsletterSettings, SectionLabels, AdminSettings } from '@/lib/types'
import {
  SECTION_GLITCH_PROBABILITY,
  SECTION_GLITCH_DURATION_MS,
  SECTION_GLITCH_INTERVAL_MS,
} from '@/lib/config'
import { trackNewsletterSignup } from '@/lib/analytics'

export interface NewsletterSectionProps {
  onUpdate?: (settings: NewsletterSettings) => void
  newsletterSettings?: NewsletterSettings
  editMode?: boolean
  sectionLabels?: SectionLabels
  onLabelChange?: (key: keyof SectionLabels, value: string) => void
  adminSettings?: AdminSettings | null
  sectionOrder?: number
}

type FormStatus = 'idle' | 'loading' | 'success' | 'error'

const inputClass =
  'flex-1 bg-transparent border border-primary/30 px-3 py-2 text-xs font-mono text-foreground placeholder:text-foreground/30 focus:outline-none focus:border-primary'

export default function NewsletterSection({
  onUpdate,
  newsletterSettings,
  editMode,
  sectionLabels,
  onLabelChange,
  adminSettings,
  sectionOrder,
}: NewsletterSectionProps) {
  const { t } = useLocale()
  const [glitchActive, setGlitchActive] = useState(false)
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<FormStatus>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [showEditPanel, setShowEditPanel] = useState(false)

  const sectionRef = useRef(null)
  const isInView = useInView(sectionRef, { once: true, amount: 0.2 })
  const titleText = sectionLabels?.newsletter || t('newsletter.title')
  const showCursor = adminSettings?.background?.blinkingCursor !== false

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
    if (!email.trim() || !email.includes('@')) {
      setStatus('error')
      setErrorMsg(t('newsletter.signupError'))
      return
    }
    setStatus('loading')
    setErrorMsg('')
    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error((data as { error?: string }).error || t('newsletter.signupError'))
      }
      setStatus('success')
      setEmail('')
      trackNewsletterSignup()
    } catch (err: unknown) {
      setStatus('error')
      if (err instanceof TypeError) {
        setErrorMsg(t('newsletter.networkError'))
      } else {
        setErrorMsg(err instanceof Error ? err.message : t('newsletter.signupError'))
      }
    }
  }

  if (!editMode && newsletterSettings?.enabled === false) return null
  if (!editMode && newsletterSettings?.showSection === false) return null

  const bgOpacity = adminSettings?.sections?.styleOverrides?.newsletter?.backgroundOpacity ?? 0.5

  return (
    <section
      ref={sectionRef}
      className="py-24 px-4 bg-gradient-to-b from-secondary/5 via-background to-background"
      id="newsletter"
      style={{ order: sectionOrder }}
      data-theme-color="input border ring primary"
    >
      <div className="max-w-6xl mx-auto" style={{ opacity: bgOpacity > 0 ? 1 : 0.3 }}>
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
                onChange={(val) => onLabelChange?.('newsletter', val)}
                text={titleText}
                defaultText="NEWSLETTER"
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
          {(newsletterSettings?.description || t('newsletter.description')) && (
            <p className="font-mono text-sm text-foreground/60 mb-6">
              {newsletterSettings?.description || t('newsletter.description')}
            </p>
          )}

          {status === 'success' ? (
            <div className="border border-primary/20 bg-primary/5 p-6 text-center space-y-3">
              <CheckCircle size={32} className="text-primary mx-auto" />
              <p className="font-mono text-sm text-primary">
                {newsletterSettings?.successMessage || t('newsletter.success')}
              </p>
              <p className="font-mono text-xs text-foreground/50">
                {t('newsletter.unsubscribe')}
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
              <div className="flex gap-2">
                <Input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={newsletterSettings?.placeholder || t('newsletter.placeholder')}
                  className={inputClass}
                  aria-label={t('newsletter.placeholder')}
                />
                <Button
                  type="submit"
                  disabled={status === 'loading'}
                  className="bg-primary hover:bg-accent active:scale-95 transition-transform touch-manipulation font-mono text-xs shrink-0"
                >
                  <EnvelopeSimple className="mr-2" size={16} />
                  {newsletterSettings?.buttonText || (status === 'loading' ? '...' : t('newsletter.subscribe'))}
                </Button>
              </div>

              {status === 'error' && (
                <div className="flex items-center gap-2 text-red-400 font-mono text-xs">
                  <Warning size={16} />
                  <span>{errorMsg || t('newsletter.signupError')}</span>
                </div>
              )}
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
            <p className="font-mono text-xs text-primary/70 uppercase tracking-wider">Newsletter Settings</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="font-mono text-xs text-foreground/50">Section Title</Label>
                <Input
                  value={newsletterSettings?.title || ''}
                  onChange={(e) => onUpdate({ ...newsletterSettings, title: e.target.value })}
                  placeholder="STAY CONNECTED"
                  className={inputClass}
                />
              </div>
              <div className="space-y-1">
                <Label className="font-mono text-xs text-foreground/50">Button Text</Label>
                <Input
                  value={newsletterSettings?.buttonText || ''}
                  onChange={(e) => onUpdate({ ...newsletterSettings, buttonText: e.target.value })}
                  placeholder="SUBSCRIBE"
                  className={inputClass}
                />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label className="font-mono text-xs text-foreground/50">Description</Label>
                <Input
                  value={newsletterSettings?.description || ''}
                  onChange={(e) => onUpdate({ ...newsletterSettings, description: e.target.value })}
                  placeholder="Get the latest news, releases and gig updates."
                  className={inputClass}
                />
              </div>
              <div className="space-y-1">
                <Label className="font-mono text-xs text-foreground/50">Email Placeholder</Label>
                <Input
                  value={newsletterSettings?.placeholder || ''}
                  onChange={(e) => onUpdate({ ...newsletterSettings, placeholder: e.target.value })}
                  placeholder="your@email.com"
                  className={inputClass}
                />
              </div>
              <div className="space-y-1">
                <Label className="font-mono text-xs text-foreground/50">Success Message</Label>
                <Input
                  value={newsletterSettings?.successMessage || ''}
                  onChange={(e) => onUpdate({ ...newsletterSettings, successMessage: e.target.value })}
                  placeholder="Thank you for subscribing!"
                  className={inputClass}
                />
              </div>
              <div className="flex items-center gap-2 sm:col-span-2">
                <Switch
                  checked={newsletterSettings?.enabled !== false}
                  onCheckedChange={(checked) => onUpdate({ ...newsletterSettings, enabled: checked })}
                  id="newsletter-enabled"
                />
                <Label htmlFor="newsletter-enabled" className="font-mono text-xs text-foreground/50">
                  Enable Newsletter Section
                </Label>
              </div>
              <div className="flex items-center gap-2 sm:col-span-2">
                <Switch
                  checked={newsletterSettings?.showSection !== false}
                  onCheckedChange={(checked) => onUpdate({ ...newsletterSettings, showSection: checked })}
                  id="newsletter-show"
                />
                <Label htmlFor="newsletter-show" className="font-mono text-xs text-foreground/50">
                  Show Section on Site
                </Label>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </section>
  )
}
