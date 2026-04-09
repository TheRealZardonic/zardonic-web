# ZARDONIC — Industrial Cyberpunk Artist Website

A fully customizable cyberpunk-themed artist website for **ZARDONIC**, built with React 19, TypeScript, Vite, and Framer Motion. Features a 3D loading screen, chromatic aberration glitch effects, Sanity CMS integration, and a full admin panel.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FNeuroklast%2Fzardonic-industrial&env=UPSTASH_REDIS_REST_URL,UPSTASH_REDIS_REST_TOKEN,RATE_LIMIT_SALT,VITE_SANITY_PROJECT_ID,VITE_SANITY_DATASET,SANITY_API_TOKEN&envDescription=Required%20environment%20variables%20for%20Redis%2C%20security%2C%20and%20Sanity%20CMS&envLink=https%3A%2F%2Fgithub.com%2FNeuroklast%2Fzardonic-industrial%2Fblob%2Fmain%2F.env.example&project-name=zardonic-industrial&repository-name=zardonic-industrial)

> **Live Site:** https://zardonic-website.vercel.app  
> **Coding agents:** Read [`docs/DEVELOPMENT_STATUS.md`](./docs/DEVELOPMENT_STATUS.md) and [`docs/CODING_AGENT_WORKFLOW.md`](./docs/CODING_AGENT_WORKFLOW.md) before starting any work.

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Development](#development)
- [Environment Variables](#environment-variables)
- [Scripts](#scripts)
- [Deployment](#deployment)
- [Documentation](#documentation)
- [License](#license)

---

## Features

### Public Site
- **3D Loading Screen** — Three.js model loading with real progress tracking and IndexedDB image pre-caching
- **Glitch Logo** — Hero logo with chromatic aberration RGB channel separation and jitter effects
- **Cyberpunk UI** — Scanline overlays, CRT effects, noise grain, circuit board background (all toggleable)
- **Spotify Integration** — GDPR-compliant two-click embedded Spotify player with dynamic CI colour-theming (hue-rotate adapts to the active colour preset) and sharp industrial styling (no rounded corners)
- **LLM Discoverability** — `public/llm.txt` served at `/llm.txt` with structured artist information, discography, genre context (drum & bass, metal DnB, mastering), and keywords so Gemini, Claude, Copilot, and ChatGPT surface ZARDONIC for relevant music industry queries
- **iTunes & Bandsintown Sync** — Automatic release and tour date fetching with Odesli cross-platform links
- **Responsive Gallery** — Swipeable image gallery with lightbox; Google Drive URL support via wsrv.nl proxy
- **Social Connect** — Instagram, Facebook, Spotify, YouTube, SoundCloud, TikTok, and more
- **News & Partners** — News section and partner/sponsors showcase
- **Contact & Newsletter** — Contact form (Resend) and newsletter signup
- **Impressum & Privacy** — Built-in legal pages with EN/DE support
- **Secret Terminal** — Konami code–activated terminal interface

### Admin CMS
Access via the lock icon in the footer, or navigate to `?admin-setup` for first-time setup.

- **Section Visibility** — Show/hide any section (Bio, Music, Gigs, Releases, Gallery, Connect, Credits)
- **Theme Customization** — All 20+ colors, heading/body/mono fonts, and favicon
- **Animation Controls** — Toggle glitch, scanline, chromatic, CRT, noise, and circuit effects
- **Config Editor** — Fine-tune every animation parameter (durations, probabilities, intervals, offsets)
- **Security Dashboard** — Incident log, attacker profiles, blocklist manager, threat scoring
- **Contact Inbox & Subscribers** — View/manage contact submissions and newsletter subscribers
- **Terminal Backend** — Execute admin commands via the built-in terminal
- **Data Export/Import** — Export and restore all site data as JSON
- **Password Protection** — scrypt-hashed admin password with TOTP (optional)

### Backend & API (40+ Vercel Serverless Functions)
- **Auth** — scrypt + optional TOTP (`api/auth.ts`)
- **Session** — HttpOnly cookies with scrypt password hashing (`api/auth.ts`)
- **KV Proxy** — Upstash Redis read/write with public key allowlist (`api/kv.ts`)
- **Analytics** — Visitor analytics with hashed IPs (`api/analytics.ts`)
- **iTunes Sync** — Automatic release fetching (`api/itunes.ts`)
- **Bandsintown Sync** — Tour date syncing (`api/bandsintown.ts`)
- **Odesli** — Cross-platform streaming links (`api/odesli.ts`)
- **Image Proxy** — SSRF-protected image proxy with allowlist (`api/image-proxy.ts`)
- **Cron Refresh** — Daily data refresh via Vercel Cron
- **Security Stack** — Honeytokens, attacker profiling, threat scoring, blocklist, rate limiting

### Data Persistence
- **Sanity CMS** — Content managed in Sanity (Project ID: `unz85dqo`, Dataset: `production`)
- **Upstash Redis** — Sessions, rate limiting, analytics, admin settings (24 h TTL)
- **IndexedDB** — Image pre-caching during loading screen
- **localStorage Fallback** — Graceful fallback when Redis is unavailable

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript, Vite 7, Tailwind CSS 4 |
| Animation | Framer Motion, Three.js |
| CMS | Sanity.io (GROQ queries, Portable Text) |
| Storage | Upstash Redis, IndexedDB, localStorage |
| UI Primitives | Radix UI, Phosphor Icons, Sonner |
| Backend | Vercel Serverless Functions (TypeScript) |
| APIs | iTunes Search, Bandsintown, Odesli/song.link, Spotify, Resend |
| Testing | Vitest (1 025+ tests) |
| Deployment | Vercel |

---

## Development

```bash
# 1. Install dependencies
npm install

# 2. Copy environment template and fill in values
cp .env.example .env

# 3. Start development server
npm run dev
```

---

## Environment Variables

Copy `.env.example` to `.env` and fill in your values. Key variables:

| Variable | Required | Description |
|----------|----------|-------------|
| `UPSTASH_REDIS_REST_URL` | ✅ | Upstash Redis endpoint |
| `UPSTASH_REDIS_REST_TOKEN` | ✅ | Upstash Redis token |
| `RATE_LIMIT_SALT` | ✅ | Random salt for GDPR-compliant IP hashing (`openssl rand -hex 32`) |
| `VITE_SANITY_PROJECT_ID` | ✅ | Sanity project ID (`unz85dqo`) |
| `VITE_SANITY_DATASET` | ✅ | Sanity dataset (`production`) |
| `SANITY_API_TOKEN` | ✅ | Sanity Editor token (server-side only) |
| `BANDSINTOWN_API_KEY` | ⚠️ | Bandsintown API key for tour date sync |
| `SPOTIFY_CLIENT_ID` | ⚠️ | Spotify app credentials |
| `SPOTIFY_CLIENT_SECRET` | ⚠️ | Spotify app credentials |
| `RESEND_API_KEY` | ⚠️ | Resend API key for contact form / newsletter |
| `CRON_SECRET` | ⚠️ | Secret for Vercel Cron Job authentication |
| `ADMIN_SETUP_TOKEN` | Optional | One-time token required for first admin setup |
| `GOOGLE_DRIVE_API_KEY` | Optional | Google Drive folder API key |

See [`.env.example`](./.env.example) for the full list with descriptions.

**Getting API keys:**
- **Upstash Redis** → https://upstash.com (free tier available)
- **Sanity** → https://www.sanity.io/manage/project/unz85dqo
- **Bandsintown** → https://www.bandsintown.com/for-artists
- **Spotify** → https://developer.spotify.com/dashboard
- **Resend** → https://resend.com

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server (port 5173) |
| `npm run build` | TypeScript check + Vite production build |
| `npm run test` | Run Vitest test suite |
| `npm run lint` | Run ESLint |
| `npm run preview` | Preview production build locally |
| `npm run typecheck` | TypeScript type-check without build |

### Utility Scripts

| Script | Description |
|--------|-------------|
| `scripts/fix-deps.sh` | Reinstall all dependencies (Linux/macOS) |
| `scripts/fix-deps.bat` | Reinstall all dependencies (Windows) |

---

## Deployment

The project deploys to **Vercel**. All serverless functions in `api/` are automatically deployed.

### Vercel Cron Jobs

| Schedule | Endpoint | Description |
|----------|----------|-------------|
| Daily 06:00 UTC | `/api/gigs-sync` | Refresh Bandsintown tour dates |
| Daily 03:00 UTC | `/api/releases-enrich` | Enrich releases with streaming links |

### First-time Admin Setup

1. Deploy to Vercel and set all required environment variables
2. Navigate to `https://your-domain.com/?admin-setup`
3. Set your admin password
4. Log in via the lock icon in the footer

---

## Documentation

All project documentation is in the [`docs/`](./docs/) directory.

### Developer Guides

| Document | Description |
|----------|-------------|
| [docs/CODING_AGENT_WORKFLOW.md](./docs/CODING_AGENT_WORKFLOW.md) | Mandatory 5-phase workflow for all coding agents |
| [docs/DEVELOPMENT_STATUS.md](./docs/DEVELOPMENT_STATUS.md) | Current development state, feature checklists, open PRs, blockers |
| [docs/ADMIN_GUIDE.md](./docs/ADMIN_GUIDE.md) | Admin CMS user guide |
| [docs/SANITY_SETUP.md](./docs/SANITY_SETUP.md) | Sanity CMS setup guide (DE) |

### Architecture & Quality

| Document | Description |
|----------|-------------|
| [docs/DEEP_AUDIT.md](./docs/DEEP_AUDIT.md) | Full deep-audit: architecture, security, UX, quality findings |
| [docs/ARCHITECTURE_DECISION_RECORDS.md](./docs/ARCHITECTURE_DECISION_RECORDS.md) | ADRs documenting key architectural decisions |
| [docs/TECH_DEBT_TRACKER.md](./docs/TECH_DEBT_TRACKER.md) | Technical debt register with severity, effort, and status |
| [docs/LESSONS_LEARNED.md](./docs/LESSONS_LEARNED.md) | Lessons learned log — updated after every agent session |

### Security & Compliance

| Document | Description |
|----------|-------------|
| [SECURITY.md](./SECURITY.md) | Security policy and vulnerability reporting |
| [docs/SECURITY_FINDINGS.md](./docs/SECURITY_FINDINGS.md) | Security findings with CVSS scores and remediation timelines |
| [docs/SECURITY_SUMMARY.md](./docs/SECURITY_SUMMARY.md) | CodeQL analysis results and security review summary |
| [docs/GDPR_COMPLIANCE.md](./docs/GDPR_COMPLIANCE.md) | GDPR compliance documentation |
| [docs/ATTACKER_PROFILING_SUMMARY.md](./docs/ATTACKER_PROFILING_SUMMARY.md) | Attacker profiling and honeypot architecture |

### Other

| Document | Description |
|----------|-------------|
| [docs/PERFORMANCE.md](./docs/PERFORMANCE.md) | Performance analysis and optimization notes |
| [docs/ACCESSIBILITY.md](./docs/ACCESSIBILITY.md) | Accessibility audit and WCAG 2.1 compliance |
| [docs/PRD.md](./docs/PRD.md) | Product requirements document |
| [docs/IMPROVEMENTS.md](./docs/IMPROVEMENTS.md) | Implemented improvements and bug fix log |
| [docs/IMPLEMENTATION_SUMMARY.md](./docs/IMPLEMENTATION_SUMMARY.md) | Implementation summary from initial build |
| [docs/TASK_COMPLETION.md](./docs/TASK_COMPLETION.md) | Historical task completion records |
| [docs/FIX_DEPENDENCIES.md](./docs/FIX_DEPENDENCIES.md) | Dependency troubleshooting guide |

---

## License

MIT License — see [LICENSE](LICENSE) for details.
