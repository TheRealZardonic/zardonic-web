# Security Findings — Zardonic Industrial

> **Last Updated:** 2026-04-08  
> **Agent ID:** copilot/deep-audit-dokumentation  
> **Scope:** Full repository audit — `api/`, `middleware.ts`, `vercel.json`, `src/`, `tsconfig.json`, `eslint.config.js`

---

## Overview

This document records security findings identified during the deep audit of the Zardonic Industrial repository. Each finding includes a CVSS-style score, recommended fix, and remediation timeline.

**Severity Ratings:**

| Level | CVSS Range | Definition |
|-------|-----------|------------|
| 🔴 Critical | 9.0–10.0 | Immediate exploitation risk; fix before next deploy |
| 🟠 High | 7.0–8.9 | Significant risk; fix within 7 days |
| 🟡 Medium | 4.0–6.9 | Moderate risk; fix within 30 days |
| 🟢 Low | 0.1–3.9 | Minor risk; fix within 90 days |
| ℹ️ Info | 0.0 | No risk; observation only |

**Status:** 🔴 Open / 🔄 In Progress / ✅ Fixed / ❌ Accepted Risk / 🔵 Requires Legal Review

---

## SF-001 🟠 Hardcoded Default RATE_LIMIT_SALT

**ID:** SF-001  
**Severity:** 🟠 High  
**CVSS Score:** 5.3 (Medium–High) — AV:N/AC:L/PR:N/UI:N/S:U/C:L/I:N/A:N  
**Status:** 🔴 Open  
**File:** `middleware.ts`, line 22  
**Timeline:** Fix within 7 days  

### Description

```ts
const SALT = process.env.RATE_LIMIT_SALT || 'zd-default-rate-limit-salt-change-me'
```

If the `RATE_LIMIT_SALT` environment variable is not configured in the production environment, the middleware falls back to a hardcoded, publicly-known salt value. Because the salt is used to hash client IP addresses before storing them in Redis (for GDPR-compliant rate limiting), a known salt allows an attacker to:

1. Pre-compute the SHA-256 hash of any IP address
2. Correlate hashed entries in Redis with real IP addresses
3. Defeat the IP anonymisation measure

### Affected Component

- IP anonymisation in Edge middleware rate limiting
- GDPR compliance (re-identification of IP addresses)

### Recommended Fix

```ts
const SALT = process.env.RATE_LIMIT_SALT
if (!SALT) {
  console.error('[middleware] RATE_LIMIT_SALT env var is not set. Skipping rate limiting.')
  return // or throw — fail secure
}
```

Alternatively, if the middleware must always run:
```ts
if (!SALT && process.env.VERCEL_ENV === 'production') {
  throw new Error('RATE_LIMIT_SALT must be set in production')
}
```

Add `RATE_LIMIT_SALT` to the Vercel environment configuration with a randomly generated 32-byte hex string.

---

## SF-002 🟠 Content Security Policy Allows `unsafe-inline` Styles

**ID:** SF-002  
**Severity:** 🟠 High  
**CVSS Score:** 5.4 (Medium) — AV:N/AC:H/PR:N/UI:R/S:U/C:L/I:L/A:N  
**Status:** 🔴 Open  
**File:** `vercel.json`, line 8 (CSP header)  
**Timeline:** Fix within 30 days  

### Description

The Content Security Policy for all routes includes:

```
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com
```

`'unsafe-inline'` for styles enables:
- CSS-based data exfiltration using attribute selectors (`input[value^="a"] { background: url(...) }`)
- Injection of malicious CSS if any user-controlled content reaches a `<style>` tag or `style=` attribute

### Affected Component

- All HTML pages served by Vercel

### Recommended Fix

**Option A — Nonce-based CSP (preferred for Tailwind CSS 4):**

Generate a per-request nonce server-side and inject it via middleware into both the CSP header and the `<style>` tags:

```
style-src 'self' 'nonce-{base64-random}' https://fonts.googleapis.com
```

**Option B — Hash-based CSP:**

Generate SHA-256 hashes of each inline style block and list them explicitly:

```
style-src 'self' 'sha256-{hash}' https://fonts.googleapis.com
```

Both options eliminate the `'unsafe-inline'` keyword. Note that Tailwind CSS 4 (Vite plugin) generates styles at build time; static CSS files do not need `'unsafe-inline'` unless runtime inline styles are used.

---

## SF-003 🟠 Build Skips TypeScript Type-Checking (`--noCheck`)

**ID:** SF-003  
**Severity:** 🟠 High (build pipeline)  
**CVSS Score:** N/A — Build configuration issue  
**Status:** 🔴 Open  
**File:** `package.json`, `scripts.build`  
**Timeline:** Fix within 7 days  

### Description

```json
"build": "export NODE_OPTIONS='--disable-warning=DEP0169' && tsc -b --noCheck && vite build"
```

`--noCheck` instructs TypeScript to skip all type-checking during the build. This means:

- Type errors in `src/` and referenced files never surface during CI/CD
- Incorrect types, missing null checks, and unsafe casts reach production silently
- Security-relevant type guarantees (e.g., input validation schemas typed incorrectly) may be bypassed

### Recommended Fix

Remove `--noCheck` from the build script. If the build is slow due to type-checking, add a separate CI step:

```json
"build": "vite build",
"typecheck": "tsc -b --noEmit"
```

Update CI workflows to run `npm run typecheck` before `npm run build`.

---

## SF-004 🟡 ESLint Ignores Entire `api/` Directory

**ID:** SF-004  
**Severity:** 🟡 Medium  
**CVSS Score:** 4.0 (Medium) — Static analysis gap  
**Status:** 🔴 Open  
**File:** `eslint.config.js`, line 5  
**Timeline:** Fix within 30 days  

### Description

```js
{ ignores: ['dist', 'node_modules', 'api'] }
```

All ~40 serverless functions in `api/` are excluded from ESLint. This means:
- Auth logic (`api/auth.ts`, `api/session.ts`) has no static analysis
- Rate-limiting helpers (`api/_ratelimit.ts`) are unchecked
- Potential injection vulnerabilities, unused variables, or unsafe operations go undetected

### Recommended Fix

Remove `'api'` from the `ignores` array. Add Node.js globals to the ESLint config for the `api/` directory:

```js
{
  files: ['api/**/*.ts'],
  languageOptions: {
    globals: { ...globals.node }
  }
}
```

---

## SF-005 🟡 Missing `strict: true` in TypeScript Configuration

**ID:** SF-005  
**Severity:** 🟡 Medium  
**CVSS Score:** 3.5 (Low–Medium) — Type safety gap  
**Status:** 🔴 Open  
**File:** `tsconfig.json`  
**Timeline:** Fix within 30 days  

### Description

`tsconfig.json` only has `"strictNullChecks": true` instead of `"strict": true`. The `strict` flag additionally enables:

- `noImplicitAny` — prevents implicit `any` types (common source of runtime bugs)
- `strictFunctionTypes` — prevents unsafe function type assignments
- `strictBindCallApply` — validates `.bind()`, `.call()`, `.apply()` types
- `strictPropertyInitialization` — ensures class properties are initialised
- `useUnknownInCatchVariables` — forces type narrowing of caught errors

Without these checks, type-unsafe code can silently compile.

### Recommended Fix

```json
{
  "compilerOptions": {
    "strict": true
  }
}
```

Remove the individual `"strictNullChecks": true` (it is implied by `strict`).

Note: Enabling `strict` may surface existing type errors. These should be fixed before the next deploy.

---

## SF-006 🟡 Image Proxy — DNS Rebinding SSRF Risk

**ID:** SF-006  
**Severity:** 🟡 Medium  
**CVSS Score:** 6.1 (Medium) — AV:N/AC:H/PR:N/UI:N/S:U/C:H/I:N/A:N  
**Status:** 🔄 Partially Mitigated  
**File:** `api/image-proxy.ts`  
**Timeline:** Fix within 30 days  

### Description

The image proxy checks the requested URL against a blocklist of private IP ranges (`BLOCKED_HOST_PATTERNS`). However, DNS-based SSRF (rebinding) attacks work as follows:

1. Attacker controls a domain `evil.com` that initially resolves to a public IP
2. At validation time, the hostname resolves to a public IP — blocklist check passes
3. Attacker immediately changes the DNS record to resolve to `169.254.169.254` (cloud metadata)
4. When the actual HTTP request is made (milliseconds later), the new DNS resolution returns the private IP

The imports show `resolve4`/`resolve6` are available, but their usage in the actual fetch flow must be verified.

### Recommended Fix

Perform DNS resolution **once** before the HTTP request, cache the resolved IP, and use the IP directly for the request (not the hostname):

```ts
const addresses = await resolve4(hostname)
// Validate addresses against BLOCKED_HOST_PATTERNS
// Make HTTP request to IP directly, with Host header set
```

This "DNS pinning" approach eliminates the TOCTOU (Time-Of-Check-Time-Of-Use) vulnerability.

---

## SF-007 🟡 Session Token Dual Transport — XSS-Vulnerable Header Mode

**ID:** SF-007  
**Severity:** 🟡 Medium  
**CVSS Score:** 5.5 (Medium) — AV:N/AC:L/PR:N/UI:R/S:U/C:H/I:N/A:N  
**Status:** 🔴 Open  
**File:** `api/session.ts`  
**Timeline:** Fix within 30 days  

### Description

Session tokens are transported via two mechanisms simultaneously:
1. **HttpOnly cookie** (`zd-session`) — XSS-resistant ✅
2. **JSON response body** (for `x-session-token` header) — XSS-vulnerable ❌

If an XSS vulnerability exists anywhere in the frontend, JavaScript can read the session token from the response and exfiltrate it. HttpOnly cookies prevent this by design.

### Recommended Fix

1. Migrate all frontend code to use the HttpOnly cookie (`zd-session`) exclusively
2. Remove the `x-session-token` header mechanism and JSON token response
3. Verify the cookie is set with `Secure; HttpOnly; SameSite=Strict` flags

---

## SF-008 🟡 Offensive Security Features — Legal Exposure

**ID:** SF-008  
**Severity:** 🟡 Medium (Legal Risk)  
**CVSS Score:** N/A — Legal/Compliance issue  
**Status:** 🔵 Requires Legal Review  
**Files:** `api/_zipbomb.ts`, `api/_sql-backfire.ts`, `api/_log-poisoning.ts`  
**Timeline:** Legal review within 60 days  

### Description

See [ADR-004](./ARCHITECTURE_DECISION_RECORDS.md#adr-004-offensive-security-features).

Active countermeasures (serving zipbombs, injecting false SQL errors, poisoning attacker logs) may:
- Violate §202c StGB (Germany) — preparation of hacking offences
- Violate GDPR — attacker data collection and profiling without consent/legitimate basis
- Be construed as a DoS attack under US CFAA

### Recommended Fix

Obtain legal review. Passive defensive measures (honeytokens for tracking, canary documents) are lower risk.

---

## SF-009 ℹ️ Honeypot Paths — Well Implemented ✅

**ID:** SF-009  
**Severity:** ℹ️ Info (Positive Finding)  
**Status:** ✅ Implemented  
**File:** `vercel.json` (rewrites)  

Common attacker paths (WordPress admin, phpMyAdmin, `.env`, `.git`, CGI-bin, xmlrpc.php) are all redirected to the `denied` handler which can fingerprint and profile attackers.

No action required. This is a security best practice.

---

## SF-010 ℹ️ Circuit Breaker at Edge — Well Implemented ✅

**ID:** SF-010  
**Severity:** ℹ️ Info (Positive Finding)  
**Status:** ✅ Implemented  
**File:** `middleware.ts`  

A global rate-limiting circuit breaker is implemented at the Vercel Edge layer. This protects billing and availability under DDoS conditions.

**Note:** The threshold (500 req/10s) should be made configurable via environment variable to avoid false positives during legitimate traffic spikes.

---

## Remediation Timeline

| Finding | Severity | Deadline | Owner |
|---------|----------|----------|-------|
| SF-001 | 🟠 High | 7 days | Dev team |
| SF-002 | 🟠 High | 30 days | Dev team |
| SF-003 | 🟠 High | 7 days | Dev team |
| SF-004 | 🟡 Medium | 30 days | Dev team |
| SF-005 | 🟡 Medium | 30 days | Dev team |
| SF-006 | 🟡 Medium | 30 days | Dev team |
| SF-007 | 🟡 Medium | 30 days | Dev team |
| SF-008 | 🟡 Medium | 60 days (legal) | Legal + Dev |

---

## Summary

| Severity | Count | Fixed | Open |
|----------|-------|-------|------|
| 🔴 Critical | 0 | — | — |
| 🟠 High | 3 | 0 | 3 |
| 🟡 Medium | 5 | 0 | 4 + 1 legal |
| ℹ️ Info | 2 | 2 | 0 |
| **Total** | **10** | **2** | **8** |

---

*Security findings are confidential. Do not share this document publicly or with untrusted parties.*
