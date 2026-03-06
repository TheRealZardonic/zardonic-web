import { Redis } from '@upstash/redis'
import { applyRateLimit } from './_ratelimit.js'
import type { VercelRequest, VercelResponse } from '@vercel/node'

/**
 * Open Graph meta-tag endpoint for social-media link previews.
 *
 * When a user shares a link like /share/news/{id}, /share/gig/{id} or
 * /share/release/{id}, Vercel rewrites the request to this handler.
 * It reads the band-data from Redis, extracts the relevant content item,
 * and returns a small HTML page with the correct og:title, og:description,
 * og:image (and Twitter card) meta tags.  A client-side redirect sends
 * real browsers to the SPA with the matching hash fragment.
 */

const FALLBACK_TITLE = 'ZARDONIC'
const FALLBACK_DESCRIPTION = 'ZARDONIC – Industrial Metal, Hard Techno & Dark Electro.'
const FALLBACK_IMAGE = '/og-image.png'

function getRedis(): Redis | null {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) return null
  return new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  })
}

/** Derive the site origin from a trusted source, not raw Host header. */
function getOrigin(): string {
  return process.env.SITE_URL || 'https://zardonic.com'
}

/** Simple HTML entity escaping to prevent XSS in injected strings. */
function esc(str: string | undefined | null): string {
  if (!str) return ''
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/** Strip markdown/HTML so we get a plain-text description. */
function plainText(str: string | undefined | null, maxLen = 200): string {
  if (!str) return ''
  const plain = String(str)
    .replace(/[<>]/g, '')
    .replace(/[#*_~`\-[\]()!]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  return plain.length > maxLen ? plain.slice(0, maxLen) + '…' : plain
}

/** Format an ISO date string for display. */
function fmtDate(iso: string | undefined | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

interface ContentMeta {
  title: string
  description: string
  image: string
  hash: string
}

/**
 * Look up the content item and return { title, description, image, hash }.
 * `hash` is the SPA fragment the browser should navigate to.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function resolveContent(data: any, type: string, id: string): ContentMeta | null {
  if (!data || !type || !id) return null

  if (type === 'news') {
    const items: any[] = data.news || []
    const item = items.find((n: any) => n.id === id)
    if (!item) return null
    return {
      title: plainText(item.text, 70) || FALLBACK_TITLE,
      description: plainText(item.details || item.text),
      image: item.photo || data.logoUrl || FALLBACK_IMAGE,
      hash: `#news/${id}`,
    }
  }

  if (type === 'gig') {
    const items: any[] = data.gigs || []
    const item = items.find((g: any) => g.id === id)
    if (!item) return null
    const dateStr = fmtDate(item.date)
    return {
      title: `${data.name || FALLBACK_TITLE} @ ${item.venue}`,
      description: `${dateStr} – ${item.venue}, ${item.location}`,
      image: item.photo || data.logoUrl || FALLBACK_IMAGE,
      hash: `#gigs/${id}`,
    }
  }

  if (type === 'release') {
    const items: any[] = data.releases || []
    const item = items.find((r: any) => r.id === id)
    if (!item) return null
    const typeLabel = item.type ? ` (${esc(item.type).toUpperCase()})` : ''
    return {
      title: `${item.title}${typeLabel} – ${data.name || FALLBACK_TITLE}`,
      description: plainText(item.description) || `${item.title} by ${data.name || FALLBACK_TITLE}`,
      image: item.artwork || data.logoUrl || FALLBACK_IMAGE,
      hash: `#releases/${id}`,
    }
  }

  return null
}

/** Build a minimal HTML page with OG tags and a meta-refresh redirect. */
function buildHTML(origin: string, meta: ContentMeta): string {
  const title = esc(meta.title)
  const description = esc(meta.description)
  // Resolve image to absolute URL if it starts with /
  const image = meta.image.startsWith('/') ? `${origin}${meta.image}` : meta.image
  const canonical = `${origin}/${esc(meta.hash)}`
  const redirect = `${origin}/${meta.hash}`

  return `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8"/>
<title>${title}</title>
<meta name="description" content="${description}"/>
<meta property="og:title" content="${title}"/>
<meta property="og:description" content="${description}"/>
<meta property="og:image" content="${esc(image)}"/>
<meta property="og:url" content="${canonical}"/>
<meta property="og:type" content="website"/>
<meta property="og:site_name" content="ZARDONIC"/>
<meta name="twitter:card" content="summary_large_image"/>
<meta name="twitter:title" content="${title}"/>
<meta name="twitter:description" content="${description}"/>
<meta name="twitter:image" content="${esc(image)}"/>
<meta http-equiv="refresh" content="0;url=${esc(redirect)}"/>
</head>
<body></body>
</html>`
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).end()
  }

  // Rate limiting — generous limit since crawlers must not be blocked
  const allowed = await applyRateLimit(req, res)
  if (!allowed) return

  const { type, id } = req.query as Record<string, string>
  const origin = getOrigin()

  if (!type || !id) {
    res.setHeader('Location', origin)
    return res.status(302).end()
  }

  // Validate type parameter against a whitelist
  const ALLOWED_TYPES = ['news', 'gig', 'release']
  if (!ALLOWED_TYPES.includes(type)) {
    res.setHeader('Location', origin)
    return res.status(302).end()
  }

  // Validate id: only allow safe characters (alphanumeric, dash, underscore)
  if (!/^[\w-]+$/.test(id)) {
    res.setHeader('Location', origin)
    return res.status(302).end()
  }

  let data: unknown = null
  try {
    const redis = getRedis()
    if (redis) {
      data = await redis.get('zardonic-band-data')
    }
  } catch {
    // Redis unavailable — fall through to fallback
  }

  const meta = resolveContent(data, type, id)

  if (!meta) {
    const fallback: ContentMeta = {
      title: FALLBACK_TITLE,
      description: FALLBACK_DESCRIPTION,
      image: FALLBACK_IMAGE,
      hash: type === 'news' ? '#news' : type === 'gig' ? '#gigs' : '#releases',
    }
    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300')
    return res.status(200).send(buildHTML(origin, fallback))
  }

  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600')
  return res.status(200).send(buildHTML(origin, meta))
}
