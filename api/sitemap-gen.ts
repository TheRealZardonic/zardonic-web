/**
 * /api/sitemap-gen.ts – Generates a real XML sitemap for search engines.
 *
 * Serves the sitemap at /sitemap.xml (routed via vercel.json rewrite).
 * The legacy /sitemap-extended.xml continues to point at /api/sitemap-trap
 * which acts as a honeypot for bot detection.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'

const BASE_URL = 'https://zardonic.com'

const STATIC_URLS: Array<{ loc: string; changefreq: string; priority: string }> = [
  { loc: `${BASE_URL}/`, changefreq: 'weekly', priority: '1.0' },
]

function buildSitemap(urls: typeof STATIC_URLS): string {
  const urlEntries = urls
    .map(
      ({ loc, changefreq, priority }) =>
        `  <url>\n    <loc>${loc}</loc>\n    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n  </url>`,
    )
    .join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlEntries}
</urlset>`
}

export default function handler(_req: VercelRequest, res: VercelResponse): void {
  const xml = buildSitemap(STATIC_URLS)
  res.setHeader('Content-Type', 'application/xml; charset=utf-8')
  res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400')
  res.status(200).send(xml)
}
