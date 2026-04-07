import { Redis } from '@upstash/redis'

/**
 * Shared Redis client singleton for all API routes.
 *
 * Centralizes Redis initialization so that every endpoint uses the same
 * environment variables and connection, eliminating duplicate
 * `new Redis({ ... })` calls that previously existed in 40+ files.
 */

let _redis: Redis | null = null

/**
 * Returns `true` when the required Redis environment variables are set.
 * All API routes should use this instead of checking env vars directly.
 *
 * Replaces the old `isKVConfigured()` which incorrectly checked
 * `KV_REST_API_URL` / `KV_REST_API_TOKEN` (legacy Vercel KV names)
 * while the actual Redis client used `UPSTASH_REDIS_REST_URL` /
 * `UPSTASH_REDIS_REST_TOKEN`. This mismatch was the root cause of
 * HTTP 503 errors in production.
 */
export function isRedisConfigured(): boolean {
  return !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)
}

/**
 * Get the shared Redis client instance.
 * Creates the client lazily on first call.
 *
 * @throws if UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN are not set.
 */
export function getRedis(): Redis {
  if (_redis) return _redis
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) {
    throw new Error(
      'Redis is not configured. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN environment variables.'
    )
  }
  _redis = new Redis({ url, token })
  return _redis
}

/**
 * Get the shared Redis client, or `null` when Redis is not configured.
 * Useful for endpoints that should degrade gracefully instead of throwing.
 */
export function getRedisOrNull(): Redis | null {
  if (_redis) return _redis
  if (!isRedisConfigured()) return null
  return getRedis()
}
