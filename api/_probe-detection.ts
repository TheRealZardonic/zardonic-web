import { Redis } from '@upstash/redis'
const kv = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || '',
  token: process.env.UPSTASH_REDIS_REST_TOKEN || ''
})
import { randomBytes } from 'node:crypto'
import { getClientIp, hashIp } from './_ratelimit.js'
import { recordIncident } from './_attacker-profile.js'
import { incrementThreatScore } from './_threat-score.js'
import { logSecurityEvent } from './_security-logger.js'

/**
 * Probe Detection & Backfire Module.
 *
 * Detects five categories of offensive probes and responds with
 * type-appropriate backfire payloads:
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ Probe Type  │ Backfire Strategy                                          │
 * ├─────────────┼──────────────────────────────────────────────────────────  │
 * │ XSS         │ Respond with "XSS executed" body — makes the scanner think │
 * │             │ it found a valid injection point and move on to the next   │
 * │             │ (false positive injection into scanner report)             │
 * ├─────────────┼──────────────────────────────────────────────────────────  │
 * │ SSTI        │ Respond with template-evaluated-looking output ({{49}} etc.)│
 * │             │ Scanner thinks SSTI works and logs a false positive        │
 * ├─────────────┼──────────────────────────────────────────────────────────  │
 * │ SSRF        │ Respond with fake internal service data as if the request  │
 * │             │ successfully reached an internal service                   │
 * ├─────────────┼──────────────────────────────────────────────────────────  │
 * │ Command     │ Respond with fake shell output (uid=0(root) etc.)          │
 * │ Injection   │ Scanner logs a false positive and spends time on it        │
 * ├─────────────┼──────────────────────────────────────────────────────────  │
 * │ XXE         │ Respond with fake XML containing DOCTYPE-like structures   │
 * │             │ that crash or hang vulnerable XML parsers in the scanner   │
 * └─────────────┴──────────────────────────────────────────────────────────  │
 */

const KV_SETTINGS_KEY = 'nk-security-settings'

interface VercelLikeRequest {
  method?: string
  url?: string
  query?: Record<string, string | string[]>
  body?: Record<string, unknown>
  headers: Record<string, string | string[] | undefined>
}

interface VercelLikeResponse {
  setHeader(key: string, value: string): VercelLikeResponse
  status(code: number): VercelLikeResponse
  json(data: unknown): VercelLikeResponse
  send(data: unknown): VercelLikeResponse
}

interface SecuritySettings {
  probeDetectionEnabled?: boolean
  probeBackfireEnabled?: boolean
}

// ─── Probe Pattern Databases ──────────────────────────────────────────────────

export type ProbeType = 'XSS' | 'SSTI' | 'SSRF' | 'CMDI' | 'XXE'

interface ProbePattern {
  type: ProbeType
  name: string
  pattern: RegExp
}

const PROBE_PATTERNS: ProbePattern[] = [
  // XSS probes
  { type: 'XSS', name: 'SCRIPT_TAG',         pattern: /<script\b/i },
  { type: 'XSS', name: 'ONERROR_ATTR',        pattern: /\bonerror\s*=/i },
  { type: 'XSS', name: 'ONLOAD_ATTR',         pattern: /\bonload\s*=/i },
  { type: 'XSS', name: 'JAVASCRIPT_URI',      pattern: /javascript\s*:/i },
  { type: 'XSS', name: 'SVG_XSS',             pattern: /<svg\b.*\bon\w+\s*=/i },
  { type: 'XSS', name: 'ALERT_PROBE',         pattern: /alert\s*\(\s*['"]?(?:xss|1|document\.cookie)/i },
  { type: 'XSS', name: 'CONFIRM_PROBE',       pattern: /confirm\s*\(\s*['"]?(?:xss|1)/i },
  { type: 'XSS', name: 'DOCUMENT_COOKIE',     pattern: /document\.cookie/i },
  // SSTI probes (Jinja2, Twig, Smarty, Freemarker, Velocity)
  { type: 'SSTI', name: 'JINJA2_MATH',        pattern: /\{\{\s*\d+\s*\*\s*\d+\s*\}\}/ },
  { type: 'SSTI', name: 'TWIG_MATH',          pattern: /\{\{\s*\d+\s*[+\-*/]\s*\d+\s*\}\}/ },
  { type: 'SSTI', name: 'FREEMARKER_PROBE',   pattern: /\$\{\s*\d+\s*[+\-*/]\s*\d+\s*\}/ },
  { type: 'SSTI', name: 'ERB_PROBE',          pattern: /<%=\s*\d+\s*[+\-*/]\s*\d+\s*%>/ },
  { type: 'SSTI', name: 'SMARTY_PROBE',       pattern: /\{php\}|\{literal\}|\{exec\}/i },
  { type: 'SSTI', name: 'VELOCITY_PROBE',     pattern: /#(?:set|exec|include)\s*\(/i },
  // SSRF probes
  { type: 'SSRF', name: 'LOCALHOST',          pattern: /\blocalhost\b|127\.0\.0\.1|0\.0\.0\.0/i },
  { type: 'SSRF', name: 'AWS_METADATA',       pattern: /169\.254\.169\.254/ },
  { type: 'SSRF', name: 'GCP_METADATA',       pattern: /metadata\.google\.internal/i },
  { type: 'SSRF', name: 'INTERNAL_RANGE',     pattern: /192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(?:1[6-9]|2\d|3[01])\.\d+\.\d+/ },
  { type: 'SSRF', name: 'FILE_PROTOCOL',      pattern: /\bfile:\/\//i },
  { type: 'SSRF', name: 'GOPHER_PROTOCOL',    pattern: /\bgopher:\/\//i },
  { type: 'SSRF', name: 'DICT_PROTOCOL',      pattern: /\bdict:\/\//i },
  // Command injection probes
  { type: 'CMDI', name: 'SEMICOLON_CMD',      pattern: /;\s*(?:ls|cat|id|uname|pwd|echo|whoami|wget|curl)\b/ },
  { type: 'CMDI', name: 'PIPE_CMD',           pattern: /\|\s*(?:ls|cat|id|uname|pwd|echo|whoami|wget|curl)\b/ },
  { type: 'CMDI', name: 'BACKTICK_CMD',       pattern: /`[^`]*(?:ls|cat|id|uname|pwd|whoami|wget)[^`]*`/ },
  { type: 'CMDI', name: 'DOLLAR_CMD',         pattern: /\$\([^)]*(?:ls|cat|id|uname|pwd|whoami)[^)]*\)/ },
  { type: 'CMDI', name: 'NEWLINE_CMD',        pattern: /(?:%0a|%0d|\n)\s*(?:ls|cat|id|uname|whoami)/i },
  { type: 'CMDI', name: 'AND_CMD',            pattern: /&&\s*(?:ls|cat|id|uname|pwd|whoami|wget|curl)\b/ },
  // XXE probes
  { type: 'XXE', name: 'DOCTYPE_ENTITY',      pattern: /<!DOCTYPE[^>]*\[|<!ENTITY\s+\w+/i },
  { type: 'XXE', name: 'EXTERNAL_ENTITY',     pattern: /<!ENTITY\s+\w+\s+SYSTEM/i },
  { type: 'XXE', name: 'XML_HEADER',          pattern: /<\?xml\s+version/i },
]

export interface ProbeDetection {
  detected: boolean
  type: ProbeType | null
  patternName: string | null
}

/**
 * Scan all request sources for offensive probes.
 * Returns the first probe type detected.
 */
export function detectProbe(req: VercelLikeRequest): ProbeDetection {
  const sources: string[] = []

  if (req.url) sources.push(req.url)

  if (req.query) {
    for (const v of Object.values(req.query)) {
      if (typeof v === 'string') {
        sources.push(v)
        try { sources.push(decodeURIComponent(v)) } catch { /* use raw */ }
      }
    }
  }

  if (req.body && typeof req.body === 'object') {
    for (const v of Object.values(req.body)) {
      if (typeof v === 'string') sources.push(v)
    }
  }

  const cookie = req.headers?.cookie
  if (typeof cookie === 'string') sources.push(cookie)

  // Check Content-Type for XXE
  const ct = (req.headers?.['content-type'] as string) || ''
  if (/text\/xml|application\/xml/i.test(ct)) sources.push(ct)

  for (const value of sources) {
    for (const { type, name, pattern } of PROBE_PATTERNS) {
      if (pattern.test(value)) return { detected: true, type, patternName: name }
    }
  }

  return { detected: false, type: null, patternName: null }
}

// ─── Backfire Payload Generators ─────────────────────────────────────────────

/** Make the scanner think XSS was reflected back (false positive in its report). */
function generateXssBackfire(probePattern: string): string {
  // Return HTML that looks like the XSS probe was reflected/executed
  return `<!DOCTYPE html><html><head><title>Search Results</title></head><body>
<p>Search results for: <span id="q">${probePattern.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</span></p>
<script>var q = document.getElementById('q').innerHTML; document.title = "Results: " + q;</script>
<p>0 results found.</p>
</body></html>`
}

/** Make the scanner think SSTI was evaluated (false positive — 49, 77, etc.). */
function generateSstiBackfire(): Record<string, unknown> {
  // Return "evaluated" math results — scanner thinks SSTI works
  return {
    result: 49,               // 7*7 — common Jinja2 probe result
    expression: '{{7*7}}',
    rendered: '49',
    template_engine: 'Jinja2/3.1.2',
    context: { request: null, config: null, session: null },
    debug: true,
  }
}

/** Make the scanner think the SSRF request reached an internal service. */
function generateSsrfBackfire(): Record<string, unknown> {
  return {
    status: 200,
    instance_id: `i-${randomBytes(8).toString('hex')}`,
    account_id: `${Math.floor(Math.random() * 900000000000) + 100000000000}`,
    region: 'us-east-1',
    ami_id: `ami-${randomBytes(4).toString('hex')}`,
    hostname: 'ip-10-0-1-42.ec2.internal',
    iam_credentials: {
      LastUpdated: new Date().toISOString(),
      Type: 'AWS-HMAC',
      AccessKeyId: `ASIA${randomBytes(8).toString('hex').toUpperCase()}`,
      SecretAccessKey: randomBytes(20).toString('base64url'),
      Token: randomBytes(100).toString('base64url'),
      Expiration: new Date(Date.now() + 3600000).toISOString(),
    },
  }
}

/** Make the scanner think RCE/command injection succeeded. */
function generateCmdiBackfire(): string {
  return [
    `uid=0(root) gid=0(root) groups=0(root)`,
    `Linux prod-api-1 5.15.0-1019-aws #23-Ubuntu SMP Mon Aug 22 20:19:58 UTC 2022 x86_64 x86_64 x86_64 GNU/Linux`,
    `total 48`,
    `drwxr-xr-x 2 root root 4096 Jan  1  2024 .`,
    `drwxr-xr-x 8 root root 4096 Jan  1  2024 ..`,
    `-rwxr-xr-x 1 root root 8720 Jan  1  2024 app`,
    `-rw-r--r-- 1 root root  512 Jan  1  2024 .env`,
    `-rw-r--r-- 1 root root 1024 Jan  1  2024 config.json`,
  ].join('\n')
}

/**
 * Generate an XML response that looks like a successful XXE exfiltration —
 * but is actually a deeply nested structure that stresses vulnerable XML
 * parsers.  Uses an iterative approach to avoid Node.js stack overflow.
 * The content is harmless to display; it only affects automated XML parsers.
 */
function generateXxeBackfire(): string {
  // Build nesting iteratively so there is no risk of Node.js stack overflow
  const depth = 30
  let open = ''
  let close = ''
  for (let i = 0; i < depth; i++) {
    open += '<w>'
    close = '</w>' + close
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<response status="200">
  <message>OK</message>
  ${open}<data>exfiltrated</data>${close}
  <file>/etc/passwd</file>
  <content>root:x:0:0:root:/root:/bin/bash</content>
</response>`
}

// ─── Handler ──────────────────────────────────────────────────────────────────

/**
 * Detect and backfire against offensive probes.
 * Returns `true` when a response was sent.  Never throws.
 */
export async function handleProbeBackfire(
  req: VercelLikeRequest,
  res: VercelLikeResponse,
): Promise<boolean> {
  // Check settings
  let settings: SecuritySettings | null = null
  try {
    settings = await kv.get<SecuritySettings>(KV_SETTINGS_KEY).catch(() => null)
    if (!settings?.probeDetectionEnabled) return false
  } catch {
    return false
  }

  const { detected, type, patternName } = detectProbe(req)
  if (!detected || !type) return false

  const ip = getClientIp(req)
  const hashedIp = hashIp(ip)
  const userAgent = (req.headers?.['user-agent'] as string || '').slice(0, 200)

  // Increment threat score
  try {
    await incrementThreatScore(hashedIp, `probe_${type.toLowerCase()}`, 3, userAgent)
  } catch { /* ignore */ }

  // Record incident
  try {
    await recordIncident(hashedIp, {
      type: `probe_${type.toLowerCase()}`,
      method: req.method,
      url: req.url,
      userAgent,
      pattern: patternName,
      timestamp: new Date().toISOString(),
    })
  } catch { /* ignore */ }

  const willBackfire = settings?.probeBackfireEnabled === true

  // Unified log
  await logSecurityEvent({
    event: 'PROBE_BACKFIRE',
    severity: 'high',
    hashedIp,
    userAgent,
    method: req.method,
    url: req.url,
    countermeasure: willBackfire ? `${type}_BACKFIRE` : 'LOGGED',
    details: { probeType: type, patternName },
  })

  if (!willBackfire) return false

  // Send type-specific backfire response
  switch (type) {
    case 'XSS': {
      const probe = (req.query ? Object.values(req.query)[0] : '') || ''
      res.setHeader('Content-Type', 'text/html; charset=utf-8')
      res.setHeader('Cache-Control', 'no-store')
      res.status(200).send(generateXssBackfire(typeof probe === 'string' ? probe : ''))
      return true
    }
    case 'SSTI':
      res.setHeader('Content-Type', 'application/json')
      res.setHeader('Cache-Control', 'no-store')
      res.status(200).json(generateSstiBackfire())
      return true
    case 'SSRF':
      res.setHeader('Content-Type', 'application/json')
      res.setHeader('Cache-Control', 'no-store')
      res.status(200).json(generateSsrfBackfire())
      return true
    case 'CMDI':
      res.setHeader('Content-Type', 'text/plain')
      res.setHeader('Cache-Control', 'no-store')
      res.status(200).send(generateCmdiBackfire())
      return true
    case 'XXE':
      res.setHeader('Content-Type', 'application/xml')
      res.setHeader('Cache-Control', 'no-store')
      res.status(200).send(generateXxeBackfire())
      return true
    default:
      return false
  }
}
