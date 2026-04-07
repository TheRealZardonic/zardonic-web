import { Redis } from '@upstash/redis'
const kv = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || '',
  token: process.env.UPSTASH_REDIS_REST_TOKEN || ''
})
import { createHash } from 'node:crypto'
import { validateSession } from './auth.js'

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

const KV_KEY = 'newsletter-subscribers'

/**
 * Newsletter subscriber management API (admin only).
 *
 * GET  — list all locally stored subscribers
 * POST — manually add a subscriber
 *
 * Note: subscribers who signed up via Mailchimp/Brevo are stored in those
 * services.  This endpoint manages a local KV mirror that can be used
 * when no external provider is configured.
 */

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
    res.status(503).json({ error: 'KV storage not configured' })
    return
  }

  const sessionValid = await validateSession(req)
  if (!sessionValid) {
    res.status(403).json({ error: 'Forbidden' })
    return
  }

  try {
    if (req.method === 'GET') {
      const subscribers = (await kv.get<Subscriber[]>(KV_KEY)) || []
      res.status(200).json({ subscribers })
      return
    }

    if (req.method === 'DELETE') {
      const { email } = req.body || {}
      if (!email || typeof email !== 'string' || !email.includes('@')) {
        res.status(400).json({ error: 'Valid email required' })
        return
      }

      const sanitizedEmail = email.toLowerCase().trim().slice(0, 254)

      const subscribers: Subscriber[] = (await kv.get<Subscriber[]>(KV_KEY)) || []
      const filtered = subscribers.filter((s) => s.email !== sanitizedEmail)
      await kv.set(KV_KEY, filtered)

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

      res.status(200).json({ success: true })
      return
    }

    res.setHeader('Allow', 'GET, DELETE, OPTIONS')
    res.status(405).json({ error: 'Method not allowed' })
  } catch (err) {
    console.error('Subscribers API error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
}
