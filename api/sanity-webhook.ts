/**
 * API Route: Sanity Webhook — Revalidation on Content Change
 *
 * Receives webhook notifications from Sanity when content is published.
 * Can be used with ISR (Incremental Static Regeneration) or to invalidate
 * CDN cache / trigger re-fetches.
 *
 * Configure in Sanity:
 *   Dashboard → API → Webhooks → Add Webhook
 *   URL: https://your-domain.com/api/sanity-webhook
 *   Secret: SANITY_WEBHOOK_SECRET
 *   Trigger on: Create, Update, Delete
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'
import crypto from 'crypto'

function isValidSignature(
  body: string,
  signature: string | undefined,
  secret: string
): boolean {
  if (!signature) return false
  const hmac = crypto.createHmac('sha256', secret)
  hmac.update(body)
  const digest = hmac.digest('hex')
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest))
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const secret = process.env.SANITY_WEBHOOK_SECRET
  if (!secret) {
    console.warn('[Sanity Webhook] SANITY_WEBHOOK_SECRET not configured')
    return res.status(503).json({ error: 'Webhook secret not configured' })
  }

  // Verify webhook signature
  const signature = req.headers['sanity-webhook-signature'] as string | undefined
  const rawBody = JSON.stringify(req.body)

  if (!isValidSignature(rawBody, signature, secret)) {
    return res.status(401).json({ error: 'Invalid signature' })
  }

  // Parse the webhook payload
  const payload = req.body as {
    _type?: string
    _id?: string
    operation?: string
  }

  console.log(
    `[Sanity Webhook] ${payload.operation ?? 'unknown'} on ${payload._type ?? 'unknown'} (${payload._id ?? 'unknown'})`
  )

  // For now, just acknowledge the webhook.
  // In a Next.js / ISR setup, this would call res.revalidate('/path').
  // With the current Vite SPA + Sanity CDN setup, the CDN auto-purges
  // when documents are published, so no explicit revalidation is needed.

  return res.status(200).json({
    success: true,
    message: 'Webhook received',
    type: payload._type,
    id: payload._id,
    operation: payload.operation,
  })
}
