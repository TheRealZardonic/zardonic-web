# GDPR Compliance Review — ZARDONIC Band Website

## Date: 2026-02-20

### Overview
This document reviews the GDPR compliance status of the ZARDONIC band website.

### Data Collection & Processing

#### ✅ Compliant Features

1. **Cookie Banner**
   - Implemented cookie consent banner (CookieConsent component)
   - Users can accept or reject cookie usage
   - Clear notice about Local Storage and IndexedDB usage
   - Link to privacy policy (Datenschutz / Privacy Policy)

2. **Local Storage First**
   - Analytics data stored in localStorage
   - No third-party cookies
   - No tracking cookies
   - User preferences stay in browser

3. **Transparent Data Usage**
   - Clear privacy policy accessible to users
   - Explains data processing purposes

4. **User Rights**
   - Admin can reset analytics data
   - Users can clear localStorage
   - No personal data stored on servers

#### 📋 Data Processing Activities

**Local Storage Items:**
- `zardonic-band-data` (local cache): Band information and content
- `admin-password-hash` (legacy): SHA-256 hashed admin password — being migrated to scrypt
- `font-sizes`: User interface preferences
- `analytics`: Anonymous usage statistics
- `sound-settings`: Audio preferences
- Image cache (IndexedDB)

**Server-Side Data (Upstash Redis):**
- Band content and configuration (`zardonic-band-data`)
- Admin password hash (scrypt, with legacy SHA-256 migration)
- Session tokens: SHA-256 random token, 4-hour TTL (`zd-session:*`)
- Rate-limit state: SHA-256 hashed IP + salt, auto-expires after 10 seconds (`zd-rl:*`)
- Honeytoken alert log: hashed IPs only, no plaintext (`zd-honeytoken-alerts`)
- Threat scores: hashed IPs, 1-hour TTL (`zd-threat:*`)
- Hard-block list: hashed IPs with reason and TTL (`zd-blocked:*`)
- Attacker profiles: hashed IPs with behavioral aggregates, 30-day TTL (`zd-profile:*`)
- Security configuration: anonymous settings object (`zd-security-settings`)

**External Services:**
- iTunes API: Fetches public release information (server-side proxy)
- Bandsintown API: Fetches upcoming events (server-side proxy)

#### ⚠️ Privacy Considerations

1. **Rate Limiting & Attack Defense (Art. 6(1)(f) GDPR)**
   - IP addresses are pseudonymised using SHA-256 + secret salt before processing
   - Hashed IP is used solely for rate-limit enforcement (5 requests / 10 s)
   - Rate-limit state is ephemeral: auto-deleted after the 10-second window
   - No plaintext IP addresses are stored or logged
   - Legal basis: Legitimate interest in protecting the website from automated attacks

2. **Honeytokens (Intrusion Detection) — Art. 6(1)(f) GDPR**
   - Decoy records in the database trigger silent alarms on unauthorised access
   - Alert logs contain only hashed IPs and timestamps — no plaintext personal data
   - Legal basis: Legitimate interest in IT security

3. **robots.txt Access Violations — Art. 6(1)(f) GDPR**
   - Violations of robots.txt Disallow rules are logged for security monitoring
   - Logs contain only hashed IPs — no plaintext personal data stored
   - Legal basis: Legitimate interest in IT security

4. **Attacker Profiling — Art. 6(1)(f) GDPR**
   - Behavioral profiles are maintained for IPs that have demonstrated malicious intent
   - All profiles use hashed IPs exclusively — no plaintext personal data
   - Profiles auto-expire after 30 days of inactivity
   - Legal basis: Legitimate interest in protecting the website and its users

5. **Session Fingerprinting — Art. 6(1)(f) GDPR**
   - Sessions are bound to User-Agent + IP /24 subnet prefix (SHA-256 hashed)
   - Purpose: Detect session hijacking attempts
   - Data is ephemeral: lives only for the 4-hour session TTL

### GDPR Rights Implementation

✅ **Right to Access**: Users control their localStorage data  
✅ **Right to Erasure**: Users can clear browser data; all server-side security data auto-expires  
✅ **Right to Rectification**: Admin can update all content  
✅ **Right to Data Portability**: JSON export/import supported  
✅ **Right to Object**: Users can reject cookie consent  
✅ **Transparency**: Clear privacy policy provided  

### Security Measures (Art. 32 GDPR)

| Measure | Implementation |
|---|---|
| Password hashing | scrypt (with legacy SHA-256 migration), constant-time comparison |
| Session tokens | Random 32-byte hex, HttpOnly cookies, 4-hour TTL |
| TOTP 2FA | Optional TOTP via otpauth library |
| Input validation | Zod schemas on all API endpoints |
| Rate limiting | Fixed-window counter, GDPR-compliant IP hashing |
| Intrusion detection | Honeytoken decoy records with silent alarms |
| Behavioral IDS | Threat scoring system with auto-escalation |
| XSS prevention | Content sanitisation, restrictive CSP headers |
| Timing attack prevention | Constant-time string comparison (timingSafeEqual) |
| Transport security | HSTS header (2-year max-age, preload) |
| Clickjacking prevention | X-Frame-Options: DENY |

### Compliance Status

**Overall GDPR Compliance: ✅ Good**

The website demonstrates strong GDPR compliance with:
- Transparent data practices
- User consent mechanisms
- Minimal data collection
- Local-first data storage
- Clear privacy policy
- User control over data
- GDPR-compliant attack defense (pseudonymised rate limiting)
- All security logging uses hashed IPs only
- Automatic data expiry for all server-side security data

### Contact

For GDPR-related questions, refer to the Impressum / Privacy Policy for contact information.
