import { useState, useEffect, useCallback } from 'react'
import type { SiteData, Gig, Release } from '@/lib/app-types'
import { DEFAULT_SITE_DATA } from '@/lib/app-types'
import { fetchITunesReleases } from '@/lib/itunes'
import { fetchOdesliLinks } from '@/lib/odesli'
import { fetchBandsintownEvents } from '@/lib/bandsintown'
import { getSyncTimestamps, updateReleasesSync, updateGigsSync } from '@/lib/sync'
import { parseGigDate } from '@/lib/utils'
import { toast } from 'sonner'
import type React from 'react'

const CACHE_DURATION_MS = 24 * 60 * 60 * 1000

export function useSiteDataSync(
  siteData: SiteData | undefined,
  setSiteData: React.Dispatch<React.SetStateAction<SiteData | undefined>>,
): {
  iTunesFetching: boolean
  bandsintownFetching: boolean
  hasAutoLoaded: boolean
  handleFetchITunesReleases: (isAutoLoad?: boolean) => Promise<void>
  handleFetchBandsintownEvents: (isAutoLoad?: boolean) => Promise<void>
} {
  const [iTunesFetching, setITunesFetching] = useState(false)
  const [bandsintownFetching, setBandsintownFetching] = useState(false)
  const [hasAutoLoaded, setHasAutoLoaded] = useState(false)

  const handleFetchITunesReleases = useCallback(async (isAutoLoad = false) => {
    setITunesFetching(true)
    try {
      const iTunesReleases = await fetchITunesReleases()
      if (iTunesReleases.length === 0) {
        if (!isAutoLoad) toast.info('No releases found on iTunes')
        return
      }

      // Only enrich with Odesli on manual admin refresh (not on auto-load)
      // to avoid exhausting the rate limit on every page load.
      if (!isAutoLoad) {
        const BATCH_SIZE = 3
        for (let i = 0; i < iTunesReleases.length; i += BATCH_SIZE) {
          const batch = iTunesReleases.slice(i, i + BATCH_SIZE)
          await Promise.allSettled(
            batch.map(async (release) => {
              if (!release.appleMusic) return
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
                }
              } catch (e) {
                console.error(`Odesli enrichment failed for ${release.title}:`, e)
              }
            })
          )
        }
      }

      setSiteData((data) => {
        const currentData = data || DEFAULT_SITE_DATA
        const existingIds = new Set(currentData.releases.map(r => r.id))
        const newReleases: Release[] = iTunesReleases
          .filter(r => !existingIds.has(r.id))
          .map(r => ({
            id: r.id,
            title: r.title,
            artwork: r.artwork,
            year: r.releaseDate ? new Date(r.releaseDate).getFullYear().toString() : '',
            releaseDate: r.releaseDate,
            spotify: r.spotify || '',
            soundcloud: r.soundcloud || '',
            youtube: r.youtube || '',
            bandcamp: r.bandcamp || '',
            appleMusic: r.appleMusic || '',
            deezer: r.deezer || '',
            tidal: r.tidal || '',
            amazonMusic: r.amazonMusic || '',
          }))

        // Update existing releases with better artwork from iTunes
        const updatedReleases = currentData.releases.map(existing => {
          const match = iTunesReleases.find(s => s.id === existing.id)
          if (match) {
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
            }
          }
          return existing
        })

        return { ...currentData, releases: [...updatedReleases, ...newReleases] }
      })

      if (!isAutoLoad) {
        toast.success(`Synced releases from iTunes`)
        updateReleasesSync(Date.now())
      }
    } catch (error) {
      if (!isAutoLoad) toast.error('Failed to fetch releases from iTunes')
      console.error(error)
    } finally {
      setITunesFetching(false)
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

      setSiteData((data) => {
        const currentData = data || DEFAULT_SITE_DATA
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
            soldOut: e.soldOut,
            startsAt: e.startsAt,
            description: e.description,
            title: e.title,
          }))

        // Also update existing gigs with enriched data from API
        const updatedGigs = currentData.gigs.map(existing => {
          const match = events.find(e => e.id === existing.id)
          if (match) {
            return {
              ...existing,
              lineup: match.lineup || existing.lineup,
              streetAddress: match.streetAddress || existing.streetAddress,
              postalCode: match.postalCode || existing.postalCode,
              soldOut: match.soldOut ?? existing.soldOut,
              startsAt: match.startsAt || existing.startsAt,
              ticketUrl: match.ticketUrl || existing.ticketUrl,
            }
          }
          return existing
        })

        return { ...currentData, gigs: [...updatedGigs, ...newGigs] }
      })

      if (!isAutoLoad) {
        toast.success(`Synced events from Bandsintown`)
        updateGigsSync(Date.now())
      }
    } catch (error) {
      if (!isAutoLoad) toast.error('Failed to fetch events from Bandsintown')
      console.error(error)
    } finally {
      setBandsintownFetching(false)
    }
  }, [setSiteData])

  // Auto-fetch iTunes releases and Bandsintown events on mount (with 24h cache)
  useEffect(() => {
    if (!hasAutoLoaded && siteData) {
      setHasAutoLoaded(true)
      const now = Date.now()
      getSyncTimestamps().then(({ lastReleasesSync, lastGigsSync }) => {
        if (now - lastReleasesSync > CACHE_DURATION_MS || siteData.releases.length === 0) {
          handleFetchITunesReleases(true).then(() => {
            updateReleasesSync(Date.now())
          })
        }
        // Also refresh if all stored gigs are in the past (no upcoming gigs visible)
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const hasUpcomingGigs = siteData.gigs.some(g => {
          if (!g.date) return false
          return parseGigDate(g.date) >= today
        })
        if (now - lastGigsSync > CACHE_DURATION_MS || siteData.gigs.length === 0 || !hasUpcomingGigs) {
          handleFetchBandsintownEvents(true).then(() => {
            updateGigsSync(Date.now())
          })
        }
      })
    }
  }, [hasAutoLoaded, siteData, handleFetchITunesReleases, handleFetchBandsintownEvents])

  return { iTunesFetching, bandsintownFetching, hasAutoLoaded, handleFetchITunesReleases, handleFetchBandsintownEvents }
}
