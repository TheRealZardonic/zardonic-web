# Developer & Agent Guidelines (AGENTS.md)

**MANDATORY**: All developers and AI agents working on this project MUST strictly adhere to the following guidelines. This ensures code quality, security, legal compliance (GDPR), perfect UI/UX, and maintainability.

## 1. Clean Code & Architecture (ISO/IEC 25010)

*   **Single Responsibility Principle (SRP)**: No "God Objects". Files like `App.tsx` must not contain thousands of lines of code. Split functionality into small, focused, and reusable components.
*   **Separation of Concerns**: Keep UI components (React), state management (Hooks/Context), and business logic (API calls/Lib functions) separate.
*   **Code Splitting & Lazy Loading**: Use `React.lazy()` and `Suspense` for heavy components (e.g., 3D models, admin panels, complex galleries) to keep the initial JavaScript bundle small and performant.
*   **Strict Typing**: Avoid the use of `any` in TypeScript. All variables, function parameters, API responses, and test mocks MUST be strictly typed.
*   **Dry Principle**: Do not repeat code. Use reusable hooks and utility functions.

## 2. Security & Data Protection (GDPR / DSGVO)

*   **Two-Click Solutions for Third-Party Embeds**: External widgets (like Spotify, YouTube, SoundCloud) MUST NEVER load automatically on page load. They require a user interaction (a click) and explicit consent before the `<iframe>` is rendered to prevent IP address leaks.
*   **Local Storage Consent**: Any use of `localStorage` or `IndexedDB` for analytics or user tracking MUST be guarded by the user's explicit consent via the `CookieConsent` banner. Only strictly necessary functional data (like theme preference) may be stored without consent.
*   **Data Minimization**: Never log plaintext IP addresses. Always use the established `hashIp()` utility.
*   **Environment Variables**: Ensure all required environment variables (e.g., `RATE_LIMIT_SALT`, `UPSTASH_REDIS_REST_URL`) are documented and checked at startup. Fail fast if security-critical variables are missing.
*   **Dependencies**: Keep all `npm` packages updated. Run `npm audit` regularly and fix vulnerabilities immediately. Do not introduce packages with known high/critical CVEs.

## 3. UI/UX & Accessibility (WCAG 2.1 AA)

*   **Accessible Typography**: Font sizes must be readable. Avoid sizes smaller than `12px` (`text-xs` in Tailwind) for continuous reading text. Decorative HUD elements may use smaller text but must not contain critical information.
*   **ARIA Labels**: All interactive elements (buttons, links, inputs) without visible text labels MUST have descriptive `aria-label` attributes.
*   **Focus Management**: Ensure custom interactive elements (like overlays, dialogs, sliders) are focusable (`tabIndex={0}`) and react to keyboard events (Enter/Space).
*   **Color Contrast**: Maintain sufficient color contrast ratios between foreground text and background colors, adhering to the established design system (`oklch` values).

## 4. Testing & Quality Assurance

*   **Zero Warnings**: The build and lint processes (`npm run build`, `npm run lint`) must complete with ZERO warnings and ZERO errors.
*   **Unit Testing**: Write unit tests for all new utilities, API routes, and complex hooks using Vitest.
*   **Test Isolation**: Tests must not rely on external network requests. Mock all external APIs (iTunes, Bandsintown, Odesli).

## 5. Build Configuration (Vite & Tailwind)

*   **Valid CSS**: Ensure all custom CSS and Tailwind configurations use standard, valid syntax. Avoid experimental features that cause build warnings (e.g., incorrect `@media` query syntax).
*   **Chunk Optimization**: Configure Rollup (via Vite) to split vendor chunks and application chunks effectively to prevent single files from exceeding 500kb (gzipped).

**Enforcement:** Before submitting any pull request or finalizing a task, you MUST run:
1.  `npm run lint`
2.  `npm run build`
3.  `npm run test`
And ensure all checks pass perfectly.

## 6. Layer Architecture & Z-Index System

All z-index values in the application are managed through CSS custom properties defined in `src/layers.css` and mirrored as TypeScript constants in `src/lib/layer-contract.ts`.

**Token hierarchy (lowest → highest):**

| Token | Value | Usage |
|---|---|---|
| `--z-bg-image` | 0 | Static background photo |
| `--z-bg-animated` | 1 | AnimatedBg components (MatrixRain, CircuitBg…) |
| `--z-bg-scanline` | 2 | CRT scanline background |
| `--z-content` | 10 | All page sections, `PageLayout` content wrapper |
| `--z-section-fx` | 15 | Section-local effects (must use `isolation: isolate`) |
| `--z-hud` | 20 | `SystemMonitorHUD` floating readouts |
| `--z-nav` | 30 | `AppNavBar` |
| `--z-global-fx` | 40 | CRT overlay, vignette, full-page noise (pointer-events: none) |
| `--z-overlay` | 50 | Modals, dialogs, galleries |
| `--z-system` | 60 | Loading screen, cookie consent, toasts |

**Rules — violation = instant PR rejection:**

*   **No raw z-index numbers** anywhere in TSX or CSS. Always use `var(--z-*)` in CSS / `style={{ zIndex: 'var(--z-nav)' } as React.CSSProperties}` in TSX.
*   **`PageLayout`** (`src/layouts/PageLayout.tsx`) MUST be used as the top-level layout for every page. Never build a `min-h-screen` container manually.
*   **`isolation: isolate`** MUST be added to any component whose children use section-local z-index values (like `.crt-effect`, `.noise-effect`). This prevents local z-index from escaping into the global stacking context.
*   **New background animations** → add to `BackgroundStack.tsx`, never to `App.tsx` directly.
*   **New global post-processing effects** (CRT, noise, vignette) → add to `GlobalEffects.tsx`.
*   **New modals / dialogs** → render inside the `overlays` slot of `PageLayout`.
*   **New system UI** (toasts, loading screens, consent banners) → render inside the `system` slot of `PageLayout`.
*   When changing any z-index token value in `src/layers.css`, also update the matching constant in `src/lib/layer-contract.ts` and ensure `src/test/layer-contract.test.tsx` still passes.

## 7. Typography & Font System

*   **CSS Font Variables**: `--font-heading`, `--font-body`, `--font-mono` are the three live CSS custom properties for font families. They are set dynamically in `src/hooks/use-app-theme.ts` from `adminSettings.design.theme.fontHeading/fontBody/fontMono`.
*   **Google Fonts Loading**: `use-app-theme.ts` automatically injects a `<link>` to Google Fonts whenever a non-system font is selected. Font names are extracted via `extractGoogleFontName()`. No manual font injection is needed for fonts in the admin dropdowns.
*   **Biography font**: `AppBioSection.tsx` reads `adminSettings.sections.styleOverrides.bio.textSize` for the Tailwind text-size class. The body font is inherited via CSS from the `body` element (`--font-body`).
*   **Font Dropdowns**: Managed in `src/components/admin/AppearanceTab.tsx` via `HEADING_FONTS`, `BODY_FONTS`, `MONO_FONTS` arrays (proper CSS values with stacks). Font size sliders are inline below each dropdown for all disclosure levels.

## 8. Admin Panel Features

*   **Undo**: `AdminPanel.tsx` maintains an undo stack (max 50 entries) in `undoStack.current`. Every `setAdminSettings` call through the panel is intercepted by `setAdminSettingsWithUndo`. The undo button (↺ icon) in the header triggers `handleUndo`.
*   **Analytics Toggle**: `adminSettings.analytics.enabled` (and `trackPageViews`, `trackEvents`) are checked in `use-app-state.ts` before firing any tracking. The admin toggle in `AnalyticsTab` is the single point of control alongside user cookie consent.
*   **Section order callbacks** (`moveSectionUp`, `moveSectionDown`) also go through `setAdminSettingsWithUndo`.

## 9. Release Gallery

*   **Layouts**: `grid` (default), `swipe` (Embla Carousel with native touch), `carousel-3d` (custom 3D with `useTouchSwipe` hook for swipe gestures).
*   **Swipe Gestures**: `Releases3DCarouselLayout` uses `useTouchSwipe` from `src/hooks/use-touch-swipe.ts` for left/right swipe navigation. `ReleasesSwipeLayout` uses Embla Carousel which handles touch natively.
