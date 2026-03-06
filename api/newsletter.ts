import { applyRateLimit } from './_ratelimit.js'

function isValidEmail(email: unknown): email is string {
  return typeof email === 'string' && email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    await applyRateLimit(req, res)
  } catch {
    return res.status(429).json({ error: 'Too many requests' })
  }

  const { email, source } = req.body || {}

  if (!isValidEmail(email)) {
    return res.status(400).json({ error: 'Valid email required' })
  }

  const sanitizedEmail = email.toLowerCase().trim().slice(0, 254)

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
          tags: source ? [source] : [],
        }),
      })
      const data = await response.json()
      if (!response.ok && data.title !== 'Member Exists') {
        return res.status(400).json({ error: 'Subscription failed' })
      }
      return res.status(200).json({ success: true })
    } catch {
      return res.status(500).json({ error: 'Newsletter service error' })
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
          attributes: source ? { SOURCE: source } : {},
        }),
      })
      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        return res.status(400).json({ error: 'Subscription failed' })
      }
      return res.status(200).json({ success: true })
    } catch {
      return res.status(500).json({ error: 'Newsletter service error' })
    }
  }

  return res.status(503).json({ error: 'Newsletter not configured' })
}
