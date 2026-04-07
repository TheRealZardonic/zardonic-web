import { Redis } from '@upstash/redis'
const kv = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || '',
  token: process.env.UPSTASH_REDIS_REST_TOKEN || ''
})

const KV_SETTINGS_KEY = 'nk-security-settings'
const ALERT_DEDUP_PREFIX = 'nk-alert-dedup:'
const ALERT_DEDUP_TTL = 300 // 5 minutes cooldown per IP+event type

interface SecurityAlertEvent {
  type?: string
  key?: string
  method?: string
  hashedIp: string
  userAgent?: string
  timestamp?: string
  threatScore?: number
  threatLevel?: string
  severity?: string
  token?: string
  documentPath?: string
  jsFingerprint?: unknown
}

interface SecuritySettings {
  discordWebhookUrl?: string
  alertEmail?: string
  alertingEnabled?: boolean
  canaryDocumentsEnabled?: boolean
}

/**
 * Send a critical security alert via Discord Webhook and/or Resend email.
 * Includes alert deduplication to prevent spam (1 alert per IP per 5 min).
 *
 * Alert channels are resolved from KV settings first, falling back to
 * environment variables:
 *   discordWebhookUrl  → DISCORD_WEBHOOK_URL
 *   alertEmail          → ADMIN_RESET_EMAIL
 *   RESEND_API_KEY      — if set, also sends email
 *   SITE_URL            — used for context in alert messages
 */
export async function sendSecurityAlert(event: SecurityAlertEvent): Promise<void> {
  try {
    // Deduplicate — only send one alert per hashedIp+key combination per 5 min
    const dedupKey = `${ALERT_DEDUP_PREFIX}${event.hashedIp}:${event.key}`
    const alreadySent = await kv.get(dedupKey).catch(() => null)
    if (alreadySent) return

    await kv.set(dedupKey, 1, { ex: ALERT_DEDUP_TTL }).catch(() => {})

    // Resolve alert channel config from KV settings, then env vars
    let settings: SecuritySettings | null = null
    try {
      settings = await kv.get<SecuritySettings>(KV_SETTINGS_KEY)
    } catch { /* ignore */ }

    const webhookUrl = (settings?.discordWebhookUrl || '').trim() || process.env.DISCORD_WEBHOOK_URL
    const alertEmail = (settings?.alertEmail || '').trim() || process.env.ADMIN_RESET_EMAIL
    const resendApiKey = process.env.RESEND_API_KEY

    const promises: Promise<unknown>[] = []

    // Discord Webhook
    if (webhookUrl) {
      promises.push(
        fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: process.env.SITE_NAME ? `${process.env.SITE_NAME} IDS` : 'Site IDS',
            avatar_url: process.env.SITE_URL ? `${process.env.SITE_URL}/favicon.ico` : '/favicon.ico',
            embeds: [{
              title: `🚨 SECURITY ALERT — ${event.type || 'THREAT DETECTED'}`,
              color: event.severity === 'critical' ? 0xff0000 : event.severity === 'high' ? 0xff6600 : 0xffcc00,
              fields: [
                { name: 'Event Type', value: event.key || '—', inline: true },
                { name: 'Method', value: event.method || '—', inline: true },
                { name: 'IP Hash', value: event.hashedIp ? `\`${event.hashedIp.slice(0, 12)}…\`` : '—', inline: true },
                { name: 'User Agent', value: event.userAgent ? `\`${event.userAgent.slice(0, 100)}\`` : '—', inline: false },
                { name: 'Threat Score', value: event.threatScore ? `${event.threatScore} (${event.threatLevel || '?'})` : '—', inline: true },
                { name: 'Site', value: process.env.SITE_URL || '—', inline: true },
              ],
              timestamp: event.timestamp || new Date().toISOString(),
              footer: { text: `${process.env.SITE_NAME || 'Site'} IDS • Active Defense System` },
            }],
          }),
        }).catch(err => console.error('[ALERT] Discord webhook failed:', (err as Error).message))
      )
    }

    // Resend E-Mail
    if (resendApiKey && alertEmail) {
      const { Resend } = await import('resend')
      const resend = new Resend(resendApiKey)
      promises.push(
        resend.emails.send({
          from: process.env.EMAIL_FROM || `noreply@${process.env.SITE_URL ? new URL(process.env.SITE_URL).hostname : 'example.com'}`,
          to: alertEmail,
          subject: `🚨 [${process.env.SITE_NAME || 'Site'} IDS] ${event.type || 'Security Alert'} — ${event.key}`,
          html: `
            <h2 style="color:#ff0000">🚨 ${process.env.SITE_NAME || 'SITE'} IDS ALERT</h2>
            <table border="1" cellpadding="6" style="border-collapse:collapse;font-family:monospace">
              <tr><td><b>Event</b></td><td>${event.key || '—'}</td></tr>
              <tr><td><b>Method</b></td><td>${event.method || '—'}</td></tr>
              <tr><td><b>IP Hash</b></td><td>${event.hashedIp || '—'}</td></tr>
              <tr><td><b>User Agent</b></td><td>${event.userAgent || '—'}</td></tr>
              <tr><td><b>Threat Score</b></td><td>${event.threatScore || '—'} (${event.threatLevel || '—'})</td></tr>
              <tr><td><b>Timestamp</b></td><td>${event.timestamp || new Date().toISOString()}</td></tr>
              <tr><td><b>Site</b></td><td>${process.env.SITE_URL || '—'}</td></tr>
            </table>
            <p style="color:#666;font-size:12px">${process.env.SITE_NAME || 'Site'} IDS • Active Defense System</p>
          `,
        }).catch(err => console.error('[ALERT] Resend email failed:', (err as Error).message))
      )
    }

    await Promise.allSettled(promises)
  } catch (err) {
    console.error('[ALERT] Failed to send security alert:', (err as Error).message)
  }
}
