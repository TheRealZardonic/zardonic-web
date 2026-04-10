import { useState, useEffect, useCallback } from 'react'
import type { SiteData, Gig, Release } from '@/lib/app-types'
import { fetchITunesReleases } from '@/lib/itunes'
import { fetchOdesliLinks } from '@/lib/odesli'
import { fetchBandsintownEvents } from '@/lib/bandsintown'
import { getSyncTimestamps, updateReleasesSync, updateGigsSync } from '@/lib/sync'
import { parseGigDate } from '@/lib/utils'
import { geocodeLocation } from '@/lib/geocode'
import { inferReleaseTypeFromTitle } from '@/lib/release-type'
import { toast } from 'sonner'

const CACHE_DURATION_MS = 24 * 60 * 60 * 1000
/** Delay between sequential Odesli API requests to respect rate limits. */
const ODESLI_DELAY_MS = 2000
/** Delay between sequential Nominatim geocoding requests (max 1 req/sec policy). */
const NOMINATIM_DELAY_MS = 1000

export interface SyncProgress {
  current: number
  total: number
  currentTitle: string
}

export function useSiteDataSync(
  siteData: SiteData | undefined,
  setSiteData: (updater: SiteData | ((current: SiteData) => SiteData)) => void,
  kvLoaded = false,
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
      const iTunesReleases = await fetchITunesReleases()
      if (iTunesReleases.length === 0) {
        if (!isAutoLoad) toast.info('No releases found on iTunes')
        return
      }

      // Apply client-side type inference to every fetched release
      for (const release of iTunesReleases) {
        if (!release.type) {
          const inferred = inferReleaseTypeFromTitle(release.title)
          if (inferred) release.type = inferred
        }
      }

      // Only enrich with Odesli on manual admin refresh (not on auto-load)
      // to avoid exhausting the rate limit on every page load.
      let enrichedCount = 0
      let failedCount = 0
      if (!isAutoLoad) {
        const total = iTunesReleases.filter(r => r.appleMusic).length
        let current = 0
        for (const release of iTunesReleases) {
          if (!release.appleMusic) continue
          current++
          setITunesProgress({ current, total, currentTitle: release.title })
          try {
            const links = await fetchOdesliLinks(release.appleMusic)
            if (links) {
              if (links.spotify) release.spotify = links.spotify
              if (links.soundcloud) release.soundcloud = links.soundcloud
              if (links.youtube) release.youtube = links.youtube
              if (links.bandcamp) release.bandcamp = links.bandcamp
              if (links.deezer) release.deezer = links.deezer
              if (links.tidal) release.tidal = links.tidal
              if (links.amazonMusic) release.amazonMusic = links.amazonMusic
              enrichedCount++
            }
          } catch (e) {
            failedCount++
            console.error(`Odesli enrichment failed for ${release.title}:`, e)
          }
          // Respect Odesli rate limits — sequential with delay between requests
          await new Promise<void>(r => setTimeout(r, ODESLI_DELAY_MS))
        }
        setITunesProgress(null)
      }

      let newCount = 0
      let updatedCount = 0
      setSiteData((currentData) => {
        const existingIds = new Set(currentData.releases.map(r => r.id))
        const newReleases: Release[] = iTunesReleases
          .filter(r => !existingIds.has(r.id))
          .map(r => ({
            id: r.id,
            title: r.title,
            artwork: r.artwork,
            year: r.releaseDate ? new Date(r.releaseDate).getFullYear().toString() : '',
            releaseDate: r.releaseDate,
            type: r.type,
            spotify: r.spotify || '',
            soundcloud: r.soundcloud || '',
            youtube: r.youtube || '',
            bandcamp: r.bandcamp || '',
            appleMusic: r.appleMusic || '',
            deezer: r.deezer || '',
            tidal: r.tidal || '',
            amazonMusic: r.amazonMusic || '',
          }))
        newCount = newReleases.length

        // Update existing releases with better artwork from iTunes
        // and apply type inference for those that still have no type
        const updatedReleases = currentData.releases.map(existing => {
          const match = iTunesReleases.find(s => s.id === existing.id)
          if (match) {
            updatedCount++
            const inferredType = existing.type || inferReleaseTypeFromTitle(existing.title)
            return {
              ...existing,
              artwork: match.artwork || existing.artwork,
              appleMusic: match.appleMusic || existing.appleMusic,
              spotify: match.spotify || existing.spotify,
              soundcloud: match.soundcloud || existing.soundcloud,
              youtube: match.youtube || existing.youtube,
              bandcamp: match.bandcamp || existing.bandcamp,
              deezer: match.deezer || existing.deezer,
              tidal: match.tidal || existing.tidal,
              amazonMusic: match.amazonMusic || existing.amazonMusic,
              type: match.type || inferredType || existing.type,
            }
          }
          return existing
        })

        return { ...currentData, releases: [...updatedReleases, ...newReleases] }
      })

      if (!isAutoLoad) {
        const parts: string[] = [
          `Synced ${newCount} new, updated ${updatedCount} existing releases.`,
          `${enrichedCount} enriched with streaming links.`,
        ]
        if (failedCount > 0) parts.push(`(${failedCount} failed)`)
        toast.success(parts.join(' '))
      }
      // Always update the sync timestamp so the 24 h cache guard works correctly on
      // the next page load, regardless of whether this was a manual or auto-load sync.
      updateReleasesSync(Date.now())
    } catch (error) {
      if (!isAutoLoad) toast.error('Failed to fetch releases from iTunes')
      console.error(error)
    } finally {
      setITunesFetching(false)
      setITunesProgress(null)
    }
  }, [setSiteData])

  const handleFetchBandsintownEvents = useCallback(async (isAutoLoad = false) => {
    setBandsintownFetching(true)
    try {
      const events = await fetchBandsintownEvents()
      if (events.length === 0) {
        if (!isAutoLoad) toast.info('No upcoming events found on Bandsintown')
        return
      }

      // Geocode events that are missing coordinates.
      // Runs on both auto-load and manual sync so new gigs get coordinates
      // persisted to KV immediately; the !latitude/!longitude guard prevents
      // re-geocoding events that already have coordinates stored.
      let geocodedCount = 0
      let geocodeFailed = 0
      for (const event of events) {
        if (!event.latitude && !event.longitude && event.location) {
          const coords = await geocodeLocation(event.location)
          if (coords) {
            event.latitude = coords.latitude
            event.longitude = coords.longitude
            geocodedCount++
          } else {
            geocodeFailed++
          }
          // Respect Nominatim's 1 req/sec policy
          await new Promise<void>(r => setTimeout(r, NOMINATIM_DELAY_MS))
        }
      }

      // Identify existing stored gigs without coords that won't be covered by
      // the Bandsintown event merge (i.e. no matching event, or matching event
      // also had no coords). Geocode these in a separate pass after the merge.
      const gigsNeedingPostGeocode: { id: string; location: string }[] = (
        siteData?.gigs ?? []
      ).filter(g => {
        if (g.latitude || g.longitude) return false   // already has coords
        if (!g.location) return false                  // no location to geocode
        const match = events.find(e => e.id === g.id)
        if (match?.latitude || match?.longitude) return false  // match has coords
        return true
      }).map(g => ({ id: g.id, location: g.location }))

      let newCount = 0
      let updatedCount = 0
      setSiteData((currentData) => {
        const existingIds = new Set(currentData.gigs.map(g => g.id))
        const newGigs: Gig[] = events
          .filter(e => !existingIds.has(e.id))
          .map(e => ({
            id: e.id,
            venue: e.venue,
            location: e.location,
            date: e.date,
            ticketUrl: e.ticketUrl,
            support: e.lineup?.filter(a => a.toLowerCase() !== 'zardonic').join(', ') || '',
            lineup: e.lineup || [],
            streetAddress: e.streetAddress,
            postalCode: e.postalCode,
            latitude: e.latitude,
            longitude: e.longitude,
            soldOut: e.soldOut,
            startsAt: e.startsAt,
            description: e.description,
            title: e.title,
          }))
        newCount = newGigs.length

        // Also update existing gigs with enriched data from API.
        // Use ?? (nullish coalescing) so that a valid "0.0" string coord from
        // Bandsintown is never discarded by falsy-value fallthrough.
        const updatedGigs = currentData.gigs.map(existing => {
          const match = events.find(e => e.id === existing.id)
          if (match) {
            updatedCount++
            return {
              ...existing,
              lineup: match.lineup || existing.lineup,
              streetAddress: match.streetAddress || existing.streetAddress,
              postalCode: match.postalCode || existing.postalCode,
              latitude: match.latitude ?? existing.latitude,
              longitude: match.longitude ?? existing.longitude,
              soldOut: match.soldOut ?? existing.soldOut,
              startsAt: match.startsAt || existing.startsAt,
              ticketUrl: match.ticketUrl || existing.ticketUrl,
            }
          }
          return existing
        })

        return { ...currentData, gigs: [...updatedGigs, ...newGigs] }
      })

      // Post-merge geocoding: geocode stored gigs that still have no coordinates
      // (these are gigs stored before geocoding was added, or whose Bandsintown
      // event also lacked coordinates and Nominatim geocoding was needed).
      for (const { id, location } of gigsNeedingPostGeocode) {
        const coords = await geocodeLocation(location)
        if (coords) {
          setSiteData(data => ({
            ...data,
            gigs: data.gigs.map(g =>
              g.id === id
                ? { ...g, latitude: coords.latitude, longitude: coords.longitude }
                : g
            ),
          }))
          geocodedCount++
        } else {
          geocodeFailed++
        }
        await new Promise<void>(r => setTimeout(r, NOMINATIM_DELAY_MS))
      }

      if (!isAutoLoad) {
        const parts: string[] = [
          `Synced ${newCount} new, updated ${updatedCount} existing gigs.`,
          `${geocodedCount} geocoded.`,
        ]
        if (geocodeFailed > 0) parts.push(`(${geocodeFailed} failed)`)
        toast.success(parts.join(' '))
      }
      // Always update the sync timestamp so the 24 h cache guard works correctly on
      // the next page load, regardless of whether this was a manual or auto-load sync.
      updateGigsSync(Date.now())
    } catch (error) {
      if (!isAutoLoad) toast.error('Failed to fetch events from Bandsintown')
      console.error(error)
    } finally {
      setBandsintownFetching(false)
    }
  // siteData?.gigs is read at call-time (line ~197, gigsNeedingPostGeocode).
  // Adding siteData to deps would recreate the callback on every data change →
  // the useEffect auto-load loop would re-trigger on every gig update → infinite
  // re-renders. The stale-closure risk is acceptable here (we only read gigs once
  // per sync call to identify which ones still need geocoding).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setSiteData])

  // Auto-fetch iTunes releases and Bandsintown events on mount (with 24h cache)
  useEffect(() => {
    if (!hasAutoLoaded && siteData && kvLoaded) {
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
  }, [hasAutoLoaded, siteData, kvLoaded, handleFetchITunesReleases, handleFetchBandsintownEvents])

  return { iTunesFetching, bandsintownFetching, hasAutoLoaded, iTunesProgress, handleFetchITunesReleases, handleFetchBandsintownEvents }
}
