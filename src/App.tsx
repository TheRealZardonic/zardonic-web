import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion'
import { useLocalStorage } from '@/hooks/use-local-storage'
import { useKV } from '@/hooks/use-kv'
import { useKonami } from '@/hooks/use-konami'
import { useAnalytics, trackClick, trackPageView, trackHeatmapClick, trackRedirect } from '@/hooks/use-analytics'
import { fetchITunesReleases, type ITunesRelease } from '@/lib/itunes'
import { fetchOdesliLinks } from '@/lib/odesli'
import { fetchBandsintownEvents } from '@/lib/bandsintown'
import { toDirectImageUrl } from '@/lib/image-cache'
import { 
  applyConfigOverrides,
  OVERLAY_LOADING_TEXT_INTERVAL_MS,
  OVERLAY_GLITCH_PHASE_DELAY_MS,
  OVERLAY_REVEAL_PHASE_DELAY_MS,
} from '@/lib/config'
import { submitContactForm, contactFormSchema } from '@/lib/contact'
import type { AdminSettings } from '@/lib/types'
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  SpeakerHigh,
  SpeakerX,
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
  CaretLeft,
  CaretRight,
  GearSix,
  ChartLine,
  Download,
  FolderOpen,
  Terminal as TerminalIcon,
  Check,
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
import { Slider } from '@/components/ui/slider'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { Toaster } from '@/components/ui/sonner'
import { toast } from 'sonner'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { SwipeableGallery } from '@/components/SwipeableGallery'
import { Terminal } from '@/components/Terminal'
import { LoadingScreen } from '@/components/LoadingScreen'
import { CircuitBackground } from '@/components/CircuitBackground'
import AdminLoginDialog, { hashPassword } from '@/components/AdminLoginDialog'
import EditControls from '@/components/EditControls'
import ConfigEditorDialog from '@/components/ConfigEditorDialog'
import { SpotifyEmbed } from '@/components/SpotifyEmbed'
import StatsDashboard from '@/components/StatsDashboard'
import { MediaBrowser } from '@/components/MediaBrowser'
import EditableHeading from '@/components/EditableHeading'
import type { TerminalCommand, SectionLabels } from '@/lib/types'
import heroImage from '@/assets/images/meta_eyJzcmNCdWNrZXQiOiJiemdsZmlsZXMifQ==.webp'
import logoImage from '@/assets/images/meta_eyJzcmNCdWNrZXQiOiJiemdsZmlsZXMifQ==.webp'

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

interface AnalyticsData {
  pageViews: number
  sectionViews: { [key: string]: number }
  clicks: { [key: string]: number }
  visitors: { date: string; count: number }[]
}

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

  // Restore admin session from localStorage
  useEffect(() => {
    if (!adminPasswordHash) return
    const storedToken = localStorage.getItem('admin-token')
    if (storedToken && storedToken === adminPasswordHash) {
      setIsOwner(true)
    }
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

  const [siteData, setSiteData] = useKV<SiteData>('zardonic-site-data', {
    artistName: 'ZARDONIC',
    heroImage: heroImage,
    bio: `The clash of disparate elements activates innovation, and every generation brings us timeless figures who accidentally spark a new revolutionary sound within the music world. Chuck Berry mixed jazz, blues, gospel and country music to create Rock N Roll. A few decades later, Ozzy Osbourne turned up the gain to create Heavy Metal. And since the early 2000s, Federico Ágreda Álvarez, the masked performer known to the world as DJ and producer Zardonic, has harnessed the power of the nexus between Drum & Bass and Heavy Metal to create the sound that is now known as Metal & Bass.

Born and raised in Venezuela, inspired by America, and based in Germany with a passport book stamped into oblivion, he also represents a union of cultures. In his music, these elements charge forward on a collision course towards a future without creative or spiritual borders. Instead, the award-winning artist draws an inimitable energy from this confluence. Following a prolific string of releases, high-profile remixes and video game collaborations, packed shows on multiple continents, and 100 million-plus streams, he realizes the power and potential of his vision like never before on his 2023 full-length offering Superstars [MNRK HEAVY].

"It's been a long road trying to find the perfect flashpoint between the metal and electronic worlds," he states about his third MNRK studio album, which follows Antihero (2015) and Become (2018). "To me, music is a direct translation of human emotion. I'm all about bringing sounds and people together with no boundaries at all. I don't like limits, so my approach is to be limitless."

Boundlessness has defined his output since day one. Zardonic has cultivated an expansive catalogue of original tracks and remixes for platinum icons, leaving his imprint on Pop Evil, Fear Factory, Bullet For My Valentine and Sonic Syndicate, among others. He has also contributed music to soundtracks for videogames such as Superhot: Mind Control Delete and Redout 2, plus features on All Elite Wrestling, TNT and NBC Sports.

He's the rare force of nature who can earn praise from both YourEDM and Metal Injection. Renowned as "Venezuela's Top DJ Act," he has impressively toppled Beatport's Drum & Bass Releases of the Week and Amazon's Hard Rock Bestsellers at #1. Not to mention, he even appeared in Warlocks Vs Shadows, standing out as "the first Latin American musician to ever be featured as a playable character in a video game.", and if you're a music producer yourself, chances are you've already used a few of his hundreds of factory presets and artist packs he's created for Arturia, Brainworx, Slate Digital, BABY Audio, GForce Software, and many more.

As if reflecting progression in palpable form, Zardonic's signature mask has evolved with him.

"To some extent, every mask marks the end of an era in my life and my way of approaching music," he notes. "The mask from the Become album and recent tours received a lot of battle damage. I had to constantly glue it back together. The paint scraped off. It wore a lot of scars with pride, yet it was a huge weight on my shoulders because no longer want to these scars to rule my decisions. Hence, the new mask is the exact opposite: shiny, sparkly and full of life. You could say I'm constantly resurrecting the Zardonic character, so to speak."

The new album features an assortment of international talents from the Drum & Bass and Hard Rock worlds, including UK singer/songwriter Reebz, featured on the single "Bitter", as well as Nazareth singer Carl Sentance, Toronto Is Broken, Daedric, Hevy, Bruno Balanta from The Qemists, Rage guitarist Jean Bormann, Blitz Union, Norwegian Blackjazz virtuosos SHINING, The Surgery & MC Reptile, Mechanical Vein, Camo MC, and Omnimar. "I am humbled to have such a strong relationship with a group of amazing people. I could spend hours writing about them, but they know that if we're working together, it's because they mean a great deal to me. My most important thing is being able to genuinely connect with the people I work with. If I can't have fun with an artist, there's simply no point in it, and I am glad to call these amazing Superstars my friends."

In the end, Zardonic will unite listeners with Superstars.

"At the core of everything, I try to breathe life into people," he leaves off. "I'm blessed enough to be able to do what I love the most, and that is Music. Music is my own form of self-healing. It allows me to float above the darkness. Maybe, it will do the same for you."`,
    tracks: [
      {
        id: '1',
        title: 'Revelation',
        artist: 'ZARDONIC',
        url: '',
        artwork: '',
      },
    ],
    gigs: [
      {
        id: '1',
        venue: 'Kulturzentrum Schlachthof',
        location: 'Wiesbaden, Germany',
        date: '2025-03-15',
        ticketUrl: 'https://example.com/tickets/wiesbaden',
        support: 'The Qemists, Counterstrike'
      },
      {
        id: '2',
        venue: 'Matrix Club',
        location: 'Berlin, Germany',
        date: '2025-04-22',
        ticketUrl: 'https://example.com/tickets/berlin',
        support: 'Current Value, Forbidden Society'
      },
      {
        id: '3',
        venue: 'Glazart',
        location: 'Paris, France',
        date: '2025-05-10',
        ticketUrl: 'https://example.com/tickets/paris',
        support: 'Pythius, Forbidden Society'
      },
      {
        id: '4',
        venue: 'Rebellion',
        location: 'Manchester, UK',
        date: '2025-06-05',
        ticketUrl: 'https://example.com/tickets/manchester',
        support: 'Signal, The Qemists'
      },
      {
        id: '5',
        venue: 'DNA Lounge',
        location: 'San Francisco, USA',
        date: '2025-07-18',
        ticketUrl: 'https://example.com/tickets/sanfrancisco',
        support: 'Evol Intent, Counterstrike'
      }
    ],
    releases: [],
    gallery: [],
    instagramFeed: [],
    members: [],
    mediaFiles: [],
    creditHighlights: [
      { src: 'https://images.zoogletools.com/s:bzglfiles/u/154437/0f55903209332a56b6137578b492e543373fdc6c/original/sega-logo.png/!!/b%3AW1sicmVzaXplIiw2NjBdLFsibWF4Il0sWyJ3ZSJdXQ%3D%3D/meta%3AeyJzcmNCdWNrZXQiOiJiemdsZmlsZXMifQ%3D%3D.png', alt: 'SEGA' },
      { src: 'https://images.zoogletools.com/s:bzglfiles/u/154437/4b65d0d33e1113b5511272580e87828768cfc2d1/original/7fdd8d8997a41afbdd8381c287d9a984.png/!!/b%3AW1sicmVzaXplIiw2NjBdLFsibWF4Il0sWyJ3ZSJdXQ%3D%3D/meta%3AeyJzcmNCdWNrZXQiOiJiemdsZmlsZXMifQ%3D%3D.png', alt: 'Sonic Syndicate' },
      { src: 'https://images.zoogletools.com/s:bzglfiles/u/154437/6eb32362aa0c4fdcce4fa319b7fa721d1fab0989/original/fearfactory-logo-svg.png/!!/b%3AW1sicmVzaXplIiw2NjBdLFsibWF4Il0sWyJ3ZSJdXQ%3D%3D/meta%3AeyJzcmNCdWNrZXQiOiJiemdsZmlsZXMifQ%3D%3D.png', alt: 'Fear Factory' },
      { src: 'https://images.zoogletools.com/s:bzglfiles/u/154437/5021ea146b63ef5ffaa3fa82ca588a2abacc85db/original/citypng-com-white-aew-all-elite-wrestling-logo-4000x4000.png/!!/b%3AW1siZXh0cmFjdCIseyJsZWZ0IjoyOSwidG9wIjo4NjIsIndpZHRoIjozOTcxLCJoZWlnaHQiOjIyMzN9XSxbInJlc2l6ZSIsNjYwXSxbIm1heCJdLFsid2UiXV0%3D/meta%3AeyJzcmNCdWNrZXQiOiJiemdsZmlsZXMifQ%3D%3D.png', alt: 'AEW' },
      { src: 'https://images.zoogletools.com/s:bzglfiles/u/154437/682412f8e4ef237f862a19771c88a5a24db05ef0/original/pop-evil-5c8c4556e6b4f.png/!!/b%3AW1siZXh0cmFjdCIseyJsZWZ0IjoxOTIsInRvcCI6MCwid2lkdGgiOjQxMywiaGVpZ2h0IjozMTB9XSxbInJlc2l6ZSIsNjYwXSxbIm1heCJdLFsid2UiXV0%3D/meta%3AeyJzcmNCdWNrZXQiOiJiemdsZmlsZXMifQ%3D%3D.png', alt: 'Pop Evil' },
      { src: 'https://images.zoogletools.com/s:bzglfiles/u/154437/e43afa6931b42622a32c143ea820b45b4bf22772/original/bfmv.png/!!/b%3AW1siZXh0cmFjdCIseyJsZWZ0IjoxMTksInRvcCI6MjUsIndpZHRoIjo4NjcsImhlaWdodCI6NjgyfV0sWyJyZXNpemUiLDY2MF0sWyJtYXgiXSxbIndlIl1d/meta%3AeyJzcmNCdWNrZXQiOiJiemdsZmlsZXMifQ%3D%3D.png', alt: 'Bullet For My Valentine' },
    ],
    social: {
      instagram: 'https://instagram.com/zfrederickx',
      facebook: 'https://facebook.com/ZardonicOfficial',
      spotify: 'https://open.spotify.com/artist/7BqEidErPMNiUXCRE0dV2n',
      youtube: 'https://youtube.com/@ZardonicOfficial',
      soundcloud: 'https://soundcloud.com/zardonic',
      bandcamp: 'https://zardonic.bandcamp.com',
      tiktok: 'https://tiktok.com/@zardonic',
      appleMusic: 'https://music.apple.com/artist/zardonic/271263343',
    },
  })

  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0)
  const [volume, setVolume] = useState([80])
  const [progress, setProgress] = useState(0)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [showConfigEditor, setShowConfigEditor] = useState(false)
  const [showStats, setShowStats] = useState(false)

  // Admin settings (persisted in Redis)
  const [adminSettings, setAdminSettings] = useKV<AdminSettings>('zardonic-admin-settings', {})
  const vis = adminSettings?.sectionVisibility ?? {}
  const anim = adminSettings?.animations ?? {}
  const sectionLabels = adminSettings?.sectionLabels ?? {}
  const terminalCommands = adminSettings?.terminalCommands ?? []

  const DEFAULT_SECTION_ORDER = ['bio', 'shell', 'creditHighlights', 'music', 'gigs', 'releases', 'gallery', 'media', 'connect']
  const sectionOrder = adminSettings?.sectionOrder ?? DEFAULT_SECTION_ORDER
  const getSectionOrder = useCallback((section: string) => {
    const idx = sectionOrder.indexOf(section)
    return idx >= 0 ? idx : DEFAULT_SECTION_ORDER.indexOf(section)
  }, [sectionOrder])

  const updateSectionLabel = useCallback((key: keyof SectionLabels, value: string) => {
    setAdminSettings((prev) => ({
      ...(prev || {}),
      sectionLabels: {
        ...(prev?.sectionLabels || {}),
        [key]: value,
      },
    }))
  }, [setAdminSettings])

  const handleSaveTerminalCommands = useCallback((commands: TerminalCommand[]) => {
    setAdminSettings((prev) => ({
      ...(prev || {}),
      terminalCommands: commands,
    }))
    toast.success('Terminal commands saved')
  }, [setAdminSettings])

  // Apply theme customizations to CSS variables
  useEffect(() => {
    const t = adminSettings?.theme
    if (!t) return
    const root = document.documentElement
    if (t.primaryColor) root.style.setProperty('--primary', t.primaryColor)
    if (t.accentColor) root.style.setProperty('--accent', t.accentColor)
    if (t.backgroundColor) root.style.setProperty('--background', t.backgroundColor)
    if (t.foregroundColor) root.style.setProperty('--foreground', t.foregroundColor)
    if (t.fontHeading) root.style.setProperty('--font-heading', t.fontHeading)
    if (t.fontBody) root.style.setProperty('--font-body', t.fontBody)
    if (t.fontMono) root.style.setProperty('--font-mono', t.fontMono)
    if (t.borderColor) root.style.setProperty('--border-color', t.borderColor)
    if (t.hoverColor) root.style.setProperty('--hover-color', t.hoverColor)
    if (t.borderRadius) root.style.setProperty('--radius', t.borderRadius)
    return () => {
      root.style.removeProperty('--primary')
      root.style.removeProperty('--accent')
      root.style.removeProperty('--background')
      root.style.removeProperty('--foreground')
      root.style.removeProperty('--font-heading')
      root.style.removeProperty('--font-body')
      root.style.removeProperty('--font-mono')
      root.style.removeProperty('--border-color')
      root.style.removeProperty('--hover-color')
      root.style.removeProperty('--radius')
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
  const [editingGig, setEditingGig] = useState<Gig | null>(null)
  const [editingRelease, setEditingRelease] = useState<Release | null>(null)
  const [cyberpunkOverlay, setCyberpunkOverlay] = useState<{type: 'gig' | 'release' | 'member' | 'impressum' | 'privacy' | 'contact', data?: any} | null>(null)
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
  const handleAdminLogin = async (password: string): Promise<boolean> => {
    const hash = await hashPassword(password)
    if (hash === adminPasswordHash) {
      localStorage.setItem('admin-token', hash)
      setIsOwner(true)
      return true
    }
    return false
  }

  const handleSetupAdminPassword = async (password: string): Promise<void> => {
    const hash = await hashPassword(password)
    localStorage.setItem('admin-token', hash)
    setAdminPasswordHash(hash)
    setIsOwner(true)
  }

  const handleSetAdminPassword = async (password: string): Promise<void> => {
    const hash = await hashPassword(password)
    localStorage.setItem('admin-token', hash)
    setAdminPasswordHash(hash)
  }

  // Auto-fetch iTunes releases and Bandsintown events on mount
  useEffect(() => {
    if (!hasAutoLoaded && siteData) {
      setHasAutoLoaded(true)
      handleFetchITunesReleases(true)
      handleFetchBandsintownEvents(true)
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
        if (!data) return data!
        const existingIds = new Set(data.releases.map(r => r.id))
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
        const updatedReleases = data.releases.map(existing => {
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

        return { ...data, releases: [...updatedReleases, ...newReleases] }
      })

      if (!isAutoLoad) {
        toast.success(`Synced releases from iTunes`)
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
        if (!data) return data!
        const existingIds = new Set(data.gigs.map(g => g.id))
        const newGigs: Gig[] = events
          .filter(e => !existingIds.has(e.id))
          .map(e => ({
            id: e.id,
            venue: e.venue,
            location: e.location,
            date: e.date,
            ticketUrl: e.ticketUrl,
            support: e.lineup?.filter(a => a.toLowerCase() !== 'zardonic').join(', ') || '',
          }))

        return { ...data, gigs: [...data.gigs, ...newGigs] }
      })

      if (!isAutoLoad) {
        toast.success(`Synced events from Bandsintown`)
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

  const saveChanges = () => {
    toast.success('Changes saved successfully')
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'hero' | 'gallery') => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        const imageUrl = reader.result as string
        if (type === 'hero') {
          setSiteData((data) => data ? { ...data, heroImage: imageUrl } : data!)
          toast.success('Hero image updated')
        } else {
          setSiteData((data) => data ? { ...data, gallery: [...data.gallery, imageUrl] } : data!)
          toast.success('Image added to gallery')
        }
      }
      reader.readAsDataURL(file)
    }
  }

  const addGig = () => {
    const newGig: Gig = {
      id: Date.now().toString(),
      venue: 'New Venue',
      location: 'City, Country',
      date: new Date().toISOString().split('T')[0],
      ticketUrl: '',
      support: ''
    }
    setSiteData((data) => data ? { ...data, gigs: [...data.gigs, newGig] } : data!)
    setEditingGig(newGig)
  }

  const saveGig = (gig: Gig) => {
    setSiteData((data) => {
      if (!data) return data!
      const gigIndex = data.gigs.findIndex(g => g.id === gig.id)
      if (gigIndex >= 0) {
        const newGigs = [...data.gigs]
        newGigs[gigIndex] = gig
        return { ...data, gigs: newGigs }
      }
      return data
    })
    setEditingGig(null)
    toast.success('Gig saved')
  }

  const deleteGig = (id: string) => {
    setSiteData((data) => data ? { ...data, gigs: data.gigs.filter(g => g.id !== id) } : data!)
    toast.success('Gig deleted')
  }

  const addRelease = () => {
    const newRelease: Release = {
      id: Date.now().toString(),
      title: 'New Release',
      artwork: '',
      year: new Date().getFullYear().toString(),
      spotify: '',
      soundcloud: '',
      youtube: '',
      bandcamp: ''
    }
    setSiteData((data) => data ? { ...data, releases: [...data.releases, newRelease] } : data!)
    setEditingRelease(newRelease)
  }

  const saveRelease = (release: Release) => {
    setSiteData((data) => {
      if (!data) return data!
      const releaseIndex = data.releases.findIndex(r => r.id === release.id)
      if (releaseIndex >= 0) {
        const newReleases = [...data.releases]
        newReleases[releaseIndex] = release
        return { ...data, releases: newReleases }
      }
      return data
    })
    setEditingRelease(null)
    toast.success('Release saved')
  }

  const deleteRelease = (id: string) => {
    setSiteData((data) => data ? { ...data, releases: data.releases.filter(r => r.id !== id) } : data!)
    toast.success('Release deleted')
  }

  const deleteGalleryImage = (index: number) => {
    setSiteData((data) => {
      if (!data) return data!
      const newGallery = [...data.gallery]
      newGallery.splice(index, 1)
      return { ...data, gallery: newGallery }
    })
    toast.success('Image removed')
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
      
      <Toaster />
      <audio ref={audioRef} src={currentTrack?.url} />

      <motion.nav
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="fixed top-0 left-0 right-0 z-50 bg-background/98 backdrop-blur-sm border-b border-border scanline-effect"
        style={{ position: 'fixed', top: 0 }}
      >
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <motion.div
            className="text-2xl md:text-3xl font-bold tracking-tighter text-foreground uppercase"
            whileHover={{ filter: 'drop-shadow(2px 0 0 rgba(255,0,100,0.3)) drop-shadow(-2px 0 0 rgba(0,255,255,0.3))' }}
          >
            {editMode ? (
              <Input
                value={siteData.artistName}
                onChange={(e) => setSiteData((data) => data ? { ...data, artistName: e.target.value } : data!)}
                className="w-48 bg-transparent border-border text-foreground"
              />
            ) : (
              <img 
                src={logoImage} 
                alt={siteData.artistName} 
                className="h-10 md:h-12 w-auto object-contain logo-glitch brightness-110 hover-chromatic-image"
              />
            )}
          </motion.div>

          <div className="hidden md:flex items-center gap-6">
            {['bio', 'music', 'gigs', 'releases', 'gallery', 'connect'].map((section) => (
              <button
                key={section}
                onClick={() => scrollToSection(section)}
                className="text-sm uppercase tracking-wide hover:text-primary transition-colors font-mono hover-chromatic hover-glitch"
              >
                {section}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-4">
            {isOwner ? (
              <Button
                size="sm"
                variant={editMode ? 'default' : 'outline'}
                onClick={() => setEditMode(!editMode)}
              >
                <Pencil className="w-4 h-4" />
              </Button>
            ) : adminPasswordHash ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowLoginDialog(true)}
              >
                Login
              </Button>
            ) : null}
            
            <button
              className="md:hidden text-foreground"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <List className="w-6 h-6" />}
            </button>
          </div>
        </div>

        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="md:hidden bg-card/95 border-t border-border overflow-hidden"
            >
              <div className="container mx-auto px-4 py-4 flex flex-col gap-4">
                {['bio', 'music', 'gigs', 'releases', 'gallery', 'connect'].map((section) => (
                  <button
                    key={section}
                    onClick={() => scrollToSection(section)}
                    className="text-left text-sm uppercase tracking-wide hover:text-primary transition-colors font-mono"
                  >
                    {section}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.nav>

      <section className="relative min-h-screen flex items-center justify-center pt-20 overflow-hidden scanline-effect">
        <div className="absolute inset-0 bg-black" />
        
        <div className="absolute inset-0 noise-effect" />
        
        <motion.div
          initial={{ opacity: 0 }}
          animate={contentLoaded ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="relative z-10 text-center px-4"
        >
          <motion.div 
            className="mb-8 relative"
            initial={{ opacity: 1 }}
            animate={contentLoaded ? { opacity: 1 } : { opacity: 0 }}
          >
            <div className="relative mx-auto w-fit hero-logo-glitch">
              <img 
                src={logoImage} 
                alt={siteData.artistName} 
                className="h-32 md:h-48 lg:h-64 w-auto object-contain brightness-110 hover-chromatic-image"
              />
              <img 
                src={logoImage} 
                alt="" 
                aria-hidden="true"
                className="absolute inset-0 h-32 md:h-48 lg:h-64 w-auto object-contain brightness-110 hero-logo-r"
              />
              <img 
                src={logoImage} 
                alt="" 
                aria-hidden="true"
                className="absolute inset-0 h-32 md:h-48 lg:h-64 w-auto object-contain brightness-110 hero-logo-b"
              />
            </div>
          </motion.div>

          {editMode && (
            <div className="mt-8">
              <label className="cursor-pointer">
                <Button variant="outline" size="lg" asChild>
                  <span>
                    <Upload className="w-5 h-5 mr-2" />
                    Upload Hero Image
                  </span>
                </Button>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleImageUpload(e, 'hero')}
                />
              </label>
            </div>
          )}

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={contentLoaded ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{ delay: 1.2, duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="mt-12 flex gap-4 justify-center flex-wrap"
          >
            <Button onClick={() => scrollToSection('music')} size="lg" className="uppercase font-mono hover-glitch hover-noise relative cyber-border">
              <span className="hover-chromatic">Listen Now</span>
            </Button>
            <Button onClick={() => scrollToSection('gigs')} size="lg" variant="outline" className="uppercase font-mono hover-glitch hover-noise relative cyber-border">
              <span className="hover-chromatic">Tour Dates</span>
            </Button>
            <Button asChild size="lg" variant="outline" className="uppercase font-mono hover-glitch hover-noise relative cyber-border">
              <a href="https://zardonic.channl.co/merch" target="_blank" rel="noopener noreferrer">
                <Storefront className="w-5 h-5 mr-2" />
                <span className="hover-chromatic">Merch</span>
              </a>
            </Button>
          </motion.div>
        </motion.div>
      </section>

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
              <EditableHeading
                text={sectionLabels.biography || ''}
                defaultText="BIOGRAPHY"
                editMode={editMode}
                onChange={(v) => updateSectionLabel('biography', v)}
                glitchEnabled={adminSettings?.glitchTextSettings?.enabled !== false}
                glitchIntervalMs={adminSettings?.glitchTextSettings?.intervalMs}
                glitchDurationMs={adminSettings?.glitchTextSettings?.durationMs}
              />
            </h2>
            
            {editMode ? (
              <div className="space-y-4">
                <Textarea
                  value={siteData.bio}
                  onChange={(e) => {
                    const newBio = e.target.value
                    setSiteData((data) => data ? { ...data, bio: newBio } : data!)
                  }}
                  className="min-h-[300px] font-mono bg-card border-border text-foreground"
                />
                <Button onClick={saveChanges}>
                  <FloppyDisk className="w-4 h-4 mr-2" />
                  Save Bio
                </Button>
              </div>
            ) : (
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
            )}
          </motion.div>
        </div>
      </section>
      </>
      )}
      </div>

      <div style={{ order: getSectionOrder('shell') }}>
      {vis.shell !== false && (
      <>
      <Separator className="bg-border" />
      <section id="shell" className="py-24 px-4 scanline-effect crt-effect">
        <div className="container mx-auto max-w-4xl">
          <motion.div
            initial={{ opacity: 0, x: -30, filter: 'blur(10px)', clipPath: 'polygon(0 0, 0 0, 0 100%, 0 100%)' }}
            whileInView={{ opacity: 1, x: 0, filter: 'blur(0px)', clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 100%)' }}
            viewport={{ once: true }}
            transition={{ duration: 1, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            <h2 className="text-4xl md:text-6xl font-bold mb-12 uppercase tracking-tighter text-foreground font-mono hover-chromatic hover-glitch cyber2077-scan-build cyber2077-data-corrupt" data-text={sectionLabels.shell || 'SHELL'}>
              <EditableHeading
                text={sectionLabels.shell || ''}
                defaultText="SHELL"
                editMode={editMode}
                onChange={(v) => updateSectionLabel('shell', v)}
                glitchEnabled={adminSettings?.glitchTextSettings?.enabled !== false}
                glitchIntervalMs={adminSettings?.glitchTextSettings?.intervalMs}
                glitchDurationMs={adminSettings?.glitchTextSettings?.durationMs}
              />
            </h2>

            <div className="grid md:grid-cols-[280px_1fr] gap-8 items-start">
              <motion.div
                className="relative aspect-square bg-muted border border-primary/30 overflow-hidden cyber-card"
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.1 }}
              >
                {adminSettings?.shellMember?.photo ? (
                  <img
                    src={adminSettings.shellMember.photo}
                    alt={adminSettings.shellMember.name || 'Member'}
                    className="w-full h-full object-cover glitch-image hover-chromatic-image"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <User className="w-20 h-20 text-muted-foreground" />
                  </div>
                )}
                {editMode && (
                  <div className="absolute bottom-2 right-2">
                    <label className="cursor-pointer">
                      <Upload className="w-6 h-6 text-primary bg-background/80 p-1 rounded" />
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) {
                            const reader = new FileReader()
                            reader.onloadend = () => {
                              setAdminSettings((prev) => ({
                                ...(prev || {}),
                                shellMember: { ...(prev?.shellMember || {}), photo: reader.result as string },
                              }))
                            }
                            reader.readAsDataURL(file)
                          }
                        }}
                      />
                    </label>
                  </div>
                )}
                <div className="absolute top-0 left-0 w-3 h-3 border-t border-l border-primary/60" />
                <div className="absolute top-0 right-0 w-3 h-3 border-t border-r border-primary/60" />
                <div className="absolute bottom-0 left-0 w-3 h-3 border-b border-l border-primary/60" />
                <div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-primary/60" />
              </motion.div>

              <motion.div
                className="space-y-4"
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.2 }}
              >
                <div className="data-label mb-2">// PROFILE.DATA.STREAM</div>
                <div className="cyber-grid p-4">
                  <div className="data-label mb-2">Subject</div>
                  {editMode ? (
                    <Input
                      value={adminSettings?.shellMember?.name || ''}
                      onChange={(e) => setAdminSettings((prev) => ({ ...(prev || {}), shellMember: { ...(prev?.shellMember || {}), name: e.target.value } }))}
                      className="bg-card border-border font-mono text-xl"
                      placeholder="Member name"
                    />
                  ) : (
                    <p className="text-xl font-bold font-mono hover-chromatic">{adminSettings?.shellMember?.name || 'Unknown'}</p>
                  )}
                </div>

                <div className="cyber-grid p-4">
                  <div className="data-label mb-2">Role</div>
                  {editMode ? (
                    <Input
                      value={adminSettings?.shellMember?.role || ''}
                      onChange={(e) => setAdminSettings((prev) => ({ ...(prev || {}), shellMember: { ...(prev?.shellMember || {}), role: e.target.value } }))}
                      className="bg-card border-border font-mono"
                      placeholder="Member role"
                    />
                  ) : (
                    <p className="text-muted-foreground font-mono">{adminSettings?.shellMember?.role || ''}</p>
                  )}
                </div>

                <div className="cyber-grid p-4">
                  <div className="data-label mb-2">Bio</div>
                  {editMode ? (
                    <Textarea
                      value={adminSettings?.shellMember?.bio || ''}
                      onChange={(e) => setAdminSettings((prev) => ({ ...(prev || {}), shellMember: { ...(prev?.shellMember || {}), bio: e.target.value } }))}
                      className="bg-card border-border font-mono min-h-[100px]"
                      placeholder="Member bio"
                    />
                  ) : (
                    <p className="text-foreground/90 leading-relaxed font-mono text-sm">{adminSettings?.shellMember?.bio || ''}</p>
                  )}
                </div>

                {editMode && (
                  <div className="cyber-grid p-4">
                    <div className="data-label mb-2">Social Links</div>
                    <div className="space-y-2">
                      {(['instagram', 'spotify', 'youtube', 'soundcloud', 'twitter', 'website'] as const).map((platform) => (
                        <div key={platform} className="flex gap-2 items-center">
                          <Label className="font-mono text-xs w-24">{platform}</Label>
                          <Input
                            value={adminSettings?.shellMember?.social?.[platform] || ''}
                            onChange={(e) => setAdminSettings((prev) => ({
                              ...(prev || {}),
                              shellMember: {
                                ...(prev?.shellMember || {}),
                                social: { ...(prev?.shellMember?.social || {}), [platform]: e.target.value },
                              },
                            }))}
                            className="bg-card border-border font-mono text-xs flex-1"
                            placeholder={`https://${platform}.com/...`}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {!editMode && adminSettings?.shellMember?.social && (
                  <div className="flex flex-wrap gap-3 pt-2">
                    {Object.entries(adminSettings.shellMember.social).filter(([, url]) => url).map(([platform, url]) => (
                      <a
                        key={platform}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-mono text-muted-foreground hover:text-primary transition-colors uppercase tracking-wider hover-chromatic"
                      >
                        [{platform}]
                      </a>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-2 text-[9px] text-primary/40 pt-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-pulse" />
                  <span>SESSION ACTIVE</span>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>
      </>
      )}
      </div>

      <div style={{ order: getSectionOrder('creditHighlights') }}>
      {vis.creditHighlights !== false && (
      <>
      <section className="py-16 px-4 bg-card/50 noise-effect overflow-hidden">
        <div className="container mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center"
          >
            <div className="data-label mb-6">
              {editMode ? (
                <Input
                  value={sectionLabels.creditHighlights || ''}
                  onChange={(e) => updateSectionLabel('creditHighlights', e.target.value)}
                  placeholder="// CREDIT.HIGHLIGHTS"
                  className="bg-transparent border-border font-mono text-xs text-center max-w-xs mx-auto"
                />
              ) : (
                <>// {sectionLabels.creditHighlights || 'CREDIT.HIGHLIGHTS'}</>
              )}
            </div>

            {editMode && (
              <div className="mb-8 space-y-3 max-w-xl mx-auto text-left">
                {siteData.creditHighlights.map((highlight, index) => (
                  <div key={index} className="flex items-end gap-2">
                    <div className="flex-1 space-y-1">
                      <Label className="font-mono text-xs">Image URL</Label>
                      <Input
                        value={highlight.src}
                        onChange={(e) => {
                          const updated = [...siteData.creditHighlights]
                          updated[index] = { ...updated[index], src: e.target.value }
                          setSiteData((data) => data ? { ...data, creditHighlights: updated } : data!)
                        }}
                        placeholder="https://drive.google.com/file/d/... or image URL"
                        className="bg-card border-border font-mono text-xs"
                      />
                    </div>
                    <div className="w-32 space-y-1">
                      <Label className="font-mono text-xs">Label</Label>
                      <Input
                        value={highlight.alt}
                        onChange={(e) => {
                          const updated = [...siteData.creditHighlights]
                          updated[index] = { ...updated[index], alt: e.target.value }
                          setSiteData((data) => data ? { ...data, creditHighlights: updated } : data!)
                        }}
                        placeholder="Name"
                        className="bg-card border-border font-mono text-xs"
                      />
                    </div>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => {
                        const updated = siteData.creditHighlights.filter((_, i) => i !== index)
                        setSiteData((data) => data ? { ...data, creditHighlights: updated } : data!)
                      }}
                    >
                      <Trash className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setSiteData((data) => data ? { ...data, creditHighlights: [...data.creditHighlights, { src: '', alt: '' }] } : data!)
                  }}
                  className="font-mono"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Logo
                </Button>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-center gap-8 md:gap-12 opacity-60 hover:opacity-90 transition-opacity duration-500">
              {siteData.creditHighlights.filter(logo => logo.src).map((logo, index) => (
                <motion.img
                  key={`credit-${index}`}
                  src={toDirectImageUrl(logo.src) || logo.src}
                  alt={logo.alt}
                  className="h-10 md:h-14 w-auto object-contain brightness-0 invert opacity-70 hover:opacity-100 transition-opacity duration-300 hover-chromatic-image"
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 0.7, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  whileHover={{ opacity: 1 }}
                  loading="lazy"
                />
              ))}
            </div>
          </motion.div>
        </div>
      </section>
      </>
      )}
      </div>

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
              <EditableHeading
                text={sectionLabels.musicPlayer || ''}
                defaultText="MUSIC PLAYER"
                editMode={editMode}
                onChange={(v) => updateSectionLabel('musicPlayer', v)}
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
                <EditableHeading
                  text={sectionLabels.upcomingGigs || ''}
                  defaultText="UPCOMING GIGS"
                  editMode={editMode}
                  onChange={(v) => updateSectionLabel('upcomingGigs', v)}
                  glitchEnabled={adminSettings?.glitchTextSettings?.enabled !== false}
                  glitchIntervalMs={adminSettings?.glitchTextSettings?.intervalMs}
                  glitchDurationMs={adminSettings?.glitchTextSettings?.durationMs}
                />
              </h2>
              {editMode && (
                <Button onClick={addGig} className="gap-2">
                  <Plus className="w-4 h-4" />
                  Add Gig
                </Button>
              )}
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

                        <div className="flex gap-2">
                          {editMode && (
                            <>
                              <Button variant="outline" size="sm" onClick={(e) => {
                                e.stopPropagation()
                                setEditingGig(gig)
                              }}>
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button variant="destructive" size="sm" onClick={(e) => {
                                e.stopPropagation()
                                deleteGig(gig.id)
                              }}>
                                <Trash className="w-4 h-4" />
                              </Button>
                            </>
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
                <EditableHeading
                  text={sectionLabels.releases || ''}
                  defaultText="RELEASES"
                  editMode={editMode}
                  onChange={(v) => updateSectionLabel('releases', v)}
                  glitchEnabled={adminSettings?.glitchTextSettings?.enabled !== false}
                  glitchIntervalMs={adminSettings?.glitchTextSettings?.intervalMs}
                  glitchDurationMs={adminSettings?.glitchTextSettings?.durationMs}
                />
              </h2>
              {editMode && (
                <Button onClick={addRelease} className="gap-2">
                  <Plus className="w-4 h-4" />
                  Add Release
                </Button>
              )}
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
                            {editMode && (
                              <div className="absolute top-2 right-2 flex gap-1">
                                <Button variant="destructive" size="sm" onClick={(e) => {
                                  e.stopPropagation()
                                  deleteRelease(release.id)
                                }}>
                                  <Trash className="w-3 h-3" />
                                </Button>
                              </div>
                            )}
                          </div>
                          <div className="p-4">
                            <h3 className="font-bold uppercase text-sm mb-1 truncate font-mono hover-chromatic">{release.title}</h3>
                            <p className="text-xs text-muted-foreground mb-3 font-mono">{release.year}</p>
                            
                            {editMode && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="w-full mt-3"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setEditingRelease(release)
                                }}
                              >
                                <Pencil className="w-3 h-3 mr-2" />
                                Edit
                              </Button>
                            )}
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

      <div style={{ order: getSectionOrder('gallery') }}>
      {vis.gallery !== false && (
      <>
      <Separator className="bg-border" />
      <section id="gallery" className="py-24 px-4 crt-effect">
        <div className="container mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0, x: -30, filter: 'blur(10px)', clipPath: 'polygon(0 0, 0 0, 0 100%, 0 100%)' }}
            whileInView={{ opacity: 1, x: 0, filter: 'blur(0px)', clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 100%)' }}
            viewport={{ once: true }}
            transition={{ duration: 1, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            <div className="flex items-center justify-between mb-12">
              <h2 className="text-4xl md:text-6xl font-bold uppercase tracking-tighter text-foreground font-mono hover-chromatic hover-glitch cyber2077-scan-build cyber2077-data-corrupt" data-text="GALLERY">
                <EditableHeading
                  text={sectionLabels.gallery || ''}
                  defaultText="GALLERY"
                  editMode={editMode}
                  onChange={(v) => updateSectionLabel('gallery', v)}
                  glitchEnabled={adminSettings?.glitchTextSettings?.enabled !== false}
                  glitchIntervalMs={adminSettings?.glitchTextSettings?.intervalMs}
                  glitchDurationMs={adminSettings?.glitchTextSettings?.durationMs}
                />
              </h2>
              {editMode && (
                <div className="flex gap-2">
                  <label className="cursor-pointer">
                    <Button className="gap-2" asChild>
                      <span>
                        <Upload className="w-4 h-4" />
                        Add Image
                      </span>
                    </Button>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleImageUpload(e, 'gallery')}
                    />
                  </label>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button className="gap-2" variant="outline">
                        <Plus className="w-4 h-4" />
                        Add URL
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add Image from URL</DialogTitle>
                      </DialogHeader>
                      <form onSubmit={(e) => {
                        e.preventDefault()
                        const formData = new FormData(e.currentTarget)
                        const url = formData.get('imageUrl') as string
                        if (url && siteData) {
                          setSiteData({ ...siteData, gallery: [...siteData.gallery, url] })
                          toast.success('Image URL added to gallery')
                          e.currentTarget.reset()
                        }
                      }}>
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="imageUrl">Image URL (supports Google Drive links)</Label>
                            <Input
                              id="imageUrl"
                              name="imageUrl"
                              type="url"
                              placeholder="https://drive.google.com/file/d/..."
                              className="mt-2"
                            />
                          </div>
                          <Button type="submit">Add Image</Button>
                        </div>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
              )}
            </div>

            {siteData.gallery.length === 0 ? (
              <Card className="p-12 text-center bg-card/50 border-border">
                <p className="text-xl text-muted-foreground uppercase tracking-wide font-mono">
                  Gallery coming soon
                </p>
              </Card>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {siteData.gallery.map((image, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, clipPath: 'inset(0 0 100% 0)' }}
                    whileInView={{ opacity: 1, clipPath: 'inset(0 0 0% 0)' }}
                    viewport={{ once: true }}
                    transition={{ 
                      duration: 0.6,
                      delay: index * 0.08,
                      ease: [0.25, 0.46, 0.45, 0.94]
                    }}
                    className="aspect-square bg-muted overflow-hidden cursor-pointer relative group glitch-image"
                    onClick={() => setGalleryIndex(index)}
                  >
                    <img 
                      src={toDirectImageUrl(image) || image} 
                      alt={`Gallery ${index + 1}`} 
                      className="w-full h-full object-cover hover-chromatic-image" 
                      crossOrigin="anonymous"
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <MagnifyingGlassPlus className="w-8 h-8 text-foreground" />
                    </div>
                    {editMode && (
                      <Button
                        variant="destructive"
                        size="sm"
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100"
                        onClick={(e) => {
                          e.stopPropagation()
                          deleteGalleryImage(index)
                        }}
                      >
                        <Trash className="w-3 h-3" />
                      </Button>
                    )}
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
        onUpdate={(files) => {
          setSiteData((data) => data ? {
            ...data,
            mediaFiles: files.map(f => ({
              id: f.id,
              name: f.name,
              url: f.url,
              type: (f.type === 'download' ? 'zip' : f.type || 'zip') as 'image' | 'pdf' | 'zip',
              size: f.description || '',
            })),
          } : data!)
        }}
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
              <EditableHeading
                text={sectionLabels.connect || ''}
                defaultText="CONNECT"
                editMode={editMode}
                onChange={(v) => updateSectionLabel('connect', v)}
                glitchEnabled={adminSettings?.glitchTextSettings?.enabled !== false}
                glitchIntervalMs={adminSettings?.glitchTextSettings?.intervalMs}
                glitchDurationMs={adminSettings?.glitchTextSettings?.durationMs}
              />
            </h2>

            {editMode && (
              <div className="mb-8 space-y-4 max-w-md mx-auto text-left">
                {([
                  { key: 'instagram', label: 'Instagram' },
                  { key: 'facebook', label: 'Facebook' },
                  { key: 'spotify', label: 'Spotify' },
                  { key: 'youtube', label: 'YouTube' },
                  { key: 'soundcloud', label: 'SoundCloud' },
                  { key: 'bandcamp', label: 'Bandcamp' },
                  { key: 'tiktok', label: 'TikTok' },
                  { key: 'appleMusic', label: 'Apple Music' },
                  { key: 'twitter', label: 'Twitter / X' },
                  { key: 'twitch', label: 'Twitch' },
                  { key: 'beatport', label: 'Beatport' },
                  { key: 'linktree', label: 'Linktree' },
                ] as { key: keyof typeof siteData.social; label: string }[]).map(({ key, label }) => (
                  <div key={key}>
                    <Label className="font-mono">{label}</Label>
                    <Input
                      value={siteData.social[key] || ''}
                      onChange={(e) => setSiteData((data) => data ? { ...data, social: { ...data.social, [key]: e.target.value } } : data!)}
                      className="bg-card border-border"
                      placeholder={`https://${label.toLowerCase().replace(/\s.*/, '')}.com/...`}
                    />
                  </div>
                ))}
              </div>
            )}

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
                    <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">{label}</span>
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

      </div>{/* end flex container for reorderable sections */}

      <footer className="py-12 px-4 border-t border-border noise-effect">
        <div className="container mx-auto text-center space-y-4">
          <div className="flex justify-center gap-6 flex-wrap">
            <button
              onClick={() => {
                setLanguage('en')
                setCyberpunkOverlay({ type: 'impressum' })
              }}
              className="text-sm text-muted-foreground hover:text-primary transition-colors uppercase tracking-wide font-mono hover-chromatic cursor-pointer"
            >
              Impressum
            </button>
            <button
              onClick={() => {
                setLanguage('en')
                setCyberpunkOverlay({ type: 'privacy' })
              }}
              className="text-sm text-muted-foreground hover:text-primary transition-colors uppercase tracking-wide font-mono hover-chromatic cursor-pointer"
            >
              Privacy Policy / Datenschutz-erklärung
            </button>
            <button
              onClick={() => setCyberpunkOverlay({ type: 'contact' })}
              className="text-sm text-muted-foreground hover:text-primary transition-colors uppercase tracking-wide font-mono hover-chromatic cursor-pointer"
            >
              Contact
            </button>
            {!isOwner && (
              <button
                onClick={() => adminPasswordHash ? setShowLoginDialog(true) : setShowSetupDialog(true)}
                className="text-sm text-muted-foreground/40 hover:text-primary/60 transition-colors font-mono cursor-pointer"
                title="Admin"
              >
                <Lock size={14} />
              </button>
            )}
          </div>
          <p className="text-sm text-muted-foreground uppercase tracking-wide font-mono hover-chromatic">
            © {new Date().getFullYear()} {siteData.artistName}
          </p>
        </div>
      </footer>

      <AnimatePresence>
        {galleryIndex !== null && siteData && (
          <SwipeableGallery
            images={siteData.gallery}
            initialIndex={galleryIndex}
            onClose={() => setGalleryIndex(null)}
          />
        )}
      </AnimatePresence>

      <Terminal 
        isOpen={terminalOpen} 
        onClose={() => setTerminalOpen(false)}
        customCommands={terminalCommands}
        editMode={editMode}
        onSaveCommands={handleSaveTerminalCommands}
      />

      <StatsDashboard open={showStats} onClose={() => setShowStats(false)} />

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

                              {editMode ? (
                                <div className="space-y-4">
                                  <div className="data-label mb-2">Custom Impressum Content (HTML supported)</div>
                                  <Textarea
                                    value={adminSettings?.legalContent?.impressumCustom || ''}
                                    onChange={(e) => setAdminSettings((prev) => ({ ...(prev || {}), legalContent: { ...(prev?.legalContent || {}), impressumCustom: e.target.value } }))}
                                    className="bg-card border-border font-mono text-sm min-h-[300px]"
                                    placeholder="Enter custom Impressum text here. Leave empty for default content."
                                  />
                                </div>
                              ) : adminSettings?.legalContent?.impressumCustom ? (
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

                              {editMode ? (
                                <div className="space-y-4">
                                  <div className="data-label mb-2">Custom Privacy/Datenschutz Content</div>
                                  <Textarea
                                    value={adminSettings?.legalContent?.privacyCustom || ''}
                                    onChange={(e) => setAdminSettings((prev) => ({ ...(prev || {}), legalContent: { ...(prev?.legalContent || {}), privacyCustom: e.target.value } }))}
                                    className="bg-card border-border font-mono text-sm min-h-[300px]"
                                    placeholder="Enter custom privacy policy text here. Leave empty for default content."
                                  />
                                </div>
                              ) : adminSettings?.legalContent?.privacyCustom ? (
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
                                    {editMode ? (
                                      <>
                                        <Input
                                          value={adminSettings?.contactInfo?.managementName || 'Federico Augusto Ágreda Álvarez'}
                                          onChange={(e) => setAdminSettings((prev) => ({ ...(prev || {}), contactInfo: { ...(prev?.contactInfo || {}), managementName: e.target.value } }))}
                                          className="bg-card border-border font-mono text-sm"
                                          placeholder="Management name"
                                        />
                                        <Input
                                          value={adminSettings?.contactInfo?.managementEmail || 'info@zardonic.net'}
                                          onChange={(e) => setAdminSettings((prev) => ({ ...(prev || {}), contactInfo: { ...(prev?.contactInfo || {}), managementEmail: e.target.value } }))}
                                          className="bg-card border-border font-mono text-sm"
                                          placeholder="Management email"
                                        />
                                      </>
                                    ) : (
                                      <>
                                        <p>{adminSettings?.contactInfo?.managementName || 'Federico Augusto Ágreda Álvarez'}</p>
                                        <p>E-Mail: <a href={`mailto:${adminSettings?.contactInfo?.managementEmail || 'info@zardonic.net'}`} className="text-primary hover:underline">{adminSettings?.contactInfo?.managementEmail || 'info@zardonic.net'}</a></p>
                                      </>
                                    )}
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
                                    {editMode ? (
                                      <Input
                                        value={adminSettings?.contactInfo?.bookingEmail || 'booking@zardonic.net'}
                                        onChange={(e) => setAdminSettings((prev) => ({ ...(prev || {}), contactInfo: { ...(prev?.contactInfo || {}), bookingEmail: e.target.value } }))}
                                        className="bg-card border-border font-mono text-sm"
                                        placeholder="Booking email"
                                      />
                                    ) : (
                                      <p>E-Mail: <a href={`mailto:${adminSettings?.contactInfo?.bookingEmail || 'booking@zardonic.net'}`} className="text-primary hover:underline">{adminSettings?.contactInfo?.bookingEmail || 'booking@zardonic.net'}</a></p>
                                    )}
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
                                    {editMode ? (
                                      <Input
                                        value={adminSettings?.contactInfo?.pressEmail || 'press@zardonic.net'}
                                        onChange={(e) => setAdminSettings((prev) => ({ ...(prev || {}), contactInfo: { ...(prev?.contactInfo || {}), pressEmail: e.target.value } }))}
                                        className="bg-card border-border font-mono text-sm"
                                        placeholder="Press email"
                                      />
                                    ) : (
                                      <p>E-Mail: <a href={`mailto:${adminSettings?.contactInfo?.pressEmail || 'press@zardonic.net'}`} className="text-primary hover:underline">{adminSettings?.contactInfo?.pressEmail || 'press@zardonic.net'}</a></p>
                                    )}
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
                                        _hp: formData.get('_hp') ?? '',
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
                                <h2 className="text-4xl md:text-5xl font-bold uppercase font-mono mb-4 hover-chromatic crt-flash-in" data-text={cyberpunkOverlay.data.venue}>
                                  {cyberpunkOverlay.data.venue}
                                </h2>
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
                                    <MapPin className="w-5 h-5 text-primary" />
                                    {cyberpunkOverlay.data.location}
                                  </div>
                                </motion.div>

                                <motion.div 
                                  className="cyber-grid p-4"
                                  initial={{ opacity: 0, x: -10 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: 0.3 }}
                                >
                                  <div className="data-label mb-2">Date & Time</div>
                                  <div className="flex items-center gap-2 text-xl font-mono hover-chromatic">
                                    <CalendarBlank className="w-5 h-5 text-primary" />
                                    {new Date(cyberpunkOverlay.data.date).toLocaleDateString('en-US', { 
                                      weekday: 'long', 
                                      year: 'numeric', 
                                      month: 'long', 
                                      day: 'numeric' 
                                    })}
                                  </div>
                                </motion.div>
                              </div>

                              {cyberpunkOverlay.data.support && (
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
                                  <Button asChild size="lg" className="w-full md:w-auto font-mono uppercase tracking-wider hover-noise cyber-border">
                                    <a href={cyberpunkOverlay.data.ticketUrl} target="_blank" rel="noopener noreferrer">
                                      <Ticket className="w-5 h-5 mr-2" />
                                      <span className="hover-chromatic">Get Tickets</span>
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
                                <div className="data-label">// SYSTEM.STATUS: [ACTIVE]</div>
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

      <Dialog open={editingGig !== null} onOpenChange={() => setEditingGig(null)}>
        <DialogContent className="bg-background border-border">
          <DialogHeader>
            <DialogTitle className="uppercase tracking-wide font-mono">Edit Gig</DialogTitle>
          </DialogHeader>
          {editingGig && (
            <div className="space-y-4">
              <div>
                <Label className="font-mono">Venue</Label>
                <Input
                  value={editingGig.venue}
                  onChange={(e) => setEditingGig({ ...editingGig, venue: e.target.value })}
                  className="bg-card border-border"
                />
              </div>
              <div>
                <Label className="font-mono">Location</Label>
                <Input
                  value={editingGig.location}
                  onChange={(e) => setEditingGig({ ...editingGig, location: e.target.value })}
                  className="bg-card border-border"
                />
              </div>
              <div>
                <Label className="font-mono">Date</Label>
                <Input
                  type="date"
                  value={editingGig.date}
                  onChange={(e) => setEditingGig({ ...editingGig, date: e.target.value })}
                  className="bg-card border-border"
                />
              </div>
              <div>
                <Label className="font-mono">Support</Label>
                <Input
                  value={editingGig.support || ''}
                  onChange={(e) => setEditingGig({ ...editingGig, support: e.target.value })}
                  className="bg-card border-border"
                />
              </div>
              <div>
                <Label className="font-mono">Ticket URL</Label>
                <Input
                  value={editingGig.ticketUrl || ''}
                  onChange={(e) => setEditingGig({ ...editingGig, ticketUrl: e.target.value })}
                  className="bg-card border-border"
                />
              </div>
              <Button onClick={() => saveGig(editingGig)} className="w-full">
                <FloppyDisk className="w-4 h-4 mr-2" />
                Save Gig
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={editingRelease !== null} onOpenChange={() => setEditingRelease(null)}>
        <DialogContent className="bg-background border-border">
          <DialogHeader>
            <DialogTitle className="uppercase tracking-wide font-mono">Edit Release</DialogTitle>
          </DialogHeader>
          {editingRelease && (
            <div className="space-y-4">
              <div>
                <Label className="font-mono">Title</Label>
                <Input
                  value={editingRelease.title}
                  onChange={(e) => setEditingRelease({ ...editingRelease, title: e.target.value })}
                  className="bg-card border-border"
                />
              </div>
              <div>
                <Label className="font-mono">Year</Label>
                <Input
                  value={editingRelease.year}
                  onChange={(e) => setEditingRelease({ ...editingRelease, year: e.target.value })}
                  className="bg-card border-border"
                />
              </div>
              <div>
                <Label className="font-mono">Artwork URL</Label>
                <Input
                  value={editingRelease.artwork}
                  onChange={(e) => setEditingRelease({ ...editingRelease, artwork: e.target.value })}
                  className="bg-card border-border"
                />
              </div>
              <div>
                <Label className="font-mono">Spotify URL</Label>
                <Input
                  value={editingRelease.spotify || ''}
                  onChange={(e) => setEditingRelease({ ...editingRelease, spotify: e.target.value })}
                  className="bg-card border-border"
                />
              </div>
              <div>
                <Label className="font-mono">YouTube URL</Label>
                <Input
                  value={editingRelease.youtube || ''}
                  onChange={(e) => setEditingRelease({ ...editingRelease, youtube: e.target.value })}
                  className="bg-card border-border"
                />
              </div>
              <Button onClick={() => saveRelease(editingRelease)} className="w-full">
                <FloppyDisk className="w-4 h-4 mr-2" />
                Save Release
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {isOwner && (
        <EditControls
          editMode={editMode}
          onToggleEdit={() => setEditMode(!editMode)}
          hasPassword={!!adminPasswordHash}
          onChangePassword={handleSetAdminPassword}
          onSetPassword={handleSetAdminPassword}
          siteData={siteData}
          onImportData={(imported) => setSiteData(imported)}
          adminSettings={adminSettings}
          onAdminSettingsChange={(settings) => setAdminSettings(settings)}
          onOpenConfigEditor={() => setShowConfigEditor(true)}
          onOpenStats={() => setShowStats(true)}
        />
      )}

      <ConfigEditorDialog
        open={showConfigEditor}
        onClose={() => setShowConfigEditor(false)}
        overrides={adminSettings?.configOverrides || {}}
        onSave={(configOverrides) => setAdminSettings((prev) => ({ ...(prev || {}), configOverrides }))}
      />

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
