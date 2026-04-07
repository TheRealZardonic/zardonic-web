import { handleCanaryCallback } from './_canary-documents.js'

interface VercelRequest {
  method?: string
  body?: Record<string, unknown>
  query?: Record<string, string | string[]>
  headers: Record<string, string | string[] | undefined>
  url?: string
}

interface VercelResponse {
  setHeader(key: string, value: string | number): VercelResponse
  status(code: number): VercelResponse
  json(data: unknown): VercelResponse
  end(): VercelResponse
  send(data: unknown): VercelResponse
}

/**
 * Canary callback endpoint — receives "phone home" signals from
 * canary documents opened by attackers.
 *
 * GET  /api/canary-callback?t=<token>&e=img  → tracking pixel callback
 * POST /api/canary-callback?t=<token>&e=js   → JavaScript fingerprint data
 */
export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  if (req.method !== 'GET' && req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  await handleCanaryCallback(req, res)
}
