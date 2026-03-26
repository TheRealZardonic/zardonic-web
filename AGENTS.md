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
