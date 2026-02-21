/**
 * Sync Timestamps Helper
 * Manages iTunes and Bandsintown sync timestamps via Vercel KV
 * NO localStorage!
 */

interface SyncTimestamps {
  lastReleasesSync: number
  lastGigsSync: number
}

/**
 * Get sync timestamps from Vercel KV
 */
export async function getSyncTimestamps(): Promise<SyncTimestamps> {
  try {
    const response = await fetch('/api/sync')
    
    if (!response.ok) {
      return {
        lastReleasesSync: 0,
        lastGigsSync: 0,
      }
    }

    return await response.json()
  } catch (error) {
    console.error('[Sync] Failed to get timestamps:', error)
    return {
      lastReleasesSync: 0,
      lastGigsSync: 0,
    }
  }
}

/**
 * Update releases sync timestamp
 */
export async function updateReleasesSync(timestamp: number = Date.now()): Promise<void> {
  try {
    await fetch('/api/sync', {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        lastReleasesSync: timestamp,
      }),
    })
  } catch (error) {
    console.error('[Sync] Failed to update releases timestamp:', error)
  }
}

/**
 * Update gigs sync timestamp
 */
export async function updateGigsSync(timestamp: number = Date.now()): Promise<void> {
  try {
    await fetch('/api/sync', {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        lastGigsSync: timestamp,
      }),
    })
  } catch (error) {
    console.error('[Sync] Failed to update gigs timestamp:', error)
  }
}
