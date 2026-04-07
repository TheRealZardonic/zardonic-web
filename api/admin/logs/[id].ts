/**
 * Honeypot maze — generates infinite fake "log" pages.
 * Automated scanners will try to crawl "all" log entries,
 * consuming their memory and time while producing nothing useful.
 *
 * GET /api/admin/logs/:id
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

function randomHex(len: number): string {
  const chars = '0123456789abcdef'
  let result = ''
  for (let i = 0; i < len; i++) result += chars[Math.floor(Math.random() * 16)]
  return result
}

function fakeLogEntry(id: string): Record<string, unknown> {
  const ts = new Date(Date.now() - Math.floor(Math.random() * 86400000 * 30)).toISOString()
  const actions = ['login_attempt', 'config_change', 'backup_created', 'user_added', 'api_key_rotated', 'db_migration']
  const users = ['admin', 'root', 'sysadmin', 'deploy-bot', 'cron-service']
  return {
    id,
    timestamp: ts,
    action: actions[Math.floor(Math.random() * actions.length)],
    user: users[Math.floor(Math.random() * users.length)],
    ip: `10.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}`,
    details: `session_${randomHex(16)}`,
    status: Math.random() > 0.2 ? 'success' : 'failed',
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const { id } = req.query || {}
  const numericId = parseInt(id as string, 10) || Math.floor(Math.random() * 100000)

  // Generate a page of fake log entries
  const entries = []
  for (let i = 0; i < 25; i++) {
    entries.push(fakeLogEntry(`log-${numericId}-${i}`))
  }

  // Always provide links to "more" logs — the maze never ends
  const nextId = numericId + 1
  const prevId = Math.max(0, numericId - 1)

  res.setHeader('Cache-Control', 'no-store')
  res.json({
    page: numericId,
    total_pages: 999999,
    entries,
    _links: {
      self: `/api/admin/logs/${numericId}`,
      next: `/api/admin/logs/${nextId}`,
      prev: `/api/admin/logs/${prevId}`,
      first: `/api/admin/logs/0`,
      last: `/api/admin/logs/999999`,
    },
  })
}
