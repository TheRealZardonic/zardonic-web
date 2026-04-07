/**
 * Honeypot sitemap — api/sitemap-trap.ts
 *
 * Serves a syntactically valid XML sitemap that references known honeypot
 * paths. Legitimate site visitors never request this file; its URL is listed
 * only in robots.txt so that crawlers that ignore Disallow rules and follow
 * Sitemap declarations will discover and visit these links.
 *
 * Each linked path is already configured in vercel.json to rewrite to
 * /api/denied, where the visitor is logged and flagged as an attacker.
 *
 * GET /sitemap-extended.xml  (rewritten by vercel.json)
 */

interface VercelRequest {
  method?: string
  body?: Record<string, unknown>
  query?: Record<string, string | string[]>
  headers: Record<string, string | string[] | undefined>
}

interface VercelResponse {
  setHeader(key: string, value: string): VercelResponse
  status(code: number): VercelResponse
  send(data: unknown): VercelResponse
}

const BASE_URL = process.env.SITE_URL || ''

const TRAP_PATHS = [
  '/admin/backup',
  '/admin/export',
  '/data/export',
  '/config/env',
  '/config/database',
  '/backup/latest',
  '/debug/logs',
  '/internal/api',
  '/private/keys',
  '/logs/access',
]

// Generated once at module initialisation so the XML stays consistent
// for the lifetime of the serverless function instance
const LASTMOD = new Date().toISOString().slice(0, 10)

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  const urlEntries = TRAP_PATHS.map(path => `  <url>\n    <loc>${BASE_URL}${path}</loc>\n    <lastmod>${LASTMOD}</lastmod>\n  </url>`).join('\n')

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlEntries}
</urlset>`

  res.setHeader('Content-Type', 'application/xml; charset=utf-8')
  res.setHeader('Cache-Control', 'public, max-age=3600')
  res.status(200).send(xml)
}
