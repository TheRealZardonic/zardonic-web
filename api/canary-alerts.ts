import { kv } from '@vercel/kv'
import type { VercelRequest, VercelResponse } from '@vercel/node'

const ALERTS_KEY = 'nk-canary-alerts'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const rawAlerts = await kv.lrange(ALERTS_KEY, 0, -1) as string[]
    const alerts = rawAlerts.map((entry: string) => {
      try {
        return typeof entry === 'string' ? JSON.parse(entry) : entry
      } catch {
        return entry
      }
    })

    return res.json({ alerts })
  } catch (error) {
    console.error('Canary alerts error:', error)
    return res.status(500).json({ error: 'Failed to fetch canary alerts' })
  }
}
