import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useKV, SKIP_UPDATE } from '@/hooks/use-kv'
import { useKonami } from '@/hooks/use-konami'
import { trackPageView, trackHeatmapClick } from '@/hooks/use-analytics'
import { fetchITunesReleases } from '@/lib/itunes'
import { fetchOdesliLinks } from '@/lib/odesli'
import { fetchBandsintownEvents } from '@/lib/bandsintown'
import { toDirectImageUrl, normalizeImageUrl } from '@/lib/image-cache'
import { 
  applyConfigOverrides,
  OVERLAY_LOADING_TEXT_INTERVAL_MS,
  OVERLAY_GLITCH_PHASE_DELAY_MS,
  OVERLAY_REVEAL_PHASE_DELAY_MS,
} from '@/lib/config'
import { submitContactForm, contactFormSchema } from '@/lib/contact'
import { loginWithPassword, setupPassword, validateSession, hashPassword } from '@/lib/session'
import { getSyncTimestamps, updateReleasesSync, updateGigsSync } from '@/lib/sync'
import type { AdminSettings } from '@/lib/types'
import {
  List,
  X,
  InstagramLogo,
  FacebookLogo,
  SpotifyLogo,
  YoutubeLogo,
  Pencil,
  FloppyDisk,
  MagnifyingGlassPlus,
  MapPin,
  CalendarBlank,
  Ticket,
  Upload,
  Trash,
  Plus,
  User,
  SoundcloudLogo,
  TiktokLogo,
  ApplePodcastsLogo,
  ArrowsClockwise,
  MusicNote,
  CaretDown,
  CaretUp,
  Envelope,
  Storefront,
  PaperPlaneTilt,
  Lock,
} from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { Toaster } from '@/components/ui/sonner'
import { toast } from 'sonner'
import { Label } from '@/components/ui/label'
import { SwipeableGallery } from '@/components/SwipeableGallery'
import { LoadingScreen } from '@/components/LoadingScreen'
import { CircuitBackground } from '@/components/CircuitBackground'
import AdminLoginDialog from '@/components/AdminLoginDialog'
import EditControls from '@/components/EditControls'
import ConfigEditorDialog from '@/components/ConfigEditorDialog'
import { SpotifyEmbed } from '@/components/SpotifyEmbed'
import { MediaBrowser } from '@/components/MediaBrowser'
import EditableHeading from '@/components/EditableHeading'
import { SystemMonitorHUD } from '@/components/SystemMonitorHUD'
import ContactSection from '@/components/ContactSection'
import ContactInboxDialog from '@/components/ContactInboxDialog'
import SubscriberListDialog from '@/components/SubscriberListDialog'
import LanguageSwitcher from '@/components/LanguageSwitcher'
import type { TerminalCommand, SectionLabels, ContactSettings } from '@/lib/types'
import AppNavBar from '@/components/AppNavBar'
import AppHeroSection from '@/components/AppHeroSection'
import ShellSection from '@/components/ShellSection'
import CreditHighlightsSection from '@/components/CreditHighlightsSection'
import GallerySection from '@/components/GallerySection'
import AppFooter from '@/components/AppFooter'
import React, { Suspense } from 'react'

import heroImage from '@/assets/images/meta_eyJzcmNCdWNrZXQiOiJiemdsZmlsZXMifQ==.webp'
import logoImage from '@/assets/images/meta_eyJzcmNCdWNrZXQiOiJiemdsZmlsZXMifQ==.webp'

// Code splitting for heavy components
const Terminal = React.lazy(() => import('@/components/Terminal').then(m => ({ default: m.Terminal })))
const StatsDashboard = React.lazy(() => import('@/components/StatsDashboard'))
const SecurityIncidentsDashboard = React.lazy(() => import('@/components/SecurityIncidentsDashboard'))
const SecuritySettingsDialog = React.lazy(() => import('@/components/SecuritySettingsDialog'))
const BlocklistManagerDialog = React.lazy(() => import('@/components/BlocklistManagerDialog'))
const AttackerProfileDialog = React.lazy(() => import('@/components/AttackerProfileDialog'))

const CACHE_DURATION_MS = 24 * 60 * 60 * 1000 // 24 hours

interface Track {
  id: string
  title: string
  artist: string
  url: string
  artwork?: string
}

interface Gig {
  id: string
  venue: string
  location: string
  date: string
  ticketUrl?: string
  support?: string
  lineup?: string[]
  streetAddress?: string
  postalCode?: string
  soldOut?: boolean
  startsAt?: string
  description?: string
  title?: string
}

interface Release {
  id: string
  title: string
  artwork: string
  year: string
  releaseDate?: string
  spotify?: string
  soundcloud?: string
  youtube?: string
  bandcamp?: string
  appleMusic?: string
  deezer?: string
  tidal?: string
  amazonMusic?: string
}

interface Member {
  id: string
  name: string
  role: string
  bio: string
  image?: string
  instagram?: string
}

interface MediaFile {
  id: string
  name: string
  type: 'image' | 'pdf' | 'zip'
  url: string
  size: string
}

interface CreditHighlight {
  src: string
  alt: string
}

export interface SiteData {
  artistName: string
  heroImage: string
  bio: string
  tracks: Track[]
  gigs: Gig[]
  releases: Release[]
  gallery: string[]
  instagramFeed: string[]
  members: Member[]
  mediaFiles: MediaFile[]
  creditHighlights: CreditHighlight[]
  social: {
    instagram?: string
    facebook?: string
    spotify?: string
    youtube?: string
    soundcloud?: string
    bandcamp?: string
    tiktok?: string
    appleMusic?: string
    twitter?: string
    twitch?: string
    beatport?: string
    linktree?: string
  }
}

const DEFAULT_SITE_DATA: SiteData = {
  artistName: 'ZARDONIC',
  heroImage: '',
  bio: '',
  tracks: [],
  gigs: [],
  releases: [],
  gallery: [],
  instagramFeed: [],
  members: [],
  mediaFiles: [],
  creditHighlights: [],
  social: {},
}

/** Discriminated union so TypeScript narrows `data` to the correct type per overlay variant. */
type CyberpunkOverlayState =
  | { type: 'impressum' | 'privacy' | 'contact'; data?: never }
  | { type: 'gig'; data: Gig }
  | { type: 'release'; data: Release }
  | { type: 'member'; data: Member }


const OVERLAY_LOADING_TEXTS = [
  '> ACCESSING PROFILE...',
  '> DECRYPTING DATA...',
  '> IDENTITY VERIFIED',
]

function App() {
  const konamiActivated = useKonami()
  const [terminalOpen, setTerminalOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [contentLoaded, setContentLoaded] = useState(false)

  // Admin authentication
  const [adminPasswordHash, setAdminPasswordHash] = useKV<string>('admin-password-hash', '')
  const [isOwner, setIsOwner] = useState(false)
  const [showLoginDialog, setShowLoginDialog] = useState(false)
  const [showSetupDialog, setShowSetupDialog] = useState(false)
  const wantsSetup = useRef(false)
  
  useEffect(() => {
    if (konamiActivated) {
      setTerminalOpen(true)
      toast.success('Terminal activated!')
    }
  }, [konamiActivated])

  // Check for ?admin-setup URL parameter on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.has('admin-setup')) {
      wantsSetup.current = true
      // Clean up URL
      const url = new URL(window.location.href)
      url.searchParams.delete('admin-setup')
      window.history.replaceState({}, '', url.toString())
    }
  }, [])

  // Restore admin session from Vercel KV
  useEffect(() => {
    if (!adminPasswordHash) return
    
    // Validate session token if exists
    validateSession().then(result => {
      if (result.authenticated) {
        setIsOwner(true)
      }
    })
  }, [adminPasswordHash])

  // Open setup dialog once KV data has loaded and confirms no password exists
  useEffect(() => {
    if (wantsSetup.current && adminPasswordHash !== undefined && !adminPasswordHash) {
      wantsSetup.current = false
      setShowSetupDialog(true)
    }
  }, [adminPasswordHash])

  useEffect(() => {
    if (!loading) {
      setTimeout(() => setContentLoaded(true), 100)
    }
  }, [loading])

  // Track page view on mount
  useEffect(() => {
    trackPageView()
  }, [])

  // Track heatmap clicks globally
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const x = e.clientX / window.innerWidth
      const y = (e.clientY + window.scrollY) / document.documentElement.scrollHeight
      const target = e.target as HTMLElement
      // Find the closest interactive element for meaningful names
      const interactive = target.closest('button, a, [role="button"]') as HTMLElement | null
      let el: string
      if (interactive) {
        const text = interactive.textContent?.trim().slice(0, 30) || ''
        const tag = interactive.tagName.toLowerCase()
        const ariaLabel = interactive.getAttribute('aria-label') || interactive.getAttribute('title') || ''
        el = ariaLabel || text || `${tag}`
      } else {
        el = target.textContent?.trim().slice(0, 30) || target.tagName.toLowerCase()
      }
      trackHeatmapClick(x, y, el)
    }
    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [])

  const [siteData, setSiteData] = useState<SiteData | undefined>(undefined)
  const [adminSettings, setAdminSettings] = useState<AdminSettings | undefined>(undefined)

  const { data: kvSiteData, isLoading: isSiteDataLoading } = useKV<SiteData>('zd-cms:site')
  const { data: kvAdminSettings, isLoading: isAdminSettingsLoading } = useKV<AdminSettings>('admin:settings')

  useEffect(() => {
    if (!isSiteDataLoading && kvSiteData) {
      setSiteData(kvSiteData)
    }
  }, [kvSiteData, isSiteDataLoading])

  useEffect(() => {
    if (!isAdminSettingsLoading && kvAdminSettings) {
      setAdminSettings(kvAdminSettings)
    }
  }, [kvAdminSettings, isAdminSettingsLoading])

  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0)
  const [volume] = useState([80])
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [showConfigEditor, setShowConfigEditor] = useState(false)
  const [showStats, setShowStats] = useState(false)
  const [showSecurityIncidents, setShowSecurityIncidents] = useState(false)
  const [showSecuritySettings, setShowSecuritySettings] = useState(false)
  const [showBlocklist, setShowBlocklist] = useState(false)
  const [showAttackerProfile, setShowAttackerProfile] = useState(false)
  const [selectedAttackerIp, setSelectedAttackerIp] = useState<string>('')
  const [showContactInbox, setShowContactInbox] = useState(false)
  const [showSubscriberList, setShowSubscriberList] = useState(false)

  const vis = adminSettings?.sectionVisibility ?? {}
  const anim = adminSettings?.animations ?? {}
  const sectionLabels = adminSettings?.sectionLabels ?? {}
  const terminalCommands = adminSettings?.terminalCommands ?? []
  const contactSettings = adminSettings?.contactSettings ?? {}

  const DEFAULT_SECTION_ORDER = ['bio', 'shell', 'creditHighlights', 'music', 'gigs', 'releases', 'gallery', 'media', 'connect', 'contact']
  const sectionOrder = adminSettings?.sectionOrder ?? DEFAULT_SECTION_ORDER
  const getSectionOrder = useCallback((section: string) => {
    const idx = sectionOrder.indexOf(section)
    return idx >= 0 ? idx : DEFAULT_SECTION_ORDER.indexOf(section)
  }, [sectionOrder])


  // Apply theme customizations to CSS variables
  useEffect(() => {
    const t = adminSettings?.theme
    if (!t) return
    const root = document.documentElement
    
    // Base colors
    if (t.primaryColor) root.style.setProperty('--primary', t.primaryColor)
    if (t.primaryForegroundColor) root.style.setProperty('--primary-foreground', t.primaryForegroundColor)
    if (t.accentColor) {
      root.style.setProperty('--accent', t.accentColor)
      // Also update hover-color fallback when accent changes and no specific hover color is set
      if (!t.hoverColor) root.style.setProperty('--hover-color', t.accentColor)
    }
    if (t.accentForegroundColor) root.style.setProperty('--accent-foreground', t.accentForegroundColor)
    if (t.backgroundColor) root.style.setProperty('--background', t.backgroundColor)
    if (t.foregroundColor) root.style.setProperty('--foreground', t.foregroundColor)
    
    // Card colors
    if (t.cardColor) root.style.setProperty('--card', t.cardColor)
    if (t.cardForegroundColor) root.style.setProperty('--card-foreground', t.cardForegroundColor)
    
    // Popover colors
    if (t.popoverColor) root.style.setProperty('--popover', t.popoverColor)
    if (t.popoverForegroundColor) root.style.setProperty('--popover-foreground', t.popoverForegroundColor)
    
    // Secondary colors
    if (t.secondaryColor) root.style.setProperty('--secondary', t.secondaryColor)
    if (t.secondaryForegroundColor) root.style.setProperty('--secondary-foreground', t.secondaryForegroundColor)
    
    // Muted colors
    if (t.mutedColor) root.style.setProperty('--muted', t.mutedColor)
    if (t.mutedForegroundColor) root.style.setProperty('--muted-foreground', t.mutedForegroundColor)
    
    // Destructive colors
    if (t.destructiveColor) root.style.setProperty('--destructive', t.destructiveColor)
    if (t.destructiveForegroundColor) root.style.setProperty('--destructive-foreground', t.destructiveForegroundColor)
    
    // Border, input, ring
    if (t.borderColor) {
      root.style.setProperty('--border-color', t.borderColor)
      root.style.setProperty('--border', t.borderColor)
    }
    if (t.inputColor) root.style.setProperty('--input', t.inputColor)
    if (t.ringColor) root.style.setProperty('--ring', t.ringColor)
    if (t.hoverColor) root.style.setProperty('--hover-color', t.hoverColor)
    
    // Border radius
    if (t.borderRadius) root.style.setProperty('--radius', t.borderRadius)
    
    // Fonts
    if (t.fontHeading) root.style.setProperty('--font-heading', t.fontHeading)
    if (t.fontBody) root.style.setProperty('--font-body', t.fontBody)
    if (t.fontMono) root.style.setProperty('--font-mono', t.fontMono)
    
    return () => {
      // Base colors
      root.style.removeProperty('--primary')
      root.style.removeProperty('--primary-foreground')
      root.style.removeProperty('--accent')
      root.style.removeProperty('--accent-foreground')
      root.style.removeProperty('--background')
      root.style.removeProperty('--foreground')
      
      // Card colors
      root.style.removeProperty('--card')
      root.style.removeProperty('--card-foreground')
      
      // Popover colors
      root.style.removeProperty('--popover')
      root.style.removeProperty('--popover-foreground')
      
      // Secondary colors
      root.style.removeProperty('--secondary')
      root.style.removeProperty('--secondary-foreground')
      
      // Muted colors
      root.style.removeProperty('--muted')
      root.style.removeProperty('--muted-foreground')
      
      // Destructive colors
      root.style.removeProperty('--destructive')
      root.style.removeProperty('--destructive-foreground')
      
      // Border, input, ring
      root.style.removeProperty('--border-color')
      root.style.removeProperty('--border')
      root.style.removeProperty('--input')
      root.style.removeProperty('--ring')
      root.style.removeProperty('--hover-color')
      
      // Border radius
      root.style.removeProperty('--radius')
      
      // Fonts
      root.style.removeProperty('--font-heading')
      root.style.removeProperty('--font-body')
      root.style.removeProperty('--font-mono')
    }
  }, [adminSettings?.theme])

  // Apply CRT overlay/vignette opacity
  useEffect(() => {
    const a = adminSettings?.animations
    const root = document.documentElement
    if (typeof a?.crtOverlayOpacity === 'number') {
      root.style.setProperty('--crt-overlay-opacity', String(a.crtOverlayOpacity))
    }
    if (typeof a?.crtVignetteOpacity === 'number') {
      root.style.setProperty('--crt-vignette-opacity', String(a.crtVignetteOpacity))
    }
    return () => {
      root.style.removeProperty('--crt-overlay-opacity')
      root.style.removeProperty('--crt-vignette-opacity')
    }
  }, [adminSettings?.animations?.crtOverlayOpacity, adminSettings?.animations?.crtVignetteOpacity])

  // Apply config overrides
  useEffect(() => {
    if (adminSettings?.configOverrides) {
      applyConfigOverrides(adminSettings.configOverrides)
    }
  }, [adminSettings?.configOverrides])

  // Apply favicon
  useEffect(() => {
    const faviconUrl = adminSettings?.faviconUrl
    if (!faviconUrl) return
    let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement | null
    if (!link) {
      link = document.createElement('link')
      link.rel = 'icon'
      document.head.appendChild(link)
    }
    link.href = faviconUrl
  }, [adminSettings?.faviconUrl])

  // Collect image URLs for precaching during loading screen
  const precacheUrls = useMemo(() => {
    if (!siteData) return []
    const urls: string[] = []
    siteData.gallery?.forEach(url => { if (url) urls.push(url) })
    siteData.releases?.forEach(r => { if (r.artwork) urls.push(r.artwork) })
    siteData.creditHighlights?.forEach(c => { if (c.src) urls.push(c.src) })
    return urls
  }, [siteData])
  const [galleryIndex, setGalleryIndex] = useState<number | null>(null)
  const [cyberpunkOverlay, setCyberpunkOverlay] = useState<CyberpunkOverlayState | null>(null)
  const [language, setLanguage] = useState<'en' | 'de'>('en')
  const [iTunesFetching, setITunesFetching] = useState(false)
  const [bandsintownFetching, setBandsintownFetching] = useState(false)
  const [hasAutoLoaded, setHasAutoLoaded] = useState(false)
  const [showAllReleases, setShowAllReleases] = useState(false)
  const [bioExpanded, setBioExpanded] = useState(false)

  // 3-phase overlay loading state
  const [overlayPhase, setOverlayPhase] = useState<'loading' | 'glitch' | 'revealed'>('loading')
  const [loadingText, setLoadingText] = useState(OVERLAY_LOADING_TEXTS[0])

  useEffect(() => {
    if (!cyberpunkOverlay) return
    
    setOverlayPhase('loading')
    setLoadingText(OVERLAY_LOADING_TEXTS[0])
    
    let idx = 0
    const txtInterval = setInterval(() => {
      idx += 1
      if (idx <= OVERLAY_LOADING_TEXTS.length - 1) {
        setLoadingText(OVERLAY_LOADING_TEXTS[idx])
      }
    }, OVERLAY_LOADING_TEXT_INTERVAL_MS)

    const glitchTimer = setTimeout(() => {
      clearInterval(txtInterval)
      setOverlayPhase('glitch')
    }, OVERLAY_GLITCH_PHASE_DELAY_MS)

    const revealTimer = setTimeout(() => {
      setOverlayPhase('revealed')
    }, OVERLAY_REVEAL_PHASE_DELAY_MS)

    return () => {
      clearInterval(txtInterval)
      clearTimeout(glitchTimer)
      clearTimeout(revealTimer)
    }
  }, [cyberpunkOverlay])
  
  const audioRef = useRef<HTMLAudioElement>(null)

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume[0] / 100
    }
  }, [volume])

  // Admin authentication handlers
  const handleAdminLogin = async (password: string, totpCode?: string): Promise<{ success: boolean; totpRequired?: boolean }> => {
    const result = await loginWithPassword(password, totpCode)
    if (result.success) {
      setIsOwner(true)
    }
    return result
  }

  const handleSetupAdminPassword = async (password: string): Promise<void> => {
    const success = await setupPassword(password)
    if (success) {
      // Also need to store the hash in KV for the password check
      setAdminPasswordHash(await hashPassword(password))
      setIsOwner(true)
    }
  }

  const handleSetAdminPassword = async (password: string): Promise<void> => {
    const success = await setupPassword(password)
    if (success) {
      setAdminPasswordHash(await hashPassword(password))
    }
  }

  // Auto-fetch iTunes releases and Bandsintown events on mount (with 24h cache)
  useEffect(() => {
    if (!hasAutoLoaded && siteData) {
      setHasAutoLoaded(true)
      const now = Date.now()
      
      // Get sync timestamps from Vercel KV
      getSyncTimestamps().then(({ lastReleasesSync, lastGigsSync }) => {
        if (now - lastReleasesSync > CACHE_DURATION_MS || siteData.releases.length === 0) {
          handleFetchITunesReleases(true).then(() => {
            updateReleasesSync(Date.now())
          })
        }
        if (now - lastGigsSync > CACHE_DURATION_MS || siteData.gigs.length === 0) {
          handleFetchBandsintownEvents(true).then(() => {
            updateGigsSync(Date.now())
          })
        }
      })
    }
  }, [hasAutoLoaded, siteData])

  const handleFetchITunesReleases = async (isAutoLoad = false) => {
    setITunesFetching(true)
    try {
      const iTunesReleases = await fetchITunesReleases()
      if (iTunesReleases.length === 0) {
        if (!isAutoLoad) toast.info('No releases found on iTunes')
        return
      }

      // Enrich with Odesli streaming links in batches
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
  }

  const handleFetchBandsintownEvents = async (isAutoLoad = false) => {
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
  }

  const togglePlay = () => {
    if (!audioRef.current) return
    
    if (isPlaying) {
      audioRef.current.pause()
    } else {
      audioRef.current.play()
    }
    setIsPlaying(!isPlaying)
  }

  const playNext = () => {
    if (!siteData) return
    setCurrentTrackIndex((prev) => (prev + 1) % siteData.tracks.length)
    setIsPlaying(true)
  }

  const playPrevious = () => {
    if (!siteData) return
    setCurrentTrackIndex((prev) => (prev - 1 + siteData.tracks.length) % siteData.tracks.length)
    setIsPlaying(true)
  }

  const scrollToSection = (id: string) => {
    setMobileMenuOpen(false)
    // Small delay to let mobile menu close before scrolling
    setTimeout(() => {
      const element = document.getElementById(id)
      if (element) {
        const navHeight = document.querySelector('nav')?.getBoundingClientRect().height ?? 80
        const y = element.getBoundingClientRect().top + window.scrollY - navHeight
        window.scrollTo({ top: y, behavior: 'smooth' })
      }
    }, 100)
  }

  const currentTrack = siteData?.tracks[currentTrackIndex]

  if (!siteData) {
    return <LoadingScreen onLoadComplete={() => setLoading(false)} precacheUrls={precacheUrls} />
  }

  return (
    <>
      <AnimatePresence>
        {loading && (
          <LoadingScreen onLoadComplete={() => setLoading(false)} precacheUrls={precacheUrls} />
        )}
      </AnimatePresence>

      <div className={`min-h-screen bg-background text-foreground relative${anim.glitchEnabled === false ? ' no-glitch' : ''}${anim.chromaticEnabled === false ? ' no-chromatic' : ''}`}>
      {anim.crtEnabled !== false && <div className="crt-overlay" />}
      {anim.crtEnabled !== false && <div className="crt-vignette" />}
      {anim.scanlineEnabled !== false && <div className="crt-scanline-bg" />}
      {anim.noiseEnabled !== false && <div className="full-page-noise periodic-noise-glitch" />}
      {anim.circuitBackgroundEnabled !== false && <CircuitBackground />}
      <SystemMonitorHUD />
      
      <Toaster />
      <audio ref={audioRef} src={currentTrack?.url} />

      <AppNavBar
        artistName={siteData.artistName}
        editMode={editMode}
        isOwner={isOwner}
        setEditMode={setEditMode}
        adminPasswordHash={adminPasswordHash || ''}
        setShowLoginDialog={setShowLoginDialog}
        mobileMenuOpen={mobileMenuOpen}
        setMobileMenuOpen={setMobileMenuOpen}
        scrollToSection={scrollToSection}
      />

      <AppHeroSection
        contentLoaded={contentLoaded}
        editMode={editMode}
        scrollToSection={scrollToSection}
        artistName={siteData.artistName}
      />

      <div className="flex flex-col">

      <div style={{ order: getSectionOrder('bio') }}>
      {vis.bio !== false && (
      <>
      <Separator className="bg-border" />
      <section id="bio" className="py-24 px-4">
        <div className="container mx-auto max-w-4xl">
          <motion.div
            initial={{ opacity: 0, x: -30, filter: 'blur(10px)', clipPath: 'polygon(0 0, 0 0, 0 100%, 0 100%)' }}
            whileInView={{ opacity: 1, x: 0, filter: 'blur(0px)', clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 100%)' }}
            viewport={{ once: true }}
            transition={{ duration: 1, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="relative"
          >
            <h2 className="text-4xl md:text-6xl font-bold mb-12 uppercase tracking-tighter text-foreground font-mono hover-chromatic hover-glitch cyber2077-scan-build cyber2077-data-corrupt" data-text="BIOGRAPHY">
              <EditableHeading onChange={() => {}}
                text={sectionLabels.biography || ''}
                defaultText="BIOGRAPHY"
                editMode={editMode}
                glitchEnabled={adminSettings?.glitchTextSettings?.enabled !== false}
                glitchIntervalMs={adminSettings?.glitchTextSettings?.intervalMs}
                glitchDurationMs={adminSettings?.glitchTextSettings?.durationMs}
              />
            </h2>
            
              <div>
                <motion.div
                  initial={{ opacity: 0, x: -30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.8, delay: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
                  className={`text-lg leading-relaxed text-muted-foreground font-light overflow-hidden ${
                    !bioExpanded ? 'max-h-[280px]' : 'max-h-[2000px]'
                  }`}
                  style={{
                    maskImage: !bioExpanded ? 'linear-gradient(to bottom, black 60%, transparent 100%)' : 'none',
                    WebkitMaskImage: !bioExpanded ? 'linear-gradient(to bottom, black 60%, transparent 100%)' : 'none',
                    transition: 'max-height 0.4s cubic-bezier(0.16, 1, 0.3, 1), mask-image 0.3s ease, -webkit-mask-image 0.3s ease',
                  }}
                >
                  {siteData.bio}
                </motion.div>
                <motion.div
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: 0.4 }}
                  className="mt-6"
                >
                  <Button
                    onClick={() => setBioExpanded(!bioExpanded)}
                    variant="outline"
                    className="font-mono hover-glitch cyber-border"
                  >
                    {bioExpanded ? (
                      <>
                        <CaretUp className="w-4 h-4 mr-2" />
                        Show Less
                      </>
                    ) : (
                      <>
                        <CaretDown className="w-4 h-4 mr-2" />
                        Read More
                      </>
                    )}
                  </Button>
                </motion.div>
              </div>
          </motion.div>
        </div>
      </section>
      </>
      )}
      </div>

      <ShellSection
        editMode={editMode}
        adminSettings={adminSettings}
        sectionOrder={getSectionOrder('shell')}
        visible={vis.shell !== false}
        sectionLabel={sectionLabels.shell || ''}
      />

      <CreditHighlightsSection
        siteData={siteData}
        editMode={editMode}
        sectionOrder={getSectionOrder('creditHighlights')}
        visible={vis.creditHighlights !== false}
        sectionLabel={sectionLabels.creditHighlights || ''}
      />

      <div style={{ order: getSectionOrder('music') }}>
      {vis.music !== false && (
      <>
      <Separator className="bg-border" />
      <section id="music" className="py-24 px-4 bg-card/50 scanline-effect crt-effect">
        <div className="container mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0, x: -30, filter: 'blur(10px)', clipPath: 'polygon(0 0, 0 0, 0 100%, 0 100%)' }}
            whileInView={{ opacity: 1, x: 0, filter: 'blur(0px)', clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 100%)' }}
            viewport={{ once: true }}
            transition={{ duration: 1, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            <h2 className="text-4xl md:text-6xl font-bold mb-12 uppercase tracking-tighter text-foreground font-mono hover-chromatic hover-glitch cyber2077-scan-build cyber2077-crt-interference" data-text="MUSIC PLAYER">
              <EditableHeading onChange={() => {}}
                text={sectionLabels.musicPlayer || ''}
                defaultText="MUSIC PLAYER"
                editMode={editMode}
                glitchEnabled={adminSettings?.glitchTextSettings?.enabled !== false}
                glitchIntervalMs={adminSettings?.glitchTextSettings?.intervalMs}
                glitchDurationMs={adminSettings?.glitchTextSettings?.durationMs}
              />
            </h2>

            <Card className="p-0 bg-card border-border relative cyber-card hover-noise overflow-hidden">
              <div className="scan-line"></div>
              <div className="p-4 pb-0">
                <div className="data-label mb-2">// SPOTIFY.STREAM.INTERFACE</div>
              </div>
              <div className="spotify-player-wrapper" style={{ 
                background: 'linear-gradient(180deg, oklch(0.15 0 0) 0%, oklch(0.1 0 0) 100%)',
                borderRadius: '0',
              }}>
                <SpotifyEmbed
                  uri="spotify:artist:7BqEidErPMNiUXCRE0dV2n"
                  width="100%"
                  height={352}
                  theme="0"
                />
              </div>
              <div className="p-4 pt-2">
                <div className="data-label">// STATUS: [STREAMING]</div>
              </div>
            </Card>
          </motion.div>
        </div>
      </section>
      </>
      )}
      </div>

      <div style={{ order: getSectionOrder('gigs') }}>
      {vis.gigs !== false && (
      <>
      <Separator className="bg-border" />
      <section id="gigs" className="py-24 px-4 noise-effect crt-effect">
        <div className="container mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0, x: -30, filter: 'blur(10px)', clipPath: 'polygon(0 0, 0 0, 0 100%, 0 100%)' }}
            whileInView={{ opacity: 1, x: 0, filter: 'blur(0px)', clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 100%)' }}
            viewport={{ once: true }}
            transition={{ duration: 1, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            <div className="flex items-center justify-between mb-12 flex-wrap gap-4">
              <h2 className="text-4xl md:text-6xl font-bold uppercase tracking-tighter text-foreground font-mono hover-chromatic hover-glitch cyber2077-scan-build cyber2077-data-corrupt" data-text="UPCOMING GIGS">
                <EditableHeading onChange={() => {}}
                  text={sectionLabels.upcomingGigs || ''}
                  defaultText="UPCOMING GIGS"
                  editMode={editMode}
                  glitchEnabled={adminSettings?.glitchTextSettings?.enabled !== false}
                  glitchIntervalMs={adminSettings?.glitchTextSettings?.intervalMs}
                  glitchDurationMs={adminSettings?.glitchTextSettings?.durationMs}
                />
              </h2>
            </div>

            {bandsintownFetching && siteData.gigs.length === 0 ? (
              <Card className="p-12 bg-card/50 border-border relative overflow-hidden">
                <div className="flex flex-col items-center justify-center space-y-6">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                  >
                    <ArrowsClockwise className="w-12 h-12 text-primary" />
                  </motion.div>
                  <div className="w-full max-w-md space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="data-label">// LOADING.BANDSINTOWN.EVENTS</span>
                      <motion.span 
                        className="font-mono text-sm text-primary"
                        animate={{ opacity: [0.4, 1, 0.4] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                      >
                        SYNCING...
                      </motion.span>
                    </div>
                    <div className="h-1 bg-border/30 relative overflow-hidden">
                      <motion.div
                        className="absolute inset-0 bg-primary"
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: [0, 0.6, 0.8, 1] }}
                        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                        style={{ transformOrigin: 'left' }}
                      />
                      <motion.div
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-primary-foreground/20 to-transparent"
                        animate={{ x: ['-100%', '200%'] }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      />
                    </div>
                    <div className="flex gap-2 font-mono text-xs text-muted-foreground">
                      <motion.span animate={{ opacity: [0, 1, 0] }} transition={{ duration: 0.8, repeat: Infinity, delay: 0 }}>▸</motion.span>
                      <motion.span animate={{ opacity: [0, 1, 0] }} transition={{ duration: 0.8, repeat: Infinity, delay: 0.2 }}>▸</motion.span>
                      <motion.span animate={{ opacity: [0, 1, 0] }} transition={{ duration: 0.8, repeat: Infinity, delay: 0.4 }}>▸</motion.span>
                      <span className="ml-2">FETCHING LIVE EVENT DATA</span>
                    </div>
                  </div>
                </div>
              </Card>
            ) : siteData.gigs.length === 0 ? (
              <Card className="p-12 text-center bg-card/50 border-border">
                <p className="text-xl text-muted-foreground uppercase tracking-wide font-mono">
                  No upcoming shows - Check back soon
                </p>
              </Card>
            ) : (
              <div className="space-y-4">
                {siteData.gigs.map((gig, index) => (
                  <motion.div
                    key={gig.id}
                    initial={{ opacity: 0, x: -50, clipPath: 'polygon(0 0, 0 0, 0 100%, 0 100%)' }}
                    whileInView={{ opacity: 1, x: 0, clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 100%)' }}
                    viewport={{ once: true }}
                    transition={{ 
                      duration: 0.8, 
                      delay: index * 0.1,
                      ease: [0.25, 0.46, 0.45, 0.94]
                    }}
                  >
                    <Card 
                      className="p-6 bg-card border-border hover:border-primary/50 transition-colors cursor-pointer cyber-card hover-scan hover-noise relative"
                      onClick={() => !editMode && setCyberpunkOverlay({ type: 'gig', data: gig })}
                    >
                      <div className="scan-line"></div>
                      <div className="data-label mb-2">// EVENT.{gig.id}</div>
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="space-y-2">
                          <h3 className="text-xl font-bold uppercase font-mono hover-chromatic">{gig.venue}</h3>
                          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground font-mono">
                            <span className="flex items-center gap-2">
                              <MapPin className="w-4 h-4" />
                              {gig.location}
                            </span>
                            <span className="flex items-center gap-2">
                              <CalendarBlank className="w-4 h-4" />
                              {new Date(gig.date).toLocaleDateString('en-US', { 
                                weekday: 'short', 
                                year: 'numeric', 
                                month: 'short', 
                                day: 'numeric' 
                              })}
                            </span>
                          </div>
                          {gig.support && (
                            <p className="text-sm text-muted-foreground font-mono">
                              Support: {gig.support}
                            </p>
                          )}
                        </div>

                      </div>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        </div>
      </section>
      </>
      )}
      </div>

      <div style={{ order: getSectionOrder('releases') }}>
      {vis.releases !== false && (
      <>
      <Separator className="bg-border" />
      <section id="releases" className="py-24 px-4 bg-card/50 scanline-effect crt-effect">
        <div className="container mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0, x: -30, filter: 'blur(10px)', clipPath: 'polygon(0 0, 0 0, 0 100%, 0 100%)' }}
            whileInView={{ opacity: 1, x: 0, filter: 'blur(0px)', clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 100%)' }}
            viewport={{ once: true }}
            transition={{ duration: 1, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            <div className="flex items-center justify-between mb-12 flex-wrap gap-4">
              <h2 className="text-4xl md:text-6xl font-bold uppercase tracking-tighter text-foreground font-mono hover-chromatic hover-glitch cyber2077-scan-build cyber2077-crt-interference" data-text="RELEASES">
                <EditableHeading onChange={() => {}}
                  text={sectionLabels.releases || ''}
                  defaultText="RELEASES"
                  editMode={editMode}
                  glitchEnabled={adminSettings?.glitchTextSettings?.enabled !== false}
                  glitchIntervalMs={adminSettings?.glitchTextSettings?.intervalMs}
                  glitchDurationMs={adminSettings?.glitchTextSettings?.durationMs}
                />
              </h2>
            </div>

            {(iTunesFetching || !hasAutoLoaded) && siteData.releases.length === 0 ? (
              <Card className="p-12 bg-card/50 border-border relative overflow-hidden">
                <div className="flex flex-col items-center justify-center space-y-6">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                  >
                    <MusicNote className="w-12 h-12 text-primary" />
                  </motion.div>
                  <div className="w-full max-w-md space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="data-label">// LOADING.ITUNES.RELEASES</span>
                      <motion.span 
                        className="font-mono text-sm text-primary"
                        animate={{ opacity: [0.4, 1, 0.4] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                      >
                        SYNCING...
                      </motion.span>
                    </div>
                    <div className="h-1 bg-border/30 relative overflow-hidden">
                      <motion.div
                        className="absolute inset-0 bg-primary"
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: [0, 0.5, 0.7, 1] }}
                        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                        style={{ transformOrigin: 'left' }}
                      />
                      <motion.div
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-primary-foreground/20 to-transparent"
                        animate={{ x: ['-100%', '200%'] }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      />
                    </div>
                    <div className="flex gap-2 font-mono text-xs text-muted-foreground">
                      <motion.span animate={{ opacity: [0, 1, 0] }} transition={{ duration: 0.8, repeat: Infinity, delay: 0 }}>▸</motion.span>
                      <motion.span animate={{ opacity: [0, 1, 0] }} transition={{ duration: 0.8, repeat: Infinity, delay: 0.2 }}>▸</motion.span>
                      <motion.span animate={{ opacity: [0, 1, 0] }} transition={{ duration: 0.8, repeat: Infinity, delay: 0.4 }}>▸</motion.span>
                      <span className="ml-2">FETCHING DISCOGRAPHY + STREAMING LINKS</span>
                    </div>
                  </div>
                </div>
              </Card>
            ) : siteData.releases.length === 0 ? (
              <Card className="p-12 text-center bg-card/50 border-border">
                <p className="text-xl text-muted-foreground uppercase tracking-wide font-mono">
                  Releases coming soon
                </p>
              </Card>
            ) : (
              <>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                  {(() => {
                    const sorted = [...siteData.releases].sort((a, b) => {
                      const yearA = a.releaseDate ? new Date(a.releaseDate).getTime() : parseInt(a.year) || 0
                      const yearB = b.releaseDate ? new Date(b.releaseDate).getTime() : parseInt(b.year) || 0
                      return yearB - yearA
                    })
                    const visible = showAllReleases ? sorted : sorted.slice(0, 6)
                    return visible.map((release, index) => (
                      <motion.div
                        key={release.id}
                        initial={{ opacity: 0, clipPath: 'inset(0 0 100% 0)' }}
                        whileInView={{ opacity: 1, clipPath: 'inset(0 0 0% 0)' }}
                        viewport={{ once: true }}
                        transition={{ 
                          duration: 0.6,
                          delay: index * 0.08,
                          ease: [0.25, 0.46, 0.45, 0.94]
                        }}
                      >
                        <Card 
                          className="overflow-hidden bg-card border-border hover:border-primary/50 transition-all cursor-pointer cyber-card hover-noise relative"
                          onClick={() => !editMode && setCyberpunkOverlay({ type: 'release', data: release })}
                        >
                          <div className="data-label absolute top-2 left-2 z-10">// REL.{release.year}</div>
                          <div className="aspect-square bg-muted relative">
                            {release.artwork && (
                              <img src={release.artwork} alt={release.title} className="w-full h-full object-cover glitch-image hover-chromatic-image" />
                            )}
                          </div>
                          <div className="p-4">
                            <h3 className="font-bold uppercase text-sm mb-1 truncate font-mono hover-chromatic">{release.title}</h3>
                            <p className="text-xs text-muted-foreground mb-3 font-mono">{release.year}</p>
                          </div>
                        </Card>
                      </motion.div>
                    ))
                  })()}
                </div>
                {siteData.releases.length > 6 && (
                  <motion.div 
                    className="flex justify-center mt-8"
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                  >
                    <Button
                      variant="outline"
                      size="lg"
                      onClick={() => setShowAllReleases(!showAllReleases)}
                      className="gap-2 uppercase font-mono cyber-border hover-glitch"
                    >
                      {showAllReleases ? (
                        <>
                          <CaretUp className="w-4 h-4" />
                          Show Less
                        </>
                      ) : (
                        <>
                          <CaretDown className="w-4 h-4" />
                          Show All ({siteData.releases.length})
                        </>
                      )}
                    </Button>
                  </motion.div>
                )}
              </>
            )}
          </motion.div>
        </div>
      </section>
      </>
      )}
      </div>

      <GallerySection
        siteData={siteData}
        editMode={editMode}
        sectionOrder={getSectionOrder('gallery')}
        visible={vis.gallery !== false}
        sectionLabel={sectionLabels.gallery || ''}
        setGalleryIndex={setGalleryIndex}
        adminSettings={adminSettings}
      />

      <div style={{ order: getSectionOrder('media') }}>
      <Separator className="bg-border" />

      <MediaBrowser
        mediaFiles={siteData.mediaFiles?.map(f => ({
          id: f.id,
          name: f.name,
          url: f.url,
          type: f.type === 'image' || f.type === 'pdf' || f.type === 'zip' ? 'download' as const : (f.type as 'audio' | 'youtube' | 'download' | undefined),
          description: f.size,
        })) || []}
        editMode={editMode}
      />
      </div>

      <div style={{ order: getSectionOrder('connect') }}>
      {vis.connect !== false && (
      <>
      <Separator className="bg-border" />
      <section id="connect" className="py-24 px-4 bg-card/50 scanline-effect crt-effect">
        <div className="container mx-auto max-w-4xl">
          <motion.div
            initial={{ opacity: 0, x: -30, filter: 'blur(10px)', clipPath: 'polygon(0 0, 0 0, 0 100%, 0 100%)' }}
            whileInView={{ opacity: 1, x: 0, filter: 'blur(0px)', clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 100%)' }}
            viewport={{ once: true }}
            transition={{ duration: 1, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="text-center"
          >
            <h2 className="text-4xl md:text-6xl font-bold mb-12 uppercase tracking-tighter text-foreground font-mono hover-chromatic hover-glitch cyber2077-scan-build cyber2077-crt-interference" data-text="CONNECT">
              <EditableHeading onChange={() => {}}
                text={sectionLabels.connect || ''}
                defaultText="CONNECT"
                editMode={editMode}
                glitchEnabled={adminSettings?.glitchTextSettings?.enabled !== false}
                glitchIntervalMs={adminSettings?.glitchTextSettings?.intervalMs}
                glitchDurationMs={adminSettings?.glitchTextSettings?.durationMs}
              />
            </h2>


            <div className="flex flex-wrap justify-center gap-6">
              {([
                { key: 'instagram', Icon: InstagramLogo, label: 'Instagram' },
                { key: 'facebook', Icon: FacebookLogo, label: 'Facebook' },
                { key: 'spotify', Icon: SpotifyLogo, label: 'Spotify' },
                { key: 'youtube', Icon: YoutubeLogo, label: 'YouTube' },
                { key: 'soundcloud', Icon: SoundcloudLogo, label: 'SoundCloud' },
                { key: 'tiktok', Icon: TiktokLogo, label: 'TikTok' },
                { key: 'bandcamp', Icon: Storefront, label: 'Bandcamp' },
                { key: 'appleMusic', Icon: ApplePodcastsLogo, label: 'Apple Music' },
                { key: 'twitter', Icon: MusicNote, label: 'X' },
                { key: 'twitch', Icon: MusicNote, label: 'Twitch' },
                { key: 'beatport', Icon: MusicNote, label: 'Beatport' },
                { key: 'linktree', Icon: MusicNote, label: 'Linktree' },
              ] as { key: keyof typeof siteData.social; Icon: React.ComponentType<{ className?: string; weight?: string }>; label: string }[]).map(({ key, Icon, label }, index) => (
                siteData.social[key] ? (
                  <motion.a
                    key={key}
                    href={siteData.social[key]}
                    target="_blank"
                    rel="noopener noreferrer"
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: 0.1 + index * 0.08, ease: [0.25, 0.46, 0.45, 0.94] }}
                    className="text-foreground hover:text-primary transition-colors hover-glitch hover-chromatic relative flex flex-col items-center gap-1"
                    title={label}
                  >
                    <Icon className="w-12 h-12" weight="fill" />
                    <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">{label}</span>
                  </motion.a>
                ) : null
              ))}
            </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.8 }}
              className="mt-12 flex flex-wrap justify-center gap-4"
            >
              <Button asChild size="lg" variant="outline" className="uppercase font-mono hover-glitch cyber-border">
                <a href="https://zardonic.channl.co/merch" target="_blank" rel="noopener noreferrer">
                  <Storefront className="w-5 h-5 mr-2" />
                  <span className="hover-chromatic">Merch Shop</span>
                </a>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="uppercase font-mono hover-glitch cyber-border"
                onClick={() => setCyberpunkOverlay({ type: 'contact' })}
              >
                <Envelope className="w-5 h-5 mr-2" />
                <span className="hover-chromatic">Contact</span>
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </section>
      </>
      )}
      </div>

      {/* Contact Section */}
      <div style={{ order: getSectionOrder('contact') }}>
      {vis.contact !== false && (
        <ContactSection
          contactSettings={contactSettings}
          editMode={editMode}
          sectionLabels={sectionLabels}
        />
      )}
      </div>

      </div>{/* end flex container for reorderable sections */}

      <AppFooter
        artistName={siteData?.artistName || ''}
        isOwner={isOwner}
        adminPasswordHash={adminPasswordHash || ''}
        setShowLoginDialog={setShowLoginDialog}
        setShowSetupDialog={setShowSetupDialog}
        setCyberpunkOverlay={setCyberpunkOverlay}
        setLanguage={setLanguage}
      />

      <AnimatePresence>
        {galleryIndex !== null && siteData && (
          <SwipeableGallery
            images={siteData.gallery}
            initialIndex={galleryIndex}
            onClose={() => setGalleryIndex(null)}
          />
        )}
      </AnimatePresence>

      <Suspense fallback={null}>
        <Terminal
          isOpen={terminalOpen}
          onClose={() => setTerminalOpen(false)}
          customCommands={terminalCommands}
          editMode={editMode}
          onSaveCommands={(() => {})}
        />
      </Suspense>

      <Suspense fallback={null}>
        <StatsDashboard open={showStats} onClose={() => setShowStats(false)} />
      </Suspense>

      <AnimatePresence>
        {cyberpunkOverlay && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="fixed inset-0 bg-black/90 z-[100] backdrop-blur-sm cyberpunk-overlay-bg"
              onClick={() => setCyberpunkOverlay(null)}
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3 }}
              className="fixed inset-0 z-[101] flex items-center justify-center p-4 md:p-8 pointer-events-none"
              style={{ perspective: '1000px' }}
            >
              <motion.div 
                initial={{ boxShadow: '0 0 0px rgba(180, 50, 50, 0)' }}
                animate={{ 
                  boxShadow: [
                    '0 0 20px rgba(180, 50, 50, 0.3)',
                    '0 0 40px rgba(180, 50, 50, 0.4)',
                    '0 0 20px rgba(180, 50, 50, 0.3)',
                  ]
                }}
                transition={{ 
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                className="relative max-w-4xl w-full bg-background/98 border border-primary/30 pointer-events-auto overflow-hidden max-h-[90vh] scanline-effect cyber-card"
                onClick={(e) => e.stopPropagation()}
              >
                <motion.div 
                  className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-primary"
                  initial={{ opacity: 0, x: -10, y: -10 }}
                  animate={{ opacity: 1, x: 0, y: 0 }}
                  transition={{ delay: 0.15, duration: 0.3 }}
                />
                <motion.div 
                  className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-primary"
                  initial={{ opacity: 0, x: 10, y: -10 }}
                  animate={{ opacity: 1, x: 0, y: 0 }}
                  transition={{ delay: 0.2, duration: 0.3 }}
                />
                <motion.div 
                  className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-primary"
                  initial={{ opacity: 0, x: -10, y: 10 }}
                  animate={{ opacity: 1, x: 0, y: 0 }}
                  transition={{ delay: 0.25, duration: 0.3 }}
                />
                <motion.div 
                  className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-primary"
                  initial={{ opacity: 0, x: 10, y: 10 }}
                  animate={{ opacity: 1, x: 0, y: 0 }}
                  transition={{ delay: 0.3, duration: 0.3 }}
                />
                
                <motion.div 
                  className="absolute top-2 left-1/2 -translate-x-1/2"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.35, duration: 0.3 }}
                >
                  <div className="data-label">// SYSTEM.INTERFACE.v2.0</div>
                </motion.div>

                <motion.div 
                  className="absolute top-0 left-0 right-0 h-1 bg-primary/20"
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: 0.4, delay: 0.1 }}
                  style={{ transformOrigin: 'left' }}
                />
                <motion.div 
                  className="absolute bottom-0 left-0 right-0 h-1 bg-primary/20"
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: 0.4, delay: 0.15 }}
                  style={{ transformOrigin: 'right' }}
                />

                {/* 3-phase content loading wrapper */}
                <div className="relative overflow-y-auto max-h-[90vh]">
                  {/* Loading phase */}
                  {overlayPhase === 'loading' && (
                    <div className="flex items-center justify-center min-h-[400px]">
                      <motion.span 
                        className="progressive-loading-label text-primary font-mono text-lg"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                      >
                        {loadingText}
                      </motion.span>
                    </div>
                  )}

                  {/* Glitch phase */}
                  {overlayPhase === 'glitch' && (
                    <div className="flex items-center justify-center min-h-[400px]">
                      <motion.div
                        className="glitch-effect text-primary font-mono text-lg"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: [0, 1, 0, 1, 0, 1] }}
                        transition={{ duration: 0.2 }}
                      >
                        {loadingText}
                      </motion.div>
                    </div>
                  )}

                  {/* Revealed phase */}
                  {overlayPhase === 'revealed' && (
                    <div className="p-8 md:p-12 pt-12">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-4 right-4 text-foreground hover:text-primary hover:bg-primary/10 z-10"
                      onClick={() => setCyberpunkOverlay(null)}
                    >
                      <X className="w-6 h-6" />
                    </Button>

                    <AnimatePresence mode="wait">
                      {overlayPhase === 'revealed' && (
                        <>
                          {cyberpunkOverlay.type === 'impressum' && (
                            <motion.div 
                              className="mt-8 space-y-6"
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: 20 }}
                              transition={{ duration: 0.3, staggerChildren: 0.05 }}
                            >
                              <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1 }}
                              >
                                <div className="data-label mb-2">// LEGAL.INFORMATION.STREAM</div>
                                <h2 className="text-4xl md:text-5xl font-bold uppercase font-mono mb-4 hover-chromatic crt-flash-in" data-text="IMPRESSUM">
                                  IMPRESSUM
                                </h2>
                              </motion.div>

                              {adminSettings?.legalContent?.impressumCustom ? (
                                <div className="cyber-grid p-4">
                                  <div className="font-mono text-sm leading-relaxed whitespace-pre-wrap text-foreground/90">
                                    {adminSettings.legalContent.impressumCustom}
                                  </div>
                                </div>
                              ) : (
                              <div className="space-y-6 text-foreground/90">
                                <motion.div 
                                  className="cyber-grid p-4"
                                  initial={{ opacity: 0, x: -10 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: 0.2 }}
                                >
                                  <div className="data-label mb-2">Angaben gemäß § 5 DDG</div>
                                  <div className="space-y-2 font-mono text-sm">
                                    <p>Federico Augusto Ágreda Álvarez</p>
                                    <p>c/o Online-Impressum.de #6397</p>
                                    <p>Europaring 90</p>
                                    <p>53757 Sankt Augustin</p>
                                    <p>Deutschland</p>
                                  </div>
                                </motion.div>

                                <motion.div 
                                  className="cyber-grid p-4"
                                  initial={{ opacity: 0, x: -10 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: 0.3 }}
                                >
                                  <div className="data-label mb-2">Kontakt / Contact</div>
                                  <div className="space-y-2 font-mono text-sm">
                                    <p>E-Mail: info@zardonic.net</p>
                                    <p>Website: www.zardonic.net</p>
                                  </div>
                                </motion.div>

                                <motion.div 
                                  className="cyber-grid p-4"
                                  initial={{ opacity: 0, x: -10 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: 0.35 }}
                                >
                                  <div className="data-label mb-2">Umsatzsteuer-Identifikationsnummer</div>
                                  <div className="space-y-2 font-mono text-sm">
                                    <p>Umsatzsteuer-Identifikationsnummer gemäß § 27a UStG:</p>
                                    <p>DE325982176</p>
                                  </div>
                                </motion.div>

                                <motion.div 
                                  className="cyber-grid p-4"
                                  initial={{ opacity: 0, x: -10 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: 0.4 }}
                                >
                                  <div className="data-label mb-2">Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV</div>
                                  <div className="space-y-2 font-mono text-sm">
                                    <p>Federico Augusto Ágreda Álvarez</p>
                                  </div>
                                </motion.div>

                                <motion.div 
                                  className="cyber-grid p-4"
                                  initial={{ opacity: 0, x: -10 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: 0.45 }}
                                >
                                  <div className="data-label mb-2">EU-Streitschlichtung</div>
                                  <div className="space-y-3 font-mono text-sm leading-relaxed">
                                    <p>Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit: <a href="https://ec.europa.eu/consumers/odr/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">https://ec.europa.eu/consumers/odr/</a></p>
                                    <p>The European Commission provides a platform for online dispute resolution (ODR): <a href="https://ec.europa.eu/consumers/odr/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">https://ec.europa.eu/consumers/odr/</a></p>
                                    <p>Unsere E-Mail-Adresse finden Sie oben im Impressum. / Our e-mail address can be found above in the Impressum.</p>
                                  </div>
                                </motion.div>

                                <motion.div 
                                  className="cyber-grid p-4"
                                  initial={{ opacity: 0, x: -10 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: 0.5 }}
                                >
                                  <div className="data-label mb-2">Verbraucherstreitbeilegung / Universalschlichtungsstelle</div>
                                  <div className="space-y-3 font-mono text-sm leading-relaxed">
                                    <p>Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.</p>
                                    <p>We are not willing or obliged to participate in dispute resolution proceedings before a consumer arbitration board.</p>
                                  </div>
                                </motion.div>

                                <motion.div 
                                  className="cyber-grid p-4"
                                  initial={{ opacity: 0, x: -10 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: 0.55 }}
                                >
                                  <div className="data-label mb-2">Haftung für Inhalte / Liability for Content</div>
                                  <div className="space-y-3 font-mono text-sm leading-relaxed">
                                    <p>Als Diensteanbieter sind wir gemäß § 7 Abs. 1 DDG für eigene Inhalte auf diesen Seiten nach den allgemeinen Gesetzen verantwortlich. Nach §§ 8 bis 10 DDG sind wir als Diensteanbieter jedoch nicht verpflichtet, übermittelte oder gespeicherte fremde Informationen zu überwachen oder nach Umständen zu forschen, die auf eine rechtswidrige Tätigkeit hinweisen.</p>
                                    <p>As a service provider, we are responsible for our own content on these pages in accordance with § 7 (1) DDG and general laws. According to §§ 8 to 10 DDG, however, we are not obliged as a service provider to monitor transmitted or stored third-party information or to investigate circumstances that indicate illegal activity.</p>
                                  </div>
                                </motion.div>

                                <motion.div 
                                  className="cyber-grid p-4"
                                  initial={{ opacity: 0, x: -10 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: 0.6 }}
                                >
                                  <div className="data-label mb-2">Haftung für Links / Liability for Links</div>
                                  <div className="space-y-3 font-mono text-sm leading-relaxed">
                                    <p>Unser Angebot enthält Links zu externen Websites Dritter, auf deren Inhalte wir keinen Einfluss haben. Deshalb können wir für diese fremden Inhalte auch keine Gewähr übernehmen. Für die Inhalte der verlinkten Seiten ist stets der jeweilige Anbieter oder Betreiber der Seiten verantwortlich.</p>
                                    <p>Our website contains links to external third-party websites over whose content we have no control. Therefore, we cannot accept any liability for this third-party content. The respective provider or operator of the linked pages is always responsible for the content of the linked pages.</p>
                                  </div>
                                </motion.div>

                                <motion.div 
                                  className="cyber-grid p-4"
                                  initial={{ opacity: 0, x: -10 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: 0.65 }}
                                >
                                  <div className="data-label mb-2">Urheberrecht / Copyright</div>
                                  <div className="space-y-3 font-mono text-sm leading-relaxed">
                                    <p>Die durch die Seitenbetreiber erstellten Inhalte und Werke auf diesen Seiten unterliegen dem Urheberrecht. Die Vervielfältigung, Bearbeitung, Verbreitung und jede Art der Verwertung außerhalb der Grenzen des Urheberrechtes bedürfen der schriftlichen Zustimmung des jeweiligen Autors bzw. Erstellers. Downloads und Kopien dieser Seite sind nur für den privaten, nicht kommerziellen Gebrauch gestattet.</p>
                                    <p>The content and works on these pages created by the site operators are subject to copyright law. Duplication, processing, distribution, and any form of exploitation beyond the scope of copyright law require the written consent of the respective author or creator. Downloads and copies of this page are only permitted for private, non-commercial use.</p>
                                  </div>
                                </motion.div>
                              </div>
                              )}

                              <motion.div 
                                className="pt-6 border-t border-border"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.7 }}
                              >
                                <div className="data-label">// SYSTEM.STATUS: [ACTIVE]</div>
                              </motion.div>
                            </motion.div>
                          )}

                          {cyberpunkOverlay.type === 'privacy' && (
                            <motion.div 
                              className="mt-8 space-y-6"
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: 20 }}
                              transition={{ duration: 0.3 }}
                            >
                              <motion.div 
                                className="flex items-center justify-between mb-6"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1 }}
                              >
                                <div>
                                  <div className="data-label mb-2">// PRIVACY.POLICY.STREAM</div>
                                  <h2 className="text-4xl md:text-5xl font-bold uppercase font-mono mb-4 hover-chromatic crt-flash-in" data-text="PRIVACY POLICY">
                                    {language === 'de' ? 'DATENSCHUTZERKLÄRUNG' : 'PRIVACY POLICY'}
                                  </h2>
                                </div>
                                <div className="flex gap-2">
                                  <Button
                                    variant={language === 'en' ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => setLanguage('en')}
                                    className="font-mono"
                                  >
                                    EN
                                  </Button>
                                  <Button
                                    variant={language === 'de' ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => setLanguage('de')}
                                    className="font-mono"
                                  >
                                    DE
                                  </Button>
                                </div>
                              </motion.div>

                              {adminSettings?.legalContent?.privacyCustom ? (
                                <div className="cyber-grid p-4">
                                  <div className="font-mono text-sm leading-relaxed whitespace-pre-wrap text-foreground/90">
                                    {adminSettings.legalContent.privacyCustom}
                                  </div>
                                </div>
                              ) : (
                              <>
                              {language === 'en' ? (
                                <div className="space-y-6 text-foreground/90">
                                  <motion.div className="cyber-grid p-4" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
                                    <div className="data-label mb-2">1. Data Protection at a Glance</div>
                                    <div className="space-y-3 font-mono text-sm leading-relaxed">
                                      <p className="font-bold text-primary">General Information</p>
                                      <p>The following information provides a simple overview of what happens to your personal data when you visit this website. Personal data is any data that can be used to identify you personally. For detailed information on data protection, please refer to our privacy policy listed below.</p>
                                      <p className="font-bold text-primary mt-4">Data Collection on this Website</p>
                                      <p>Data processing on this website is carried out by the website operator: Federico Ágreda Álvarez (ZARDONIC), E-Mail: info@zardonic.com.</p>
                                      <p>Your data is collected either because you provide it to us or because it is automatically recorded by our IT systems when you visit the website (e.g., technical data such as your internet browser, operating system, or time of access). This data is collected automatically as soon as you enter our website.</p>
                                      <p className="font-bold text-primary mt-4">What do we use your data for?</p>
                                      <p>Some data is collected to ensure the error-free provision of the website. No data is used for analyzing user behavior or marketing purposes.</p>
                                    </div>
                                  </motion.div>

                                  <motion.div className="cyber-grid p-4" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}>
                                    <div className="data-label mb-2">2. Hosting</div>
                                    <div className="space-y-3 font-mono text-sm leading-relaxed">
                                      <p>This website is hosted by Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723, USA. When you visit our website, your personal data (e.g., IP address) is processed by Vercel on their servers. This may involve the transfer of data to the USA. For more information, see Vercel&apos;s privacy policy: <a href="https://vercel.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">https://vercel.com/legal/privacy-policy</a></p>
                                      <p>The use of Vercel is based on Art. 6(1)(f) GDPR. We have a legitimate interest in a reliable presentation of our website.</p>
                                    </div>
                                  </motion.div>

                                  <motion.div className="cyber-grid p-4" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.35 }}>
                                    <div className="data-label mb-2">3. General Information &amp; Mandatory Information</div>
                                    <div className="space-y-3 font-mono text-sm leading-relaxed">
                                      <p className="font-bold text-primary">Data Protection</p>
                                      <p>We take the protection of your personal data very seriously. We treat your personal data confidentially and in accordance with the statutory data protection regulations (GDPR, BDSG) and this privacy policy.</p>
                                      <p className="font-bold text-primary mt-4">Note on the Responsible Party</p>
                                      <p>The responsible party for data processing on this website is: Federico Ágreda Álvarez (ZARDONIC), E-Mail: info@zardonic.com.</p>
                                      <p>The responsible party is the natural person who alone or jointly with others decides on the purposes and means of the processing of personal data.</p>
                                      <p className="font-bold text-primary mt-4">Storage Duration</p>
                                      <p>Unless a specific storage period is mentioned within this privacy policy, your personal data will remain with us until the purpose for data processing no longer applies. If you assert a legitimate request for deletion or revoke consent for data processing, your data will be deleted unless we have other legally permissible reasons for storing your personal data; in such cases, deletion will take place after these reasons cease to apply.</p>
                                      <p className="font-bold text-primary mt-4">Legal Basis for Processing</p>
                                      <p>Where we obtain consent for processing operations, Art. 6(1)(a) GDPR serves as the legal basis. For processing necessary for the performance of a contract, Art. 6(1)(b) GDPR serves as the legal basis. For processing necessary for compliance with a legal obligation, Art. 6(1)(c) GDPR serves as the legal basis. Where processing is necessary for the purposes of legitimate interests, Art. 6(1)(f) GDPR serves as the legal basis.</p>
                                      <p className="font-bold text-primary mt-4">SSL/TLS Encryption</p>
                                      <p>This site uses SSL/TLS encryption for security reasons and to protect the transmission of confidential content. You can recognize an encrypted connection by the lock icon in your browser&apos;s address bar and by the address starting with &quot;https://&quot;.</p>
                                    </div>
                                  </motion.div>

                                  <motion.div className="cyber-grid p-4" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }}>
                                    <div className="data-label mb-2">4. Data Collection on this Website</div>
                                    <div className="space-y-3 font-mono text-sm leading-relaxed">
                                      <p className="font-bold text-primary">Server Log Files</p>
                                      <p>The hosting provider automatically collects and stores information in server log files that your browser transmits to us. These are: browser type and version, operating system, referrer URL, hostname of the accessing computer, time of the server request, and IP address. This data is not merged with other data sources. This data is collected on the basis of Art. 6(1)(f) GDPR.</p>
                                      <p className="font-bold text-primary mt-4">Local Storage</p>
                                      <p>This website uses the browser&apos;s local storage to save your preferences (e.g., volume settings, edit mode state). This data is stored exclusively on your device and is not transmitted to us. You can clear this data at any time via your browser settings.</p>
                                    </div>
                                  </motion.div>

                                  <motion.div className="cyber-grid p-4" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.45 }}>
                                    <div className="data-label mb-2">5. External APIs &amp; Third-Party Services</div>
                                    <div className="space-y-3 font-mono text-sm leading-relaxed">
                                      <p className="font-bold text-primary">Spotify Embed (Client-Side)</p>
                                      <p>This website uses the Spotify iFrame Embed to provide an integrated music player. When the player loads, a direct connection to Spotify servers is established from your browser. Provider: Spotify AB, Regeringsgatan 19, 111 53 Stockholm, Sweden. Spotify may process your IP address, browser information, and usage data. Privacy policy: <a href="https://www.spotify.com/legal/privacy-policy/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">https://www.spotify.com/legal/privacy-policy/</a></p>
                                      <p>The use of Spotify Embed is based on Art. 6(1)(f) GDPR. We have a legitimate interest in presenting our music in an interactive and user-friendly manner.</p>
                                      <p className="font-bold text-primary mt-4">Server-Side APIs</p>
                                      <p>This website also uses server-side proxies to connect to the following third-party APIs. Your IP address is not directly shared with these services; requests are made from our server:</p>
                                      <p className="font-bold text-primary mt-4">Apple Music / iTunes API</p>
                                      <p>We use the Apple iTunes Search API to retrieve music release information and artwork. Provider: Apple Inc., One Apple Park Way, Cupertino, CA 95014, USA. Privacy policy: <a href="https://www.apple.com/legal/privacy/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">https://www.apple.com/legal/privacy/</a></p>
                                      <p className="font-bold text-primary mt-4">Odesli / song.link API</p>
                                      <p>We use the Odesli API to generate cross-platform streaming links (Spotify, YouTube, SoundCloud, etc.). Provider: Odesli, Inc. Privacy policy: <a href="https://odesli.co/privacy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">https://odesli.co/privacy</a></p>
                                      <p className="font-bold text-primary mt-4">Bandsintown API</p>
                                      <p>We use the Bandsintown API to display upcoming live events and tour dates. Provider: Bandsintown Inc., 24 W 25th St., New York, NY 10010, USA. Privacy policy: <a href="https://corp.bandsintown.com/privacy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">https://corp.bandsintown.com/privacy</a></p>
                                      <p>The use of these services is based on Art. 6(1)(f) GDPR. We have a legitimate interest in displaying accurate and up-to-date music and event information.</p>
                                    </div>
                                  </motion.div>

                                  <motion.div className="cyber-grid p-4" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 }}>
                                    <div className="data-label mb-2">6. Your Rights</div>
                                    <div className="space-y-3 font-mono text-sm leading-relaxed">
                                      <p>Under the GDPR, you have the following rights:</p>
                                      <p><span className="text-primary">• Right of Access (Art. 15 GDPR)</span> — You have the right to request information about your personal data processed by us.</p>
                                      <p><span className="text-primary">• Right to Rectification (Art. 16 GDPR)</span> — You have the right to request the correction of inaccurate personal data.</p>
                                      <p><span className="text-primary">• Right to Erasure (Art. 17 GDPR)</span> — You have the right to request the deletion of your personal data.</p>
                                      <p><span className="text-primary">• Right to Restriction (Art. 18 GDPR)</span> — You have the right to request the restriction of the processing of your personal data.</p>
                                      <p><span className="text-primary">• Right to Data Portability (Art. 20 GDPR)</span> — You have the right to receive your personal data in a structured, commonly used, and machine-readable format.</p>
                                      <p><span className="text-primary">• Right to Object (Art. 21 GDPR)</span> — You have the right to object to the processing of your personal data at any time.</p>
                                      <p><span className="text-primary">• Right to Withdraw Consent (Art. 7(3) GDPR)</span> — You have the right to withdraw your consent at any time.</p>
                                      <p><span className="text-primary">• Right to Lodge a Complaint (Art. 77 GDPR)</span> — You have the right to lodge a complaint with a supervisory authority.</p>
                                    </div>
                                  </motion.div>
                                </div>
                              ) : (
                                <div className="space-y-6 text-foreground/90">
                                  <motion.div className="cyber-grid p-4" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
                                    <div className="data-label mb-2">1. Datenschutz auf einen Blick</div>
                                    <div className="space-y-3 font-mono text-sm leading-relaxed">
                                      <p className="font-bold text-primary">Allgemeine Hinweise</p>
                                      <p>Die folgenden Hinweise geben einen einfachen Überblick darüber, was mit Ihren personenbezogenen Daten passiert, wenn Sie diese Website besuchen. Personenbezogene Daten sind alle Daten, mit denen Sie persönlich identifiziert werden können. Ausführliche Informationen zum Thema Datenschutz entnehmen Sie unserer unter diesem Text aufgeführten Datenschutzerklärung.</p>
                                      <p className="font-bold text-primary mt-4">Datenerfassung auf dieser Website</p>
                                      <p>Die Datenverarbeitung auf dieser Website erfolgt durch den Websitebetreiber: Federico Ágreda Álvarez (ZARDONIC), E-Mail: info@zardonic.com.</p>
                                      <p>Ihre Daten werden zum einen dadurch erhoben, dass Sie uns diese mitteilen. Andere Daten werden automatisch oder nach Ihrer Einwilligung beim Besuch der Website durch unsere IT-Systeme erfasst. Das sind vor allem technische Daten (z.B. Internetbrowser, Betriebssystem oder Uhrzeit des Seitenaufrufs).</p>
                                      <p className="font-bold text-primary mt-4">Wofür nutzen wir Ihre Daten?</p>
                                      <p>Ein Teil der Daten wird erhoben, um eine fehlerfreie Bereitstellung der Website zu gewährleisten. Es werden keine Daten zur Analyse des Nutzerverhaltens oder zu Marketingzwecken verwendet.</p>
                                    </div>
                                  </motion.div>

                                  <motion.div className="cyber-grid p-4" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}>
                                    <div className="data-label mb-2">2. Hosting</div>
                                    <div className="space-y-3 font-mono text-sm leading-relaxed">
                                      <p>Diese Website wird bei Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723, USA gehostet. Wenn Sie unsere Website besuchen, werden Ihre personenbezogenen Daten (z.B. IP-Adresse) auf den Servern von Vercel verarbeitet. Dies kann mit einer Übermittlung von Daten in die USA verbunden sein. Weitere Informationen entnehmen Sie der Datenschutzerklärung von Vercel: <a href="https://vercel.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">https://vercel.com/legal/privacy-policy</a></p>
                                      <p>Die Verwendung von Vercel erfolgt auf Grundlage von Art. 6 Abs. 1 lit. f DSGVO. Wir haben ein berechtigtes Interesse an einer zuverlässigen Darstellung unserer Website.</p>
                                    </div>
                                  </motion.div>

                                  <motion.div className="cyber-grid p-4" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.35 }}>
                                    <div className="data-label mb-2">3. Allgemeine Hinweise und Pflichtinformationen</div>
                                    <div className="space-y-3 font-mono text-sm leading-relaxed">
                                      <p className="font-bold text-primary">Datenschutz</p>
                                      <p>Wir nehmen den Schutz Ihrer persönlichen Daten sehr ernst. Wir behandeln Ihre personenbezogenen Daten vertraulich und entsprechend der gesetzlichen Datenschutzvorschriften (DSGVO, BDSG) sowie dieser Datenschutzerklärung.</p>
                                      <p className="font-bold text-primary mt-4">Hinweis zur verantwortlichen Stelle</p>
                                      <p>Verantwortlich für die Datenverarbeitung auf dieser Website ist: Federico Ágreda Álvarez (ZARDONIC), E-Mail: info@zardonic.com.</p>
                                      <p>Verantwortliche Stelle ist die natürliche Person, die allein oder gemeinsam mit anderen über die Zwecke und Mittel der Verarbeitung personenbezogener Daten entscheidet.</p>
                                      <p className="font-bold text-primary mt-4">Speicherdauer</p>
                                      <p>Soweit innerhalb dieser Datenschutzerklärung keine speziellere Speicherdauer genannt wurde, verbleiben Ihre personenbezogenen Daten bei uns, bis der Zweck für die Datenverarbeitung entfällt. Wenn Sie ein berechtigtes Löschersuchen geltend machen oder eine Einwilligung zur Datenverarbeitung widerrufen, werden Ihre Daten gelöscht, sofern wir keine anderen rechtlich zulässigen Gründe für die Speicherung haben; in einem solchen Fall erfolgt die Löschung nach Fortfall dieser Gründe.</p>
                                      <p className="font-bold text-primary mt-4">Rechtsgrundlagen der Verarbeitung</p>
                                      <p>Soweit wir für Verarbeitungsvorgänge eine Einwilligung einholen, dient Art. 6 Abs. 1 lit. a DSGVO als Rechtsgrundlage. Für Verarbeitungen zur Vertragserfüllung dient Art. 6 Abs. 1 lit. b DSGVO. Für Verarbeitungen zur Erfüllung rechtlicher Verpflichtungen dient Art. 6 Abs. 1 lit. c DSGVO. Soweit die Verarbeitung zur Wahrung berechtigter Interessen erforderlich ist, dient Art. 6 Abs. 1 lit. f DSGVO als Rechtsgrundlage.</p>
                                      <p className="font-bold text-primary mt-4">SSL- bzw. TLS-Verschlüsselung</p>
                                      <p>Diese Seite nutzt aus Sicherheitsgründen eine SSL- bzw. TLS-Verschlüsselung. Eine verschlüsselte Verbindung erkennen Sie am Schloss-Symbol in der Adresszeile Ihres Browsers und daran, dass die Adresse mit &quot;https://&quot; beginnt.</p>
                                    </div>
                                  </motion.div>

                                  <motion.div className="cyber-grid p-4" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }}>
                                    <div className="data-label mb-2">4. Datenerfassung auf dieser Website</div>
                                    <div className="space-y-3 font-mono text-sm leading-relaxed">
                                      <p className="font-bold text-primary">Server-Log-Dateien</p>
                                      <p>Der Provider der Seiten erhebt und speichert automatisch Informationen in sogenannten Server-Log-Dateien, die Ihr Browser automatisch an uns übermittelt. Dies sind: Browsertyp und -version, verwendetes Betriebssystem, Referrer URL, Hostname des zugreifenden Rechners, Uhrzeit der Serveranfrage und IP-Adresse. Eine Zusammenführung dieser Daten mit anderen Datenquellen wird nicht vorgenommen. Die Erfassung erfolgt auf Grundlage von Art. 6 Abs. 1 lit. f DSGVO.</p>
                                      <p className="font-bold text-primary mt-4">Lokaler Speicher (Local Storage)</p>
                                      <p>Diese Website nutzt den lokalen Speicher Ihres Browsers, um Ihre Einstellungen zu speichern (z.B. Lautstärke, Bearbeitungsmodus). Diese Daten werden ausschließlich auf Ihrem Gerät gespeichert und nicht an uns übermittelt. Sie können diese Daten jederzeit über Ihre Browsereinstellungen löschen.</p>
                                    </div>
                                  </motion.div>

                                  <motion.div className="cyber-grid p-4" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.45 }}>
                                    <div className="data-label mb-2">5. Externe APIs &amp; Drittanbieter-Dienste</div>
                                    <div className="space-y-3 font-mono text-sm leading-relaxed">
                                      <p className="font-bold text-primary">Spotify Embed (Clientseitig)</p>
                                      <p>Diese Website nutzt den Spotify iFrame Embed zur Bereitstellung eines integrierten Musikplayers. Beim Laden des Players wird eine direkte Verbindung zu den Servern von Spotify hergestellt. Anbieter: Spotify AB, Regeringsgatan 19, 111 53 Stockholm, Schweden. Spotify kann dabei Ihre IP-Adresse, Browserinformationen und Nutzungsdaten verarbeiten. Datenschutzerklärung: <a href="https://www.spotify.com/legal/privacy-policy/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">https://www.spotify.com/legal/privacy-policy/</a></p>
                                      <p>Die Nutzung des Spotify Embeds erfolgt auf Grundlage von Art. 6 Abs. 1 lit. f DSGVO. Wir haben ein berechtigtes Interesse an einer interaktiven und nutzerfreundlichen Darstellung unserer Musik.</p>
                                      <p className="font-bold text-primary mt-4">Serverseitige APIs</p>
                                      <p>Diese Website verwendet zudem serverseitige Proxys zur Verbindung mit folgenden Drittanbieter-APIs. Ihre IP-Adresse wird nicht direkt an diese Dienste weitergegeben; die Anfragen werden von unserem Server gestellt:</p>
                                      <p className="font-bold text-primary mt-4">Apple Music / iTunes API</p>
                                      <p>Wir nutzen die Apple iTunes Search API zum Abrufen von Musikveröffentlichungen und Artwork. Anbieter: Apple Inc., One Apple Park Way, Cupertino, CA 95014, USA. Datenschutzerklärung: <a href="https://www.apple.com/legal/privacy/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">https://www.apple.com/legal/privacy/</a></p>
                                      <p className="font-bold text-primary mt-4">Odesli / song.link API</p>
                                      <p>Wir nutzen die Odesli API zur Erzeugung plattformübergreifender Streaming-Links (Spotify, YouTube, SoundCloud etc.). Anbieter: Odesli, Inc. Datenschutzerklärung: <a href="https://odesli.co/privacy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">https://odesli.co/privacy</a></p>
                                      <p className="font-bold text-primary mt-4">Bandsintown API</p>
                                      <p>Wir nutzen die Bandsintown API zur Anzeige anstehender Live-Events und Tourdaten. Anbieter: Bandsintown Inc., 24 W 25th St., New York, NY 10010, USA. Datenschutzerklärung: <a href="https://corp.bandsintown.com/privacy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">https://corp.bandsintown.com/privacy</a></p>
                                      <p>Die Nutzung dieser Dienste erfolgt auf Grundlage von Art. 6 Abs. 1 lit. f DSGVO. Wir haben ein berechtigtes Interesse an der Darstellung aktueller Musik- und Veranstaltungsinformationen.</p>
                                    </div>
                                  </motion.div>

                                  <motion.div className="cyber-grid p-4" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 }}>
                                    <div className="data-label mb-2">6. Ihre Rechte</div>
                                    <div className="space-y-3 font-mono text-sm leading-relaxed">
                                      <p>Ihnen stehen unter der DSGVO folgende Rechte zu:</p>
                                      <p><span className="text-primary">• Auskunftsrecht (Art. 15 DSGVO)</span> — Sie haben das Recht, Auskunft über Ihre bei uns gespeicherten personenbezogenen Daten zu erhalten.</p>
                                      <p><span className="text-primary">• Recht auf Berichtigung (Art. 16 DSGVO)</span> — Sie haben das Recht, die Berichtigung unrichtiger Daten zu verlangen.</p>
                                      <p><span className="text-primary">• Recht auf Löschung (Art. 17 DSGVO)</span> — Sie haben das Recht, die Löschung Ihrer personenbezogenen Daten zu verlangen.</p>
                                      <p><span className="text-primary">• Recht auf Einschränkung (Art. 18 DSGVO)</span> — Sie haben das Recht, die Einschränkung der Verarbeitung Ihrer Daten zu verlangen.</p>
                                      <p><span className="text-primary">• Recht auf Datenübertragbarkeit (Art. 20 DSGVO)</span> — Sie haben das Recht, Ihre Daten in einem strukturierten, gängigen und maschinenlesbaren Format zu erhalten.</p>
                                      <p><span className="text-primary">• Widerspruchsrecht (Art. 21 DSGVO)</span> — Sie haben das Recht, jederzeit gegen die Verarbeitung Ihrer personenbezogenen Daten Widerspruch einzulegen.</p>
                                      <p><span className="text-primary">• Recht auf Widerruf (Art. 7 Abs. 3 DSGVO)</span> — Sie haben das Recht, Ihre Einwilligung jederzeit zu widerrufen.</p>
                                      <p><span className="text-primary">• Beschwerderecht (Art. 77 DSGVO)</span> — Sie haben das Recht, sich bei einer Aufsichtsbehörde zu beschweren.</p>
                                    </div>
                                  </motion.div>
                                </div>
                              )}
                              </>
                              )}

                              <motion.div 
                                className="pt-6 border-t border-border"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.7 }}
                              >
                                <div className="data-label">// SYSTEM.STATUS: [ACTIVE]</div>
                              </motion.div>
                            </motion.div>
                          )}

                          {cyberpunkOverlay.type === 'contact' && (
                            <motion.div 
                              className="mt-8 space-y-6"
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: 20 }}
                              transition={{ duration: 0.3 }}
                            >
                              <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1 }}
                              >
                                <div className="data-label mb-2">// CONTACT.INTERFACE.STREAM</div>
                                <h2 className="text-4xl md:text-5xl font-bold uppercase font-mono mb-4 hover-chromatic crt-flash-in" data-text="CONTACT">
                                  CONTACT
                                </h2>
                              </motion.div>

                              <div className="space-y-6 text-foreground/90">
                                <motion.div 
                                  className="cyber-grid p-4"
                                  initial={{ opacity: 0, x: -10 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: 0.2 }}
                                >
                                  <div className="data-label mb-3">Management</div>
                                  <div className="space-y-2 font-mono text-sm">
                                      <>
                                        <p>{adminSettings?.contactInfo?.managementName || 'Federico Augusto Ágreda Álvarez'}</p>
                                        <p>E-Mail: <a href={`mailto:${adminSettings?.contactInfo?.managementEmail || 'info@zardonic.net'}`} className="text-primary hover:underline">{adminSettings?.contactInfo?.managementEmail || 'info@zardonic.net'}</a></p>
                                      </>
                                  </div>
                                </motion.div>

                                <motion.div 
                                  className="cyber-grid p-4"
                                  initial={{ opacity: 0, x: -10 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: 0.3 }}
                                >
                                  <div className="data-label mb-3">Booking</div>
                                  <div className="space-y-2 font-mono text-sm">
                                      <p>E-Mail: <a href={`mailto:${adminSettings?.contactInfo?.bookingEmail || 'booking@zardonic.net'}`} className="text-primary hover:underline">{adminSettings?.contactInfo?.bookingEmail || 'booking@zardonic.net'}</a></p>
                                  </div>
                                </motion.div>

                                <motion.div 
                                  className="cyber-grid p-4"
                                  initial={{ opacity: 0, x: -10 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: 0.35 }}
                                >
                                  <div className="data-label mb-3">Press / Media</div>
                                  <div className="space-y-2 font-mono text-sm">
                                      <p>E-Mail: <a href={`mailto:${adminSettings?.contactInfo?.pressEmail || 'press@zardonic.net'}`} className="text-primary hover:underline">{adminSettings?.contactInfo?.pressEmail || 'press@zardonic.net'}</a></p>
                                  </div>
                                </motion.div>


                                <motion.div 
                                  className="cyber-grid p-6"
                                  initial={{ opacity: 0, x: -10 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: 0.45 }}
                                >
                                  <div className="data-label mb-4">// CONTACT.FORM</div>
                                  <form
                                    onSubmit={async (e) => {
                                      e.preventDefault()
                                      const form = e.currentTarget
                                      const formData = new FormData(form)
                                      const data = {
                                        name: formData.get('name') as string,
                                        email: formData.get('email') as string,
                                        subject: formData.get('subject') as string,
                                        message: formData.get('message') as string,
                                        _hp: formData.get('_hp') as string ?? '',
                                      }

                                      const validation = contactFormSchema.safeParse(data)
                                      if (!validation.success) {
                                        toast.error(validation.error.issues[0]?.message || 'Please check your input')
                                        return
                                      }

                                      const submitBtn = form.querySelector('button[type="submit"]') as HTMLButtonElement | null
                                      if (submitBtn) submitBtn.disabled = true

                                      toast.loading('Sending message...', { id: 'contact-submit' })

                                      const result = await submitContactForm(data)

                                      if (result.success) {
                                        toast.success('Message sent successfully!', { id: 'contact-submit' })
                                        form.reset()
                                      } else {
                                        toast.error(result.error || 'Failed to send message', { id: 'contact-submit' })
                                      }

                                      if (submitBtn) submitBtn.disabled = false
                                    }}
                                    className="space-y-4"
                                  >
                                    {/* Honeypot field — hidden from real users */}
                                    <input type="text" name="_hp" tabIndex={-1} autoComplete="off" aria-hidden="true" className="absolute opacity-0 h-0 w-0 overflow-hidden pointer-events-none" />
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                      <div>
                                        <Label className="font-mono text-xs uppercase tracking-wide">{adminSettings?.contactInfo?.formNameLabel || 'Name'}</Label>
                                        <Input name="name" required maxLength={100} placeholder={adminSettings?.contactInfo?.formNamePlaceholder || 'Your name'} className="bg-card border-border font-mono mt-1" />
                                      </div>
                                      <div>
                                        <Label className="font-mono text-xs uppercase tracking-wide">{adminSettings?.contactInfo?.formEmailLabel || 'Email'}</Label>
                                        <Input name="email" type="email" required maxLength={254} placeholder={adminSettings?.contactInfo?.formEmailPlaceholder || 'your@email.com'} className="bg-card border-border font-mono mt-1" />
                                      </div>
                                    </div>
                                    <div>
                                      <Label className="font-mono text-xs uppercase tracking-wide">{adminSettings?.contactInfo?.formSubjectLabel || 'Subject'}</Label>
                                      <Input name="subject" required maxLength={200} placeholder={adminSettings?.contactInfo?.formSubjectPlaceholder || 'Subject'} className="bg-card border-border font-mono mt-1" />
                                    </div>
                                    <div>
                                      <Label className="font-mono text-xs uppercase tracking-wide">{adminSettings?.contactInfo?.formMessageLabel || 'Message'}</Label>
                                      <Textarea name="message" required maxLength={5000} placeholder={adminSettings?.contactInfo?.formMessagePlaceholder || 'Your message...'} className="bg-card border-border font-mono mt-1 min-h-[120px]" />
                                    </div>
                                    <Button type="submit" className="w-full uppercase font-mono hover-glitch cyber-border">
                                      <PaperPlaneTilt className="w-5 h-5 mr-2" />
                                      <span className="hover-chromatic">{adminSettings?.contactInfo?.formButtonText || 'Send Message'}</span>
                                    </Button>
                                  </form>
                                </motion.div>
                              </div>

                              <motion.div 
                                className="pt-6 border-t border-border"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.7 }}
                              >
                                <div className="data-label">// SYSTEM.STATUS: [ACTIVE]</div>
                              </motion.div>
                            </motion.div>
                          )}

                          {cyberpunkOverlay.type === 'member' && cyberpunkOverlay.data && (
                            <motion.div 
                              className="mt-8 space-y-6"
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: 20 }}
                              transition={{ duration: 0.3 }}
                            >
                              <motion.div 
                                className="flex flex-col md:flex-row gap-6"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1 }}
                              >
                                {cyberpunkOverlay.data.image && (
                                  <div className="w-48 h-48 bg-muted relative">
                                    <img
                                      src={cyberpunkOverlay.data.image}
                                      alt={cyberpunkOverlay.data.name}
                                      className="w-full h-full object-cover"
                                    />
                                  </div>
                                )}
                                <div className="flex-1">
                                  <div className="text-xs text-primary uppercase tracking-widest font-mono mb-2">// MEMBER.PROFILE</div>
                                  <h2 className="text-4xl font-bold uppercase font-mono mb-2 crt-flash-in" data-text={cyberpunkOverlay.data.name}>
                                    {cyberpunkOverlay.data.name}
                                  </h2>
                                  <p className="text-xl text-muted-foreground font-mono mb-4">{cyberpunkOverlay.data.role}</p>
                                  <p className="text-foreground/90 leading-relaxed">{cyberpunkOverlay.data.bio}</p>
                                  {cyberpunkOverlay.data.instagram && (
                                    <Button asChild variant="outline" className="mt-4 font-mono">
                                      <a href={cyberpunkOverlay.data.instagram} target="_blank" rel="noopener noreferrer">
                                        <InstagramLogo className="w-5 h-5 mr-2" weight="fill" />
                                        Follow
                                      </a>
                                    </Button>
                                  )}
                                </div>
                              </motion.div>
                            </motion.div>
                          )}

                          {cyberpunkOverlay.type === 'gig' && cyberpunkOverlay.data && (
                            <motion.div 
                              className="mt-8 space-y-6"
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: 20 }}
                              transition={{ duration: 0.3 }}
                            >
                              <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1 }}
                              >
                                <div className="data-label mb-2">// EVENT.DATA.STREAM</div>
                                {cyberpunkOverlay.data.title && (
                                  <p className="text-sm font-mono text-primary uppercase tracking-widest mb-1">{cyberpunkOverlay.data.title}</p>
                                )}
                                <h2 className="text-4xl md:text-5xl font-bold uppercase font-mono mb-4 hover-chromatic crt-flash-in" data-text={cyberpunkOverlay.data.venue}>
                                  {cyberpunkOverlay.data.venue}
                                </h2>
                                {cyberpunkOverlay.data.soldOut && (
                                  <span className="inline-block px-3 py-1 text-xs font-mono uppercase tracking-wider bg-destructive/20 text-destructive border border-destructive/30">SOLD OUT</span>
                                )}
                              </motion.div>

                              <div className="grid md:grid-cols-2 gap-6">
                                <motion.div 
                                  className="cyber-grid p-4"
                                  initial={{ opacity: 0, x: -10 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: 0.2 }}
                                >
                                  <div className="data-label mb-2">Location</div>
                                  <div className="flex items-center gap-2 text-xl font-mono hover-chromatic">
                                    <MapPin className="w-5 h-5 text-primary shrink-0" />
                                    {cyberpunkOverlay.data.location}
                                  </div>
                                  {cyberpunkOverlay.data.streetAddress && (
                                    <p className="text-sm text-muted-foreground font-mono mt-2 ml-7">
                                      {cyberpunkOverlay.data.streetAddress}
                                      {cyberpunkOverlay.data.postalCode && `, ${cyberpunkOverlay.data.postalCode}`}
                                    </p>
                                  )}
                                </motion.div>

                                <motion.div 
                                  className="cyber-grid p-4"
                                  initial={{ opacity: 0, x: -10 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: 0.3 }}
                                >
                                  <div className="data-label mb-2">Date & Time</div>
                                  <div className="flex items-center gap-2 text-xl font-mono hover-chromatic">
                                    <CalendarBlank className="w-5 h-5 text-primary shrink-0" />
                                    {new Date(cyberpunkOverlay.data.date).toLocaleDateString('en-US', { 
                                      weekday: 'long', 
                                      year: 'numeric', 
                                      month: 'long', 
                                      day: 'numeric' 
                                    })}
                                  </div>
                                  {cyberpunkOverlay.data.startsAt && (
                                    <p className="text-sm text-muted-foreground font-mono mt-2 ml-7">
                                      Doors: {new Date(cyberpunkOverlay.data.startsAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                  )}
                                </motion.div>
                              </div>

                              {cyberpunkOverlay.data.description && (
                                <motion.div 
                                  className="cyber-grid p-4"
                                  initial={{ opacity: 0, x: -10 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: 0.35 }}
                                >
                                  <div className="data-label mb-2">Info</div>
                                  <p className="text-foreground/90 font-mono text-sm">{cyberpunkOverlay.data.description}</p>
                                </motion.div>
                              )}

                              {cyberpunkOverlay.data.lineup && cyberpunkOverlay.data.lineup.length > 0 && (
                                <motion.div 
                                  className="cyber-grid p-4"
                                  initial={{ opacity: 0, x: -10 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: 0.4 }}
                                >
                                  <div className="data-label mb-3">Lineup</div>
                                  <div className="flex flex-wrap gap-2">
                                    {cyberpunkOverlay.data.lineup.map((artist: string, i: number) => (
                                      <motion.span
                                        key={i}
                                        className={`px-3 py-1.5 text-sm font-mono border transition-colors ${
                                          artist.toLowerCase() === 'zardonic'
                                            ? 'bg-primary/20 border-primary/50 text-primary font-bold'
                                            : 'bg-card border-border text-foreground/80 hover:border-primary/30'
                                        }`}
                                        initial={{ opacity: 0, scale: 0.8 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ delay: 0.4 + i * 0.05 }}
                                      >
                                        {artist}
                                      </motion.span>
                                    ))}
                                  </div>
                                </motion.div>
                              )}

                              {cyberpunkOverlay.data.support && !cyberpunkOverlay.data.lineup?.length && (
                                <motion.div 
                                  className="cyber-grid p-4"
                                  initial={{ opacity: 0, x: -10 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: 0.4 }}
                                >
                                  <div className="data-label mb-2">Support Acts</div>
                                  <p className="text-lg font-mono text-foreground/90 hover-chromatic">{cyberpunkOverlay.data.support}</p>
                                </motion.div>
                              )}

                              {cyberpunkOverlay.data.ticketUrl && (
                                <motion.div 
                                  className="pt-4"
                                  initial={{ opacity: 0, y: 10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ delay: 0.5 }}
                                >
                                  <Button 
                                    asChild 
                                    size="lg" 
                                    className={`w-full md:w-auto font-mono uppercase tracking-wider hover-noise cyber-border ${cyberpunkOverlay.data.soldOut ? 'opacity-50 pointer-events-none' : ''}`}
                                  >
                                    <a href={cyberpunkOverlay.data.ticketUrl} target="_blank" rel="noopener noreferrer">
                                      <Ticket className="w-5 h-5 mr-2" />
                                      <span className="hover-chromatic">{cyberpunkOverlay.data.soldOut ? 'Sold Out' : 'Get Tickets'}</span>
                                    </a>
                                  </Button>
                                </motion.div>
                              )}

                              <motion.div 
                                className="pt-6 border-t border-border"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.6 }}
                              >
                                <div className="data-label">// SYSTEM.STATUS: [{cyberpunkOverlay.data.soldOut ? 'SOLD_OUT' : 'ACTIVE'}]</div>
                              </motion.div>
                            </motion.div>
                          )}

                          {cyberpunkOverlay.type === 'release' && cyberpunkOverlay.data && (
                            <motion.div 
                              className="mt-8"
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: 20 }}
                              transition={{ duration: 0.3 }}
                            >
                              <div className="grid md:grid-cols-[300px_1fr] gap-8">
                                <motion.div 
                                  className="aspect-square bg-muted relative cyber-card"
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  transition={{ delay: 0.1 }}
                                >
                                  {cyberpunkOverlay.data.artwork && (
                                    <img 
                                      src={cyberpunkOverlay.data.artwork} 
                                      alt={cyberpunkOverlay.data.title} 
                                      className="w-full h-full object-cover glitch-image" 
                                    />
                                  )}
                                </motion.div>

                                <div className="space-y-6">
                                  <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.2 }}
                                  >
                                    <div className="data-label mb-2">// RELEASE.INFO.STREAM</div>
                                    <h2 className="text-3xl md:text-4xl font-bold uppercase font-mono mb-2 hover-chromatic crt-flash-in" data-text={cyberpunkOverlay.data.title}>
                                      {cyberpunkOverlay.data.title}
                                    </h2>
                                    <p className="text-xl text-muted-foreground font-mono">{cyberpunkOverlay.data.year}</p>
                                  </motion.div>

                                  <motion.div 
                                    className="cyber-grid p-4"
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.3 }}
                                  >
                                    <div className="data-label mb-3">Stream & Download</div>
                                    <div className="flex flex-wrap gap-4">
                                      {cyberpunkOverlay.data.spotify && (
                                        <Button asChild variant="outline" className="font-mono">
                                          <a href={cyberpunkOverlay.data.spotify} target="_blank" rel="noopener noreferrer">
                                            <SpotifyLogo className="w-5 h-5 mr-2" weight="fill" />
                                            <span className="hover-chromatic">Spotify</span>
                                          </a>
                                        </Button>
                                      )}
                                      {cyberpunkOverlay.data.youtube && (
                                        <Button asChild variant="outline" className="font-mono">
                                          <a href={cyberpunkOverlay.data.youtube} target="_blank" rel="noopener noreferrer">
                                            <YoutubeLogo className="w-5 h-5 mr-2" weight="fill" />
                                            <span className="hover-chromatic">YouTube</span>
                                          </a>
                                        </Button>
                                      )}
                                      {cyberpunkOverlay.data.soundcloud && (
                                        <Button asChild variant="outline" className="font-mono">
                                          <a href={cyberpunkOverlay.data.soundcloud} target="_blank" rel="noopener noreferrer">
                                            <span className="hover-chromatic">SoundCloud</span>
                                          </a>
                                        </Button>
                                      )}
                                      {cyberpunkOverlay.data.bandcamp && (
                                        <Button asChild variant="outline" className="font-mono">
                                          <a href={cyberpunkOverlay.data.bandcamp} target="_blank" rel="noopener noreferrer">
                                            <span className="hover-chromatic">Bandcamp</span>
                                          </a>
                                        </Button>
                                      )}
                                      {cyberpunkOverlay.data.appleMusic && (
                                        <Button asChild variant="outline" className="font-mono">
                                          <a href={cyberpunkOverlay.data.appleMusic} target="_blank" rel="noopener noreferrer">
                                            <ApplePodcastsLogo className="w-5 h-5 mr-2" weight="fill" />
                                            <span className="hover-chromatic">Apple Music</span>
                                          </a>
                                        </Button>
                                      )}
                                      {cyberpunkOverlay.data.deezer && (
                                        <Button asChild variant="outline" className="font-mono">
                                          <a href={cyberpunkOverlay.data.deezer} target="_blank" rel="noopener noreferrer">
                                            <span className="hover-chromatic">Deezer</span>
                                          </a>
                                        </Button>
                                      )}
                                      {cyberpunkOverlay.data.tidal && (
                                        <Button asChild variant="outline" className="font-mono">
                                          <a href={cyberpunkOverlay.data.tidal} target="_blank" rel="noopener noreferrer">
                                            <span className="hover-chromatic">Tidal</span>
                                          </a>
                                        </Button>
                                      )}
                                      {cyberpunkOverlay.data.amazonMusic && (
                                        <Button asChild variant="outline" className="font-mono">
                                          <a href={cyberpunkOverlay.data.amazonMusic} target="_blank" rel="noopener noreferrer">
                                            <span className="hover-chromatic">Amazon Music</span>
                                          </a>
                                        </Button>
                                      )}
                                    </div>
                                  </motion.div>

                                  <motion.div 
                                    className="pt-4 border-t border-border"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 0.4 }}
                                  >
                                    <div className="data-label">// MEDIA.STATUS: [AVAILABLE]</div>
                                  </motion.div>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </>
                      )}
                    </AnimatePresence>
                    </div>
                  )}
                </div>
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>


      {isOwner && (
        <EditControls
          editMode={editMode}
          onToggleEdit={() => setEditMode(!editMode)}
          hasPassword={!!adminPasswordHash}
          onChangePassword={handleSetAdminPassword}
          onSetPassword={handleSetAdminPassword}
          adminSettings={adminSettings}
          onOpenConfigEditor={() => setShowConfigEditor(true)}
          onOpenStats={() => setShowStats(true)}
          onOpenSecurityIncidents={() => setShowSecurityIncidents(true)}
          onOpenSecuritySettings={() => setShowSecuritySettings(true)}
          onOpenBlocklist={() => setShowBlocklist(true)}
          onOpenContactInbox={() => setShowContactInbox(true)}
          onOpenSubscriberList={() => setShowSubscriberList(true)}
        />
      )}

      <ConfigEditorDialog
        open={showConfigEditor}
        onClose={() => setShowConfigEditor(false)}
        overrides={adminSettings?.configOverrides || {}}
        onSave={(configOverrides) => setAdminSettings((prev) => ({ ...(prev || {}), configOverrides }))}
      />

      {/* Security admin dialogs — only rendered when admin is logged in */}
      {isOwner && (
        <Suspense fallback={null}>
          <SecurityIncidentsDashboard
            open={showSecurityIncidents}
            onClose={() => setShowSecurityIncidents(false)}
            onViewProfile={(hashedIp) => {
              setSelectedAttackerIp(hashedIp)
              setShowAttackerProfile(true)
            }}
          />
          <SecuritySettingsDialog
            open={showSecuritySettings}
            onClose={() => setShowSecuritySettings(false)}
          />
          <BlocklistManagerDialog
            open={showBlocklist}
            onClose={() => setShowBlocklist(false)}
          />
          <AttackerProfileDialog
            open={showAttackerProfile}
            onClose={() => setShowAttackerProfile(false)}
            hashedIp={selectedAttackerIp}
          />
          <ContactInboxDialog
            open={showContactInbox}
            onClose={() => setShowContactInbox(false)}
          />
          <SubscriberListDialog
            open={showSubscriberList}
            onClose={() => setShowSubscriberList(false)}
          />
        </Suspense>
      )}

      {/* Admin Login Dialogs */}
      <AdminLoginDialog
        open={showLoginDialog}
        onOpenChange={setShowLoginDialog}
        mode="login"
        onLogin={handleAdminLogin}
        onSetPassword={handleSetAdminPassword}
      />

      <AdminLoginDialog
        open={showSetupDialog}
        onOpenChange={setShowSetupDialog}
        mode="setup"
        onSetPassword={handleSetupAdminPassword}
      />
    </div>
    </>
  )
}

export default App
