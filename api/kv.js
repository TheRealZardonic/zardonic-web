import { Redis } from '@upstash/redis'

// Check if KV is properly configured
const isKVConfigured = () => {
  return !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)
}

// Lazily create the Redis client so we only instantiate when env vars are set
let _redis
function getRedis() {
  if (!_redis) {
    _redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
  }
  return _redis
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
    console.error('KV not configured: Missing UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN environment variables')
    return res.status(503).json({ 
      error: 'Service unavailable',
      message: 'KV storage is not configured. Please set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN environment variables.'
    })
  }

  const kv = getRedis()

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

      // Use 24h TTL for cached data keys, no TTL for admin-password-hash
      if (key === 'admin-password-hash') {
        await kv.set(key, value)
      } else {
        await kv.set(key, value, { ex: 86400 }) // 24 hours
      }
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
      errorMessage.toLowerCase().includes('upstash_redis_rest_url') ||
      errorMessage.toLowerCase().includes('upstash_redis_rest_token') ||
      errorMessage.toLowerCase().includes('upstash') ||
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
