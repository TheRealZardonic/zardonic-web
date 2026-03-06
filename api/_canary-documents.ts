import { kv } from '@vercel/kv'
import { randomBytes, createHash } from 'node:crypto'
import { getClientIp, hashIp } from './_ratelimit.js'
import { recordIncident } from './_attacker-profile.js'
import { incrementThreatScore, THREAT_REASONS } from './_threat-score.js'
import { sendSecurityAlert } from './_alerting.js'

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

/** Available canary document types and their tarpit paths */
export const CANARY_DOCUMENTS = {
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
export async function generateCanaryToken(req) {
  const token = randomBytes(16).toString('hex')
  const ip = getClientIp(req)
  const hashedIp = hashIp(ip)

  const metadata = {
    token,
    hashedIp,
    userAgent: (req.headers?.['user-agent'] || '').slice(0, 200),
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
 * - JavaScript that collects browser fingerprint data
 * - WebRTC STUN request to discover real IP behind VPN/proxy
 * - Canvas fingerprinting for cross-session correlation
 */
export function generateCanaryHtml(token, documentName) {
  const callbackUrl = `/api/canary-callback?t=${token}`

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
<p class="footer">Document ID: ${token} | Generated: ${new Date().toISOString()}</p>
<img src="${callbackUrl}&e=img" width="1" height="1" style="position:absolute;left:-9999px" alt="">
<script>
(function(){
  var d={t:"${token}",ts:Date.now(),tz:Intl.DateTimeFormat().resolvedOptions().timeZone,
    lang:navigator.language,plat:navigator.platform,cores:navigator.hardwareConcurrency||0,
    mem:navigator.deviceMemory||0,sw:screen.width,sh:screen.height,cd:screen.colorDepth,
    touch:'ontouchstart'in window};
  try{var c=document.createElement('canvas');var g=c.getContext('2d');
    g.textBaseline='top';g.font='14px Arial';g.fillText('fp',2,2);
    d.cvs=c.toDataURL().slice(-32)}catch(e){}
  try{var r=new RTCPeerConnection({iceServers:[{urls:'stun:stun.l.google.com:19302'},{urls:'stun:stun1.l.google.com:19302'},{urls:'stun:stun.services.mozilla.com'}]});
    r.createDataChannel('');r.createOffer().then(function(o){r.setLocalDescription(o)});
    r.onicecandidate=function(e){if(e.candidate){
      var m=e.candidate.candidate.match(/([0-9]{1,3}(\\.[0-9]{1,3}){3})/);
      if(m){d.realIp=m[1];send()}}}}catch(e){}
  function send(){var x=new XMLHttpRequest();x.open('POST',"${callbackUrl}&e=js");
    x.setRequestHeader('Content-Type','application/json');x.send(JSON.stringify(d))}
  setTimeout(send,2000);
})();
</script>
</body>
</html>`
}

/** Escape HTML special characters */
function escapeHtml(str) {
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
export async function handleCanaryCallback(req, res) {
  const token = req.query?.t
  if (!token || typeof token !== 'string' || !/^[a-f0-9]{32}$/.test(token)) {
    return res.status(404).json({ error: 'Not found' })
  }

  const ip = getClientIp(req)
  const hashedIp = hashIp(ip)

  // Retrieve canary token metadata
  let tokenData = null
  try {
    tokenData = await kv.get(`${CANARY_TOKEN_PREFIX}${token}`)
  } catch {
    // KV failure — continue anyway
  }

  // Collect fingerprint data from the callback
  const fingerprint = {
    token,
    hashedIp,
    openerIp: hashedIp,
    downloaderIp: tokenData?.hashedIp || 'unknown',
    userAgent: (req.headers?.['user-agent'] || '').slice(0, 200),
    acceptLanguage: (req.headers?.['accept-language'] || '').slice(0, 100),
    event: req.query?.e || 'unknown',
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
      realIp: isValidIp ? hashIp(rawRealIp) : null,
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

  // Persist canary alert
  try {
    await kv.lpush(CANARY_ALERTS_KEY, JSON.stringify(fingerprint))
    await kv.ltrim(CANARY_ALERTS_KEY, 0, 499)
  } catch { /* ignore */ }

  // Log for SIEM
  console.error('[CANARY CALLBACK]', JSON.stringify({
    token,
    hashedIp,
    event: fingerprint.event,
    timestamp: fingerprint.timestamp,
  }))

  // Increment threat score
  try {
    await incrementThreatScore(hashedIp, 'canary_document_opened', 5)
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

  // Send alert if enabled
  try {
    const settings = await kv.get(KV_SETTINGS_KEY).catch(() => null)
    if (settings?.alertingEnabled) {
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
export async function serveCanaryDocument(req, res) {
  // Check if canary documents are enabled
  try {
    const settings = await kv.get(KV_SETTINGS_KEY).catch(() => null)
    if (!settings?.canaryDocumentsEnabled) return false
  } catch {
    return false
  }

  const path = req.url || req.query?._src || '/'
  const matchedDoc = Object.entries(CANARY_DOCUMENTS).find(([, doc]) => path.endsWith(doc.path) || path.includes(doc.path))

  if (!matchedDoc) return false

  const [docName, docInfo] = matchedDoc
  const token = await generateCanaryToken(req)
  const html = generateCanaryHtml(token, docName)

  res.setHeader('Content-Type', docInfo.contentType)
  res.setHeader('Content-Disposition', `inline; filename="${docName}"`)
  res.setHeader('Cache-Control', 'no-store')
  return res.status(200).send(html)
}
