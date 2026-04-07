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
 * Path Traversal & LFI (Local File Inclusion) Backfire Module.
 *
 * Uses the attacker's own technique against them: when a directory traversal
 * or LFI probe is detected, the server responds with *convincing fake files*
 * that:
 *
 * 1. Contain embedded canary tokens — stored in KV so that if the attacker
 *    ever uses the fake credentials, they trigger a fresh CANARY_CALLBACK
 *    alert that reveals their presence from a potentially different IP.
 *
 * 2. Look completely authentic (real-format /etc/passwd, .env, wp-config.php,
 *    .git/config, SSH private keys) so the attacker wastes time processing
 *    useless data.
 *
 * 3. Every fake file is unique per request (fresh canary token + randomised
 *    credential fragments) so exfiltrating multiple copies yields no benefit.
 *
 * Detected patterns:
 *   Classic traversal  ../  %2e%2e/  %252e%252e
 *   Null-byte injection  %00
 *   Unix sensitive files  /etc/passwd  /etc/shadow  /proc/self/environ
 *   Windows paths  boot.ini  win.ini  System32\drivers\etc\hosts
 *   App config files  .env  wp-config.php  .git/config  .ssh/id_rsa
 *   PHP wrappers  php://filter  php://input  expect://  data://
 */

const KV_SETTINGS_KEY = 'nk-security-settings'
const CANARY_TOKEN_PREFIX = 'nk-canary:'
const CANARY_TOKEN_TTL = 604800 // 7 days

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
  send(data: unknown): VercelLikeResponse
}

interface SecuritySettings {
  pathTraversalBackfireEnabled?: boolean
  pathTraversalServeFakeFiles?: boolean
}

// ─── Pattern Database ─────────────────────────────────────────────────────────

interface TraversalPattern {
  name: string
  pattern: RegExp
  /** Which fake file type to serve as backfire response. */
  fileType: string
}

const PATH_TRAVERSAL_PATTERNS: TraversalPattern[] = [
  // ── Specific file targets FIRST (before generic traversal, so they win) ──
  // Unix sensitive files
  { name: 'ETC_PASSWD',             pattern: /\/etc\/passwd/i,                         fileType: 'passwd' },
  { name: 'ETC_SHADOW',             pattern: /\/etc\/shadow/i,                         fileType: 'passwd' },
  { name: 'PROC_SELF_ENVIRON',      pattern: /\/proc\/self\/environ/i,                 fileType: 'environ' },
  { name: 'PROC_SELF_CMDLINE',      pattern: /\/proc\/self\/cmdline/i,                 fileType: 'environ' },
  // Application config files
  { name: 'DOTENV',                 pattern: /(?:^|\/)\.env(?:\.(?:local|prod(?:uction)?|staging|example|dev))?$/i, fileType: 'dotenv' },
  { name: 'WP_CONFIG',              pattern: /wp-config\.php/i,                        fileType: 'wpconfig' },
  { name: 'GIT_CONFIG',             pattern: /\.git[/\\]config/i,                      fileType: 'gitconfig' },
  { name: 'SSH_PRIVKEY',            pattern: /\.ssh[/\\](?:id_rsa|id_ed25519|id_ecdsa|id_dsa)/i, fileType: 'sshkey' },
  // Windows paths
  { name: 'WIN_HOSTS',              pattern: /windows[/\\]system32[/\\]drivers[/\\]etc[/\\]hosts/i, fileType: 'winfile' },
  { name: 'WIN_INI',                pattern: /\bwin\.ini\b/i,                          fileType: 'winfile' },
  { name: 'BOOT_INI',               pattern: /\bboot\.ini\b/i,                         fileType: 'winfile' },
  // PHP wrappers (common in LFI exploitation)
  { name: 'PHP_FILTER',             pattern: /php:\/\/filter/i,                        fileType: 'php_wrapper' },
  { name: 'PHP_INPUT',              pattern: /php:\/\/input/i,                         fileType: 'php_wrapper' },
  { name: 'EXPECT_WRAPPER',         pattern: /expect:\/\//i,                           fileType: 'php_wrapper' },
  { name: 'DATA_WRAPPER',           pattern: /^data:\/\//i,                            fileType: 'php_wrapper' },
  // ── Generic traversal patterns LAST ──────────────────────────────────────
  { name: 'URL_ENCODED_TRAVERSAL',  pattern: /%2e%2e[%2f%5c]/i,                       fileType: 'generic' },
  { name: 'DOUBLE_ENCODED',         pattern: /%252e%252e/i,                            fileType: 'generic' },
  { name: 'NULL_BYTE',              pattern: /%00/,                                    fileType: 'generic' },
  { name: 'DOT_DOT_SLASH',          pattern: /\.\.[/\\]/,                              fileType: 'generic' },
]

// ─── Traversal Detection ─────────────────────────────────────────────────────

export interface TraversalDetection {
  detected: boolean
  patternName: string | null
  fileType: string | null
}

/**
 * Scan all request sources (URL, query params, body, cookies) for path
 * traversal / LFI patterns.  URL decodes values before matching to catch
 * single-encoded probes.
 */
export function detectPathTraversal(req: VercelLikeRequest): TraversalDetection {
  const sources: string[] = []

  if (req.url) {
    sources.push(req.url)
    try { sources.push(decodeURIComponent(req.url)) } catch { /* invalid encoding — use raw */ }
  }

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

  for (const value of sources) {
    for (const { name, pattern, fileType } of PATH_TRAVERSAL_PATTERNS) {
      if (pattern.test(value)) return { detected: true, patternName: name, fileType }
    }
  }

  return { detected: false, patternName: null, fileType: null }
}

// ─── Fake File Generators ─────────────────────────────────────────────────────

/** Realistic-looking /etc/passwd with canary token embedded in a comment. */
function generateFakePasswd(token: string): string {
  return [
    'root:x:0:0:root:/root:/bin/bash',
    'daemon:x:1:1:daemon:/usr/sbin:/usr/sbin/nologin',
    'bin:x:2:2:bin:/bin:/usr/sbin/nologin',
    'sys:x:3:3:sys:/dev:/usr/sbin/nologin',
    'sync:x:4:65534:sync:/bin:/bin/sync',
    'games:x:5:60:games:/usr/games:/usr/sbin/nologin',
    'man:x:6:12:man:/var/cache/man:/usr/sbin/nologin',
    'lp:x:7:7:lp:/var/spool/lpd:/usr/sbin/nologin',
    'mail:x:8:8:mail:/var/mail:/usr/sbin/nologin',
    'news:x:9:9:news:/var/spool/news:/usr/sbin/nologin',
    'proxy:x:13:13:proxy:/bin:/usr/sbin/nologin',
    'www-data:x:33:33:www-data:/var/www:/usr/sbin/nologin',
    `admin:x:1000:1000:Admin,,,:/home/admin:/bin/bash # ${token}`,
    'deploy:x:1001:1001:deploy:/home/deploy:/bin/bash',
    'postgres:x:1002:1002:PostgreSQL:/var/lib/postgresql:/bin/bash',
    'redis:x:1003:1003:Redis:/var/lib/redis:/bin/false',
    'nobody:x:65534:65534:nobody:/nonexistent:/usr/sbin/nologin',
  ].join('\n')
}

/** Convincing .env file with randomised fake credentials + canary token. */
function generateFakeEnv(token: string): string {
  return [
    '# Production environment — CONFIDENTIAL',
    `# Generated: ${new Date().toISOString()}`,
    '',
    'APP_ENV=production',
    `APP_KEY=base64:${randomBytes(32).toString('base64')}`,
    'APP_DEBUG=false',
    'APP_URL=https://prod.internal.cluster',
    '',
    'DB_CONNECTION=pgsql',
    'DB_HOST=rds-prod.internal.aws',
    'DB_PORT=5432',
    'DB_DATABASE=app_production',
    'DB_USERNAME=app_rw',
    `DB_PASSWORD=${randomBytes(16).toString('hex')}`,
    '',
    'REDIS_HOST=redis-sentinel.internal',
    'REDIS_PORT=6379',
    `REDIS_PASSWORD=${randomBytes(12).toString('hex')}`,
    '',
    `STRIPE_SECRET_KEY=sk_live_${randomBytes(24).toString('hex')}`,
    `SENDGRID_API_KEY=SG.${randomBytes(22).toString('base64url')}.${randomBytes(43).toString('base64url')}`,
    `AWS_ACCESS_KEY_ID=AKIA${token.slice(0, 8).toUpperCase()}FAKE`,
    `AWS_SECRET_ACCESS_KEY=${randomBytes(20).toString('base64url')}`,
    '',
    `# CANARY_TOKEN=${token}`,
  ].join('\n')
}

/** Realistic-looking wp-config.php with fake credentials. */
function generateFakeWpConfig(token: string): string {
  return `<?php
/** WordPress Configuration — production */
define('DB_NAME', 'wordpress_prod');
define('DB_USER', 'wp_admin');
define('DB_PASSWORD', '${randomBytes(12).toString('hex')}');
define('DB_HOST', 'rds-prod.internal.aws:3306');
define('DB_CHARSET', 'utf8mb4');
define('DB_COLLATE', '');

$table_prefix = 'wp_';

define('AUTH_KEY',         '${randomBytes(32).toString('base64url')}');
define('SECURE_AUTH_KEY',  '${randomBytes(32).toString('base64url')}');
define('LOGGED_IN_KEY',    '${randomBytes(32).toString('base64url')}');
define('NONCE_KEY',        '${randomBytes(32).toString('base64url')}');
define('AUTH_SALT',        '${randomBytes(32).toString('base64url')}');
define('SECURE_AUTH_SALT', '${randomBytes(32).toString('base64url')}');
define('LOGGED_IN_SALT',   '${randomBytes(32).toString('base64url')}');
define('NONCE_SALT',       '${randomBytes(32).toString('base64url')}');

define('WP_DEBUG', false);
define('FORCE_SSL_ADMIN', true);
define('DISALLOW_FILE_EDIT', true);

// CANARY: ${token}
if (!defined('ABSPATH')) {
  define('ABSPATH', __DIR__ . '/');
}
require_once ABSPATH . 'wp-settings.php';`
}

/** Realistic-looking .git/config with a deploy remote + canary. */
function generateFakeGitConfig(token: string): string {
  return `[core]
\trepositoryformatversion = 0
\tfilemode = true
\tbare = false
\tlogallrefupdates = true
[remote "origin"]
\turl = git@github.com:internal-org/production-app.git
\tfetch = +refs/heads/*:refs/remotes/origin/*
[remote "deploy"]
\turl = git@deploy.prod.internal:app.git
\tfetch = +refs/heads/*:refs/remotes/deploy/*
[branch "main"]
\tremote = origin
\tmerge = refs/heads/main
# canary=${token}
[user]
\tname = deploy-bot
\temail = deploy@prod.internal.cluster`
}

/**
 * Non-functional PEM-looking private key blob (random bytes + token comment).
 * Will not parse as a real key but looks convincing enough to waste attacker time.
 */
function generateFakeSshKey(token: string): string {
  const body = randomBytes(400).toString('base64').match(/.{1,64}/g)?.join('\n') || ''
  return `-----BEGIN OPENSSH PRIVATE KEY-----\n${body}\n# ${token}\n-----END OPENSSH PRIVATE KEY-----`
}

interface FakeFileResult {
  content: string
  contentType: string
  filename: string
}

function generateFakeContent(fileType: string, token: string): FakeFileResult {
  switch (fileType) {
    case 'passwd':
    case 'environ':
      return { content: generateFakePasswd(token), contentType: 'text/plain; charset=utf-8', filename: 'passwd' }
    case 'dotenv':
      return { content: generateFakeEnv(token), contentType: 'text/plain; charset=utf-8', filename: '.env' }
    case 'wpconfig':
      return { content: generateFakeWpConfig(token), contentType: 'text/plain; charset=utf-8', filename: 'wp-config.php' }
    case 'gitconfig':
      return { content: generateFakeGitConfig(token), contentType: 'text/plain; charset=utf-8', filename: 'config' }
    case 'sshkey':
      return { content: generateFakeSshKey(token), contentType: 'application/octet-stream', filename: 'id_rsa' }
    case 'winfile':
      return {
        content: `; Windows configuration\r\n; CANARY=${token}\r\n[boot loader]\r\ntimeout=5\r\ndefault=multi(0)disk(0)rdisk(0)partition(1)\\WINDOWS\r\n[operating systems]\r\nmulti(0)disk(0)rdisk(0)partition(1)\\WINDOWS="Microsoft Windows XP Professional" /fastdetect`,
        contentType: 'text/plain',
        filename: 'boot.ini',
      }
    default:
      return {
        content: JSON.stringify({
          status: 'ok',
          config: {
            db_host: 'rds-prod.internal.aws',
            db_pass: randomBytes(16).toString('hex'),
            api_key: `sk_prod_${token.slice(0, 8)}${randomBytes(20).toString('hex')}`,
            secret: randomBytes(24).toString('hex'),
            canary: token,
          },
        }, null, 2),
        contentType: 'application/json',
        filename: 'config.json',
      }
  }
}

// ─── Backfire Handler ─────────────────────────────────────────────────────────

/**
 * Handle a path traversal / LFI attempt with a canary backfire response.
 *
 * Returns `true` when a response was sent (caller must not send another).
 * Returns `false` when the feature is disabled or no traversal was detected.
 * Never throws.
 */
export async function handlePathTraversalBackfire(
  req: VercelLikeRequest,
  res: VercelLikeResponse,
): Promise<boolean> {
  // Check if path traversal backfire is enabled
  let settings: SecuritySettings | null = null
  try {
    settings = await kv.get<SecuritySettings>(KV_SETTINGS_KEY).catch(() => null)
    if (!settings?.pathTraversalBackfireEnabled) return false
  } catch {
    return false
  }

  const { detected, patternName, fileType } = detectPathTraversal(req)
  if (!detected) return false

  const ip = getClientIp(req)
  const hashedIp = hashIp(ip)
  const userAgent = (req.headers?.['user-agent'] as string || '').slice(0, 200)

  // Increment threat score (path traversal is a high-severity probe)
  try {
    await incrementThreatScore(hashedIp, 'path_traversal_attempt', 4, userAgent)
  } catch { /* ignore */ }

  // Record incident in attacker profile
  try {
    await recordIncident(hashedIp, {
      type: 'path_traversal_attempt',
      method: req.method,
      url: req.url,
      userAgent,
      pattern: patternName,
      timestamp: new Date().toISOString(),
    })
  } catch { /* ignore */ }

  const serveFakeFile = settings?.pathTraversalServeFakeFiles !== false

  // Unified structured log
  await logSecurityEvent({
    event: 'PATH_TRAVERSAL_BACKFIRE',
    severity: 'high',
    hashedIp,
    userAgent,
    method: req.method,
    url: req.url,
    countermeasure: serveFakeFile ? 'FAKE_FILE_SERVED' : 'LOGGED',
    details: { patternName, fileType },
  })

  if (!serveFakeFile) return false

  // Generate a unique canary token for this download
  const token = randomBytes(16).toString('hex')

  // Store token in KV so when the attacker uses the fake credentials it triggers an alert
  try {
    await kv.set(`${CANARY_TOKEN_PREFIX}${token}`, {
      token,
      hashedIp,
      userAgent,
      downloadedAt: new Date().toISOString(),
      documentPath: req.url || '/',
      source: 'path_traversal',
      patternName,
      opened: false,
    }, { ex: CANARY_TOKEN_TTL })
  } catch { /* ignore */ }

  const { content, contentType } = generateFakeContent(fileType || 'generic', token)

  res.setHeader('Content-Type', contentType)
  res.setHeader('Cache-Control', 'no-store')
  res.status(200).send(content)
  return true
}
