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
  type: z.enum(['album', 'single', 'ep', 'remix']),
  streamingLinks: z.array(z.object({
    platform: z.string().max(50),
    url: z.string().url().max(500),
  })).optional(),
  description: z.string().max(5000).optional(),
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

// Inferred TypeScript types
export type SiteConfig = z.infer<typeof siteConfigSchema>
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
