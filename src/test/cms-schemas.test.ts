import { describe, it, expect } from 'vitest'
import {
  siteConfigSchema,
  heroSchema,
  memberSlotSchema,
  releaseSchema,
  socialLinkSchema,
  navItemSchema,
  sectionConfigSchema,
  themeConfigSchema,
  mediaItemSchema,
  footerConfigSchema,
  cmsContentPostSchema,
  cmsPublishSchema,
} from '../../src/cms/schemas.ts'

describe('siteConfigSchema', () => {
  it('accepts valid config', () => {
    const result = siteConfigSchema.safeParse({ name: 'Zardonic', description: 'Metal artist' })
    expect(result.success).toBe(true)
  })
  it('rejects empty name', () => {
    const result = siteConfigSchema.safeParse({ name: '', description: 'x' })
    expect(result.success).toBe(false)
  })
  it('rejects name over 100 chars', () => {
    const result = siteConfigSchema.safeParse({ name: 'a'.repeat(101), description: '' })
    expect(result.success).toBe(false)
  })
})

describe('heroSchema', () => {
  it('accepts valid hero', () => {
    const result = heroSchema.safeParse({ headline: 'ZARDONIC', overlayOpacity: 0.5 })
    expect(result.success).toBe(true)
  })
  it('rejects overlayOpacity > 1', () => {
    const result = heroSchema.safeParse({ headline: 'x', overlayOpacity: 1.5 })
    expect(result.success).toBe(false)
  })
  it('rejects overlayOpacity < 0', () => {
    const result = heroSchema.safeParse({ headline: 'x', overlayOpacity: -0.1 })
    expect(result.success).toBe(false)
  })
})

describe('memberSlotSchema', () => {
  it('accepts valid entity member', () => {
    const result = memberSlotSchema.safeParse({ id: '1', name: 'Entity 1', role: 'Vocals', type: 'entity', order: 0 })
    expect(result.success).toBe(true)
  })
  it('rejects invalid type', () => {
    const result = memberSlotSchema.safeParse({ id: '1', name: 'x', role: 'y', type: 'admin', order: 0 })
    expect(result.success).toBe(false)
  })
})

describe('releaseSchema', () => {
  it('accepts valid release', () => {
    const result = releaseSchema.safeParse({ id: '1', title: 'Album', releaseDate: '2024-01-01', type: 'album' })
    expect(result.success).toBe(true)
  })
  it('rejects invalid type', () => {
    const result = releaseSchema.safeParse({ id: '1', title: 'x', releaseDate: '2024-01-01', type: 'mixtape' })
    expect(result.success).toBe(false)
  })
  it('rejects empty title', () => {
    const result = releaseSchema.safeParse({ id: '1', title: '', releaseDate: '2024-01-01', type: 'single' })
    expect(result.success).toBe(false)
  })
})

describe('socialLinkSchema', () => {
  it('accepts valid social link', () => {
    const result = socialLinkSchema.safeParse({ platform: 'spotify', url: 'https://spotify.com/artist/x', order: 0 })
    expect(result.success).toBe(true)
  })
  it('rejects invalid platform', () => {
    const result = socialLinkSchema.safeParse({ platform: 'myspace', url: 'https://myspace.com', order: 0 })
    expect(result.success).toBe(false)
  })
  it('rejects non-URL', () => {
    const result = socialLinkSchema.safeParse({ platform: 'instagram', url: 'not-a-url', order: 0 })
    expect(result.success).toBe(false)
  })
})

describe('navItemSchema', () => {
  it('accepts valid nav item', () => {
    const result = navItemSchema.safeParse({ id: '1', label: 'Home', anchor: '#home', order: 0, enabled: true })
    expect(result.success).toBe(true)
  })
  it('rejects empty label', () => {
    const result = navItemSchema.safeParse({ id: '1', label: '', anchor: '#home', order: 0, enabled: true })
    expect(result.success).toBe(false)
  })
})

describe('sectionConfigSchema', () => {
  it('accepts valid section', () => {
    const result = sectionConfigSchema.safeParse({ id: 'hero', type: 'hero', label: 'Hero', enabled: true, order: 0 })
    expect(result.success).toBe(true)
  })
})

describe('themeConfigSchema', () => {
  it('accepts valid theme', () => {
    const result = themeConfigSchema.safeParse({ primaryColor: '#ff0000', secondaryColor: '#00ff00', accentColor: '#0000ff' })
    expect(result.success).toBe(true)
  })
  it('rejects invalid hex color', () => {
    const result = themeConfigSchema.safeParse({ primaryColor: 'red', secondaryColor: '#00ff00', accentColor: '#0000ff' })
    expect(result.success).toBe(false)
  })
  it('rejects 3-char hex', () => {
    const result = themeConfigSchema.safeParse({ primaryColor: '#fff', secondaryColor: '#00ff00', accentColor: '#0000ff' })
    expect(result.success).toBe(false)
  })
})

describe('mediaItemSchema', () => {
  it('accepts valid media item', () => {
    const result = mediaItemSchema.safeParse({
      id: 'abc', fileName: 'photo.jpg', mimeType: 'image/jpeg', size: 12345,
      url: 'https://example.com/photo.jpg', uploadedAt: '2024-01-01T00:00:00Z',
    })
    expect(result.success).toBe(true)
  })
})

describe('footerConfigSchema', () => {
  it('accepts valid footer', () => {
    const result = footerConfigSchema.safeParse({ copyrightText: '© 2024 Zardonic', contactEmail: 'info@zardonic.com' })
    expect(result.success).toBe(true)
  })
  it('rejects invalid email', () => {
    const result = footerConfigSchema.safeParse({ copyrightText: '© 2024', contactEmail: 'not-an-email' })
    expect(result.success).toBe(false)
  })
  it('accepts empty contactEmail', () => {
    const result = footerConfigSchema.safeParse({ copyrightText: '© 2024' })
    expect(result.success).toBe(true)
  })
})

describe('cmsContentPostSchema', () => {
  it('accepts valid key with zd-cms: prefix', () => {
    const result = cmsContentPostSchema.safeParse({ key: 'zd-cms:hero', value: { headline: 'x' } })
    expect(result.success).toBe(true)
  })
  it('rejects key without zd-cms: prefix', () => {
    const result = cmsContentPostSchema.safeParse({ key: 'hero', value: {} })
    expect(result.success).toBe(false)
  })
  it('defaults draft to true', () => {
    const result = cmsContentPostSchema.safeParse({ key: 'zd-cms:hero', value: {} })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.draft).toBe(true)
  })
})

describe('cmsPublishSchema', () => {
  it('accepts valid publish request', () => {
    const result = cmsPublishSchema.safeParse({ key: 'zd-cms:hero' })
    expect(result.success).toBe(true)
  })
  it('rejects invalid key', () => {
    const result = cmsPublishSchema.safeParse({ key: 'hero' })
    expect(result.success).toBe(false)
  })
  it('accepts revert flag', () => {
    const result = cmsPublishSchema.safeParse({ key: 'zd-cms:hero', revert: true })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.revert).toBe(true)
  })
})
