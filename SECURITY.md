# Security Policy

Thank you for helping make the ZARDONIC band website safe and secure.

## Reporting Security Issues

If you believe you have found a security vulnerability in this project, please report it responsibly.

**Please do not report security vulnerabilities through public GitHub issues, discussions, or pull requests.**

Instead, please report security issues by:
1. Creating a private security advisory on GitHub
2. Or by contacting the maintainers directly through the repository

Please include as much of the information listed below as you can to help us better understand and resolve the issue:

* The type of issue (e.g., XSS, CSRF, authentication bypass, data exposure)
* Full paths of source file(s) related to the manifestation of the issue
* The location of the affected source code (tag/branch/commit or direct URL)
* Any special configuration required to reproduce the issue
* Step-by-step instructions to reproduce the issue
* Proof-of-concept or exploit code (if possible)
* Impact of the issue, including how an attacker might exploit the issue

This information will help us triage your report more quickly.

## Supported Versions

We release patches for security vulnerabilities for the latest version of the project. Please ensure you are using the most recent version.

| Version | Supported          |
| ------- | ------------------ |
| Latest  | :white_check_mark: |
| < Latest| :x:                |

## Security Architecture

### Authentication & Access Control
- **Admin Authentication**: scrypt password hashing (with legacy SHA-256 migration) and constant-time comparison (`timingSafeEqual`)
- **Setup Token Protection**: Initial admin setup requires a one-time `ADMIN_SETUP_TOKEN` (set via environment variable) to prevent unauthorized setup. Timing-safe comparison prevents token enumeration.
- **TOTP Two-Factor Authentication**: Optional TOTP (Time-based One-Time Password) via authenticator apps (Google Authenticator, Authy, etc.). Uses `otpauth` library with SHA-1, 6-digit codes, 30-second period, ±1 window for clock skew tolerance. Enrollment requires active session; disabling requires both password and valid TOTP code.
- **Session Binding**: Session fingerprinting (User-Agent + IP /24 subnet) to prevent session hijacking
- **Session Cookies**: `HttpOnly; Secure; SameSite=Strict` cookies (`zd-session`) with 4-hour TTL. No client-side JavaScript access to session tokens. All sessions invalidated on password change.
- **CSRF Protection**: No state-changing operations via GET requests
- **Sensitive Key Protection**: `admin-password-hash`, keys containing `token`, `secret`, `password`, `private`, or `credential` are blocked from API reads without authentication

### Input Validation (Zod)
All API inputs are validated through strict [Zod](https://zod.dev/) schemas (`api/_schemas.ts`):
- **KV API**: Key format, length (max 200), no control characters; value presence check
- **Auth API**: Password length/format, TOTP 6-digit format, setup token validation
- **Blocklist API**: Hashed IP format (8–64 chars), reason string, TTL range
- **iTunes API**: Search term bounded, entity enum validation
- **Security Settings**: All settings type-checked and range-bounded

### Rate Limiting
All API endpoints are protected by rate limiting (`api/_ratelimit.ts`):
- **Algorithm**: Sliding window — 5 requests per 10 seconds per client
- **Backend**: Upstash Redis (`@upstash/redis`)
- **GDPR Compliance**: Client IPs are hashed with SHA-256 + a secret salt before use as rate-limit keys. No plaintext IPs are stored. Rate-limit state auto-expires after the window period.
- **Response**: HTTP 429 `Too Many Requests` when the limit is exceeded
- **Graceful Degradation**: If Redis is unavailable, requests are allowed through

### SSRF Protection (Image Proxy)
- Blocklist for private/internal networks: `127.x`, `10.x`, `172.16-31.x`, `192.168.x`, `169.254.x`, IPv6 loopback/mapped/link-local/unique-local, metadata endpoints
- Hex, octal, and decimal integer IP notation blocked
- Protocol allowlist: only `http:` and `https:`
- DNS rebinding protection: resolved IPs checked against blocklist
- Redirect target re-validated after fetch
- Content-type restricted to raster `image/*` (SVG blocked to prevent XSS)

### Security HTTP Headers (vercel.json)
All responses include defensive HTTP headers:
- **Content-Security-Policy**: Restricts script, style, image, and frame sources
- **X-Frame-Options: DENY**: Prevents clickjacking
- **X-Content-Type-Options: nosniff**: Prevents MIME sniffing
- **Strict-Transport-Security**: HSTS with 2-year max-age and preload
- **Referrer-Policy**: Limits referrer information leakage
- **Permissions-Policy**: Disables camera, microphone, geolocation, payment

### Robots.txt Trap (Security Rewrites)
Paths that are listed as `Disallow` in robots.txt are rewarded with:
- **Tarpit Delay**: 3–8 second random delay to limit scanner throughput
- **Honeytoken Link Injection**: The 403 page contains links to further restricted paths to catch automated crawlers
- **Threat Score Increment**: Access violations increment the requester's threat score
- **Attacker Flagging**: The requesting IP is flagged for entropy injection on subsequent requests

Trapped paths include: `/admin/*`, `/dashboard/*`, `/backup/*`, `/config/*`, `/debug/*`, `/staging/*`, `/internal/*`, `/private/*`, `/data/*`, `/logs/*`, `/wp-admin/*`, `/phpmyadmin/*`, `/xmlrpc.php`, `/.env`, `/.git/*`, and others.

### Honeytokens (Intrusion Detection)
Decoy records are planted in the Redis database (`api/_honeytokens.ts`):
- Keys: `admin_backup`, `admin-backup-hash`, `db-credentials`, `api-master-key`, `backup-admin-password`
- Any read or write to these keys triggers a **silent alarm**: logged to `stderr` and persisted to `zd-honeytoken-alerts` in Redis
- The API returns a confrontational `403 Forbidden` taunt message to detected attackers

### Threat Score System (Behavioral IDS)
Requests are scored based on suspicious behavior patterns (`api/_threat-score.ts`):
- **Algorithm**: Cumulative score per (hashed) IP, 1-hour TTL
- **Score Sources**: robots.txt violations (+3), honeytoken access (+5), suspicious UA (+4), missing browser headers (+2), rate limit exceeded (+2)
- **Escalation**: WARN (≥3) → TARPIT (≥7) → AUTO-BLOCK (≥12, configurable)
- **Storage**: Ephemeral scores in Redis with 1-hour TTL
- **Auto-blocking**: IPs exceeding threshold are automatically added to the hard blocklist

### Hard Blocklist
Persistent IP blocklist for confirmed attackers (`api/_blocklist.ts`, `api/blocklist.ts`):
- Auto-populated when threat score exceeds threshold (default: 12 points)
- Admin-manageable via dashboard (add/remove entries with reason and TTL)
- Configurable TTL (default 7 days)
- All API endpoints check blocklist before processing
- Index maintained in Redis for efficient lookups

### Attacker Profiling System
Detailed per-attacker analytics aggregating behavioral data per IP hash:
- **Threat Score History**: Timeline of score changes with reasons
- **Attack Type Analysis**: Frequency distribution of attack patterns
- **User-Agent Analysis**: Classification into categories with diversity metrics
- **Behavioral Pattern Detection**: Automated identification of attack signatures
- **Incident Timeline**: Chronological log of last 50 incidents per attacker
- **Data Retention**: Profiles expire after 30 days
- **Privacy**: All data uses SHA-256 hashed IPs only (GDPR compliant)

### Zip Bomb (Optional, Disabled by Default)
When enabled, serves a gzip-compressed 10 MB null-byte payload to confirmed bots (`api/_zipbomb.ts`):
- Only triggered for IPs already flagged as attackers
- Disabled by default — enable explicitly in Security Settings

### Real-time Alerting (Optional)
Critical security events trigger immediate Discord webhook notifications (`api/_alerting.ts`):
- **Deduplication**: Max 1 alert per IP per 5 minutes
- **Configuration**: Set `DISCORD_WEBHOOK_URL` environment variable to enable

## KV Key Namespacing (Zardonic)

All Redis keys use the `zd-` prefix to namespace Zardonic data:

| Key | Purpose |
|---|---|
| `zd-session:*` | Admin session tokens (4h TTL) |
| `zd-threat:*` | Threat scores per hashed IP (1h TTL) |
| `zd-blocked:*` | Hard-blocked IPs (7d default TTL) |
| `zd-blocked-index` | Set index of all blocked hashes |
| `zd-security-settings` | Persisted security configuration |
| `zd-attacker-profiles` | Per-attacker behavioral profiles |
| `zd-honeytoken-alerts` | Security incident log (last 500) |
| `zd-flagged:*` | IPs flagged for entropy injection (24h TTL) |
| `zd-admin-totp-secret` | TOTP 2FA secret (permanent) |
| `zardonic-band-data` | Public site content (public read) |

## Environment Variables

| Variable | Purpose | Required |
|---|---|---|
| `UPSTASH_REDIS_REST_URL` | Upstash Redis endpoint | Yes |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis auth token | Yes |
| `RATE_LIMIT_SALT` | Secret salt for IP hashing (rate limiting) | **Required in production** |
| `ADMIN_SETUP_TOKEN` | One-time token for initial admin setup | Recommended |
| `DISCORD_WEBHOOK_URL` | Discord webhook URL for security alerts | Optional |
| `BANDSINTOWN_API_KEY` | Bandsintown API key | Optional |
| `SITE_URL` | Site URL included in alert messages | Optional |

## Best Practices for Deployment

1. **Environment Variables**: Never commit sensitive API keys or tokens
2. **Rate Limit Salt**: Set `RATE_LIMIT_SALT` to a unique, random value in production
3. **Admin Setup Token**: Set `ADMIN_SETUP_TOKEN` to a strong, random value before deploying
4. **Enable 2FA**: After setting up the admin password, enable TOTP two-factor authentication
5. **HTTPS**: Always deploy behind HTTPS (HSTS header enforced via vercel.json)
6. **Regular Updates**: Keep dependencies up to date
7. **Log Monitoring**: Monitor `[HONEYTOKEN ALERT]` and `[ACCESS VIOLATION]` entries in server logs
