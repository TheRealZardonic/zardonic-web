import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getRedis, getRedisOrNull, isRedisConfigured } from './_redis.js'
const kv = new Proxy({} as ReturnType<typeof getRedis>, {
  get (_, prop: string | symbol) { return Reflect.get(getRedis(), prop) },
})
import { randomUUID } from 'node:crypto'
import { applyRateLimit } from './_ratelimit.js'
import { validateSession } from './auth.js'
import { z } from 'zod'
import { Resend } from 'resend'

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
const ADMIN_SETTINGS_KEY = 'admin:settings'
const MAX_CONTACT_MESSAGES = 500 // Safety cap against storage exhaustion DoS

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

const contactInputSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be 1-100 characters'),
  email: z.string().email('A valid email address is required').max(254),
  subject: z.string().min(1, 'Subject is required').max(200, 'Subject must be 1-200 characters'),
  message: z.string().min(1, 'Message is required').max(5000, 'Message must be 1-5000 characters'),
})

interface ValidationResult {
  error?: string
  data?: { name: string; email: string; subject: string; message: string }
}

function validateContactInput(body: Record<string, unknown> | undefined): ValidationResult {
  const parsed = contactInputSchema.safeParse(body)
  if (!parsed.success) {
    const first = parsed.error.issues[0]
    return { error: first?.message ?? 'Invalid input' }
  }
  return {
    data: {
      name: parsed.data.name.trim(),
      email: parsed.data.email.trim(),
      subject: parsed.data.subject.trim(),
      message: parsed.data.message.trim(),
    },
  }
}

/** Resolve the recipient email: env > admin KV settings > not configured */
async function resolveToEmail(): Promise<string | null> {
  // Environment variable takes priority
  const envEmail = process.env.CONTACT_EMAIL || process.env.CONTACT_EMAIL_TO
  if (envEmail) return envEmail

  // Fall back to admin-configured forwarding address in Redis
  try {
    const redis = getRedisOrNull()
    if (redis) {
      const settings = await redis.get<{ contactSettings?: { emailForwardTo?: string } }>(ADMIN_SETTINGS_KEY)
      if (settings?.contactSettings?.emailForwardTo) {
        return settings.contactSettings.emailForwardTo
      }
    }
  } catch { /* non-fatal */ }

  return null
}

/** Send email notification via Resend */
async function sendEmailViaResend({ name, email, subject, message, toEmail }: { name: string; email: string; subject: string; message: string; toEmail: string }): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return false

  try {
    const resend = new Resend(apiKey)
    const fromAddress = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'
    const siteName = process.env.SITE_NAME || 'Website'
    const { error } = await resend.emails.send({
      from: `${siteName} Contact Form <${fromAddress}>`,
      to: [toEmail],
      replyTo: `${name} <${email}>`,
      subject: `Contact Form: ${subject}`,
      html: `<p><strong>From:</strong> ${esc(name)} &lt;${esc(email)}&gt;</p><p><strong>Subject:</strong> ${esc(subject)}</p><p>${esc(message).replace(/\n/g, '<br>')}</p>`,
    })
    if (error) {
      console.error('Resend API error:', error)
      return false
    }
    return true
  } catch (err) {
    console.error('Failed to send contact email via Resend:', err)
    return false
  }
}

/** Send email notification via Brevo transactional API */
async function sendEmailViaBrevo({ name, email, subject, message, toEmail }: { name: string; email: string; subject: string; message: string; toEmail: string }): Promise<boolean> {
  const apiKey = process.env.BREVO_API_KEY
  if (!apiKey) return false

  try {
    const siteName = process.env.SITE_NAME ? `${process.env.SITE_NAME} Contact Form` : 'Contact Form'
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': apiKey,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        sender: { name: siteName, email: toEmail },
        to: [{ email: toEmail }],
        replyTo: { name, email },
        subject: `Contact Form: ${subject}`,
        htmlContent: `<p><strong>From:</strong> ${name} &lt;${email}&gt;</p><p><strong>Subject:</strong> ${subject}</p><p>${message.replace(/\n/g, '<br>')}</p>`,
      }),
    })
    if (!response.ok) {
      const body = await response.text()
      console.error(`Brevo API error ${response.status}:`, body)
      return false
    }
    return true
  } catch (err) {
    console.error('Failed to send contact email via Brevo:', err)
    return false
  }
}

/** Send email notification — tries Resend first, then Brevo as fallback */
async function sendEmailNotification({ name, email, subject, message }: { name: string; email: string; subject: string; message: string }): Promise<void> {
  const toEmail = await resolveToEmail()
  if (!toEmail) return

  // Try Resend first (preferred)
  if (process.env.RESEND_API_KEY) {
    await sendEmailViaResend({ name, email, subject, message, toEmail })
    return
  }

  // Fall back to Brevo
  await sendEmailViaBrevo({ name, email, subject, message, toEmail })
}

// OWASP A01:2021 – Broken Access Control: restrict CORS to the configured origin.
// In production, require ALLOWED_ORIGIN to be explicitly set. Defaulting to '*'
// allows any website to silently submit contact forms on behalf of visitors.
const CORS_ORIGIN = process.env.ALLOWED_ORIGIN ||
  (process.env.VERCEL_ENV === 'production' ? 'null' : '*')

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

  if (!isRedisConfigured()) {
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
