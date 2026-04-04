import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Extract URL from query string
  const targetUrl = req.query.url

  if (!targetUrl || typeof targetUrl !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid url parameter' })
  }

  // Ensure it's a valid Sanity URL for security
  try {
    const parsedUrl = new URL(targetUrl)
    if (!parsedUrl.hostname.endsWith('.sanity.io')) {
      return res.status(403).json({ error: 'Invalid proxy target hostname' })
    }
  } catch (err) {
    return res.status(400).json({ error: 'Invalid proxy target URL' })
  }

  try {
    // Clone headers but exclude host, origin, referer
    const reqHeaders: Record<string, string> = {}
    for (const [key, value] of Object.entries(req.headers)) {
      const lowerKey = key.toLowerCase()
      if (
        value &&
        typeof value === 'string' &&
        !['host', 'origin', 'referer', 'sec-ch-ua', 'sec-fetch-mode', 'sec-fetch-site', 'sec-fetch-dest'].includes(lowerKey)
      ) {
        reqHeaders[lowerKey] = value
      }
    }

    // Explicitly add an Accept header
    reqHeaders['accept'] = 'application/json'

    const response = await fetch(targetUrl, {
      method: req.method || 'GET',
      headers: reqHeaders,
      // If it's a POST/PUT, forward the body
      body: ['POST', 'PUT', 'PATCH'].includes(req.method || '') && req.body
        ? JSON.stringify(req.body)
        : undefined,
    })

    const contentType = response.headers.get('content-type') || 'application/json'
    res.setHeader('Content-Type', contentType)

    // Forward the status code
    res.status(response.status)

    if (contentType.includes('application/json')) {
      const data = await response.json()
      res.json(data)
    } else {
      const text = await response.text()
      res.send(text)
    }
  } catch (error) {
    console.error('Sanity proxy error:', error)
    res.status(500).json({ error: 'Failed to proxy request to Sanity' })
  }
}
