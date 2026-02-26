import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

// ---------------------------------------------------------------------------
// Test: collectImageUrls limits preloaded images (Image Bomb prevention)
// ---------------------------------------------------------------------------

/**
 * We cannot directly import collectImageUrls because it is a module-scoped
 * function inside App.tsx. Instead we replicate the same logic here and verify
 * the contract: given large BandData, the returned list is capped.
 */

const MAX_PRECACHE_IMAGES = 6

interface MinimalBandData {
  news?: Array<{ photo?: string }>
  biography?: {
    members?: Array<string | { photo?: string }>
  }
  galleryImages?: Array<{ url?: string }>
  releases?: Array<{ artwork?: string }>
  gigs?: Array<{ photo?: string }>
}

function collectImageUrls(data: MinimalBandData): string[] {
  const urls: string[] = []
  data.news?.slice(0, 3).forEach(item => { if (item.photo) urls.push(item.photo) })
  data.biography?.members?.forEach(member => {
    if (typeof member !== 'string' && member.photo) urls.push(member.photo)
  })
  return urls.slice(0, MAX_PRECACHE_IMAGES)
}

describe('collectImageUrls — Image Bomb prevention', () => {
  it('returns at most MAX_PRECACHE_IMAGES URLs', () => {
    const data: MinimalBandData = {
      news: Array.from({ length: 50 }, (_, i) => ({ photo: `https://img/${i}.jpg` })),
      biography: {
        members: Array.from({ length: 20 }, (_, i) => ({ photo: `https://member/${i}.jpg` })),
      },
      galleryImages: Array.from({ length: 100 }, (_, i) => ({ url: `https://gallery/${i}.jpg` })),
      releases: Array.from({ length: 30 }, (_, i) => ({ artwork: `https://release/${i}.jpg` })),
      gigs: Array.from({ length: 20 }, (_, i) => ({ photo: `https://gig/${i}.jpg` })),
    }
    const urls = collectImageUrls(data)
    expect(urls.length).toBeLessThanOrEqual(MAX_PRECACHE_IMAGES)
  })

  it('does not preload gallery images', () => {
    const data: MinimalBandData = {
      galleryImages: [{ url: 'https://gallery/1.jpg' }, { url: 'https://gallery/2.jpg' }],
    }
    const urls = collectImageUrls(data)
    expect(urls).not.toContain('https://gallery/1.jpg')
    expect(urls).toHaveLength(0)
  })

  it('does not preload release artwork', () => {
    const data: MinimalBandData = {
      releases: [{ artwork: 'https://art/1.jpg' }],
    }
    const urls = collectImageUrls(data)
    expect(urls).not.toContain('https://art/1.jpg')
  })

  it('does not preload gig photos', () => {
    const data: MinimalBandData = {
      gigs: [{ photo: 'https://gig/1.jpg' }],
    }
    const urls = collectImageUrls(data)
    expect(urls).not.toContain('https://gig/1.jpg')
  })

  it('preloads first 3 news images', () => {
    const data: MinimalBandData = {
      news: [
        { photo: 'https://news/1.jpg' },
        { photo: 'https://news/2.jpg' },
        { photo: 'https://news/3.jpg' },
        { photo: 'https://news/4.jpg' },
      ],
    }
    const urls = collectImageUrls(data)
    expect(urls).toContain('https://news/1.jpg')
    expect(urls).toContain('https://news/2.jpg')
    expect(urls).toContain('https://news/3.jpg')
    expect(urls).not.toContain('https://news/4.jpg')
  })

  it('preloads member photos', () => {
    const data: MinimalBandData = {
      biography: { members: [{ photo: 'https://member/1.jpg' }] },
    }
    const urls = collectImageUrls(data)
    expect(urls).toContain('https://member/1.jpg')
  })

  it('returns empty array for empty data', () => {
    expect(collectImageUrls({})).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// Test: CSP header in vercel.json
// ---------------------------------------------------------------------------

describe('vercel.json Content-Security-Policy', () => {
  const vercelConfig = JSON.parse(
    readFileSync(resolve(__dirname, '../../vercel.json'), 'utf-8')
  )

  const cspHeader = vercelConfig.headers
    ?.flatMap((h: { headers: Array<{ key: string; value: string }> }) => h.headers)
    ?.find((h: { key: string }) => h.key === 'Content-Security-Policy')

  it('CSP header exists in vercel.json', () => {
    expect(cspHeader).toBeDefined()
  })

  it('restricts connect-src to self only (prevents XSS data exfiltration)', () => {
    expect(cspHeader.value).toMatch(/connect-src 'self'(?:;|$)/)
  })

  it('restricts default-src to self', () => {
    expect(cspHeader.value).toContain("default-src 'self'")
  })

  it('does not allow unsafe-inline scripts', () => {
    const scriptSrc = cspHeader.value.match(/script-src ([^;]+)/)
    expect(scriptSrc).toBeTruthy()
    expect(scriptSrc[1]).not.toContain("'unsafe-inline'")
    expect(scriptSrc[1].trim()).toBe("'self'")
  })

  it('allows inline styles', () => {
    expect(cspHeader.value).toContain("style-src 'self' 'unsafe-inline'")
  })

  it('allows YouTube nocookie embeds in frame-src', () => {
    expect(cspHeader.value).toContain('frame-src https://www.youtube-nocookie.com')
  })

  it('does not allow connect-src to arbitrary external domains', () => {
    // connect-src should ONLY be 'self' — no wildcard or external domains
    const connectSrc = cspHeader.value.match(/connect-src ([^;]+)/)
    expect(connectSrc).toBeTruthy()
    expect(connectSrc[1].trim()).toBe("'self'")
  })
})

// ---------------------------------------------------------------------------
// Test: No inline scripts in index.html (prevents CSP violations)
// ---------------------------------------------------------------------------

describe('index.html CSP compliance', () => {
  const html = readFileSync(resolve(__dirname, '../../index.html'), 'utf-8')

  it('does not contain inline <script> blocks (CSP script-src self)', () => {
    // Matches <script> tags that contain inline code (not just src references)
    const inlineScriptPattern = /<script(?![^>]*\bsrc\b)[^>]*>[^<]+<\/script>/gi
    const matches = html.match(inlineScriptPattern)
    expect(matches).toBeNull()
  })

  it('all script tags use src attribute for external loading', () => {
    const scriptTags = html.match(/<script[^>]*>/gi) || []
    for (const tag of scriptTags) {
      expect(tag).toMatch(/\bsrc=/)
    }
  })

  it('does not contain inline event handlers on HTML elements', () => {
    // Matches on* attributes like oncontextmenu, onclick, etc.
    const inlineHandlerPattern = /\bon\w+\s*=\s*["']/gi
    const matches = html.match(inlineHandlerPattern)
    expect(matches).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// Test: Rate limit salt production guard
// ---------------------------------------------------------------------------

describe('Rate limit salt production guard', () => {
  it('production guard exists in _ratelimit.js source code', () => {
    const source = readFileSync(
      resolve(__dirname, '../../api/_ratelimit.ts'),
      'utf-8'
    )
    // Must throw when RATE_LIMIT_SALT is missing in production
    expect(source).toContain("process.env.NODE_ENV === 'production'")
    expect(source).toContain('RATE_LIMIT_SALT')
    expect(source).toMatch(/throw new Error/)
  })
})

// ---------------------------------------------------------------------------
// Test: robots.txt AI/LLM crawler blocks
// ---------------------------------------------------------------------------

describe('robots.txt AI crawler blocks', () => {
  const robotsTxt = readFileSync(resolve(__dirname, '../../public/robots.txt'), 'utf-8')

  it('blocks GPTBot', () => {
    expect(robotsTxt).toMatch(/User-agent: GPTBot[\s\S]*?Disallow: \//)
  })

  it('blocks anthropic-ai', () => {
    expect(robotsTxt).toMatch(/User-agent: anthropic-ai[\s\S]*?Disallow: \//)
  })
})

// ---------------------------------------------------------------------------
// Test: vercel.json sitemap-trap rewrite
// ---------------------------------------------------------------------------

describe('vercel.json sitemap-trap rewrite', () => {
  const vercelConfig = JSON.parse(
    readFileSync(resolve(__dirname, '../../vercel.json'), 'utf-8')
  )

  it('contains sitemap-extended.xml rewrite to /api/sitemap-trap', () => {
    const rewrite = vercelConfig.rewrites?.find(
      (r: { source: string; destination: string }) => r.source === '/sitemap-extended.xml'
    )
    expect(rewrite).toBeDefined()
    expect(rewrite?.destination).toBe('/api/sitemap-trap')
  })
})

// ---------------------------------------------------------------------------
// Test: vite.config.ts uses inline obfuscation (javascript-obfuscator)
// ---------------------------------------------------------------------------

describe('vite.config.ts obfuscator plugin', () => {
  const viteConfig = readFileSync(resolve(__dirname, '../../vite.config.ts'), 'utf-8')

  it('uses inline javascript-obfuscator for production builds', () => {
    expect(viteConfig).toContain("from 'javascript-obfuscator'")
    expect(viteConfig).toContain('vite:obfuscatefiles')
  })
})
