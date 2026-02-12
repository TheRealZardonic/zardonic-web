import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion'
import { useKV } from '@github/spark/hooks'
import { useKonami } from '@/hooks/use-konami'
import { useAnalytics, trackClick } from '@/hooks/use-analytics'
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
import heroImage from '@/assets/images/meta_eyJzcmNCdWNrZXQiOiJiemdsZmlsZXMifQ==.webp'

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
  
  useEffect(() => {
    if (konamiActivated) {
      setTerminalOpen(true)
      toast.success('Terminal activated!')
    }
  }, [konamiActivated])

  const [siteData, setSiteData] = useKV<SiteData>('zardonic-site-data', {
    artistName: 'ZARDONIC',
    heroImage: heroImage,
    bio: `THE CLASH OF DISPARATE ELEMENTS ACTIVATES INNOVATION, AND EVERY GENERATION BRINGS US TIMELESS FIGURES WHO ACCIDENTALLY SPARK A NEW REVOLUTIONARY SOUND WITHIN THE MUSIC WORLD. CHUCK BERRY MIXED JAZZ, BLUES, GOSPEL AND COUNTRY MUSIC TO CREATE ROCK N ROLL. A FEW DECADES LATER, OZZY OSBOURNE TURNED UP THE GAIN TO CREATE HEAVY METAL. AND SINCE THE EARLY 2000S, FEDERICO AGREDA ALVAREZ, THE MASKED PERFORMER KNOWN TO THE WORLD AS DJ AND PRODUCER ZARDONIC, HAS HARNESSED THE POWER OF THE NEXUS BETWEEN DRUM & BASS AND HEAVY METAL TO CREATE THE SOUND THAT IS NOW KNOWN AS METAL & BASS.`,
    tracks: [
      {
        id: '1',
        title: 'Revelation',
        artist: 'ZARDONIC',
        url: '',
        artwork: '',
      },
    ],
    gigs: [],
    releases: [],
    gallery: [],
    instagramFeed: [],
    members: [],
    mediaFiles: [],
    social: {
      instagram: 'https://instagram.com/zardonic',
      facebook: 'https://facebook.com/zardonic',
      spotify: 'https://open.spotify.com/artist/zardonic',
      youtube: 'https://youtube.com/zardonic',
      soundcloud: 'https://soundcloud.com/zardonic',
      bandcamp: 'https://zardonic.bandcamp.com',
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
  const [cyberpunkOverlay, setCyberpunkOverlay] = useState<{type: 'gig' | 'release' | 'member', data: any} | null>(null)
  
  const audioRef = useRef<HTMLAudioElement>(null)
  const [currentUser, setCurrentUser] = useState<any>(null)

  useEffect(() => {
    window.spark.user().then(setCurrentUser)
  }, [])

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume[0] / 100
    }
  }, [volume])

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
    <div className="min-h-screen bg-background text-foreground">
      <Toaster />
      <audio ref={audioRef} src={currentTrack?.url} />

      <motion.nav
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        className="fixed top-0 left-0 right-0 z-50 bg-background/98 backdrop-blur-sm border-b border-border"
      >
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <motion.h1
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
              siteData.artistName
            )}
          </motion.h1>

          <div className="hidden md:flex items-center gap-6">
            {['bio', 'music', 'gigs', 'releases', 'gallery', 'connect'].map((section) => (
              <button
                key={section}
                onClick={() => scrollToSection(section)}
                className="text-sm uppercase tracking-wide hover:text-primary transition-colors font-mono"
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
        {siteData.heroImage && (
          <div className="absolute inset-0">
            <img src={siteData.heroImage} alt="Hero" className="w-full h-full object-cover opacity-20" />
          </div>
        )}
        
        <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/90 to-background" />
        
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
          className="relative z-10 text-center px-4"
        >
          <h1 className="text-6xl md:text-9xl font-bold tracking-tighter mb-8 uppercase" data-text={siteData.artistName}>
            <span className="text-foreground">
              {siteData.artistName}
            </span>
          </h1>
          
          {editMode && (
            <div className="flex justify-center mb-4">
              <label className="cursor-pointer">
                <Button variant="outline" className="gap-2" asChild>
                  <span>
                    <Upload className="w-4 h-4" />
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
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="mt-12 flex gap-4 justify-center flex-wrap"
          >
            <Button onClick={() => scrollToSection('music')} size="lg" className="uppercase font-mono">
              Listen Now
            </Button>
            <Button onClick={() => scrollToSection('gigs')} size="lg" variant="outline" className="uppercase font-mono">
              Tour Dates
            </Button>
          </motion.div>
        </motion.div>
      </section>

      <Separator className="bg-border" />

      <section id="bio" className="py-24 px-4">
        <div className="container mx-auto max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="relative"
          >
            <h2 className="text-4xl md:text-6xl font-bold mb-12 uppercase tracking-tighter text-foreground font-mono" data-text="BIOGRAPHY">
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
              <p className="text-lg leading-relaxed text-muted-foreground font-light">
                {siteData.bio}
              </p>
            )}
          </motion.div>
        </div>
      </section>

      <Separator className="bg-border" />

      <section id="music" className="py-24 px-4 bg-card/50">
        <div className="container mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl md:text-6xl font-bold mb-12 uppercase tracking-tighter text-foreground font-mono" data-text="MUSIC PLAYER">
              MUSIC PLAYER
            </h2>

            {siteData.tracks.length > 0 && (
              <Card className="p-8 bg-card border-border relative">
                <div className="grid md:grid-cols-[200px_1fr] gap-8">
                  <div className="aspect-square bg-muted flex items-center justify-center text-6xl">
                    {currentTrack?.artwork ? (
                      <img src={currentTrack.artwork} alt={currentTrack.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="text-foreground/20 font-mono">▶</div>
                    )}
                  </div>

                  <div className="flex flex-col justify-between">
                    <div>
                      <h3 className="text-2xl font-bold mb-2 uppercase font-mono">{currentTrack?.title}</h3>
                      <p className="text-muted-foreground mb-4 font-mono">{currentTrack?.artist}</p>
                    </div>

                    <div className="space-y-4">
                      <Slider
                        value={[progress]}
                        onValueChange={(val) => setProgress(val[0])}
                        max={100}
                        step={1}
                        className="w-full"
                      />

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <Button size="icon" variant="ghost" onClick={playPrevious}>
                            <SkipBack className="w-5 h-5" />
                          </Button>
                          
                          <Button size="icon" onClick={togglePlay}>
                            {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                          </Button>
                          
                          <Button size="icon" variant="ghost" onClick={playNext}>
                            <SkipForward className="w-5 h-5" />
                          </Button>
                        </div>

                        <div className="flex items-center gap-2 w-32">
                          {volume[0] === 0 ? <SpeakerX className="w-5 h-5" /> : <SpeakerHigh className="w-5 h-5" />}
                          <Slider
                            value={volume}
                            onValueChange={setVolume}
                            max={100}
                            step={1}
                            className="w-full"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            )}
          </motion.div>
        </div>
      </section>

      <Separator className="bg-border" />

      <section id="gigs" className="py-24 px-4">
        <div className="container mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <div className="flex items-center justify-between mb-12">
              <h2 className="text-4xl md:text-6xl font-bold uppercase tracking-tighter text-foreground font-mono" data-text="UPCOMING GIGS">
                UPCOMING GIGS
              </h2>
              {editMode && (
                <Button onClick={addGig} className="gap-2">
                  <Plus className="w-4 h-4" />
                  Add Gig
                </Button>
              )}
            </div>

            {siteData.gigs.length === 0 ? (
              <Card className="p-12 text-center bg-card/50 border-border">
                <p className="text-xl text-muted-foreground uppercase tracking-wide font-mono">
                  No upcoming shows - Check back soon
                </p>
              </Card>
            ) : (
              <div className="space-y-4">
                {siteData.gigs.map((gig) => (
                  <motion.div
                    key={gig.id}
                    whileHover={{ scale: 1.01 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Card 
                      className="p-6 bg-card border-border hover:border-primary/50 transition-colors cursor-pointer"
                      onClick={() => !editMode && setCyberpunkOverlay({ type: 'gig', data: gig })}
                    >
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="space-y-2">
                          <h3 className="text-xl font-bold uppercase font-mono">{gig.venue}</h3>
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

      <section id="releases" className="py-24 px-4 bg-card/50">
        <div className="container mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <div className="flex items-center justify-between mb-12">
              <h2 className="text-4xl md:text-6xl font-bold uppercase tracking-tighter text-foreground font-mono" data-text="RELEASES">
                RELEASES
              </h2>
              {editMode && (
                <Button onClick={addRelease} className="gap-2">
                  <Plus className="w-4 h-4" />
                  Add Release
                </Button>
              )}
            </div>

            {siteData.releases.length === 0 ? (
              <Card className="p-12 text-center bg-card/50 border-border">
                <p className="text-xl text-muted-foreground uppercase tracking-wide font-mono">
                  Releases coming soon
                </p>
              </Card>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {siteData.releases.map((release) => (
                  <motion.div
                    key={release.id}
                    whileHover={{ scale: 1.03 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Card 
                      className="overflow-hidden bg-card border-border hover:border-primary/50 transition-all cursor-pointer"
                      onClick={() => !editMode && setCyberpunkOverlay({ type: 'release', data: release })}
                    >
                      <div className="aspect-square bg-muted relative">
                        {release.artwork && (
                          <img src={release.artwork} alt={release.title} className="w-full h-full object-cover" />
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
                        <h3 className="font-bold uppercase text-sm mb-1 truncate font-mono">{release.title}</h3>
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

      <section id="gallery" className="py-24 px-4">
        <div className="container mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <div className="flex items-center justify-between mb-12">
              <h2 className="text-4xl md:text-6xl font-bold uppercase tracking-tighter text-foreground font-mono" data-text="GALLERY">
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
                    whileHover={{ scale: 1.03 }}
                    className="aspect-square bg-muted overflow-hidden cursor-pointer relative group"
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

      <section id="connect" className="py-24 px-4 bg-card/50">
        <div className="container mx-auto max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center"
          >
            <h2 className="text-4xl md:text-6xl font-bold mb-12 uppercase tracking-tighter text-foreground font-mono" data-text="CONNECT">
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
                  whileHover={{ scale: 1.1 }}
                  className="text-foreground hover:text-primary transition-colors"
                >
                  <InstagramLogo className="w-12 h-12" weight="fill" />
                </motion.a>
              )}
              {siteData.social.facebook && (
                <motion.a
                  href={siteData.social.facebook}
                  target="_blank"
                  rel="noopener noreferrer"
                  whileHover={{ scale: 1.1 }}
                  className="text-foreground hover:text-primary transition-colors"
                >
                  <FacebookLogo className="w-12 h-12" weight="fill" />
                </motion.a>
              )}
              {siteData.social.spotify && (
                <motion.a
                  href={siteData.social.spotify}
                  target="_blank"
                  rel="noopener noreferrer"
                  whileHover={{ scale: 1.1 }}
                  className="text-foreground hover:text-primary transition-colors"
                >
                  <SpotifyLogo className="w-12 h-12" weight="fill" />
                </motion.a>
              )}
              {siteData.social.youtube && (
                <motion.a
                  href={siteData.social.youtube}
                  target="_blank"
                  rel="noopener noreferrer"
                  whileHover={{ scale: 1.1 }}
                  className="text-foreground hover:text-primary transition-colors"
                >
                  <YoutubeLogo className="w-12 h-12" weight="fill" />
                </motion.a>
              )}
            </div>
          </motion.div>
        </div>
      </section>

      <footer className="py-12 px-4 border-t border-border">
        <div className="container mx-auto text-center">
          <p className="text-sm text-muted-foreground uppercase tracking-wide font-mono">
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
              className="fixed inset-0 bg-black/90 z-[100] backdrop-blur-sm cyberpunk-overlay-bg"
              onClick={() => setCyberpunkOverlay(null)}
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.8, rotateX: -15 }}
              animate={{ opacity: 1, scale: 1, rotateX: 0 }}
              exit={{ opacity: 0, scale: 0.8, rotateX: 15 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed inset-0 z-[101] flex items-center justify-center p-4 md:p-8 pointer-events-none"
            >
              <div 
                className="relative max-w-4xl w-full bg-background/98 border border-primary/30 pointer-events-auto overflow-y-auto max-h-[90vh] scanline-effect"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="absolute -top-1 -left-1 w-6 h-6 border-t-2 border-l-2 border-primary/50" />
                <div className="absolute -top-1 -right-1 w-6 h-6 border-t-2 border-r-2 border-primary/50" />
                <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-2 border-l-2 border-primary/50" />
                <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-2 border-r-2 border-primary/50" />

                <div className="relative p-8 md:p-12">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-4 right-4 text-foreground hover:text-primary hover:bg-primary/10 z-10"
                    onClick={() => setCyberpunkOverlay(null)}
                  >
                    <X className="w-6 h-6" />
                  </Button>

                  {cyberpunkOverlay.type === 'member' && (
                    <div className="mt-8 space-y-6">
                      <div className="flex flex-col md:flex-row gap-6">
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
                      </div>
                    </div>
                  )}

                  {cyberpunkOverlay.type === 'gig' && (
                    <div className="mt-8 space-y-6">
                      <div>
                        <div className="text-xs text-primary uppercase tracking-widest font-mono mb-2">// EVENT.DATA</div>
                        <h2 className="text-4xl md:text-5xl font-bold uppercase font-mono mb-4" data-text={cyberpunkOverlay.data.venue}>
                          {cyberpunkOverlay.data.venue}
                        </h2>
                      </div>

                      <div className="grid md:grid-cols-2 gap-6">
                        <div>
                          <div className="text-xs text-muted-foreground uppercase tracking-wide font-mono mb-1">Location</div>
                          <div className="flex items-center gap-2 text-xl font-mono">
                            <MapPin className="w-5 h-5 text-primary" />
                            {cyberpunkOverlay.data.location}
                          </div>
                        </div>

                        <div>
                          <div className="text-xs text-muted-foreground uppercase tracking-wide font-mono mb-1">Date & Time</div>
                          <div className="flex items-center gap-2 text-xl font-mono">
                            <CalendarBlank className="w-5 h-5 text-primary" />
                            {new Date(cyberpunkOverlay.data.date).toLocaleDateString('en-US', { 
                              weekday: 'long', 
                              year: 'numeric', 
                              month: 'long', 
                              day: 'numeric' 
                            })}
                          </div>
                        </div>
                      </div>

                      {cyberpunkOverlay.data.support && (
                        <div>
                          <div className="text-xs text-muted-foreground uppercase tracking-wide font-mono mb-1">Support Acts</div>
                          <p className="text-lg font-mono text-foreground/90">{cyberpunkOverlay.data.support}</p>
                        </div>
                      )}

                      {cyberpunkOverlay.data.ticketUrl && (
                        <div className="pt-4">
                          <Button asChild size="lg" className="w-full md:w-auto font-mono uppercase tracking-wider">
                            <a href={cyberpunkOverlay.data.ticketUrl} target="_blank" rel="noopener noreferrer">
                              <Ticket className="w-5 h-5 mr-2" />
                              Get Tickets
                            </a>
                          </Button>
                        </div>
                      )}

                      <div className="pt-6 border-t border-border">
                        <div className="text-xs text-primary font-mono">// SYSTEM.STATUS: ACTIVE</div>
                      </div>
                    </div>
                  )}

                  {cyberpunkOverlay.type === 'release' && (
                    <div className="mt-8">
                      <div className="grid md:grid-cols-[300px_1fr] gap-8">
                        <div className="aspect-square bg-muted relative">
                          {cyberpunkOverlay.data.artwork && (
                            <img 
                              src={cyberpunkOverlay.data.artwork} 
                              alt={cyberpunkOverlay.data.title} 
                              className="w-full h-full object-cover" 
                            />
                          )}
                        </div>

                        <div className="space-y-6">
                          <div>
                            <div className="text-xs text-primary uppercase tracking-widest font-mono mb-2">// RELEASE.INFO</div>
                            <h2 className="text-3xl md:text-4xl font-bold uppercase font-mono mb-2" data-text={cyberpunkOverlay.data.title}>
                              {cyberpunkOverlay.data.title}
                            </h2>
                            <p className="text-xl text-muted-foreground font-mono">{cyberpunkOverlay.data.year}</p>
                          </div>

                          <div>
                            <div className="text-xs text-muted-foreground uppercase tracking-wide font-mono mb-3">Stream & Download</div>
                            <div className="flex flex-wrap gap-4">
                              {cyberpunkOverlay.data.spotify && (
                                <Button asChild variant="outline" className="font-mono">
                                  <a href={cyberpunkOverlay.data.spotify} target="_blank" rel="noopener noreferrer">
                                    <SpotifyLogo className="w-5 h-5 mr-2" weight="fill" />
                                    Spotify
                                  </a>
                                </Button>
                              )}
                              {cyberpunkOverlay.data.youtube && (
                                <Button asChild variant="outline" className="font-mono">
                                  <a href={cyberpunkOverlay.data.youtube} target="_blank" rel="noopener noreferrer">
                                    <YoutubeLogo className="w-5 h-5 mr-2" weight="fill" />
                                    YouTube
                                  </a>
                                </Button>
                              )}
                              {cyberpunkOverlay.data.soundcloud && (
                                <Button asChild variant="outline" className="font-mono">
                                  <a href={cyberpunkOverlay.data.soundcloud} target="_blank" rel="noopener noreferrer">
                                    SoundCloud
                                  </a>
                                </Button>
                              )}
                              {cyberpunkOverlay.data.bandcamp && (
                                <Button asChild variant="outline" className="font-mono">
                                  <a href={cyberpunkOverlay.data.bandcamp} target="_blank" rel="noopener noreferrer">
                                    Bandcamp
                                  </a>
                                </Button>
                              )}
                            </div>
                          </div>

                          <div className="pt-4 border-t border-border">
                            <div className="text-xs text-primary font-mono">// MEDIA.STATUS: AVAILABLE</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
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
  )
}

export default App
