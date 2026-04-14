import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { PaperPlaneTilt } from '@phosphor-icons/react'
import { toast } from 'sonner'
import type { AdminSettings, DecorativeTexts } from '@/lib/types'
import { submitContactForm, contactFormSchema } from '@/lib/contact'

interface ContactOverlayContentProps {
  adminSettings: AdminSettings | undefined
  decorativeTexts?: DecorativeTexts
}

export function ContactOverlayContent({ adminSettings, decorativeTexts }: ContactOverlayContentProps) {
  const streamLabel = decorativeTexts?.contactStreamLabel ?? '// CONTACT.INTERFACE'
  const formLabel = decorativeTexts?.contactFormLabel ?? '// CONTACT.FORM'
  const statusLabel = decorativeTexts?.contactStatusLabel ?? '// SYSTEM.STATUS: [ACTIVE]'
  return (
    <motion.div
      data-theme-color="card border input ring"
      className="mt-8 space-y-6"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.3 }}
    >
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="data-label mb-2">{streamLabel}</div>
        <h2 className="text-4xl md:text-5xl font-bold uppercase font-mono mb-4 hover-chromatic crt-flash-in" data-text="CONTACT">
          CONTACT
        </h2>
      </motion.div>

      <div className="space-y-6 text-foreground/90">
        {(adminSettings?.contact?.managementName || adminSettings?.contact?.managementEmail) && (
          <motion.div
            className="cyber-grid p-4"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="data-label mb-3">Management</div>
            <div className="space-y-2 font-mono text-sm">
              {adminSettings?.contact?.managementName && (
                <p>{adminSettings.contact.managementName}</p>
              )}
              {adminSettings?.contact?.managementEmail && (
                <p>E-Mail: <a href={`mailto:${adminSettings.contact.managementEmail}`} className="text-primary hover:underline">{adminSettings.contact.managementEmail}</a></p>
              )}
            </div>
          </motion.div>
        )}

        {adminSettings?.contact?.bookingEmail && (
          <motion.div
            className="cyber-grid p-4"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            <div className="data-label mb-3">Booking</div>
            <div className="space-y-2 font-mono text-sm">
              <p>E-Mail: <a href={`mailto:${adminSettings.contact.bookingEmail}`} className="text-primary hover:underline">{adminSettings.contact.bookingEmail}</a></p>
            </div>
          </motion.div>
        )}

        {adminSettings?.contact?.pressEmail && (
          <motion.div
            className="cyber-grid p-4"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.35 }}
          >
            <div className="data-label mb-3">Press / Media</div>
            <div className="space-y-2 font-mono text-sm">
              <p>E-Mail: <a href={`mailto:${adminSettings.contact.pressEmail}`} className="text-primary hover:underline">{adminSettings.contact.pressEmail}</a></p>
            </div>
          </motion.div>
        )}

        <motion.div
          className="cyber-grid p-6"
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.45 }}
        >
          <div className="data-label mb-4">{formLabel}</div>
          <form
            onSubmit={async (e) => {
              e.preventDefault()
              const form = e.currentTarget
              const formData = new FormData(form)
              const data = {
                name: formData.get('name') as string,
                email: formData.get('email') as string,
                subject: formData.get('subject') as string,
                message: formData.get('message') as string,
                _hp: (formData.get('_hp') as string) ?? '',
              }

              const validation = contactFormSchema.safeParse(data)
              if (!validation.success) {
                toast.error(validation.error.issues[0]?.message || 'Please check your input')
                return
              }

              const submitBtn = form.querySelector('button[type="submit"]') as HTMLButtonElement | null
              if (submitBtn) submitBtn.disabled = true
              toast.loading('Sending message...', { id: 'contact-submit' })

              const result = await submitContactForm(data)

              if (result.success) {
                toast.success('Message sent successfully!', { id: 'contact-submit' })
                form.reset()
              } else {
                toast.error(result.error || 'Failed to send message', { id: 'contact-submit' })
              }

              if (submitBtn) submitBtn.disabled = false
            }}
            className="space-y-4"
          >
            {/* Honeypot field — hidden from real users */}
            <input type="text" name="_hp" tabIndex={-1} autoComplete="off" aria-hidden="true" className="absolute opacity-0 h-0 w-0 overflow-hidden pointer-events-none" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="font-mono text-xs uppercase tracking-wide">{adminSettings?.contact?.formNameLabel || 'Name'}</Label>
                <Input name="name" required maxLength={100} placeholder={adminSettings?.contact?.formNamePlaceholder || 'Your name'} className="bg-card border-border font-mono mt-1" />
              </div>
              <div>
                <Label className="font-mono text-xs uppercase tracking-wide">{adminSettings?.contact?.formEmailLabel || 'Email'}</Label>
                <Input name="email" type="email" required maxLength={254} placeholder={adminSettings?.contact?.formEmailPlaceholder || 'your@email.com'} className="bg-card border-border font-mono mt-1" />
              </div>
            </div>
            <div>
              <Label className="font-mono text-xs uppercase tracking-wide">{adminSettings?.contact?.formSubjectLabel || 'Subject'}</Label>
              {adminSettings?.contact?.contactSubjects && adminSettings.contact.contactSubjects.length > 0 ? (
                <select
                  name="subject"
                  required
                  defaultValue=""
                  className="w-full bg-card border border-border font-mono text-sm mt-1 px-3 py-2 rounded-md text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="" disabled>{adminSettings?.contact?.formSubjectPlaceholder || 'Select a subject...'}</option>
                  {adminSettings.contact.contactSubjects.map((s, i) => (
                    <option key={i} value={s}>{s}</option>
                  ))}
                </select>
              ) : (
                <Input name="subject" required maxLength={200} placeholder={adminSettings?.contact?.formSubjectPlaceholder || 'Subject'} className="bg-card border-border font-mono mt-1" />
              )}
            </div>
            <div>
              <Label className="font-mono text-xs uppercase tracking-wide">{adminSettings?.contact?.formMessageLabel || 'Message'}</Label>
              <Textarea name="message" required maxLength={5000} placeholder={adminSettings?.contact?.formMessagePlaceholder || 'Your message...'} className="bg-card border-border font-mono mt-1 min-h-[120px]" />
            </div>
            <Button type="submit" className="w-full uppercase font-mono hover-glitch cyber-border">
              <PaperPlaneTilt className="w-5 h-5 mr-2" />
              <span className="hover-chromatic">{adminSettings?.contact?.formButtonText || 'Send Message'}</span>
            </Button>
          </form>
        </motion.div>
      </div>

      <motion.div
        className="pt-6 border-t border-border"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
      >
        <div className="data-label">{statusLabel}</div>
      </motion.div>
    </motion.div>
  )
}
