import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { term, entity, limit } = req.query

  if (!term || typeof term !== 'string') {
    return res.status(400).json({ error: 'Missing term parameter' })
  }

  const params = new URLSearchParams({ term })
  if (entity && typeof entity === 'string') params.set('entity', entity)
  if (limit && typeof limit === 'string') params.set('limit', limit)

  try {
    const response = await fetch(
      `https://itunes.apple.com/search?${params.toString()}`,
      {
        headers: {
          'Accept': 'application/json',
        },
      }
    )

    if (!response.ok) {
      return res.status(response.status).json({ error: `iTunes API responded with ${response.status}` })
    }

    const data = await response.json()
    res.status(200).json(data)
  } catch (error) {
    console.error('iTunes proxy error:', error)
    res.status(502).json({ error: 'Failed to fetch from iTunes API' })
  }
}
