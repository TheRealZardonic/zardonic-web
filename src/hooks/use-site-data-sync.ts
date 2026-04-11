import { useState, useEffect, useCallback } from 'react'
import type { SiteData } from '@/lib/app-types'
import { getSyncTimestamps, updateReleasesSync, updateGigsSync } from '@/lib/sync'
import { parseGigDate } from '@/lib/utils'
import { toast } from 'sonner'

const CACHE_DURATION_MS = 24 * 60 * 60 * 1000

export interface SyncProgress {
  current: number
  total: number
  currentTitle: string
}

export function useSiteDataSync(
  siteData: SiteData | undefined,
  kvLoaded = false,
  refetchSiteData?: () => void,
  isOwner?: boolean,
): {
  iTunesFetching: boolean
  bandsintownFetching: boolean
  hasAutoLoaded: boolean
  iTunesProgress: SyncProgress | null
  handleFetchITunesReleases: (isAutoLoad?: boolean) => Promise<void>
  handleFetchBandsintownEvents: (isAutoLoad?: boolean) => Promise<void>
} {
  const [iTunesFetching, setITunesFetching] = useState(false)
  const [bandsintownFetching, setBandsintownFetching] = useState(false)
  const [hasAutoLoaded, setHasAutoLoaded] = useState(false)
  const [iTunesProgress, setITunesProgress] = useState<SyncProgress | null>(null)

  const handleFetchITunesReleases = useCallback(async (isAutoLoad = false) => {
    setITunesFetching(true)
    setITunesProgress(null)
    try {
      // Phase 1: iTunes + MusicBrainz → immediate band-data write + queue
      const response = await fetch('/api/releases-enrich', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        if (!isAutoLoad) toast.error(data?.error ?? 'Failed to sync releases from iTunes')
        return
      }

      const data = await response.json()
      const total: number = data.queued ?? 0

      // Releases are now in band-data (iTunes + MB, without streaming links) — show them immediately
      refetchSiteData?.()
      updateReleasesSync(Date.now())

      if (total === 0) {
        if (!isAutoLoad) toast.success('No releases found.')
        return
      }

      // Phase 2: Subscribe to SSE stream — server pushes one event per enriched
      // release so the browser makes a single persistent connection instead of
      // calling /api/releases-enrich-worker every 200 ms.
      await new Promise<void>((resolve) => {
        const stream = new EventSource('/api/releases-enrich-stream', { withCredentials: true })

        stream.onmessage = (e: MessageEvent<string>) => {
          try {
            const event = JSON.parse(e.data) as {
              type: string
              processed?: number
              total?: number
              currentTitle?: string
            }
            if (event.type === 'progress') {
              setITunesProgress({
                current: event.processed ?? 0,
                total: event.total ?? total,
                currentTitle: event.currentTitle ?? '',
              })
            } else if (event.type === 'done') {
              stream.close()
              refetchSiteData?.()
              resolve()
            } else if (event.type === 'error') {
              stream.close()
              // Non-fatal: cron will finish enrichment in background
              resolve()
            }
          } catch {
            // Malformed event — ignore
          }
        }

        stream.onerror = () => {
          // EventSource automatically reconnects.  If the server closed the
          // connection cleanly (end of budget), it will resume from where it
          // left off on the next reconnect.  We treat a hard error (state =
          // CLOSED without a 'done' event) as non-fatal so the cron job can
          // finish enrichment in the background.
          if (stream.readyState === EventSource.CLOSED) {
            // Server closed cleanly — may still be in progress via cron
            refetchSiteData?.()
            resolve()
          }
        }
      })

      if (!isAutoLoad) {
        toast.success(`${total} releases synced and enriched.`)
      }
    } catch (error) {
      if (!isAutoLoad) toast.error('Failed to sync releases from iTunes')
      console.error(error)
    } finally {
      setITunesFetching(false)
      setITunesProgress(null)
    }
  }, [refetchSiteData])

  const handleFetchBandsintownEvents = useCallback(async (isAutoLoad = false) => {
    setBandsintownFetching(true)
    try {
      const response = await fetch('/api/gigs-sync', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        if (!isAutoLoad) toast.error(data?.error ?? 'Failed to fetch events from Bandsintown')
        return
      }

      const data = await response.json()
      refetchSiteData?.()
      updateGigsSync(Date.now())

      if (!isAutoLoad) {
        const parts: string[] = [
          `Synced ${data.newCount ?? 0} new, updated ${data.updatedCount ?? 0} existing gigs.`,
        ]
        if ((data.geocodedCount ?? 0) > 0) parts.push(`${data.geocodedCount} geocoded.`)
        toast.success(parts.join(' '))
      }
    } catch (error) {
      if (!isAutoLoad) toast.error('Failed to fetch events from Bandsintown')
      console.error(error)
    } finally {
      setBandsintownFetching(false)
    }
  }, [refetchSiteData])

  // Auto-fetch iTunes releases and Bandsintown events on mount (with 24h cache).
  // Only runs for authenticated admins — public visitors read from KV directly.
  useEffect(() => {
    if (!hasAutoLoaded && siteData && kvLoaded && isOwner) {
      setHasAutoLoaded(true)
      const now = Date.now()
      getSyncTimestamps().then(({ lastReleasesSync, lastGigsSync }) => {
        if (now - lastReleasesSync > CACHE_DURATION_MS || siteData.releases.length === 0) {
          handleFetchITunesReleases(true)
        }
        // Also refresh if all stored gigs are in the past (no upcoming gigs visible)
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const hasUpcomingGigs = siteData.gigs.some(g => {
          if (!g.date) return false
          return parseGigDate(g.date) >= today
        })
        if (now - lastGigsSync > CACHE_DURATION_MS || siteData.gigs.length === 0 || !hasUpcomingGigs) {
          handleFetchBandsintownEvents(true)
        }
      })
    }
  }, [hasAutoLoaded, siteData, kvLoaded, isOwner, handleFetchITunesReleases, handleFetchBandsintownEvents])

  return { iTunesFetching, bandsintownFetching, hasAutoLoaded, iTunesProgress, handleFetchITunesReleases, handleFetchBandsintownEvents }
}
