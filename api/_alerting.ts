import { Redis } from '@upstash/redis'

let _redis: Redis | null = null

function getRedis(): Redis | null {
  if (_redis) return _redis
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) return null
  _redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  })
  return _redis
}

const ALERT_DEDUP_PREFIX = 'zd-alert-dedup:'
const ALERT_DEDUP_TTL = 300 // 5 minutes cooldown per IP+event type

interface SecurityAlertEvent {
  type: string
  key?: string
  method?: string
  hashedIp?: string
  userAgent?: string
  timestamp?: string
  threatScore?: number
  threatLevel?: string
  severity?: string
}

/**
 * Send a critical security alert via Discord Webhook.
 * Includes alert deduplication to prevent spam (1 alert per IP per 5 min).
 *
 * Environment variables:
 *   DISCORD_WEBHOOK_URL — Discord webhook URL (optional)
 *   SITE_URL            — used for context in alert messages
 */
export async function sendSecurityAlert(event: SecurityAlertEvent): Promise<void> {
  try {
    const redis = getRedis()
    if (redis) {
      // Deduplicate — only send one alert per hashedIp+key combination per 5 min
      const dedupKey = `${ALERT_DEDUP_PREFIX}${event.hashedIp}:${event.key}`
      const alreadySent = await redis.get(dedupKey).catch(() => null)
      if (alreadySent) return
      await redis.set(dedupKey, 1, { ex: ALERT_DEDUP_TTL }).catch(() => {})
    }

    const webhookUrl = process.env.DISCORD_WEBHOOK_URL
    if (!webhookUrl) return

    const siteUrl = process.env.SITE_URL || 'zardonic.com'
    const severityColor = event.severity === 'critical' ? 0xff0000 : event.severity === 'high' ? 0xff6600 : 0xffcc00

    const embed = {
      title: `🚨 ZARDONIC Security Alert: ${event.type}`,
      color: severityColor,
      fields: [
        { name: 'Site', value: siteUrl, inline: true },
        { name: 'Severity', value: event.severity || 'unknown', inline: true },
        ...(event.hashedIp ? [{ name: 'Hashed IP', value: `\`${event.hashedIp.slice(0, 16)}...\``, inline: true }] : []),
        ...(event.key ? [{ name: 'Key/Path', value: `\`${event.key}\``, inline: true }] : []),
        ...(event.method ? [{ name: 'Method', value: event.method, inline: true }] : []),
        ...(event.threatScore !== undefined ? [{ name: 'Threat Score', value: String(event.threatScore), inline: true }] : []),
        ...(event.threatLevel ? [{ name: 'Threat Level', value: event.threatLevel, inline: true }] : []),
        ...(event.userAgent ? [{ name: 'User-Agent', value: `\`${event.userAgent.slice(0, 100)}\``, inline: false }] : []),
      ],
      timestamp: event.timestamp || new Date().toISOString(),
    }

    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ embeds: [embed] }),
    }).catch(() => {})
  } catch {
    // Alerting failure must not block the response
  }
}
