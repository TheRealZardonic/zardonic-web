import { kv } from '@vercel/kv'
import { applyRateLimit } from './_ratelimit.js'
import { terminalCommandSchema, validate } from './_schemas.js'

/**
 * Terminal command API — returns command output only when
 * the correct command name is provided.
 *
 * POST /api/terminal  { command: "status" }
 *
 * This keeps terminal secrets server-side instead of
 * shipping them in the band-data JSON payload to the browser.
 */

// Check if KV is properly configured
const isKVConfigured = () => {
  return !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN)
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Rate limiting
  const allowed = await applyRateLimit(req, res)
  if (!allowed) return

  if (!req.body || typeof req.body !== 'object') {
    return res.status(400).json({ error: 'Request body is required' })
  }

  // Validate input
  const parsed = validate(terminalCommandSchema, req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error })
  }
  const { command } = parsed.data

  if (!isKVConfigured()) {
    return res.status(503).json({ error: 'Service unavailable' })
  }

  try {
    const bandData = await kv.get<{ terminalCommands?: { name?: string; description?: string; output?: unknown[]; fileUrl?: string; fileName?: string }[] }>('band-data')
    const commands = (bandData && typeof bandData === 'object' && Array.isArray(bandData.terminalCommands))
      ? bandData.terminalCommands
      : []

    // "help" returns only command names and descriptions — no outputs or file URLs
    if (command === 'help') {
      const listing = commands.map(c => ({
        name: c.name || '',
        description: c.description || '',
      }))
      return res.json({ found: true, listing })
    }

    const match = commands.find(c => (c.name || '').toLowerCase() === command.toLowerCase())
    if (!match) {
      return res.json({ found: false })
    }

    return res.json({
      found: true,
      output: Array.isArray(match.output) ? match.output : [],
      fileUrl: match.fileUrl || null,
      fileName: match.fileName || null,
    })
  } catch (error) {
    console.error('Terminal API error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
