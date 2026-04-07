import { Redis } from '@upstash/redis'
const kv = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || '',
  token: process.env.UPSTASH_REDIS_REST_TOKEN || ''
})
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

interface VercelRequest {
  method?: string
  body?: Record<string, unknown>
  query?: Record<string, string | string[]>
  headers: Record<string, string | string[] | undefined>
}

interface VercelResponse {
  setHeader(key: string, value: string): VercelResponse
  status(code: number): VercelResponse
  json(data: unknown): VercelResponse
  end(): VercelResponse
}

interface TerminalCommand {
  name?: string
  description?: string
  output?: string[]
  fileUrl?: string
  fileName?: string
}

interface BandData {
  terminalCommands?: TerminalCommand[]
}

// Check if KV is properly configured
const isKVConfigured = (): boolean => {
  return !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN)
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  // Rate limiting
  const allowed = await applyRateLimit(req, res)
  if (!allowed) return

  if (!req.body || typeof req.body !== 'object') {
    res.status(400).json({ error: 'Request body is required' })
    return
  }

  // Validate input
  const parsed = validate(terminalCommandSchema, req.body)
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error })
    return
  }
  const { command } = parsed.data

  if (!isKVConfigured()) {
    res.status(503).json({ error: 'Service unavailable' })
    return
  }

  try {
    const bandData = await kv.get<BandData>('band-data')
    const commands: TerminalCommand[] = (bandData && typeof bandData === 'object' && Array.isArray(bandData.terminalCommands))
      ? bandData.terminalCommands
      : []

    // "help" returns only command names and descriptions — no outputs or file URLs
    if (command === 'help') {
      const listing = commands.map(c => ({
        name: c.name || '',
        description: c.description || '',
      }))
      res.json({ found: true, listing })
      return
    }

    const match = commands.find(c => (c.name || '').toLowerCase() === command.toLowerCase())
    if (!match) {
      res.json({ found: false })
      return
    }

    res.json({
      found: true,
      output: Array.isArray(match.output) ? match.output : [],
      fileUrl: match.fileUrl || null,
      fileName: match.fileName || null,
    })
  } catch (error) {
    console.error('Terminal API error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}
