import { kv } from '@vercel/kv'

// Check if KV is properly configured
const isKVConfigured = () => {
  return !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN)
}

// Constant-time string comparison to prevent timing attacks on hash comparison
export function timingSafeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false
  let result = 0
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return result === 0
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  // Check if KV is configured
  if (!isKVConfigured()) {
    console.error('KV not configured: Missing KV_REST_API_URL or KV_REST_API_TOKEN environment variables')
    return res.status(503).json({ 
      error: 'Service unavailable',
      message: 'KV storage is not configured. Please set KV_REST_API_URL and KV_REST_API_TOKEN environment variables.'
    })
  }

  try {
    if (req.method === 'GET') {
      const { key } = req.query
      if (!key || typeof key !== 'string') return res.status(400).json({ error: 'key is required' })

      const value = await kv.get(key)
      return res.json({ value: value ?? null })
    }

    if (req.method === 'POST') {
      if (!req.body || typeof req.body !== 'object') {
        return res.status(400).json({ error: 'Request body is required' })
      }

      const { key, value } = req.body
      if (!key || typeof key !== 'string') return res.status(400).json({ error: 'key is required' })
      if (value === undefined) return res.status(400).json({ error: 'value is required' })

      const token = req.headers['x-admin-token'] || ''

      if (key === 'admin-password-hash') {
        // Allow setting password if none exists (initial setup)
        // Require auth to change an existing password
        const existingHash = await kv.get('admin-password-hash')
        if (existingHash && !timingSafeEqual(token, existingHash)) {
          return res.status(403).json({ error: 'Unauthorized' })
        }
      } else {
        // All other writes require a valid admin token
        const adminHash = await kv.get('admin-password-hash')
        if (adminHash && !timingSafeEqual(token, adminHash)) {
          return res.status(403).json({ error: 'Unauthorized' })
        }
      }

      await kv.set(key, value)
      return res.json({ success: true })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (error) {
    console.error('KV API error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('KV API error details:', {
      message: errorMessage,
      key: req.body?.key,
      method: req.method,
      hasToken: !!req.headers['x-admin-token']
    })
    
    const isKVConfigError = error instanceof Error && (
      errorMessage.toLowerCase().includes('kv_rest_api_url') ||
      errorMessage.toLowerCase().includes('kv_rest_api_token') ||
      errorMessage.toLowerCase().includes('vercel kv') ||
      errorMessage.toLowerCase().includes('missing credentials')
    )
    
    if (isKVConfigError) {
      return res.status(503).json({ 
        error: 'Service unavailable',
        message: 'KV storage configuration error. Please check environment variables.',
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
      })
    }
    
    return res.status(500).json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
    })
  }
}
