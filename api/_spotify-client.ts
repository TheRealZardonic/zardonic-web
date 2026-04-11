/**
 * Shared Spotify client helper.
 *
 * Exports a lightweight `getSpotifyAccessToken()` that uses the Client
 * Credentials flow (no user auth required).  No Redis caching — callers
 * that need a long-lived cached token should implement caching themselves
 * (see api/spotify.ts).
 */
import { fetchWithRetry } from './_fetch-retry.js'

/**
 * Fetch a Spotify Client Credentials access token.
 *
 * Returns `null` when SPOTIFY_CLIENT_ID / SPOTIFY_CLIENT_SECRET are not set
 * or when the token endpoint returns a non-2xx response.
 */
export async function getSpotifyAccessToken(): Promise<string | null> {
  const clientId = process.env.SPOTIFY_CLIENT_ID
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET
  if (!clientId || !clientSecret) return null

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
  const res = await fetchWithRetry('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  })

  if (!res.ok) return null
  const data = await res.json() as { access_token: string }
  return data.access_token
}
