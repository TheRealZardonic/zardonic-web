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

      // Phase 2: Browser loops the worker until all Odesli enrichment is done
      let processed = 0
      while (true) {
        const workerRes = await fetch('/api/releases-enrich-worker', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
        })
        if (!workerRes.ok) break  // non-fatal: worker may time out, cron will finish

        const workerData = await workerRes.json()
        processed = workerData.processed ?? (workerData.done ? total : processed)

        setITunesProgress({ current: processed, total, currentTitle: workerData.currentTitle ?? '' })

        if (workerData.done) {
          // Final band-data write happened — refetch to get fully enriched releases
          refetchSiteData?.()
          break
        }

        // Small breathing room between worker calls
        await new Promise(r => setTimeout(r, 200))
      }

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
