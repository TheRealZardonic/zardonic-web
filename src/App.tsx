import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion'
import { useKV } from '@github/spark/hooks'
import { useKonami } from '@/hooks/use-konami'
import { useAnalytics, trackClick } from '@/hooks/use-analytics'
import { fetchITunesReleases, type ITunesRelease } from '@/lib/itunes'
import { fetchOdesliLinks } from '@/lib/odesli'
import { fetchBandsintownEvents } from '@/lib/bandsintown'
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
} from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
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

interface SiteData {
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
  social: {
    instagram?: string
    facebook?: string
    spotify?: string
    youtube?: string
    soundcloud?: string
    bandcamp?: string
    tiktok?: string
    appleMusic?: string
  }
}

interface AnalyticsData {
  pageViews: number
  sectionViews: { [key: string]: number }
  clicks: { [key: string]: number }
  visitors: { date: string; count: number }[]
}

function App() {
  const konamiActivated = useKonami()
  const [terminalOpen, setTerminalOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [contentLoaded, setContentLoaded] = useState(false)
  
  useEffect(() => {
    if (konamiActivated) {
      setTerminalOpen(true)
      toast.success('Terminal activated!')
    }
  }, [konamiActivated])

  useEffect(() => {
    if (!loading) {
      setTimeout(() => setContentLoaded(true), 100)
    }
  }, [loading])

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
    releases: [
      {
        id: '1',
        title: 'Superstars',
        artwork: 'https://images.unsplash.com/photo-1619983081563-430f63602796?w=500&h=500&fit=crop',
        year: '2023',
        spotify: 'https://open.spotify.com/album/example1',
        youtube: 'https://youtube.com/playlist/example1',
        soundcloud: 'https://soundcloud.com/zardonic/sets/superstars',
        bandcamp: 'https://zardonic.bandcamp.com/album/superstars'
      },
      {
        id: '2',
        title: 'Become',
        artwork: 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=500&h=500&fit=crop',
        year: '2018',
        spotify: 'https://open.spotify.com/album/example2',
        youtube: 'https://youtube.com/playlist/example2',
        soundcloud: 'https://soundcloud.com/zardonic/sets/become',
        bandcamp: 'https://zardonic.bandcamp.com/album/become'
      },
      {
        id: '3',
        title: 'Antihero',
        artwork: 'https://images.unsplash.com/photo-1598387993441-a364f854c3e1?w=500&h=500&fit=crop',
        year: '2015',
        spotify: 'https://open.spotify.com/album/example3',
        youtube: 'https://youtube.com/playlist/example3',
        soundcloud: 'https://soundcloud.com/zardonic/sets/antihero',
        bandcamp: 'https://zardonic.bandcamp.com/album/antihero'
      },
      {
        id: '4',
        title: 'Vulgar Display of Bass',
        artwork: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=500&h=500&fit=crop',
        year: '2013',
        spotify: 'https://open.spotify.com/album/example4',
        youtube: 'https://youtube.com/playlist/example4',
        soundcloud: 'https://soundcloud.com/zardonic/sets/vulgar-display-of-bass'
      },
      {
        id: '5',
        title: 'Black And White',
        artwork: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=500&h=500&fit=crop',
        year: '2011',
        spotify: 'https://open.spotify.com/album/example5',
        youtube: 'https://youtube.com/playlist/example5',
        bandcamp: 'https://zardonic.bandcamp.com/album/black-and-white'
      },
      {
        id: '6',
        title: 'Revelation',
        artwork: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&h=500&fit=crop',
        year: '2009',
        spotify: 'https://open.spotify.com/album/example6',
        soundcloud: 'https://soundcloud.com/zardonic/sets/revelation',
        bandcamp: 'https://zardonic.bandcamp.com/album/revelation'
      },
      {
        id: '7',
        title: 'Before The Dawn',
        artwork: 'https://images.unsplash.com/photo-1487180144351-b8472da7d491?w=500&h=500&fit=crop',
        year: '2007',
        spotify: 'https://open.spotify.com/album/example7',
        bandcamp: 'https://zardonic.bandcamp.com/album/before-the-dawn'
      },
      {
        id: '8',
        title: 'Raised On The Streets',
        artwork: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=500&h=500&fit=crop',
        year: '2020',
        spotify: 'https://open.spotify.com/album/example8',
        youtube: 'https://youtube.com/playlist/example8',
        soundcloud: 'https://soundcloud.com/zardonic/sets/raised-on-the-streets'
      }
    ],
    gallery: [],
    instagramFeed: [],
    members: [],
    mediaFiles: [],
    social: {
      instagram: 'https://instagram.com/zfrederickx',
      facebook: 'https://facebook.com/ZardonicOfficial',
      spotify: 'https://open.spotify.com/artist/0hVKeSdrYbJjFqLRnYeHOp',
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
  const [galleryIndex, setGalleryIndex] = useState<number | null>(null)
  const [editingGig, setEditingGig] = useState<Gig | null>(null)
  const [editingRelease, setEditingRelease] = useState<Release | null>(null)
  const [cyberpunkOverlay, setCyberpunkOverlay] = useState<{type: 'gig' | 'release' | 'member' | 'impressum' | 'privacy', data?: any} | null>(null)
  const [language, setLanguage] = useState<'en' | 'de'>('en')
  const [overlayLoading, setOverlayLoading] = useState(false)
  const [loadingProgress, setLoadingProgress] = useState(0)
  const [contentReady, setContentReady] = useState(false)
  const [iTunesFetching, setITunesFetching] = useState(false)
  const [bandsintownFetching, setBandsintownFetching] = useState(false)
  const [hasAutoLoaded, setHasAutoLoaded] = useState(false)
  
  const audioRef = useRef<HTMLAudioElement>(null)
  const [currentUser, setCurrentUser] = useState<any>(null)

  useEffect(() => {
    window.spark.user().then(setCurrentUser)
  }, [])

  useEffect(() => {
    if (cyberpunkOverlay) {
      setOverlayLoading(true)
      setContentReady(false)
      setLoadingProgress(0)

      const progressInterval = setInterval(() => {
        setLoadingProgress(prev => {
          if (prev >= 100) {
            clearInterval(progressInterval)
            return 100
          }
          return prev + Math.random() * 30
        })
      }, 50)

      const contentTimer = setTimeout(() => {
        setContentReady(true)
      }, 400)

      const loadingTimer = setTimeout(() => {
        setOverlayLoading(false)
        clearInterval(progressInterval)
      }, 600)

      return () => {
        clearInterval(progressInterval)
        clearTimeout(contentTimer)
        clearTimeout(loadingTimer)
      }
    }
  }, [cyberpunkOverlay])

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume[0] / 100
    }
  }, [volume])

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
    const element = document.getElementById(id)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' })
      setMobileMenuOpen(false)
    }
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
    return <div className="min-h-screen bg-background flex items-center justify-center">
      <p className="text-foreground text-2xl font-mono">LOADING...</p>
    </div>
  }

  return (
    <>
      <AnimatePresence>
        {loading && (
          <LoadingScreen onLoadComplete={() => setLoading(false)} />
        )}
      </AnimatePresence>

      <div className="min-h-screen bg-background text-foreground relative">
      <div className="crt-overlay" />
      <div className="crt-vignette" />
      <div className="full-page-noise periodic-noise-glitch" />
      <CircuitBackground />
      
      <Toaster />
      <audio ref={audioRef} src={currentTrack?.url} />

      <motion.nav
        initial={{ y: -100, opacity: 0 }}
        animate={contentLoaded ? { y: 0, opacity: 1 } : { y: -100, opacity: 0 }}
        transition={{ duration: 0.8, delay: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="fixed top-0 left-0 right-0 z-50 bg-background/98 backdrop-blur-sm border-b border-border scanline-effect"
      >
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <motion.div
            className="text-2xl md:text-3xl font-bold tracking-tighter text-foreground uppercase"
            whileHover={{ scale: 1.02 }}
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
                className="h-10 md:h-12 w-auto object-contain logo-glitch brightness-110"
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
            {currentUser?.isOwner && (
              <Button
                size="sm"
                variant={editMode ? 'default' : 'outline'}
                onClick={() => setEditMode(!editMode)}
              >
                <Pencil className="w-4 h-4" />
              </Button>
            )}
            
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
          initial={{ opacity: 0, scale: 0.95, y: 30 }}
          animate={contentLoaded ? { opacity: 1, scale: 1, y: 0 } : { opacity: 0, scale: 0.95, y: 30 }}
          transition={{ duration: 1, delay: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="relative z-10 text-center px-4"
        >
          <motion.div 
            className="mb-8 relative"
            initial={{ opacity: 0, scale: 0.8, y: 30 }}
            animate={contentLoaded ? { opacity: 1, scale: 1, y: 0 } : { opacity: 0, scale: 0.8, y: 30 }}
            transition={{ duration: 1, delay: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            <img 
              src={logoImage} 
              alt={siteData.artistName} 
              className="h-32 md:h-48 lg:h-64 w-auto object-contain logo-glitch brightness-110 mx-auto"
            />
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
          </motion.div>
        </motion.div>
      </section>

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
            <h2 className="text-4xl md:text-6xl font-bold mb-12 uppercase tracking-tighter text-foreground font-mono hover-chromatic hover-glitch cyber2077-scan-build" data-text="BIOGRAPHY">
              BIOGRAPHY
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
              <motion.p 
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
                className="text-lg leading-relaxed text-muted-foreground font-light"
              >
                {siteData.bio}
              </motion.p>
            )}
          </motion.div>
        </div>
      </section>

      <Separator className="bg-border" />

      <section id="music" className="py-24 px-4 bg-card/50 scanline-effect crt-effect">
        <div className="container mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0, x: -30, filter: 'blur(10px)', clipPath: 'polygon(0 0, 0 0, 0 100%, 0 100%)' }}
            whileInView={{ opacity: 1, x: 0, filter: 'blur(0px)', clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 100%)' }}
            viewport={{ once: true }}
            transition={{ duration: 1, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            <h2 className="text-4xl md:text-6xl font-bold mb-12 uppercase tracking-tighter text-foreground font-mono hover-chromatic hover-glitch cyber2077-scan-build" data-text="MUSIC PLAYER">
              MUSIC PLAYER
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
                <iframe
                  style={{ borderRadius: '0' }}
                  src="https://open.spotify.com/embed/artist/0hVKeSdrYbJjFqLRnYeHOp?utm_source=generator&theme=0"
                  width="100%"
                  height="352"
                  frameBorder="0"
                  allowFullScreen
                  allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                  loading="lazy"
                  title="Spotify Player - ZARDONIC"
                ></iframe>
              </div>
              <div className="p-4 pt-2">
                <div className="data-label">// STATUS: [STREAMING]</div>
              </div>
            </Card>
          </motion.div>
        </div>
      </section>

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
              <h2 className="text-4xl md:text-6xl font-bold uppercase tracking-tighter text-foreground font-mono hover-chromatic hover-glitch cyber2077-scan-build" data-text="UPCOMING GIGS">
                UPCOMING GIGS
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
                    whileHover={{ scale: 1.01 }}
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
              <h2 className="text-4xl md:text-6xl font-bold uppercase tracking-tighter text-foreground font-mono hover-chromatic hover-glitch cyber2077-scan-build" data-text="RELEASES">
                RELEASES
              </h2>
              {editMode && (
                <Button onClick={addRelease} className="gap-2">
                  <Plus className="w-4 h-4" />
                  Add Release
                </Button>
              )}
            </div>

            {iTunesFetching && siteData.releases.length === 0 ? (
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
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {[...siteData.releases].sort((a, b) => {
                  const yearA = a.releaseDate ? new Date(a.releaseDate).getTime() : parseInt(a.year) || 0
                  const yearB = b.releaseDate ? new Date(b.releaseDate).getTime() : parseInt(b.year) || 0
                  return yearB - yearA
                }).map((release, index) => (
                  <motion.div
                    key={release.id}
                    initial={{ opacity: 0, scale: 0.8, rotateX: -20 }}
                    whileInView={{ opacity: 1, scale: 1, rotateX: 0 }}
                    viewport={{ once: true }}
                    transition={{ 
                      duration: 0.6,
                      delay: index * 0.08,
                      ease: [0.25, 0.46, 0.45, 0.94]
                    }}
                    whileHover={{ scale: 1.03 }}
                  >
                    <Card 
                      className="overflow-hidden bg-card border-border hover:border-primary/50 transition-all cursor-pointer cyber-card hover-noise relative"
                      onClick={() => !editMode && setCyberpunkOverlay({ type: 'release', data: release })}
                    >
                      <div className="data-label absolute top-2 left-2 z-10">// REL.{release.year}</div>
                      <div className="aspect-square bg-muted relative">
                        {release.artwork && (
                          <img src={release.artwork} alt={release.title} className="w-full h-full object-cover glitch-image" />
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
                ))}
              </div>
            )}
          </motion.div>
        </div>
      </section>

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
              <h2 className="text-4xl md:text-6xl font-bold uppercase tracking-tighter text-foreground font-mono hover-chromatic hover-glitch cyber2077-scan-build" data-text="GALLERY">
                GALLERY
              </h2>
              {editMode && (
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
                    initial={{ opacity: 0, scale: 0.8, rotateY: -20 }}
                    whileInView={{ opacity: 1, scale: 1, rotateY: 0 }}
                    viewport={{ once: true }}
                    transition={{ 
                      duration: 0.6,
                      delay: index * 0.08,
                      ease: [0.25, 0.46, 0.45, 0.94]
                    }}
                    whileHover={{ scale: 1.03 }}
                    className="aspect-square bg-muted overflow-hidden cursor-pointer relative group glitch-image"
                    onClick={() => setGalleryIndex(index)}
                  >
                    <img src={image} alt={`Gallery ${index + 1}`} className="w-full h-full object-cover" />
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
            <h2 className="text-4xl md:text-6xl font-bold mb-12 uppercase tracking-tighter text-foreground font-mono hover-chromatic hover-glitch cyber2077-scan-build" data-text="CONNECT">
              CONNECT
            </h2>

            {editMode && (
              <div className="mb-8 space-y-4 max-w-md mx-auto text-left">
                <div>
                  <Label className="font-mono">Instagram</Label>
                  <Input
                    value={siteData.social.instagram || ''}
                    onChange={(e) => setSiteData((data) => data ? { ...data, social: { ...data.social, instagram: e.target.value } } : data!)}
                    className="bg-card border-border"
                  />
                </div>
                <div>
                  <Label className="font-mono">Facebook</Label>
                  <Input
                    value={siteData.social.facebook || ''}
                    onChange={(e) => setSiteData((data) => data ? { ...data, social: { ...data.social, facebook: e.target.value } } : data!)}
                    className="bg-card border-border"
                  />
                </div>
                <div>
                  <Label className="font-mono">Spotify</Label>
                  <Input
                    value={siteData.social.spotify || ''}
                    onChange={(e) => setSiteData((data) => data ? { ...data, social: { ...data.social, spotify: e.target.value } } : data!)}
                    className="bg-card border-border"
                  />
                </div>
                <div>
                  <Label className="font-mono">YouTube</Label>
                  <Input
                    value={siteData.social.youtube || ''}
                    onChange={(e) => setSiteData((data) => data ? { ...data, social: { ...data.social, youtube: e.target.value } } : data!)}
                    className="bg-card border-border"
                  />
                </div>
              </div>
            )}

            <div className="flex flex-wrap justify-center gap-6">
              {siteData.social.instagram && (
                <motion.a
                  href={siteData.social.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  initial={{ opacity: 0, scale: 0, rotate: -180 }}
                  whileInView={{ opacity: 1, scale: 1, rotate: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: 0.1, ease: [0.25, 0.46, 0.45, 0.94] }}
                  whileHover={{ scale: 1.1 }}
                  className="text-foreground hover:text-primary transition-colors hover-glitch relative"
                >
                  <InstagramLogo className="w-12 h-12" weight="fill" />
                </motion.a>
              )}
              {siteData.social.facebook && (
                <motion.a
                  href={siteData.social.facebook}
                  target="_blank"
                  rel="noopener noreferrer"
                  initial={{ opacity: 0, scale: 0, rotate: -180 }}
                  whileInView={{ opacity: 1, scale: 1, rotate: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
                  whileHover={{ scale: 1.1 }}
                  className="text-foreground hover:text-primary transition-colors hover-glitch relative"
                >
                  <FacebookLogo className="w-12 h-12" weight="fill" />
                </motion.a>
              )}
              {siteData.social.spotify && (
                <motion.a
                  href={siteData.social.spotify}
                  target="_blank"
                  rel="noopener noreferrer"
                  initial={{ opacity: 0, scale: 0, rotate: -180 }}
                  whileInView={{ opacity: 1, scale: 1, rotate: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
                  whileHover={{ scale: 1.1 }}
                  className="text-foreground hover:text-primary transition-colors hover-glitch relative"
                >
                  <SpotifyLogo className="w-12 h-12" weight="fill" />
                </motion.a>
              )}
              {siteData.social.youtube && (
                <motion.a
                  href={siteData.social.youtube}
                  target="_blank"
                  rel="noopener noreferrer"
                  initial={{ opacity: 0, scale: 0, rotate: -180 }}
                  whileInView={{ opacity: 1, scale: 1, rotate: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
                  whileHover={{ scale: 1.1 }}
                  className="text-foreground hover:text-primary transition-colors hover-glitch relative"
                >
                  <YoutubeLogo className="w-12 h-12" weight="fill" />
                </motion.a>
              )}
              {siteData.social.soundcloud && (
                <motion.a
                  href={siteData.social.soundcloud}
                  target="_blank"
                  rel="noopener noreferrer"
                  initial={{ opacity: 0, scale: 0, rotate: -180 }}
                  whileInView={{ opacity: 1, scale: 1, rotate: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
                  whileHover={{ scale: 1.1 }}
                  className="text-foreground hover:text-primary transition-colors hover-glitch relative"
                >
                  <SoundcloudLogo className="w-12 h-12" weight="fill" />
                </motion.a>
              )}
              {siteData.social.tiktok && (
                <motion.a
                  href={siteData.social.tiktok}
                  target="_blank"
                  rel="noopener noreferrer"
                  initial={{ opacity: 0, scale: 0, rotate: -180 }}
                  whileInView={{ opacity: 1, scale: 1, rotate: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
                  whileHover={{ scale: 1.1 }}
                  className="text-foreground hover:text-primary transition-colors hover-glitch relative"
                >
                  <TiktokLogo className="w-12 h-12" weight="fill" />
                </motion.a>
              )}
            </div>
          </motion.div>
        </div>
      </section>

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
              Privacy Policy / Datenschutzerklärung
            </button>
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

      <Terminal isOpen={terminalOpen} onClose={() => setTerminalOpen(false)} />

      <AnimatePresence>
        {cyberpunkOverlay && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/90 z-[100] backdrop-blur-sm cyberpunk-overlay-bg"
              onClick={() => setCyberpunkOverlay(null)}
            />
            
            <motion.div
              initial={{ 
                opacity: 0, 
                y: 50,
                rotateX: -20,
                scale: 0.9
              }}
              animate={{ 
                opacity: 1, 
                y: 0,
                rotateX: 0,
                scale: 1
              }}
              exit={{ 
                opacity: 0, 
                y: -30,
                rotateX: 10,
                scale: 0.95
              }}
              transition={{ 
                type: "spring", 
                damping: 25, 
                stiffness: 300,
                opacity: { duration: 0.2 }
              }}
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

                <AnimatePresence mode="wait">
                  {overlayLoading && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="absolute inset-0 bg-background/95 z-50 flex flex-col items-center justify-center p-8"
                    >
                      <motion.div
                        initial={{ scale: 0, rotate: -180 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ type: "spring", damping: 15, stiffness: 200 }}
                        className="mb-8"
                      >
                        <div className="w-16 h-16 border-2 border-primary/30 border-t-primary relative">
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                            className="absolute inset-0"
                          >
                            <div className="w-full h-full border-2 border-transparent border-t-primary/60" />
                          </motion.div>
                          <motion.div
                            animate={{ rotate: -360 }}
                            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                            className="absolute inset-2"
                          >
                            <div className="w-full h-full border-2 border-transparent border-t-primary/40" />
                          </motion.div>
                        </div>
                      </motion.div>

                      <motion.div 
                        className="w-full max-w-md space-y-3"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                      >
                        <div className="flex justify-between items-center mb-2">
                          <motion.span 
                            className="data-label"
                            animate={{ opacity: [0.5, 1, 0.5] }}
                            transition={{ duration: 1.5, repeat: Infinity }}
                          >
                            // LOADING.DATA.STREAM
                          </motion.span>
                          <motion.span 
                            className="font-mono text-sm text-primary"
                            key={Math.floor(loadingProgress)}
                          >
                            {Math.floor(loadingProgress)}%
                          </motion.span>
                        </div>
                        
                        <div className="h-1 bg-border/30 relative overflow-hidden">
                          <motion.div
                            className="absolute inset-0 bg-primary"
                            initial={{ scaleX: 0 }}
                            animate={{ scaleX: loadingProgress / 100 }}
                            style={{ transformOrigin: 'left' }}
                            transition={{ duration: 0.1 }}
                          />
                          <motion.div
                            className="absolute inset-0 bg-gradient-to-r from-transparent via-primary-foreground/20 to-transparent"
                            animate={{ x: ['-100%', '200%'] }}
                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          />
                        </div>

                        <motion.div 
                          className="flex gap-2 font-mono text-xs text-muted-foreground"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.3 }}
                        >
                          <motion.span
                            animate={{ opacity: [0, 1, 0] }}
                            transition={{ duration: 0.8, repeat: Infinity, delay: 0 }}
                          >
                            ▸
                          </motion.span>
                          <motion.span
                            animate={{ opacity: [0, 1, 0] }}
                            transition={{ duration: 0.8, repeat: Infinity, delay: 0.2 }}
                          >
                            ▸
                          </motion.span>
                          <motion.span
                            animate={{ opacity: [0, 1, 0] }}
                            transition={{ duration: 0.8, repeat: Infinity, delay: 0.4 }}
                          >
                            ▸
                          </motion.span>
                          <span className="ml-2">INITIALIZING INTERFACE</span>
                        </motion.div>
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="relative overflow-y-auto max-h-[90vh]">
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
                      {contentReady && (
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
                                <h2 className="text-4xl md:text-5xl font-bold uppercase font-mono mb-4 hover-chromatic" data-text="IMPRESSUM">
                                  IMPRESSUM
                                </h2>
                              </motion.div>

                              <div className="space-y-6 text-foreground/90">
                                <motion.div 
                                  className="cyber-grid p-4"
                                  initial={{ opacity: 0, x: -10 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: 0.2 }}
                                >
                                  <div className="data-label mb-2">Information according to § 5 TMG</div>
                                  <div className="space-y-2 font-mono text-sm">
                                    <p>Federico Ágreda Álvarez (ZARDONIC)</p>
                                    <p>Professional Artist & Music Producer</p>
                                  </div>
                                </motion.div>

                                <motion.div 
                                  className="cyber-grid p-4"
                                  initial={{ opacity: 0, x: -10 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: 0.3 }}
                                >
                                  <div className="data-label mb-2">Contact</div>
                                  <div className="space-y-2 font-mono text-sm">
                                    <p>Email: info@zardonic.com</p>
                                    <p>Website: www.zardonic.com</p>
                                  </div>
                                </motion.div>

                                <motion.div 
                                  className="cyber-grid p-4"
                                  initial={{ opacity: 0, x: -10 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: 0.4 }}
                                >
                                  <div className="data-label mb-2">Responsible for content according to § 55 Abs. 2 RStV</div>
                                  <div className="space-y-2 font-mono text-sm">
                                    <p>Federico Ágreda Álvarez</p>
                                  </div>
                                </motion.div>

                                <motion.div 
                                  className="cyber-grid p-4"
                                  initial={{ opacity: 0, x: -10 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: 0.5 }}
                                >
                                  <div className="data-label mb-2">Disclaimer / Haftungsausschluss</div>
                                  <div className="space-y-3 font-mono text-sm leading-relaxed">
                                    <p className="font-bold text-primary">Liability for content:</p>
                                    <p>The contents of our pages were created with the greatest care. However, we cannot guarantee the accuracy, completeness and timeliness of the content. As a service provider, we are responsible for our own content on these pages in accordance with general laws. However, we are not obligated to monitor transmitted or stored third-party information or to investigate circumstances that indicate illegal activity.</p>
                                    
                                    <p className="font-bold text-primary mt-4">Liability for links:</p>
                                    <p>Our offer contains links to external websites of third parties, on whose contents we have no influence. Therefore, we cannot assume any liability for these external contents. The respective provider or operator of the pages is always responsible for the contents of the linked pages.</p>
                                    
                                    <p className="font-bold text-primary mt-4">Copyright:</p>
                                    <p>The content and works created by the site operators on these pages are subject to copyright law. All content and works on this website are protected by copyright. Duplication, processing, distribution and any kind of exploitation outside the limits of copyright require the written consent of the respective author or creator.</p>
                                  </div>
                                </motion.div>
                              </div>

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
                                  <h2 className="text-4xl md:text-5xl font-bold uppercase font-mono mb-4 hover-chromatic" data-text="PRIVACY POLICY">
                                    PRIVACY POLICY
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

                              {language === 'en' ? (
                                <div className="space-y-6 text-foreground/90">
                                  <motion.div 
                                    className="cyber-grid p-4"
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.2 }}
                                  >
                                    <div className="data-label mb-2">1. Data Protection at a Glance</div>
                                    <div className="space-y-3 font-mono text-sm leading-relaxed">
                                      <p className="font-bold text-primary">General Information</p>
                                      <p>The following information provides a simple overview of what happens to your personal data when you visit this website. Personal data is any data that can be used to identify you personally.</p>
                                    </div>
                                  </motion.div>

                                  <motion.div 
                                    className="cyber-grid p-4"
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.3 }}
                                  >
                                    <div className="data-label mb-2">2. Data Collection on this Website</div>
                                    <div className="space-y-3 font-mono text-sm leading-relaxed">
                                      <p className="font-bold text-primary">Who is responsible for data collection on this website?</p>
                                      <p>Data processing on this website is carried out by the website operator. You can find their contact details in the section "Information about the responsible party" in this privacy policy.</p>
                                      
                                      <p className="font-bold text-primary mt-4">How do we collect your data?</p>
                                      <p>Your data is collected when you provide it to us. This can be data that you enter in a contact form, for example. Other data is collected automatically or with your consent when you visit the website by our IT systems. This is mainly technical data (e.g. internet browser, operating system or time of page view).</p>
                                      
                                      <p className="font-bold text-primary mt-4">What do we use your data for?</p>
                                      <p>Some of the data is collected to ensure error-free provision of the website. Other data may be used to analyze your user behavior.</p>
                                    </div>
                                  </motion.div>

                                  <motion.div 
                                    className="cyber-grid p-4"
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.4 }}
                                  >
                                    <div className="data-label mb-2">3. General Information and Mandatory Information</div>
                                    <div className="space-y-3 font-mono text-sm leading-relaxed">
                                      <p className="font-bold text-primary">Data Protection</p>
                                      <p>The operators of these pages take the protection of your personal data very seriously. We treat your personal data confidentially and in accordance with the statutory data protection regulations and this privacy policy.</p>
                                      <p>When you use this website, various personal data is collected. Personal data is data with which you can be personally identified. This privacy policy explains what data we collect and what we use it for. It also explains how and for what purpose this is done.</p>
                                    </div>
                                  </motion.div>

                                  <motion.div 
                                    className="cyber-grid p-4"
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.5 }}
                                  >
                                    <div className="data-label mb-2">4. Data Recording on this Website</div>
                                    <div className="space-y-3 font-mono text-sm leading-relaxed">
                                      <p className="font-bold text-primary">Cookies</p>
                                      <p>Our website uses cookies. Cookies are small text files that are stored on your device and that store certain settings and data for exchange with our system via your browser. Some cookies remain stored on your device until you delete them. They enable us to recognize your browser on your next visit.</p>
                                      <p>You can set your browser so that you are informed about the setting of cookies and only allow cookies in individual cases, exclude the acceptance of cookies for certain cases or in general, and activate the automatic deletion of cookies when closing the browser.</p>
                                    </div>
                                  </motion.div>

                                  <motion.div 
                                    className="cyber-grid p-4"
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.6 }}
                                  >
                                    <div className="data-label mb-2">5. Your Rights</div>
                                    <div className="space-y-3 font-mono text-sm leading-relaxed">
                                      <p>You have the right to receive information about the origin, recipient and purpose of your stored personal data free of charge at any time. You also have the right to request the correction or deletion of this data. If you have given your consent to data processing, you can revoke this consent at any time for the future. You also have the right to request the restriction of the processing of your personal data under certain circumstances.</p>
                                    </div>
                                  </motion.div>
                                </div>
                              ) : (
                                <div className="space-y-6 text-foreground/90">
                                  <motion.div 
                                    className="cyber-grid p-4"
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.2 }}
                                  >
                                    <div className="data-label mb-2">1. Datenschutz auf einen Blick</div>
                                    <div className="space-y-3 font-mono text-sm leading-relaxed">
                                      <p className="font-bold text-primary">Allgemeine Hinweise</p>
                                      <p>Die folgenden Hinweise geben einen einfachen Überblick darüber, was mit Ihren personenbezogenen Daten passiert, wenn Sie diese Website besuchen. Personenbezogene Daten sind alle Daten, mit denen Sie persönlich identifiziert werden können.</p>
                                    </div>
                                  </motion.div>

                                  <motion.div 
                                    className="cyber-grid p-4"
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.3 }}
                                  >
                                    <div className="data-label mb-2">2. Datenerfassung auf dieser Website</div>
                                    <div className="space-y-3 font-mono text-sm leading-relaxed">
                                      <p className="font-bold text-primary">Wer ist verantwortlich für die Datenerfassung auf dieser Website?</p>
                                      <p>Die Datenverarbeitung auf dieser Website erfolgt durch den Websitebetreiber. Dessen Kontaktdaten können Sie dem Abschnitt „Hinweis zur verantwortlichen Stelle" in dieser Datenschutzerklärung entnehmen.</p>
                                      
                                      <p className="font-bold text-primary mt-4">Wie erfassen wir Ihre Daten?</p>
                                      <p>Ihre Daten werden zum einen dadurch erhoben, dass Sie uns diese mitteilen. Hierbei kann es sich z.B. um Daten handeln, die Sie in ein Kontaktformular eingeben. Andere Daten werden automatisch oder nach Ihrer Einwilligung beim Besuch der Website durch unsere IT-Systeme erfasst. Das sind vor allem technische Daten (z.B. Internetbrowser, Betriebssystem oder Uhrzeit des Seitenaufrufs).</p>
                                      
                                      <p className="font-bold text-primary mt-4">Wofür nutzen wir Ihre Daten?</p>
                                      <p>Ein Teil der Daten wird erhoben, um eine fehlerfreie Bereitstellung der Website zu gewährleisten. Andere Daten können zur Analyse Ihres Nutzerverhaltens verwendet werden.</p>
                                    </div>
                                  </motion.div>

                                  <motion.div 
                                    className="cyber-grid p-4"
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.4 }}
                                  >
                                    <div className="data-label mb-2">3. Allgemeine Hinweise und Pflichtinformationen</div>
                                    <div className="space-y-3 font-mono text-sm leading-relaxed">
                                      <p className="font-bold text-primary">Datenschutz</p>
                                      <p>Die Betreiber dieser Seiten nehmen den Schutz Ihrer persönlichen Daten sehr ernst. Wir behandeln Ihre personenbezogenen Daten vertraulich und entsprechend der gesetzlichen Datenschutzvorschriften sowie dieser Datenschutzerklärung.</p>
                                      <p>Wenn Sie diese Website benutzen, werden verschiedene personenbezogene Daten erhoben. Personenbezogene Daten sind Daten, mit denen Sie persönlich identifiziert werden können. Die vorliegende Datenschutzerklärung erläutert, welche Daten wir erheben und wofür wir sie nutzen. Sie erläutert auch, wie und zu welchem Zweck das geschieht.</p>
                                    </div>
                                  </motion.div>

                                  <motion.div 
                                    className="cyber-grid p-4"
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.5 }}
                                  >
                                    <div className="data-label mb-2">4. Datenerfassung auf dieser Website</div>
                                    <div className="space-y-3 font-mono text-sm leading-relaxed">
                                      <p className="font-bold text-primary">Cookies</p>
                                      <p>Unsere Internetseiten verwenden Cookies. Cookies sind kleine Textdateien, die auf Ihrem Endgerät abgelegt werden und die bestimmte Einstellungen und Daten zum Austausch mit unserem System über Ihren Browser speichern. Einige Cookies bleiben auf Ihrem Endgerät gespeichert, bis Sie diese löschen. Sie ermöglichen es uns, Ihren Browser beim nächsten Besuch wiederzuerkennen.</p>
                                      <p>Sie können Ihren Browser so einstellen, dass Sie über das Setzen von Cookies informiert werden und Cookies nur im Einzelfall erlauben, die Annahme von Cookies für bestimmte Fälle oder generell ausschließen sowie das automatische Löschen der Cookies beim Schließen des Browsers aktivieren.</p>
                                    </div>
                                  </motion.div>

                                  <motion.div 
                                    className="cyber-grid p-4"
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.6 }}
                                  >
                                    <div className="data-label mb-2">5. Ihre Rechte</div>
                                    <div className="space-y-3 font-mono text-sm leading-relaxed">
                                      <p>Sie haben jederzeit das Recht, unentgeltlich Auskunft über Herkunft, Empfänger und Zweck Ihrer gespeicherten personenbezogenen Daten zu erhalten. Sie haben außerdem ein Recht, die Berichtigung oder Löschung dieser Daten zu verlangen. Wenn Sie eine Einwilligung zur Datenverarbeitung erteilt haben, können Sie diese Einwilligung jederzeit für die Zukunft widerrufen. Außerdem haben Sie das Recht, unter bestimmten Umständen die Einschränkung der Verarbeitung Ihrer personenbezogenen Daten zu verlangen.</p>
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
                                  <h2 className="text-4xl font-bold uppercase font-mono mb-2" data-text={cyberpunkOverlay.data.name}>
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
                                <h2 className="text-4xl md:text-5xl font-bold uppercase font-mono mb-4 hover-chromatic" data-text={cyberpunkOverlay.data.venue}>
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
                                  initial={{ opacity: 0, scale: 0.9 }}
                                  animate={{ opacity: 1, scale: 1 }}
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
                                    <h2 className="text-3xl md:text-4xl font-bold uppercase font-mono mb-2 hover-chromatic" data-text={cyberpunkOverlay.data.title}>
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

      {editMode && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="fixed bottom-8 right-8 bg-primary text-primary-foreground p-4 shadow-lg"
        >
          <p className="text-sm uppercase font-bold font-mono">Edit Mode Active</p>
        </motion.div>
      )}
    </div>
    </>
  )
}

export default App
