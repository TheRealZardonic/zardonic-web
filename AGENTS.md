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
*   **Admin UI Typography Shield**: Theme font/size customisations MUST NEVER affect the admin panel or CMS shell. Any admin container MUST carry `data-admin-ui="true"`. The `[data-admin-ui]` CSS rule in `index.css` resets all `--font-*`, `--heading-*`, `--body-*`, `--mono-*` variables to stable system fallbacks. This rule covers: `AdminPanel.tsx` (root motion.div), `CmsApp.tsx` (wrapping div), and every admin `DialogContent` element. When adding new admin dialogs or overlays, always add `data-admin-ui="true"` to their root portaled element.

## 8. Admin Panel Features

*   **Undo**: `AdminPanel.tsx` maintains an undo stack (max 50 entries) in `undoStack.current`. Every `setAdminSettings` call through the panel is intercepted by `setAdminSettingsWithUndo`. The undo button (↺ icon) in the header triggers `handleUndo`.
*   **Analytics Toggle**: `adminSettings.analytics.enabled` (and `trackPageViews`, `trackEvents`) are checked in `use-app-state.ts` before firing any tracking. The admin toggle in `AnalyticsTab` is the single point of control alongside user cookie consent.
*   **Consent Helpers**: Pure consent functions (`useAnalyticsConsent`, `getAnalyticsConsentSync`, `getConsentPreferencesAsync`, `dispatchConsentEvent`) live in `src/lib/consent.ts`. Non-UI modules (e.g. `use-app-state.ts`) MUST import from `@/lib/consent`, never from `@/components/CookieConsent`. The component re-exports everything for backwards compatibility.
*   **Section order callbacks** (`moveSectionUp`, `moveSectionDown`) also go through `setAdminSettingsWithUndo`.

## 9. Release Gallery

*   **Layouts**: `grid` (default), `swipe` (Embla Carousel with native touch), `carousel-3d` (custom 3D with `useTouchSwipe` hook for swipe gestures).
*   **Swipe Gestures**: `Releases3DCarouselLayout` uses `useTouchSwipe` from `src/hooks/use-touch-swipe.ts` for left/right swipe navigation. `ReleasesSwipeLayout` uses Embla Carousel which handles touch natively.

## 10. Schema-Driven UI

All admin and CMS form fields MUST be defined in schema registries — never hard-coded inline in component JSX.

### Registries

| Registry | File | Purpose |
|---|---|---|
| `FIELD_REGISTRY` | `src/cms/schemas.ts` | CMS fields keyed by `"schema.field"` (e.g. `"hero.headline"`) |
| `SECTION_REGISTRY` | `src/lib/sections-registry.ts` | Admin panel *section* fields with `SectionConfigField[]` |
| `DESIGN_REGISTRY` | `src/lib/sections-registry.ts` | Admin panel *global design* fields (layout, navigation, footer) |

### Rules

*   **New CMS field** → add a `FieldMeta` entry to `FIELD_REGISTRY` in `src/cms/schemas.ts`. Never render a CMS field without an entry here.
*   **New admin section field** → add a `SectionConfigField` to the appropriate entry in `SECTION_REGISTRY`. The `SectionFieldRenderer` and `SectionPanel` consume this automatically.
*   **New global design/layout field** (e.g. a nav or footer setting) → add a `SectionConfigField` to the appropriate entry in `DESIGN_REGISTRY`. The `DesignPanel` component renders it automatically. Do **NOT** add manual Input/Slider/Switch JSX to `LayoutTab.tsx`.
*   **Hero section settings** are in `SECTION_REGISTRY` under id `'hero'` (artistName, heroImage, heroImageOpacity, minHeight, heroImageBlur, paddingTop). Do NOT add hero style controls to `LayoutTab.tsx` — use `SECTION_REGISTRY` instead.
*   **Generic CMS form rendering** → use `<SchemaFormRenderer fields={getFieldsForSchema('hero')} values={...} onChange={...} />` from `src/cms/components/SchemaFormRenderer.tsx`. This is the canonical way to render CMS fields in the sidebar.
*   **Progressive disclosure**: set `advanced: true` on `FieldMeta` (CMS) or `disclosure: 'advanced' | 'expert'` on `SectionConfigField` / `DesignRegistryEntry` configField. Never build custom show/hide logic for field visibility.

## 11. Inversion of Control (IoC)

UI components MUST receive all data and callbacks as props — they must not directly access global state, context, or external stores.

### Rules

*   **No direct context reads in leaf components**: Components that render UI (sections, cards, widgets) must receive their data via props. Context access is only permitted in top-level wiring components (e.g., `App.tsx`, `AdminPanel.tsx`, `use-app-state.ts`).
*   **Section contracts**: All page sections must extend `SectionProps` (or `EditableSectionProps<T>`) from `src/lib/component-contracts.ts`. The `editMode`, `sectionLabels`, and `onLabelChange` props are mandatory.
*   **Admin panel contracts**: All admin sub-forms must extend `AdminPanelProps<T>` from `src/lib/component-contracts.ts`. No sub-form should import or read `AdminSettings` directly from storage/context.
*   **Dialog contracts**: All modals must extend `DialogProps` (with `open` / `onClose`). No dialog should manage its own visibility state internally.

## 12. Strict Tool Calling (AdminActionRegistry)

All mutations to `AdminSettings` or `SiteData` from the admin panel MUST go through the `AdminActionRegistry`.

### How it works

*   **Registry**: `src/lib/admin-action-registry.ts` contains `ADMIN_ACTION_REGISTRY` — a map of typed, Zod-validated actions.
*   **Dispatcher**: `dispatchAdminAction(actionId, rawInput, ctx, callerDisclosure)` validates input, enforces disclosure-level access control, and calls the action handler.
*   **Actions** are `RegisteredAdminAction` objects with: `id`, `label`, `schema` (Zod), `minDisclosure`, and `execute`.

### Available actions

| Action ID | Min Disclosure | Description |
|---|---|---|
| `update_admin_value` | basic | Set any AdminSettings path by dot-notation |
| `update_label` | basic | Rename a section heading label |
| `set_section_visibility` | basic | Show/hide a section |
| `set_section_order` | advanced | Reorder page sections |
| `update_style_override` | advanced | Change a section style override |
| `reset_section_styles` | expert | Reset all style overrides for a section |
| `update_site_data_field` | basic | Update artistName, bio, heroImage, or website |

### Rules

*   **Register before using**: Every new admin mutation must be registered in `ADMIN_ACTION_REGISTRY` with a Zod schema before it can be called.
*   **No raw state mutations**: Direct calls to `setAdminSettings(...)` or `setSiteData(...)` from UI components are only permitted via `dispatchAdminAction`. Components receive `dispatchAdminAction` as an injected dependency.
*   **Disclosure enforcement**: `dispatchAdminAction` returns `{ ok: false, error }` when the caller's disclosure level is below `action.minDisclosure`. UI must surface this error to the user.
*   **Input validation**: All inputs are validated against the Zod schema before execution. Malformed inputs are rejected with a typed error — never passed to the handler.
*   **Tests required**: Every new action MUST have corresponding tests in `src/test/admin-action-registry.test.ts`.

## 13. Agent Workflow Requirements

These rules apply specifically to AI agent runs on this project:

### After Every Run

1.  **Update AGENTS.md**: If new conventions, patterns, or architectural decisions were introduced, add or update the relevant section in this file. AGENTS.md is the living specification of this project.
2.  **Update documentation**: If new public APIs, components, or utilities were added, update the relevant docs in the `docs/` directory or inline JSDoc comments.
3.  **Update `.ts-errors-remaining.txt`**: After fixing TypeScript errors, update or delete this file to reflect the current state. A clean typecheck means this file should either be empty or deleted.

### Test-Driven Development

*   Write tests **before or alongside** implementation — not after.
*   New registries (action registry, field registry, section registry) MUST have comprehensive unit tests before being merged.
*   New UI components that accept props MUST have rendering and interaction tests.

### Minimal Changes Principle

*   Make the **smallest possible change** that fully addresses the requirement.
*   Do not refactor unrelated code in the same PR.
*   Do not add new dependencies unless absolutely necessary — check `npm audit` for any new package.
