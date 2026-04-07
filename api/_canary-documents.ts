import { Redis } from '@upstash/redis'
const kv = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || '',
  token: process.env.UPSTASH_REDIS_REST_TOKEN || ''
})
import { randomBytes } from 'node:crypto'
import { getClientIp, hashIp } from './_ratelimit.js'
import { recordIncident, addForensicData } from './_attacker-profile.js'
import { incrementThreatScore } from './_threat-score.js'
import { sendSecurityAlert } from './_alerting.js'
import { logSecurityEvent } from './_security-logger.js'

/**
 * Canary Documents — trackable decoy files placed in tarpit directories.
 *
 * These documents are served from paths like /admin/backup/db-export.xlsx
 * and contain embedded tracking mechanisms:
 *
 * 1. HTML files with external resource references that "phone home"
 *    when the attacker opens them, revealing their real IP, OS, and
 *    browser — even behind proxies (via WebRTC, DNS rebinding hints).
 *
 * 2. Unique per-download tokens embedded in the document content so
 *    each download can be correlated with the opener event.
 *
 * The canary callback endpoint logs the attacker's real fingerprint
 * data to KV for the admin dashboard.
 */

const KV_SETTINGS_KEY = 'nk-security-settings'
const CANARY_TOKEN_PREFIX = 'nk-canary:'
const CANARY_ALERTS_KEY = 'nk-canary-alerts'
const CANARY_TOKEN_TTL = 604800 // 7 days

interface VercelLikeRequest {
  method?: string
  url?: string
  query?: Record<string, string | string[]>
  body?: Record<string, unknown>
  headers: Record<string, string | string[] | undefined>
}

interface VercelLikeResponse {
  setHeader(key: string, value: string | number): VercelLikeResponse
  status(code: number): VercelLikeResponse
  json(data: unknown): VercelLikeResponse
  end(): VercelLikeResponse
  send(data: unknown): VercelLikeResponse
}

interface CanaryDocument {
  path: string
  description: string
  contentType: string
}

interface CanaryTokenMetadata {
  token: string
  hashedIp: string
  userAgent: string
  downloadedAt: string
  documentPath: string
  opened: boolean
  openedAt?: string
  openerFingerprint?: unknown
}

interface SecuritySettings {
  alertingEnabled?: boolean
  canaryDocumentsEnabled?: boolean
  canaryPhoneHomeOnOpen?: boolean
  canaryCollectFingerprint?: boolean
  canaryAlertOnCallback?: boolean
}

interface JsFingerprint {
  timezone: string | null
  language: string | null
  platform: string | null
  cores: number | null
  memory: number | null
  screenWidth: number | null
  screenHeight: number | null
  colorDepth: number | null
  touchSupport: boolean | null
  canvasHash: string | null
  realIp: string | null
}

interface CanaryFingerprint {
  token: string
  hashedIp: string
  openerIp: string
  downloaderIp: string
  userAgent: string
  acceptLanguage: string
  event: string
  timestamp: string
  documentPath: string
  jsFingerprint: JsFingerprint | null
}

/** Available canary document types and their tarpit paths */
export const CANARY_DOCUMENTS: Record<string, CanaryDocument> = {
  'db-export.html': {
    path: '/admin/backup/db-export.html',
    description: 'Database export (HTML)',
    contentType: 'text/html',
  },
  'credentials.html': {
    path: '/admin/backup/credentials.html',
    description: 'Credentials file (HTML)',
    contentType: 'text/html',
  },
  'config-backup.html': {
    path: '/config/backup/config-backup.html',
    description: 'Configuration backup (HTML)',
    contentType: 'text/html',
  },
  'api-keys.html': {
    path: '/private/api-keys.html',
    description: 'API keys document (HTML)',
    contentType: 'text/html',
  },
  'admin-notes.html': {
    path: '/internal/admin-notes.html',
    description: 'Admin notes (HTML)',
    contentType: 'text/html',
  },
}

/**
 * Generate a unique canary token for tracking a document download.
 * The token is stored in KV with metadata about the download event.
 */
export async function generateCanaryToken(req: VercelLikeRequest): Promise<string> {
  const token = randomBytes(16).toString('hex')
  const ip = getClientIp(req)
  const hashedIp = hashIp(ip)

  const metadata: CanaryTokenMetadata = {
    token,
    hashedIp,
    userAgent: (req.headers?.['user-agent'] as string || '').slice(0, 200),
    downloadedAt: new Date().toISOString(),
    documentPath: req.url || '/',
    opened: false,
  }

  try {
    await kv.set(`${CANARY_TOKEN_PREFIX}${token}`, metadata, { ex: CANARY_TOKEN_TTL })
  } catch {
    // Token storage failure is non-critical
  }

  return token
}

/**
 * Generate an HTML canary document with embedded tracking.
 *
 * The document looks like a legitimate admin page but contains:
 * - External image/script references to the canary callback endpoint
 *   (only when `canaryPhoneHomeOnOpen` is enabled)
 * - JavaScript that collects browser fingerprint data
 *   (only when `canaryCollectFingerprint` is enabled)
 * - WebRTC STUN request to discover real IP behind VPN/proxy
 * - Canvas fingerprinting for cross-session correlation
 */
export function generateCanaryHtml(token: string, documentName: string, settings?: SecuritySettings): string {
  const callbackUrl = `/api/canary-callback?t=${token}`
  const phoneHome = settings?.canaryPhoneHomeOnOpen !== false
  const collectFingerprint = settings?.canaryCollectFingerprint !== false

  // Tracking pixel — fires on page load, works even without JavaScript.
  // Allowed by `img-src 'self'` in the Content-Security-Policy.
  const trackingPixel = phoneHome
    ? `\n<img src="${callbackUrl}&e=img" width="1" height="1" style="position:absolute;left:-9999px" alt="">`
    : ''

  // Fingerprinting script — loaded as an external same-origin resource so
  // it is permitted by `script-src 'self'` in the CSP.  Inline `<script>`
  // blocks would be rejected by browsers enforcing the policy.
  const fingerprintScript = collectFingerprint
    ? `\n<script src="/api/canary-script?t=${token}"></script>`
    : ''

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Internal Document — ${escapeHtml(documentName)}</title>
<style>
body{font-family:Consolas,monospace;background:#1a1a2e;color:#c4c4c4;margin:2rem;line-height:1.6}
h1{color:#e94560;border-bottom:1px solid #333;padding-bottom:.5rem}
table{border-collapse:collapse;width:100%;margin:1rem 0}
td,th{border:1px solid #333;padding:.5rem;text-align:left}
th{background:#16213e;color:#e94560}
.warn{color:#ff6b35;font-size:.85rem;margin-top:2rem}
.footer{color:#555;font-size:.75rem;margin-top:3rem}
</style>
</head>
<body>
<h1>CONFIDENTIAL — ${escapeHtml(documentName)}</h1>
<p>Internal backup document. Last updated: ${new Date().toISOString()}</p>
<table>
<tr><th>Key</th><th>Value</th></tr>
<tr><td>DB Host</td><td>prod-db.internal.cluster</td></tr>
<tr><td>DB User</td><td>admin_rw</td></tr>
<tr><td>DB Password</td><td>S3cure_Pr0d_${randomBytes(4).toString('hex')}</td></tr>
<tr><td>API Master Key</td><td>sk_live_${randomBytes(16).toString('hex')}</td></tr>
<tr><td>Backup Encryption</td><td>AES-256-GCM</td></tr>
</table>
<p class="warn">⚠ This document is monitored. Unauthorized access will be logged and reported.</p>
<p class="footer">Document ID: ${token} | Generated: ${new Date().toISOString()}</p>${trackingPixel}${fingerprintScript}
</body>
</html>`
}

/** Escape HTML special characters */
function escapeHtml(str: string): string {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/**
 * Handle a canary callback — invoked when an attacker opens a canary document.
 * Logs the attacker's fingerprint data and triggers alerts.
 */
export async function handleCanaryCallback(req: VercelLikeRequest, res: VercelLikeResponse): Promise<unknown> {
  const token = req.query?.t
  if (!token || typeof token !== 'string' || !/^[a-f0-9]{32}$/.test(token)) {
    return res.status(404).json({ error: 'Not found' })
  }

  const ip = getClientIp(req)
  const hashedIp = hashIp(ip)

  // Retrieve canary token metadata
  let tokenData: CanaryTokenMetadata | null = null
  try {
    tokenData = await kv.get<CanaryTokenMetadata>(`${CANARY_TOKEN_PREFIX}${token}`)
  } catch {
    // KV failure — continue anyway
  }

  // Collect fingerprint data from the callback
  const fingerprint: CanaryFingerprint = {
    token,
    hashedIp,
    openerIp: hashedIp,
    downloaderIp: tokenData?.hashedIp || 'unknown',
    userAgent: (req.headers?.['user-agent'] as string || '').slice(0, 200),
    acceptLanguage: (req.headers?.['accept-language'] as string || '').slice(0, 100),
    event: (req.query?.e as string) || 'unknown',
    timestamp: new Date().toISOString(),
    documentPath: tokenData?.documentPath || 'unknown',
    // JS fingerprint data from POST body
    jsFingerprint: null,
  }

  // Parse JS fingerprint data if this is a POST callback
  if (req.method === 'POST' && req.body && typeof req.body === 'object') {
    // Validate WebRTC-reported IP format before hashing
    const rawRealIp = req.body.realIp
    const isValidIp = typeof rawRealIp === 'string' && /^(\d{1,3}\.){3}\d{1,3}$/.test(rawRealIp)
      && rawRealIp.split('.').every(o => Number(o) >= 0 && Number(o) <= 255)

    fingerprint.jsFingerprint = {
      timezone: typeof req.body.tz === 'string' ? req.body.tz.slice(0, 100) : null,
      language: typeof req.body.lang === 'string' ? req.body.lang.slice(0, 50) : null,
      platform: typeof req.body.plat === 'string' ? req.body.plat.slice(0, 100) : null,
      cores: typeof req.body.cores === 'number' ? req.body.cores : null,
      memory: typeof req.body.mem === 'number' ? req.body.mem : null,
      screenWidth: typeof req.body.sw === 'number' ? req.body.sw : null,
      screenHeight: typeof req.body.sh === 'number' ? req.body.sh : null,
      colorDepth: typeof req.body.cd === 'number' ? req.body.cd : null,
      touchSupport: typeof req.body.touch === 'boolean' ? req.body.touch : null,
      canvasHash: typeof req.body.cvs === 'string' ? req.body.cvs.slice(0, 64) : null,
      realIp: isValidIp ? hashIp(rawRealIp as string) : null,
    }
  }

  // Mark token as opened
  if (tokenData) {
    try {
      await kv.set(`${CANARY_TOKEN_PREFIX}${token}`, {
        ...tokenData,
        opened: true,
        openedAt: fingerprint.timestamp,
        openerFingerprint: fingerprint,
      }, { ex: CANARY_TOKEN_TTL })
    } catch { /* ignore */ }
  }

  // Persist canary alert (legacy list for canary-alerts admin endpoint)
  try {
    await kv.lpush(CANARY_ALERTS_KEY, JSON.stringify(fingerprint))
    await kv.ltrim(CANARY_ALERTS_KEY, 0, 499)
  } catch { /* ignore */ }

  // Increment threat score — pass UA for richer log context
  try {
    await incrementThreatScore(hashedIp, 'canary_document_opened', 5, fingerprint.userAgent)
  } catch { /* ignore */ }

  // Record incident
  try {
    await recordIncident(hashedIp, {
      type: 'canary_document_opened',
      token,
      documentPath: fingerprint.documentPath,
      event: fingerprint.event,
      userAgent: fingerprint.userAgent,
      timestamp: fingerprint.timestamp,
    })
  } catch { /* ignore */ }

  // Persist forensic data in attacker profile for dashboard display
  try {
    await addForensicData(hashedIp, {
      token,
      event: fingerprint.event,
      timestamp: fingerprint.timestamp,
      documentPath: fingerprint.documentPath,
      userAgent: fingerprint.userAgent,
      acceptLanguage: fingerprint.acceptLanguage,
      openerIp: fingerprint.openerIp,
      downloaderIp: fingerprint.downloaderIp,
      jsFingerprint: fingerprint.jsFingerprint,
    })
  } catch { /* ignore */ }

  // Send alert if enabled
  try {
    const settings = await kv.get<SecuritySettings>(KV_SETTINGS_KEY).catch(() => null)
    if (settings?.alertingEnabled && settings?.canaryAlertOnCallback !== false) {
      await sendSecurityAlert({
        type: 'CANARY DOCUMENT OPENED',
        token,
        documentPath: fingerprint.documentPath,
        hashedIp,
        userAgent: fingerprint.userAgent,
        timestamp: fingerprint.timestamp,
        severity: 'critical',
        jsFingerprint: fingerprint.jsFingerprint,
      })
    }
  } catch { /* ignore */ }

  // Unified structured log — full fingerprint detail for SIEM and admin dashboard
  await logSecurityEvent({
    event: 'CANARY_CALLBACK',
    severity: 'high',
    hashedIp,
    userAgent: fingerprint.userAgent,
    method: req.method,
    countermeasure: 'CANARY_FINGERPRINTED',
    details: {
      token,
      callbackEvent: fingerprint.event,
      documentPath: fingerprint.documentPath,
      downloaderIp: fingerprint.downloaderIp,
      acceptLanguage: fingerprint.acceptLanguage,
      jsFingerprint: fingerprint.jsFingerprint,
    },
  })

  // Return a 1x1 transparent pixel for image callbacks, or 204 for JS callbacks
  if (req.query?.e === 'img') {
    const pixel = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVQI12NgAAIABQABNl7BcQAAAABJRU5ErkJggg==',
      'base64'
    )
    res.setHeader('Content-Type', 'image/png')
    res.setHeader('Cache-Control', 'no-store')
    return res.status(200).send(pixel)
  }

  return res.status(204).end()
}

/**
 * Serve a canary document for a given tarpit path.
 * Returns true if the path matched a canary document, false otherwise.
 */
export async function serveCanaryDocument(req: VercelLikeRequest, res: VercelLikeResponse): Promise<boolean> {
  // Check if canary documents are enabled
  let settings: SecuritySettings | null = null
  try {
    settings = await kv.get<SecuritySettings>(KV_SETTINGS_KEY).catch(() => null)
    if (!settings?.canaryDocumentsEnabled) return false
  } catch {
    return false
  }

  const path = (req.query?._src as string) || req.url || '/'
  const matchedDoc = Object.entries(CANARY_DOCUMENTS).find(([, doc]) => path.endsWith(doc.path) || path.includes(doc.path))

  if (!matchedDoc) return false

  const [docName, docInfo] = matchedDoc
  const token = await generateCanaryToken(req)
  const html = generateCanaryHtml(token, docName, settings)

  // Unified structured log for when a canary document is served to an attacker
  const ip = getClientIp(req)
  const hashedIp = hashIp(ip)
  await logSecurityEvent({
    event: 'CANARY_DOCUMENT_SERVED',
    severity: 'high',
    hashedIp,
    userAgent: (req.headers?.['user-agent'] as string || '').slice(0, 200),
    method: req.method,
    url: path,
    countermeasure: 'CANARY_TRAP',
    details: { documentName: docName, documentPath: docInfo.path, token },
  })

  res.setHeader('Content-Type', docInfo.contentType)
  res.setHeader('Content-Disposition', `inline; filename="${docName}"`)
  res.setHeader('Cache-Control', 'no-store')
  res.status(200).send(html)
  return true
}
