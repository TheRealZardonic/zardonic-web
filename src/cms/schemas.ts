import { z } from 'zod'

export const siteConfigSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500),
  logoUrl: z.string().url().optional().or(z.literal('')),
  faviconUrl: z.string().url().optional().or(z.literal('')),
  ogImageUrl: z.string().url().optional().or(z.literal('')),
  analyticsId: z.string().max(50).optional(),
  customMeta: z.array(z.object({
    name: z.string().max(100),
    content: z.string().max(500),
  })).max(20).optional(),
})

export type SiteConfig = z.infer<typeof siteConfigSchema>

export const heroSchema = z.object({
  backgroundImageUrl: z.string().max(2000).optional(),
  headline: z.string().max(200),
  subheadline: z.string().max(500).optional(),
  ctaText: z.string().max(50).optional(),
  ctaLink: z.string().max(500).optional(),
  overlayOpacity: z.number().min(0).max(1).optional(),
})

export const memberSlotSchema = z.object({
  id: z.string(),
  name: z.string().max(100),
  role: z.string().max(100),
  photoUrl: z.string().max(2000).optional(),
  bio: z.string().max(2000).optional(),
  socialLinks: z.array(z.object({
    platform: z.string().max(50),
    url: z.string().url().max(500),
  })).max(10).optional(),
  type: z.enum(['entity', 'engineer']),
  order: z.number().int().min(0),
})

export const releaseSchema = z.object({
  id: z.string(),
  title: z.string().min(1).max(200),
  coverUrl: z.string().max(2000).optional(),
  releaseDate: z.string(),
  type: z.enum(['album', 'single', 'ep', 'remix', 'compilation']),
  streamingLinks: z.array(z.object({
    platform: z.string().max(50),
    url: z.string().url().max(500),
  })).optional(),
  description: z.string().max(5000).optional(),
  artists: z.array(z.string().max(200)).optional(),
})

export const newsArticleSchema = z.object({
  id: z.string(),
  title: z.string().min(1).max(300),
  content: z.unknown(), // Tiptap JSON
  featuredImageUrl: z.string().max(2000).optional(),
  publishedAt: z.string().optional(),
  isDraft: z.boolean(),
})

export const socialLinkSchema = z.object({
  platform: z.enum(['spotify', 'instagram', 'youtube', 'twitter', 'facebook', 'soundcloud', 'bandcamp', 'tiktok', 'apple-music', 'other']),
  url: z.string().url().max(500),
  label: z.string().max(100).optional(),
  order: z.number().int().min(0),
})

export const navItemSchema = z.object({
  id: z.string(),
  label: z.string().min(1).max(50),
  anchor: z.string().max(200),
  order: z.number().int().min(0),
  enabled: z.boolean(),
})

export const sectionConfigSchema = z.object({
  id: z.string(),
  type: z.string().max(50),
  label: z.string().max(100),
  enabled: z.boolean(),
  order: z.number().int().min(0),
})

export const themeConfigSchema = z.object({
  primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  secondaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  accentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  fontFamily: z.string().max(100).optional(),
  overlaySettings: z.object({
    enabled: z.boolean(),
    color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
    opacity: z.number().min(0).max(1).optional(),
  }).optional(),
})

export const mediaItemSchema = z.object({
  id: z.string(),
  fileName: z.string().max(255),
  mimeType: z.string().max(100),
  size: z.number().int(),
  width: z.number().int().optional(),
  height: z.number().int().optional(),
  url: z.string().max(2000),
  thumbnailUrl: z.string().max(2000).optional(),
  uploadedAt: z.string(),
  alt: z.string().max(500).optional(),
})

export const footerConfigSchema = z.object({
  copyrightText: z.string().max(500),
  contactEmail: z.string().email().max(200).optional().or(z.literal('')),
  additionalLinks: z.array(z.object({
    label: z.string().max(100),
    url: z.string().max(500),
  })).max(10).optional(),
  legalLinks: z.array(z.object({
    label: z.string().max(100),
    url: z.string().max(500),
  })).max(5).optional(),
})

// CMS Content API schemas
export const cmsContentPostSchema = z.object({
  key: z.string().min(1).max(200).regex(/^zd-cms:/, 'Key must start with zd-cms:'),
  value: z.unknown(),
  draft: z.boolean().optional().default(true),
})

export const cmsPublishSchema = z.object({
  key: z.string().min(1).max(200).regex(/^zd-cms:/, 'Key must start with zd-cms:'),
  revert: z.boolean().optional().default(false),
})

export const cmsAutoSaveSchema = z.object({
  key: z.string().min(1).max(200).regex(/^zd-cms:/, 'Key must start with zd-cms:'),
  value: z.unknown(),
})

export const cmsSectionsPostSchema = z.object({
  sections: z.array(sectionConfigSchema).max(50),
})

// ─── UI Field Metadata ────────────────────────────────────────────────────────
//
// Describes each schema field for the schema-driven form renderer in CmsSidebar.
// Maps field paths ("schema.field") to their display label, input widget type,
// and whether they are "advanced" (hidden behind the progressive-disclosure toggle).

export type FieldWidgetType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'url'
  | 'email'
  | 'color'
  | 'checkbox'
  | 'select'
  | 'image-url'
  | 'date'
  | 'range'

export interface FieldMeta {
  /** Human-readable label shown in the form */
  label: string
  /** Input widget to use */
  widget: FieldWidgetType
  /** Shown as placeholder text in the input */
  placeholder?: string
  /** If true, hidden behind "Advanced" toggle (progressive disclosure) */
  advanced?: boolean
  /** For 'select' or 'range' widgets */
  options?: Array<{ value: string; label: string }>
  /** For 'range' widget */
  min?: number
  max?: number
  step?: number
  /** For grouping fields visually */
  group?: string
  /** Whether this field acts as a global design token (can be inherited) */
  isDesignToken?: boolean
  /** Contextual help text shown in an inline tooltip next to the label */
  tooltip?: string
}

/** Registry of all editable CMS fields, keyed by "schemaName.fieldName". */
export const FIELD_REGISTRY: Record<string, FieldMeta> = {
  // ── Site Config ──────────────────────────────────────────────────────────
  'siteConfig.name':          { label: 'Site Name', widget: 'text', placeholder: 'ZARDONIC', group: 'Identity', tooltip: 'The public name of your site, used in the browser tab title and social share previews.' },
  'siteConfig.description':   { label: 'Description', widget: 'textarea', placeholder: 'ZARDONIC – Official Website.', group: 'Identity', tooltip: 'A short description of your site used in search engine results and social previews.' },
  'siteConfig.logoUrl':       { label: 'Logo URL', widget: 'image-url', placeholder: 'https://...', group: 'Branding', tooltip: 'URL of your site logo. Displayed in the header and social previews.' },
  'siteConfig.faviconUrl':    { label: 'Favicon URL', widget: 'image-url', placeholder: 'https://...', group: 'Branding', tooltip: 'URL of your favicon (16×16 or 32×32 PNG/ICO). Shown in the browser tab.' },
  'siteConfig.ogImageUrl':    { label: 'OG Image URL', widget: 'image-url', placeholder: 'https://...', group: 'Branding', tooltip: 'Open Graph image shown when your site is shared on social media (1200×630 recommended).' },
  'siteConfig.analyticsId':   { label: 'Analytics ID', widget: 'text', placeholder: 'UA-XXXXXXX', group: 'Analytics', advanced: true, tooltip: 'Your Google Analytics or Plausible tracking ID. Leave empty to disable analytics.' },

  // ── Hero ─────────────────────────────────────────────────────────────────
  'hero.headline':            { label: 'Headline', widget: 'text', placeholder: 'ZARDONIC', group: 'Content', tooltip: 'The main title displayed in large text in the hero section at the top of your page.' },
  'hero.subheadline':         { label: 'Sub-headline', widget: 'textarea', placeholder: 'Industrial / Drum & Bass', group: 'Content', tooltip: 'A supporting line below the headline. Good for genre, tagline, or tour info.' },
  'hero.ctaText':             { label: 'CTA Button Text', widget: 'text', placeholder: 'LISTEN NOW', group: 'CTA', tooltip: 'Text on the call-to-action button in the hero section (e.g. "Listen Now", "Buy Tickets").' },
  'hero.ctaLink':             { label: 'CTA Button Link', widget: 'url', placeholder: '#music', group: 'CTA', tooltip: 'Where the CTA button links to. Can be an anchor (#music) or a full URL.' },
  'hero.backgroundImageUrl':  { label: 'Background Image', widget: 'image-url', placeholder: 'https://...', group: 'Design', tooltip: 'Full-bleed background image for the hero section. Use a high-resolution image (min. 1920×1080).' },
  'hero.overlayOpacity':      { label: 'Overlay Opacity', widget: 'range', min: 0, max: 1, step: 0.05, group: 'Design', advanced: true, tooltip: 'Controls how dark the overlay is over the hero background image. 0 = transparent, 1 = fully opaque.' },

  // ── Theme ─────────────────────────────────────────────────────────────────
  'theme.primaryColor':       { label: 'Primary Color', widget: 'color', group: 'Colors', isDesignToken: true, tooltip: 'The main brand color used for buttons, active links, and highlights throughout the site.' },
  'theme.secondaryColor':     { label: 'Secondary Color', widget: 'color', group: 'Colors', isDesignToken: true, tooltip: 'Used for card backgrounds, hover states, and secondary UI elements.' },
  'theme.accentColor':        { label: 'Accent Color', widget: 'color', group: 'Colors', isDesignToken: true, tooltip: 'Used for glowing borders, hover effects on gig cards, and interactive accent elements.' },
  'theme.fontFamily':         { label: 'Font Family', widget: 'text', placeholder: 'Orbitron, monospace', group: 'Typography', advanced: true, tooltip: 'CSS font-family stack for the entire site. Use Google Fonts names or system font stacks.' },

  // ── Footer ───────────────────────────────────────────────────────────────
  'footer.copyrightText':     { label: 'Copyright Text', widget: 'text', placeholder: '© 2025 Zardonic', group: 'Content', tooltip: 'Copyright line displayed in the page footer.' },
  'footer.contactEmail':      { label: 'Contact Email', widget: 'email', placeholder: 'info@zardonic.com', group: 'Contact', tooltip: 'Public contact email shown in the footer. Also used as the reply-to address for contact form emails.' },

  // ── Release ──────────────────────────────────────────────────────────────
  'release.title':            { label: 'Title', widget: 'text', placeholder: 'Release Name', group: 'Core', tooltip: 'Official release title as it appears in the music section and release overlays.' },
  'release.coverUrl':         { label: 'Artwork URL', widget: 'image-url', placeholder: 'https://...', group: 'Core', tooltip: 'URL of the album/EP/single artwork. Square images (1:1) work best.' },
  'release.releaseDate':      { label: 'Release Date', widget: 'date', group: 'Core', tooltip: 'The official release date. Used for sorting and display in the releases section.' },
  'release.type':             { label: 'Type', widget: 'select', options: [
    { value: 'album', label: 'Album' },
    { value: 'ep', label: 'EP' },
    { value: 'single', label: 'Single' },
    { value: 'remix', label: 'Remix' },
    { value: 'compilation', label: 'Appears On' },
  ], group: 'Core', tooltip: 'Release format. Controls the badge shown on the release card.' },
  'release.description':      { label: 'Description', widget: 'textarea', group: 'Core', advanced: true, tooltip: 'Optional notes or liner text shown in the release detail overlay.' },
  'release.artists':          { label: 'Artists (comma-separated)', widget: 'text', placeholder: 'e.g. Zardonic, Freqax', group: 'Core', advanced: true, tooltip: 'Featured artists for this release. Displayed below the title in the release overlay.' },

  // ── Member ───────────────────────────────────────────────────────────────
  'member.name':              { label: 'Name', widget: 'text', group: 'Identity', tooltip: 'Full display name of this band member or entity, shown on the member card.' },
  'member.role':              { label: 'Role', widget: 'text', group: 'Identity', tooltip: 'Their role in the project (e.g. "Producer", "Drummer", "Vocalist").' },
  'member.photoUrl':          { label: 'Photo URL', widget: 'image-url', group: 'Identity', tooltip: 'Portrait photo URL. Square images work best; used in the members section and overlays.' },
  'member.bio':               { label: 'Bio', widget: 'textarea', group: 'Identity', advanced: true, tooltip: 'Short biography displayed when clicking on the member card.' },

  // ── Navigation ───────────────────────────────────────────────────────────
  'navItem.label':            { label: 'Label', widget: 'text', group: 'Nav', tooltip: 'Text shown in the navigation bar for this item.' },
  'navItem.anchor':           { label: 'Anchor Target', widget: 'text', placeholder: '#section-id', group: 'Nav', tooltip: 'The anchor or URL this nav item scrolls to or links to (e.g. "#releases").' },
  'navItem.enabled':          { label: 'Visible', widget: 'checkbox', group: 'Nav', tooltip: 'Toggle whether this nav item is visible in the navigation bar.' },
}

/** Return all field metadata for a given schema prefix (e.g. "hero"). */
export function getFieldsForSchema(schemaName: string): Array<{ path: string; meta: FieldMeta }> {
  const prefix = `${schemaName}.`
  return Object.entries(FIELD_REGISTRY)
    .filter(([path]) => path.startsWith(prefix))
    .map(([path, meta]) => ({ path, meta }))
}

/** Return the field meta for an exact path. */
export function getFieldMeta(path: string): FieldMeta | undefined {
  return FIELD_REGISTRY[path]
}

// ─── Schema → Route mapping ───────────────────────────────────────────────────
/** Maps a schema name to the CMS route where it is edited. */
export const SCHEMA_ROUTE_MAP: Record<string, string> = {
  siteConfig: 'cms/site-config',
  hero:       'cms/content/hero',
  member:     'cms/content/members',
  release:    'cms/content/releases',
  newsArticle:'cms/content/news',
  footer:     'cms/content/footer',
  navItem:    'cms/navigation',
  theme:      'cms/theme',
}

export type HeroConfig = z.infer<typeof heroSchema>
export type MemberSlot = z.infer<typeof memberSlotSchema>
export type Release = z.infer<typeof releaseSchema>
export type NewsArticle = z.infer<typeof newsArticleSchema>
export type SocialLink = z.infer<typeof socialLinkSchema>
export type NavItem = z.infer<typeof navItemSchema>
export type SectionConfig = z.infer<typeof sectionConfigSchema>
export type ThemeConfig = z.infer<typeof themeConfigSchema>
export type MediaItem = z.infer<typeof mediaItemSchema>
export type FooterConfig = z.infer<typeof footerConfigSchema>
