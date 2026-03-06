/**
 * Honeypot sitemap — api/sitemap-trap.js
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

const TRAP_URLS = [
  'https://neuroklast.com/admin/backup',
  'https://neuroklast.com/admin/export',
  'https://neuroklast.com/data/export',
  'https://neuroklast.com/config/env',
  'https://neuroklast.com/config/database',
  'https://neuroklast.com/backup/latest',
  'https://neuroklast.com/debug/logs',
  'https://neuroklast.com/internal/api',
  'https://neuroklast.com/private/keys',
  'https://neuroklast.com/logs/access',
]

// Generated once at module initialisation so the XML stays consistent
// for the lifetime of the serverless function instance
const LASTMOD = new Date().toISOString().slice(0, 10)

export default async function handler(req, res) {
  const urlEntries = TRAP_URLS.map(loc => `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${LASTMOD}</lastmod>\n  </url>`).join('\n')

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlEntries}
</urlset>`

  res.setHeader('Content-Type', 'application/xml; charset=utf-8')
  res.setHeader('Cache-Control', 'public, max-age=3600')
  return res.status(200).send(xml)
}
