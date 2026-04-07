import { Redis } from '@upstash/redis'
const kv = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || '',
  token: process.env.UPSTASH_REDIS_REST_TOKEN || ''
})
import { randomUUID } from 'node:crypto'
import { applyRateLimit } from './_ratelimit.js'
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

interface ContactMessage {
  id: string
  name: string
  email: string
  subject: string
  message: string
  date: string
  read: boolean
}

const KV_KEY = 'contact-messages'
const MAX_CONTACT_MESSAGES = 500 // Safety cap against storage exhaustion DoS

const isKVConfigured = (): boolean => {
  return !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN)
}

/** HTML entity escaping to prevent XSS */
function esc(str: string | undefined): string {
  if (!str) return ''
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

interface ValidationResult {
  error?: string
  data?: { name: string; email: string; subject: string; message: string }
}

function validateContactInput(body: Record<string, unknown> | undefined): ValidationResult {
  const { name, email, subject, message } = body || {}
  if (!name || typeof name !== 'string' || name.trim().length < 1 || name.trim().length > 100) {
    return { error: 'Name is required and must be 1-100 characters.' }
  }
  if (!email || typeof email !== 'string' || !EMAIL_RE.test(email.trim()) || email.trim().length > 254) {
    return { error: 'A valid email address is required.' }
  }
  if (!subject || typeof subject !== 'string' || subject.trim().length < 1 || subject.trim().length > 200) {
    return { error: 'Subject is required and must be 1-200 characters.' }
  }
  if (!message || typeof message !== 'string' || message.trim().length < 1 || message.trim().length > 5000) {
    return { error: 'Message is required and must be 1-5000 characters.' }
  }
  return {
    data: {
      name: esc(name.trim().slice(0, 100)),
      email: esc(email.trim().slice(0, 254)),
      subject: esc(subject.trim().slice(0, 200)),
      message: esc(message.trim().slice(0, 5000)),
    },
  }
}

/** Send email notification via Brevo transactional API */
async function sendEmailNotification({ name, email, subject, message }: { name: string; email: string; subject: string; message: string }): Promise<void> {
  const apiKey = process.env.BREVO_API_KEY
  const toEmail = process.env.CONTACT_EMAIL_TO
  if (!apiKey || !toEmail) return

  try {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': apiKey,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        sender: { name: process.env.SITE_NAME ? `${process.env.SITE_NAME} Contact Form` : 'Contact Form', email: toEmail },
        to: [{ email: toEmail }],
        replyTo: { name, email },
        subject: `Contact Form: ${subject}`,
        htmlContent: `<p><strong>From:</strong> ${name} &lt;${email}&gt;</p><p><strong>Subject:</strong> ${subject}</p><p>${message.replace(/\n/g, '<br>')}</p>`,
      }),
    })
    if (!response.ok) {
      const body = await response.text()
      console.error(`Brevo API error ${response.status}:`, body)
    }
  } catch (err) {
    console.error('Failed to send contact email notification:', err)
  }
}

// OWASP A01:2021 – Broken Access Control: restrict CORS to the configured origin
// instead of a wildcard so arbitrary third-party sites cannot POST contact messages.
const CORS_ORIGIN = process.env.ALLOWED_ORIGIN || '*'

function setCorsHeaders(res: VercelResponse): void {
  res.setHeader('Access-Control-Allow-Origin', CORS_ORIGIN)
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  // CORS preflight for public POST
  if (req.method === 'OPTIONS') {
    setCorsHeaders(res)
    res.status(200).end()
    return
  }

  if (!isKVConfigured()) {
    res.status(503).json({
      error: 'Service unavailable',
      message: 'KV storage is not configured.',
    })
    return
  }

  try {
    switch (req.method) {
      case 'POST':
        await handlePost(req, res)
        return
      case 'GET':
        await handleGet(req, res)
        return
      case 'PATCH':
        await handlePatch(req, res)
        return
      case 'DELETE':
        await handleDelete(req, res)
        return
      default:
        res.setHeader('Allow', 'POST, GET, PATCH, DELETE, OPTIONS')
        res.status(405).json({ error: 'Method not allowed' })
        return
    }
  } catch (err) {
    console.error('Contact API error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
}

/** POST — submit a new contact message (public, rate-limited) */
async function handlePost(req: VercelRequest, res: VercelResponse): Promise<void> {
  setCorsHeaders(res)

  const allowed = await applyRateLimit(req, res)
  if (!allowed) return

  const parsed = validateContactInput(req.body)
  if (parsed.error) {
    res.status(400).json({ error: parsed.error })
    return
  }

  const { name, email, subject, message } = parsed.data!
  const id = `msg-${randomUUID()}`

  const entry: ContactMessage = {
    id,
    name,
    email,
    subject,
    message,
    date: new Date().toISOString(),
    read: false,
  }

  const MAX_RETRIES = 3
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const existing: ContactMessage[] = (await kv.get<ContactMessage[]>(KV_KEY)) || []
      existing.push(entry)
      const toStore = existing.length > MAX_CONTACT_MESSAGES ? existing.slice(-MAX_CONTACT_MESSAGES) : existing
      await kv.set(KV_KEY, toStore)
      break
    } catch (err) {
      if (attempt === MAX_RETRIES - 1) throw err
    }
  }

  // Send email notification (awaited so Vercel does not kill the request before fetch completes)
  await sendEmailNotification({ name, email, subject, message })

  res.status(200).json({ success: true })
}

/** GET — list all contact messages (admin only) */
async function handleGet(req: VercelRequest, res: VercelResponse): Promise<void> {
  const sessionValid = await validateSession(req)
  if (!sessionValid) {
    res.status(403).json({ error: 'Forbidden' })
    return
  }

  const messages = (await kv.get<ContactMessage[]>(KV_KEY)) || []
  res.status(200).json({ messages })
}

/** PATCH — mark a message as read/unread (admin only) */
async function handlePatch(req: VercelRequest, res: VercelResponse): Promise<void> {
  const sessionValid = await validateSession(req)
  if (!sessionValid) {
    res.status(403).json({ error: 'Forbidden' })
    return
  }

  const { id, read } = req.body || {}
  if (!id || typeof id !== 'string') {
    res.status(400).json({ error: 'Message id is required.' })
    return
  }
  if (typeof read !== 'boolean') {
    res.status(400).json({ error: 'read must be a boolean.' })
    return
  }

  const messages: ContactMessage[] = (await kv.get<ContactMessage[]>(KV_KEY)) || []
  const idx = messages.findIndex((m) => m.id === id)
  if (idx === -1) {
    res.status(404).json({ error: 'Message not found.' })
    return
  }

  messages[idx].read = read
  await kv.set(KV_KEY, messages)

  res.status(200).json({ success: true })
}

/** DELETE — delete a contact message (admin only) */
async function handleDelete(req: VercelRequest, res: VercelResponse): Promise<void> {
  const sessionValid = await validateSession(req)
  if (!sessionValid) {
    res.status(403).json({ error: 'Forbidden' })
    return
  }

  const { id } = req.body || {}
  if (!id || typeof id !== 'string') {
    res.status(400).json({ error: 'Message id is required.' })
    return
  }

  const messages: ContactMessage[] = (await kv.get<ContactMessage[]>(KV_KEY)) || []
  const filtered = messages.filter((m) => m.id !== id)
  if (filtered.length === messages.length) {
    res.status(404).json({ error: 'Message not found.' })
    return
  }

  await kv.set(KV_KEY, filtered)

  res.status(200).json({ success: true })
}
