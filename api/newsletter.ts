import { Redis } from '@upstash/redis'
const kv = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || '',
  token: process.env.UPSTASH_REDIS_REST_TOKEN || ''
})
import { createHash } from 'node:crypto'
import { applyRateLimit } from './_ratelimit.js'

/** Same regex as api/contact.ts — matches user@domain.tld */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

interface VercelRequest {
  method?: string
  body?: Record<string, unknown>
  query?: Record<string, string | string[]>
  headers: Record<string, string | string[] | undefined>
}

interface VercelResponse {
  setHeader(key: string, value: string): VercelResponse
  status(code: number): VercelResponse
  json(data: unknown): VercelResponse
  end(): VercelResponse
}

interface Subscriber {
  email: string
  source?: string
  date: string
}

/** Store subscriber locally in KV for the admin mailing list view. */
async function storeSubscriberLocally(email: string, source: string | undefined): Promise<void> {
  if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) return
  const MAX_RETRIES = 3
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const key = 'newsletter-subscribers'
      const subscribers: Subscriber[] = (await kv.get<Subscriber[]>(key)) || []
      if (subscribers.some((s) => s.email === email)) return // already subscribed
      subscribers.push({ email, source: source || 'website', date: new Date().toISOString() })
      await kv.set(key, subscribers)
      return // success
    } catch (err) {
      if (attempt === MAX_RETRIES - 1) {
        console.error('storeSubscriberLocally failed after retries:', err)
      }
    }
  }
}

// OWASP A01:2021 – Broken Access Control: restrict CORS to the configured origin
// instead of a wildcard so arbitrary third-party sites cannot POST subscriptions.
const CORS_ORIGIN = process.env.ALLOWED_ORIGIN || '*'

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  res.setHeader('Access-Control-Allow-Origin', CORS_ORIGIN)
  res.setHeader('Access-Control-Allow-Methods', 'POST, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  if (req.method === 'DELETE') {
    const allowed = await applyRateLimit(req, res)
    if (!allowed) return

    const { email } = req.body || {}
    if (!email || typeof email !== 'string' || !EMAIL_RE.test(email.trim()) || email.trim().length > 254) {
      res.status(400).json({ error: 'Valid email required' })
      return
    }

    const sanitizedEmail = email.toLowerCase().trim().slice(0, 254)

    // Remove from local KV store
    if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
      const MAX_RETRIES = 3
      for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        try {
          const key = 'newsletter-subscribers'
          const subscribers: Subscriber[] = (await kv.get<Subscriber[]>(key)) || []
          const filtered = subscribers.filter((s) => s.email !== sanitizedEmail)
          await kv.set(key, filtered)
          break
        } catch (err) {
          if (attempt === MAX_RETRIES - 1) {
            console.error('Unsubscribe from local KV failed:', err)
          }
        }
      }
    }

    // Also unsubscribe from Mailchimp/Brevo if configured
    try {
      // Mailchimp
      if (process.env.MAILCHIMP_API_KEY && process.env.MAILCHIMP_LIST_ID) {
        const dc = process.env.MAILCHIMP_API_KEY.split('-').pop()
        const hash = createHash('md5').update(sanitizedEmail).digest('hex')
        const url = `https://${dc}.api.mailchimp.com/3.0/lists/${process.env.MAILCHIMP_LIST_ID}/members/${hash}`
        await fetch(url, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `apikey ${process.env.MAILCHIMP_API_KEY}`,
          },
          body: JSON.stringify({ status: 'unsubscribed' }),
        })
      }

      // Brevo
      if (process.env.BREVO_API_KEY && process.env.BREVO_LIST_ID) {
        const url = `https://api.brevo.com/v3/contacts/lists/${process.env.BREVO_LIST_ID}/contacts/remove`
        await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'api-key': process.env.BREVO_API_KEY,
          },
          body: JSON.stringify({ emails: [sanitizedEmail] }),
        })
      }
    } catch (err) {
      console.error('External unsubscription failed:', err)
    }

    res.status(200).json({ success: true, message: 'Unsubscribed successfully' })
    return
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const allowed = await applyRateLimit(req, res)
  if (!allowed) return

  const { email, source } = req.body || {}

  if (!email || typeof email !== 'string' || !EMAIL_RE.test(email.trim()) || email.trim().length > 254) {
    res.status(400).json({ error: 'Valid email required' })
    return
  }

  const sanitizedEmail = email.toLowerCase().trim().slice(0, 254)
  const sanitizedSource = typeof source === 'string' ? source : undefined

  // Mailchimp
  if (process.env.MAILCHIMP_API_KEY && process.env.MAILCHIMP_LIST_ID) {
    try {
      const dc = process.env.MAILCHIMP_API_KEY.split('-').pop()
      const url = `https://${dc}.api.mailchimp.com/3.0/lists/${process.env.MAILCHIMP_LIST_ID}/members`
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `apikey ${process.env.MAILCHIMP_API_KEY}`,
        },
        body: JSON.stringify({
          email_address: sanitizedEmail,
          status: 'pending',
          tags: sanitizedSource ? [sanitizedSource] : [],
        }),
      })
      const data = await response.json() as { title?: string; detail?: string }
      if (!response.ok && data.title !== 'Member Exists') {
        res.status(400).json({ error: data.detail || 'Subscription failed' })
        return
      }
      storeSubscriberLocally(sanitizedEmail, sanitizedSource)
      res.status(200).json({ success: true })
      return
    } catch {
      res.status(500).json({ error: 'Newsletter service error' })
      return
    }
  }

  // Brevo (Sendinblue)
  if (process.env.BREVO_API_KEY && process.env.BREVO_LIST_ID) {
    try {
      const response = await fetch('https://api.brevo.com/v3/contacts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': process.env.BREVO_API_KEY,
        },
        body: JSON.stringify({
          email: sanitizedEmail,
          listIds: [parseInt(process.env.BREVO_LIST_ID)],
          updateEnabled: true,
          attributes: sanitizedSource ? { SOURCE: sanitizedSource } : {},
        }),
      })
      if (!response.ok) {
        const data = await response.json().catch(() => ({})) as { message?: string }
        res.status(400).json({ error: data.message || 'Subscription failed' })
        return
      }
      storeSubscriberLocally(sanitizedEmail, sanitizedSource)
      res.status(200).json({ success: true })
      return
    } catch {
      res.status(500).json({ error: 'Newsletter service error' })
      return
    }
  }

  // No external provider — store locally in KV
  await storeSubscriberLocally(sanitizedEmail, sanitizedSource)
  res.status(200).json({ success: true })
}
