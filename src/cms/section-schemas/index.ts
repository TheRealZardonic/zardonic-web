/**
 * Section Schemas — Barrel Export
 *
 * Importing this module registers all section schemas with the `AdminSchemaRegistry`
 * as a side-effect. Import it once at the admin panel entry point to ensure the
 * registry is fully populated before calling `getSections()` or `getSection()`.
 *
 * Usage:
 * ```typescript
 * import '@/cms/section-schemas' // triggers all registerAdminSection() calls
 * import { getSections } from '@/lib/admin-schema-registry'
 * const allSections = getSections()
 * ```
 */

// ─── Section schema registrations (side-effects) ─────────────────────────────
import './hero-schema'
import './bio-schema'
import './music-schema'
import './releases-schema'
import './gigs-schema'
import './media-schema'
import './social-schema'
import './contact-schema'
import './newsletter-schema'
import './gallery-schema'
import './partners-schema'
import './sponsoring-schema'
import './credit-highlights-schema'
import './shell-schema'
import './footer-schema'
import './impressum-schema'

// ─── Named re-exports for direct import ──────────────────────────────────────
export { heroSectionSchema } from './hero-schema'
export { bioSectionSchema } from './bio-schema'
export { musicSectionSchema } from './music-schema'
export { releasesSectionSchema } from './releases-schema'
export { gigsSectionSchema } from './gigs-schema'
export { mediaSectionSchema } from './media-schema'
export { socialSectionSchema } from './social-schema'
export { contactSectionSchema } from './contact-schema'
export { newsletterSectionSchema } from './newsletter-schema'
export { gallerySectionSchema } from './gallery-schema'
export { partnersSectionSchema } from './partners-schema'
export { sponsoringSectionSchema } from './sponsoring-schema'
export { creditHighlightsSectionSchema } from './credit-highlights-schema'
export { shellSectionSchema } from './shell-schema'
export { footerSectionSchema } from './footer-schema'
export { impressumSectionSchema } from './impressum-schema'
