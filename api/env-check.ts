/**
 * GET /api/env-check
 *
 * Returns the presence status of required environment variables.
 * Only reports whether each variable is set (boolean) — never exposes values.
 * Used by the SetupWizard to guide new users through ENV configuration.
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

export default function handler(req: VercelRequest, res: VercelResponse): void {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const vars = {
    KV_REST_API_URL: !!process.env.KV_REST_API_URL,
    KV_REST_API_TOKEN: !!process.env.KV_REST_API_TOKEN,
    ADMIN_SETUP_TOKEN: !!process.env.ADMIN_SETUP_TOKEN,
    RESEND_API_KEY: !!process.env.RESEND_API_KEY,
  }

  res.status(200).json({ vars })
}
