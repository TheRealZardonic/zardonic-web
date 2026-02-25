import { useState } from 'react'
import { trackNewsletterSignup } from '@/lib/analytics'

interface NewsletterWidgetProps {
  enabled?: boolean
  title?: string
  description?: string
  placeholder?: string
  buttonText?: string
  onSuccess?: () => void
  source?: string
}

export default function NewsletterWidget({
  enabled = true,
  title = 'STAY IN THE LOOP',
  description = 'Neue Releases, Gigs & Updates direkt in deinen Posteingang',
  placeholder = 'deine@email.com',
  buttonText = 'SUBSCRIBE',
  onSuccess,
  source,
}: NewsletterWidgetProps) {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  if (!enabled) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return
    setStatus('loading')
    setErrorMsg('')
    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), source }),
      })
      const data = await res.json()
      if (!res.ok) {
        setStatus('error')
        setErrorMsg(data.error || 'Fehler beim Anmelden')
      } else {
        setStatus('success')
        trackNewsletterSignup()
        onSuccess?.()
      }
    } catch (err) {
      console.error('Newsletter signup failed:', err)
      setStatus('error')
      setErrorMsg('Netzwerkfehler. Bitte versuche es später erneut.')
    }
  }

  return (
    <div className="border border-primary/30 bg-black/30 p-4 space-y-3 font-mono">
      <div>
        <h3 className="text-sm font-bold tracking-wider text-primary uppercase">{title}</h3>
        <p className="text-[11px] text-foreground/60 mt-1">{description}</p>
      </div>
      {status === 'success' ? (
        <p className="text-[12px] text-green-400 font-mono">✓ Du bist dabei! Check deine E-Mails.</p>
      ) : (
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder={placeholder}
            required
            disabled={status === 'loading'}
            className="flex-1 bg-transparent border border-primary/30 px-3 py-2 text-xs font-mono text-foreground placeholder:text-foreground/30 focus:outline-none focus:border-primary disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={status === 'loading'}
            className="px-4 py-2 bg-primary/20 border border-primary/50 text-primary text-xs font-mono tracking-wider hover:bg-primary/30 transition-colors disabled:opacity-50"
          >
            {status === 'loading' ? '...' : buttonText}
          </button>
        </form>
      )}
      {status === 'error' && (
        <p className="text-[11px] text-red-400 font-mono">{errorMsg}</p>
      )}
      <p className="text-[9px] text-foreground/30">Du kannst dich jederzeit abmelden.</p>
    </div>
  )
}
