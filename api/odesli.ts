import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { url, userCountry } = req.query

  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'Missing url parameter' })
  }

  const params = new URLSearchParams({ url })
  if (userCountry && typeof userCountry === 'string') {
    params.set('userCountry', userCountry)
  }

  try {
    const response = await fetch(
      `https://api.song.link/v1-alpha.1/links?${params.toString()}`,
      {
        headers: {
          'Accept': 'application/json',
        },
      }
    )

    if (!response.ok) {
      return res.status(response.status).json({ error: `Odesli API responded with ${response.status}` })
    }

    const data = await response.json()
    res.status(200).json(data)
  } catch (error) {
    console.error('Odesli proxy error:', error)
    res.status(502).json({ error: 'Failed to fetch from Odesli API' })
  }
}
