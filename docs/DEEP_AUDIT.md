# Deep Audit Report — Zardonic Industrial Website

> **Last Updated:** 2026-04-01  
> **Agent ID:** copilot/deep-audit-dokumentation  
> **Repository:** `Neuroklast/zardonic-industrial`  
> **Deployed At:** https://zardonic-website.vercel.app  

---

## Executive Summary

This document records the findings of a comprehensive deep-audit of the Zardonic Industrial website repository. It covers architecture, security, UI/UX, software quality (ISO 25010), anti-patterns, dependency hygiene, performance, and missing features. Each finding is rated by severity using the following scale:

| Icon | Severity | Definition |
|------|----------|------------|
| 🔴 | **Critical** | Immediate risk to security, data integrity, or production stability |
| 🟠 | **High** | Significant risk; should be addressed in the next sprint |
| 🟡 | **Medium** | Notable issue; address within 1–3 sprints |
| 🟢 | **Low** | Minor issue or improvement; address when capacity allows |
| ℹ️ | **Info** | Observation or best-practice note; no action required |

---

## A. Architecture Analysis

### A-01 🟠 God Object — `src/App.tsx` (726 lines)

- **File:** `src/App.tsx`
- **Size:** ~726 lines (significantly reduced from original 3 638 lines)
- **Finding:** `App.tsx` still manages multiple concerns: loading screen state, admin auth state, site data sync, all dialog open/close state (12+ boolean flags), section rendering order, edit mode, and konami activation. This still violates Single Responsibility.
- **Status:** Substantially improved — down from 3 638 to 726 lines. Key improvements: lazy-loading admin panel, hook extraction, context separation. Remaining work: `AdminDialogManager`, `SiteDataProvider`, `AuthProvider` contexts.
- **Recommendation:** Extract remaining concerns into dedicated components/contexts. Aim for <300 lines per component.

---

### A-02 🟠 Oversized Components

| File | Lines | Bytes |
|------|-------|-------|
| `src/components/EditControls.tsx` | 1 007 | 45 007 |
| `src/components/ThemeCustomizerDialog.tsx` | 795 | 35 903 |
| `src/components/SecretTerminal.tsx` | 672 | 30 350 |
| `src/components/InstagramGallery.tsx` | 600 | — |
| `src/components/MediaSection.tsx` | 584 | — |

- **Finding:** Multiple components carry far too much responsibility. Each violates the Single Responsibility Principle.
- **Recommendation:** Split each oversized component into smaller, focused sub-components. `EditControls.tsx` in particular should be split by domain (theme, sections, data export, etc.).

---

### A-03 🟡 Flat Component Directory — 70+ Files Without Sub-Structure

- **Directory:** `src/components/`
- **Finding:** All ~70 components live in a single flat folder. There is no grouping by feature, domain, or type (UI primitives vs. page sections vs. dialogs vs. overlays).
- **Recommendation:** Introduce sub-directories such as:
  ```
  src/components/
  ├── layout/          # Navigation, Footer, LoadingScreen
  ├── sections/        # Hero, BiographySection, MediaSection, …
  ├── dialogs/         # AdminLoginDialog, ThemeCustomizerDialog, …
  ├── effects/         # CyberpunkBackground, OverlayEffectsLayer, …
  ├── ui/              # shadcn primitives (already exists ✅)
  └── admin/           # EditControls, SecuritySettingsDialog, …
  ```

---

### A-04 🟡 Only One Context (`LocaleContext`)

- **File:** `src/contexts/LocaleContext.tsx`
- **Finding:** Authentication state, theme state, admin state, and analytics state are all managed inside `App.tsx` via `useState`/`useRef`. Passing them down through props creates prop-drilling and tight coupling.
- **Recommendation:** Create dedicated contexts: `AuthContext`, `ThemeContext`, `AdminContext`, `SiteConfigContext`.

---

### A-05 🟡 No State Management Library

- **Finding:** The entire application uses only React's built-in `useState`/`useReducer`. For a CMS with dozens of interdependent state slices this results in complex, hard-to-trace updates.
- **Recommendation:** Adopt **Zustand** (lightweight, idiomatic for Vite/React projects). See [ADR-002](./ARCHITECTURE_DECISION_RECORDS.md#adr-002-state-management).

---

### A-06 🟡 No Client-Side Router

- **Finding:** There is no `react-router-dom` or equivalent. The entire SPA renders everything from `App.tsx` with conditional rendering. There are no bookmarkable URLs, no browser history support, and no deep-linking.
- **Recommendation:** Add React Router v7 for section-level routing (`/bio`, `/releases`, `/gigs`, etc.) and for the admin panel. See [ADR-003](./ARCHITECTURE_DECISION_RECORDS.md#adr-003-routing-strategy).

---

### A-07 🟠 Duplicate Cookie UI Components

- **Files:** `src/components/CookieBanner.tsx` & `src/components/CookieConsent.tsx`
- **Finding:** Two components appear to implement overlapping cookie-consent logic. This leads to inconsistent behaviour and maintenance burden.
- **Recommendation:** Consolidate into a single `CookieConsent.tsx` component. Delete the duplicate.

---

### A-08 🟢 No Barrel Exports (`index.ts`)

- **Directories:** `src/components/`, `src/hooks/`, `src/lib/`
- **Finding:** There are no barrel index files. Every import requires a full relative path.
- **Recommendation:** Add `index.ts` barrel files to enable clean imports: `import { Navigation, Footer } from '@/components'`.

---

### A-09 🟡 `middleware.ts` — New Redis Instance Per Request

- **File:** `middleware.ts` (lines 55–60)
- **Finding:**
  ```ts
  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  })
  ```
  A new `Redis` client is constructed on **every single request** inside the middleware handler. While Upstash uses HTTP (stateless), this still allocates objects unnecessarily on the Edge.
- **Recommendation:** Move the client instantiation to module scope (outside the handler function), guarded by an env-var check.

---

### A-10 🟢 Oversized `src/index.css` (1 990 lines)

- **File:** `src/index.css`
- **Finding:** The global stylesheet is nearly 2 000 lines, mixing resets, custom properties, utility classes, component-specific styles, and animation keyframes.
- **Recommendation:** Split into: `base.css`, `animations.css`, `themes.css`, `components.css`.

---

## B. Security Analysis

### B-01 🟠 Hardcoded Default Salt in `middleware.ts`

- **File:** `middleware.ts`, line 22
- **Code:**
  ```ts
  const SALT = process.env.RATE_LIMIT_SALT || 'zd-default-rate-limit-salt-change-me'
  ```
- **Finding:** If `RATE_LIMIT_SALT` is not set in the environment, a well-known, hardcoded fallback is used. This makes the IP hash predictable, undermining the anonymisation of IP addresses in rate-limiting.
- **CVSS:** 5.3 (Medium) — see [`SECURITY_FINDINGS.md#SF-001`](./SECURITY_FINDINGS.md#sf-001)
- **Recommendation:** Fail loudly (throw/log an error) when the env var is absent in production. Never fall back to a published default.

---

### B-02 🟠 CSP Allows `'unsafe-inline'` for Styles

- **File:** `vercel.json`, line 8
- **Code:**
  ```json
  "style-src": "'self' 'unsafe-inline' https://fonts.googleapis.com"
  ```
- **Finding:** `'unsafe-inline'` for styles enables CSS injection attacks, particularly in browsers that support CSS-based exfiltration (attribute selectors, `url()` fetches).
- **CVSS:** 5.4 (Medium) — see [`SECURITY_FINDINGS.md#SF-002`](./SECURITY_FINDINGS.md#sf-002)
- **Recommendation:** Use CSS nonces or a hash-based CSP for inline styles. For Tailwind CSS 4, a nonce can be injected via Vite.

---

### B-03 🟠 Build Skips TypeScript Type Checking (`--noCheck`)

- **File:** `package.json`, `scripts.build`
- **Code:**
  ```json
  "build": "export NODE_OPTIONS='--disable-warning=DEP0169' && tsc -b --noCheck && vite build"
  ```
- **Finding:** `--noCheck` bypasses all TypeScript type checking during the production build. Type errors that would catch runtime bugs are silently ignored on every deploy.
- **Recommendation:** Remove `--noCheck`. Run `tsc --noEmit` as a separate CI step to surface type errors without blocking fast Vite builds.

---

### B-04 🟡 ESLint Ignores the Entire `api/` Directory

- **File:** `eslint.config.js`, line 5
- **Code:**
  ```js
  { ignores: ['dist', 'node_modules', 'api'] }
  ```
- **Finding:** All serverless functions in `api/` are excluded from linting. Security-relevant code (auth, rate-limiting, session management) receives no static analysis.
- **Recommendation:** Remove `'api'` from ignores. Add a separate ESLint config for Node.js/edge environments.

---

### B-05 🟡 `tsconfig.json` Missing `strict: true`

- **File:** `tsconfig.json`
- **Finding:** Only `strictNullChecks: true` is set individually. `strict: true` would additionally enable `noImplicitAny`, `strictFunctionTypes`, `strictBindCallApply`, `strictPropertyInitialization`, and `useUnknownInCatchVariables`.
- **Recommendation:** Add `"strict": true` and remove the individual `strictNullChecks` override.

---

### B-06 🟡 Image Proxy — SSRF Risk Assessment

- **File:** `api/image-proxy.ts`
- **Finding:** The proxy does implement a blocklist for private IP ranges (`BLOCKED_HOST_PATTERNS`). However, it does not perform a DNS pre-resolution check before connecting, meaning a DNS-rebinding attack could potentially bypass the blocklist.
- **Severity:** Partially mitigated. DNS pre-resolution (`resolve4`/`resolve6` is imported but usage must be verified end-to-end).
- **Recommendation:** Verify that `resolve4`/`resolve6` DNS checks are performed **before** the HTTP fetch, not just at validation time.

---

### B-07 🟡 Offensive Security Features — Legal Exposure

- **Files:** `api/_zipbomb.ts`, `api/_sql-backfire.ts`, `api/_log-poisoning.ts`, `api/_canary-documents.ts`, `api/_honeytokens.ts`, `api/_attacker-profile.ts`
- **Finding:** These features implement active countermeasures (serving zipbombs, injecting false SQL, poisoning attacker logs, tracking attacker fingerprints). While innovative, these may be illegal or expose the operator to civil liability in certain jurisdictions (EU, US CFAA/ECPA).
- **Recommendation:** Legal review required. See [ADR-004](./ARCHITECTURE_DECISION_RECORDS.md#adr-004-offensive-security-features).

---

### B-08 🟢 Session Token — Dual-Mode (Cookie + Header)

- **File:** `api/session.ts`
- **Finding:** Session tokens are sent both as `HttpOnly` cookies and as JSON response body (for legacy `x-session-token` header support). The `x-session-token` header approach is XSS-vulnerable.
- **Recommendation:** Migrate all frontend session handling to `HttpOnly` cookie. Deprecate and remove the header-based approach.

---

### B-09 ℹ️ Honeypot Paths — Well Implemented ✅

- **File:** `vercel.json` (rewrites section)
- **Finding:** WordPress, phpMyAdmin, `.env`, `.git`, and other common scanner targets are all redirected to the `denied` handler, which can profile attackers.
- **Recommendation:** No action required; this is a good security practice.

---

### B-10 ℹ️ Circuit Breaker — Implemented ✅

- **File:** `middleware.ts`
- **Finding:** Global rate-limiting circuit breaker is implemented at the Edge layer, preventing billing explosions under DDoS.
- **Note:** The threshold of 500 req/10s may be low for legitimate traffic spikes (e.g., after a viral social media post). Consider making it configurable via environment variable.

---

## C. UI/UX Analysis

### C-01 🟠 Accessibility — Missing `prefers-reduced-motion` on All Animations

- **Files:** `src/components/CyberpunkBackground.tsx`, `src/components/OverlayEffectsLayer.tsx`, `src/components/GlitchImage.tsx`, `src/components/ChromaticText.tsx`, and many others.
- **Finding:** The application renders CRT scanlines, glitch effects, chromatic aberration, and motion blur by default. Users with vestibular disorders or photosensitive epilepsy are not protected unless the admin disables effects manually.
- **Recommendation:** Check `window.matchMedia('(prefers-reduced-motion: reduce)')` and disable all non-essential animations when true.

---

### C-02 🟡 Missing Skip-to-Content Link

- **Finding:** Keyboard users must tab through the entire navigation before reaching main content. No skip-navigation link is present.
- **Recommendation:** Add `<a href="#main-content" class="sr-only focus:not-sr-only">Skip to main content</a>` as the first focusable element.

---

### C-03 🟡 Keyboard Navigation — Incomplete

- **Files:** Various interactive components (custom modals, galleries, terminal).
- **Finding:** Custom components built on top of Radix UI primitives may not fully inherit keyboard navigation patterns. Focus trapping in modals needs audit.
- **Recommendation:** Test all interactive elements with keyboard-only navigation. Use `@testing-library/user-event` to automate keyboard tests.

---

### C-04 🟡 Duplicate Cookie UI (CookieBanner + CookieConsent)

- **Finding:** Two separate components handle cookie consent UI, causing potential UX confusion if both render simultaneously or if their state diverges.
- **Recommendation:** See [A-07](#a-07-🟠-duplicate-cookie-ui-components).

---

### C-05 🟢 No Responsive Breakpoint Test Coverage

- **Finding:** No automated tests exist for responsive layouts at mobile, tablet, and desktop breakpoints.
- **Recommendation:** Add Playwright visual regression tests for key breakpoints.

---

### C-06 🟢 i18n Implemented (DE/EN) ✅ — ARIA Labels Need Audit

- **Files:** `src/lib/i18n.ts`, `src/contexts/LocaleContext.tsx`
- **Finding:** Internationalisation is in place for both German and English content. However, ARIA labels may not be translated.
- **Recommendation:** Ensure all `aria-label`, `aria-description`, and `title` attributes reference i18n keys.

---

## D. Software Quality (ISO/IEC 25010)

### D-01 🟠 Test Coverage — Near Zero

| Scope | Status |
|-------|--------|
| Component tests | Only `SpotifyEmbed.test.tsx` |
| Hook tests | `use-local-storage.test.ts` (1 file) |
| Lib unit tests | `contact.test.ts`, `bandsintown.test.ts`, `itunes.test.ts`, `odesli.test.ts`, `sync.test.ts`, `session.test.ts` |
| E2E tests | ❌ None |
| API tests | ❌ None |
| Visual regression | ❌ None |

- **Finding:** Critical paths (admin auth, newsletter, contact form, Redis integration) have no automated tests. A regression could go undetected.
- **Recommendation:** Achieve at minimum 60% line coverage for `src/lib/` and `api/`. Add one Playwright E2E test per critical user flow.

---

### D-02 🟠 `tsc --noCheck` in Build

- See [B-03](#b-03-🟠-build-skips-typescript-type-checking---nocheck).

---

### D-03 🟢 Version `0.0.0` in `package.json`

- **File:** `package.json`, line 3
- **Finding:** The package version is `0.0.0`, with no Semantic Versioning in use.
- **Recommendation:** Adopt SemVer. Create `CHANGELOG.md`. Use `npm version patch/minor/major` or a tool like `changesets` for automated release notes.

---

### D-04 🟢 No `CHANGELOG.md`

- **Finding:** There is no changelog documenting what changed between deployments.
- **Recommendation:** Create `CHANGELOG.md` following [Keep a Changelog](https://keepachangelog.com/) convention.

---

### D-05 🟢 Platform-Specific Build Script

- **File:** `package.json`, `scripts.build`
- **Finding:** The build script uses Unix `export` syntax and is incompatible with Windows CMD. The `fix-deps.bat` helper file's existence suggests Windows users are already struggling.
- **Recommendation:** Use `cross-env` package or a `.env` file loaded by Vite to handle cross-platform environment variables.

---

## E. Anti-Patterns & Code Smells

### E-01 🔴 God Object — `App.tsx`

- See [A-01](#a-01-🔴-god-object---srcapptsx-3-638-lines).

### E-02 🟠 Shotgun Surgery

- **Finding:** A single UI change (e.g., adding a new section, a new modal) requires modifications scattered across `App.tsx`, potentially multiple components, `src/lib/`, and API handlers. There is no feature isolation.
- **Recommendation:** Feature-based directory structure (see [A-03](#a-03-🟡-flat-component-directory---70-files-without-sub-structure)).

### E-03 🟡 Magic Numbers

- **File:** `middleware.ts`
- **Examples:**
  ```ts
  const THRESHOLD = 500        // no unit annotation
  const COOLDOWN_SECONDS = 300 // magic number, not configurable
  ```
- **Recommendation:** Move all magic numbers to named, documented constants. Make them configurable via environment variables.

### E-04 🟡 No Error Boundaries Per Section

- **File:** `src/ErrorFallback.tsx`, `src/App.tsx`
- **Finding:** Only one root-level error boundary exists. If any section component throws, the entire page unmounts.
- **Recommendation:** Wrap each major section (`<Hero>`, `<BiographySection>`, `<ReleasesSection>`, etc.) with its own `<ErrorBoundary>` that renders a fallback card rather than crashing the whole page.

### E-05 🟢 Primitive Obsession — No TypeScript Enums/Union Types for States

- **Finding:** Component state is tracked with raw strings and booleans (e.g., `activeSection: string`, `mode: string`) instead of typed union types or enums.
- **Recommendation:** Define union types: `type ActiveSection = 'bio' | 'releases' | 'gigs' | 'gallery'`.

---

## F. Dependency Hygiene

### F-01 🟠 6 Open Dependabot PRs Unmerged

| PR | Package | Change |
|----|---------|--------|
| #54 | `javascript-obfuscator` | 4.2.2 → 5.3.0 |
| #51 | `marked` | 15.0.12 → 17.0.3 |
| #48 | `eslint` | 9.39.2 → 10.0.2 (breaking) |
| #45 | `actions/setup-node` | 4 → 6 |
| #44 | `actions/checkout` | 4 → 6 |
| #22 | `zod` | 3.25.76 → 4.3.6 (breaking) |
| #5  | `globals` | 16.5.0 → 17.3.0 |

- **Recommendation:** Review and merge non-breaking updates immediately. Evaluate breaking changes (`eslint`, `zod`) against migration guides before merging.

### F-02 🟠 `next-themes` in a Vite/React Project

- **File:** `package.json`
- **Package:** `next-themes@0.4.6`
- **Finding:** `next-themes` is designed for Next.js projects and relies on Next.js SSR hydration. Using it in a Vite SPA is incorrect and may cause hydration warnings or incorrect behaviour.
- **Recommendation:** Replace with a Vite-compatible alternative such as `@radix-ui/themes`, or implement a minimal custom theme context.

### F-03 🟡 Three Icon Libraries in Use

- **Packages:** `@heroicons/react`, `@phosphor-icons/react`, `lucide-react`
- **Finding:** Three separate icon libraries add unnecessary bundle weight and inconsistent visual style across the UI.
- **Recommendation:** Standardise on one library (Phosphor is already the most widely used in the codebase). Remove the others. See [ADR-005](./ARCHITECTURE_DECISION_RECORDS.md#adr-005-dependency-consolidation).

### F-04 🟢 `zod` 3.x — Breaking Change Pending (`zod` v4)

- **Package:** `zod@3.25.76`
- **Finding:** `zod` v4 is a major rewrite with breaking API changes. PR #22 proposes the bump but is unmergeable without a migration audit.
- **Recommendation:** Review all `zod` schema usage in `api/_schemas.ts` and update before merging PR #22.

---

## G. Performance

### G-01 🟠 JavaScript Obfuscation Increases Bundle Size

- **Package:** `javascript-obfuscator@4.2.2` (devDependency)
- **Finding:** Obfuscating JavaScript after a Vite build significantly inflates bundle size (typically 30–80% larger) and eliminates all tree-shaking and minification benefits from Rollup/Vite.
- **Recommendation:** Remove obfuscation from the build pipeline. Security through obscurity does not protect against determined attackers. Deploy source maps only to a private error-tracking service.

### G-02 ✅ Three.js / Logo3D removed — vendor-three chunk eliminated

- **Finding (resolved):** `Logo3D.tsx` was dead code — imported nowhere. `three`, `@react-three/fiber`, and `@react-three/drei` were its sole consumers.
- **Resolution:** Deleted `Logo3D.tsx`, `ZARDONICTEXT.glb`, `ZARDONICHEAD.glb`, and removed all three packages from `package.json`. The `vendor-three` (~138 kB gzipped) and `vendor-three-react` chunks no longer exist in the production bundle.
- **Remaining:** `d3`, `recharts`, and `framer-motion` are still eagerly imported. Use `React.lazy()` + `React.Suspense` for `StatsDashboard` and `AudioVisualizer` if bundle size becomes a concern.

### G-03 🟡 No Route-Based Code Splitting

- **Finding:** Because there is no router, all page content is bundled and downloaded upfront, even sections the user may never view.
- **Recommendation:** Routing (see [A-06](#a-06-🟡-no-client-side-router)) combined with dynamic imports will enable route-based code splitting.

### G-04 🟢 Loading Screen Does Not Block LCP

- **File:** `src/components/LoadingScreen.tsx`
- **Finding (resolved):** The 3D loading screen that previously relied on Three.js has been removed along with `Logo3D.tsx` and all Three.js dependencies. `LoadingScreen.tsx` now uses CSS/Framer Motion animations only.
- **Recommendation:** No action required.

---

## H. Missing Features & Recommendations

| # | Feature | Priority |
|---|---------|----------|
| H-01 | React Router for SPA navigation | 🟠 High |
| H-02 | Zustand state management | 🟡 Medium |
| H-03 | Per-section Error Boundaries | 🟡 Medium |
| H-04 | Structured logging in API handlers | 🟡 Medium |
| H-05 | Health-check endpoint (`/api/health`) | 🟢 Low |
| H-06 | Per-user rate limiting (not just global) | 🟡 Medium |
| H-07 | CORS configuration for API endpoints | 🟠 High |
| H-08 | `CHANGELOG.md` + SemVer releases | 🟢 Low |
| H-09 | `prefers-reduced-motion` support | 🟠 High |
| H-10 | E2E tests (Playwright) | 🟠 High |

---

## Summary Table

| ID | Severity | Area | Title |
|----|----------|------|-------|
| A-01 | 🔴 Critical | Architecture | God Object — `App.tsx` |
| B-01 | 🟠 High | Security | Hardcoded default salt |
| B-02 | 🟠 High | Security | CSP allows `unsafe-inline` styles |
| B-03 | 🟠 High | Build | `tsc --noCheck` in production build |
| A-02 | 🟠 High | Architecture | Oversized components |
| A-07 | 🟠 High | Architecture | Duplicate cookie UI |
| D-01 | 🟠 High | Quality | Near-zero test coverage |
| F-01 | 🟠 High | Dependencies | 6 open Dependabot PRs |
| F-02 | 🟠 High | Dependencies | `next-themes` in Vite project |
| G-01 | 🟠 High | Performance | JS obfuscation inflates bundle |
| A-03 | 🟡 Medium | Architecture | Flat component directory |
| A-04 | 🟡 Medium | Architecture | Only 1 Context |
| A-05 | 🟡 Medium | Architecture | No state management |
| A-06 | 🟡 Medium | Architecture | No router |
| B-04 | 🟡 Medium | Security | ESLint ignores `api/` |
| B-05 | 🟡 Medium | Security | Missing `strict: true` in tsconfig |
| B-06 | 🟡 Medium | Security | Image proxy SSRF risk |
| B-07 | 🟡 Medium | Security | Offensive features — legal risk |
| C-01 | 🟠 High | UX/a11y | Missing `prefers-reduced-motion` |
| C-02 | 🟡 Medium | UX/a11y | Missing skip-to-content |
| F-03 | 🟡 Medium | Dependencies | Three icon libraries |
| G-02 | 🟡 Medium | Performance | No lazy loading |
| E-01 | 🔴 Critical | Code Quality | God Object |
| E-04 | 🟡 Medium | Code Quality | No per-section error boundaries |

---

*Document generated by automated deep-audit analysis of the repository at commit HEAD.*
