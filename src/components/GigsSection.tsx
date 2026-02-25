import { motion, useInView } from 'framer-motion'
import { CalendarDots, MapPin, Ticket, Plus, Trash, ArrowsClockwise, FacebookLogo, InstagramLogo, Link, MusicNote } from '@phosphor-icons/react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { ChromaticText } from '@/components/ChromaticText'
import FontSizePicker from '@/components/FontSizePicker'
import type { Gig, FontSizeSettings, SectionLabels } from '@/lib/types'
import { useState, useEffect, useRef } from 'react'
import GigEditDialog from './GigEditDialog'
import { format, isPast } from 'date-fns'
import { toast } from 'sonner'
import { useTypingEffect } from '@/hooks/use-typing-effect'
import { useTrackSection } from '@/hooks/use-track-section'

interface GigsSectionProps {
  gigs: Gig[]
  editMode: boolean
  onUpdate: (gigs: Gig[]) => void
  fontSizes?: FontSizeSettings
  onFontSizeChange?: (key: keyof FontSizeSettings, value: string) => void
  dataLoaded?: boolean
  sectionLabels?: SectionLabels
  onLabelChange?: (key: keyof SectionLabels, value: string) => void
}

export default function GigsSection({ gigs, editMode, onUpdate, fontSizes, onFontSizeChange, dataLoaded, sectionLabels, onLabelChange }: GigsSectionProps) {
  const [editingGig, setEditingGig] = useState<Gig | null>(null)
  const [isAdding, setIsAdding] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false)
  const [glitchActive, setGlitchActive] = useState(false)
  const [showAllGigs, setShowAllGigs] = useState(false)
  const sectionRef = useRef(null)
  const isInView = useInView(sectionRef, { once: true })
  useTrackSection('gigs')

  const titleText = sectionLabels?.gigs || 'UPCOMING GIGS'
  const headingPrefix = sectionLabels?.headingPrefix ?? '>'
  const { displayedText: displayedTitle } = useTypingEffect(
    isInView ? titleText : '',
    40,
    100
  )

  useEffect(() => {
    const interval = setInterval(() => {
      if (Math.random() > 0.75) {
        setGlitchActive(true)
        setTimeout(() => setGlitchActive(false), 300)
      }
    }, 3500)

    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (!hasLoadedOnce && dataLoaded) {
      loadGigsFromAPI(true)
      setHasLoadedOnce(true)
    }
  }, [dataLoaded])

  const loadGigsFromAPI = async (isAutoLoad = false) => {
    setIsLoading(true)
    try {
      const apiGigs: Gig[] = []
      
      if (apiGigs.length > 0) {
        const currentGigs = gigs || []
        const existingIds = new Set(currentGigs.map(g => g.id))
        const newGigs = apiGigs.filter(g => !existingIds.has(g.id))
        
        if (newGigs.length > 0) {
          onUpdate([...currentGigs, ...newGigs])
          if (!isAutoLoad) {
            toast.success(`${newGigs.length} upcoming gig${newGigs.length > 1 ? 's' : ''} loaded from concert APIs`)
          }
        } else if (!isAutoLoad) {
          toast.info('No new gigs found')
        }
      } else if (!isAutoLoad) {
        toast.info('No upcoming concerts found at this time')
      }
    } catch (error) {
      console.error('Failed to load gigs:', error)
      if (!isAutoLoad) {
        toast.error('Failed to load upcoming gigs')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const upcomingGigs = (gigs || [])
    .filter(gig => showAllGigs || !isPast(new Date(gig.date)))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  const handleDelete = (id: string) => {
    onUpdate((gigs || []).filter(g => g.id !== id))
  }

  const handleSave = (gig: Gig) => {
    const currentGigs = gigs || []
    if (editingGig) {
      onUpdate(currentGigs.map(g => g.id === gig.id ? gig : g))
    } else {
      onUpdate([...currentGigs, gig])
    }
    setEditingGig(null)
    setIsAdding(false)
  }

  return (
    <section ref={sectionRef} className="py-24 px-4 bg-gradient-to-b from-background via-background to-secondary/5" id="gigs">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-12 gap-4">
          <motion.h2 
            className={`text-4xl md:text-5xl lg:text-6xl font-bold font-mono scanline-text dot-matrix-text ${glitchActive ? 'glitch-text-effect' : ''}`}
            data-text={`${headingPrefix} ${displayedTitle}`}
            initial={{ opacity: 0, x: -20 }}
            animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -20 }}
            transition={{ duration: 0.6 }}
            style={{
              textShadow: '0 0 6px oklch(1 0 0 / 0.5), 0 0 12px oklch(0.50 0.22 25 / 0.3), 0 0 18px oklch(0.50 0.22 25 / 0.2)'
            }}
          >
            <ChromaticText intensity={1.5}>
              {headingPrefix} {displayedTitle}
            </ChromaticText>
            <span className="animate-pulse">_</span>
          </motion.h2>
          <div className="flex gap-2 flex-wrap">
            {editMode && onLabelChange && (
              <input
                type="text"
                value={sectionLabels?.gigs || ''}
                onChange={(e) => onLabelChange('gigs', e.target.value)}
                placeholder="UPCOMING GIGS"
                className="bg-transparent border border-primary/30 px-2 py-1 text-xs font-mono text-primary w-32 focus:outline-none focus:border-primary"
              />
            )}
            {editMode && (
              <Button
                onClick={() => setShowAllGigs(!showAllGigs)}
                variant="outline"
                className="border-primary/30 hover:bg-primary/10 active:scale-95 transition-transform touch-manipulation"
              >
                {showAllGigs ? 'Show Upcoming' : 'Show All'}
              </Button>
            )}
            <Button
              onClick={() => loadGigsFromAPI(false)}
              disabled={isLoading}
              variant="outline"
              className="border-primary/30 hover:bg-primary/10 active:scale-95 transition-transform touch-manipulation"
            >
              <ArrowsClockwise className={`${isLoading ? 'animate-spin mr-2' : 'mr-0 md:mr-2'}`} size={20} />
              <span className="hidden md:inline">{isLoading ? 'Loading...' : 'Refresh'}</span>
            </Button>
            {editMode && (
              <Button
                onClick={() => setIsAdding(true)}
                className="bg-primary hover:bg-accent active:scale-95 transition-transform touch-manipulation"
              >
                <Plus className="mr-0 md:mr-2" size={20} />
                <span className="hidden md:inline">Add Gig</span>
              </Button>
            )}
          </div>
        </div>

        <Separator className="bg-gradient-to-r from-primary via-primary/50 to-transparent mb-12 h-0.5" />

        {editMode && onFontSizeChange && (
          <div className="mb-6 flex gap-2 flex-wrap">
            <FontSizePicker label="GIGS" value={fontSizes?.gigsText} onChange={(v) => onFontSizeChange('gigsText', v)} />
          </div>
        )}

        {isLoading && upcomingGigs.length === 0 ? (
          <motion.div 
            className="text-center py-20"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
          >
            <ArrowsClockwise size={64} className="mx-auto mb-6 text-primary animate-spin" />
            <p className="text-muted-foreground text-lg">Loading upcoming shows...</p>
          </motion.div>
        ) : upcomingGigs.length === 0 ? (
          <motion.div 
            className="text-center py-20"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <CalendarDots size={64} className="mx-auto mb-6 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground text-lg mb-2">No upcoming shows scheduled.</p>
            <p className="text-muted-foreground text-sm">Check back soon for tour dates.</p>
          </motion.div>
        ) : (
          <div className="grid gap-4">
            {upcomingGigs.map((gig, index) => (
              <motion.div
                key={gig.id}
                initial={{ opacity: 0, y: 30 }}
                animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
              >
                <Card className="p-4 md:p-6 bg-card/50 backdrop-blur-sm border-border hover:border-primary/50 active:border-primary transition-all duration-300 group relative overflow-hidden touch-manipulation active:scale-[0.99] hud-element hud-corner hud-scanline">
                  <span className="corner-bl"></span>
                  <span className="corner-br"></span>
                  
                  <div className="absolute top-2 right-2 data-readout text-[8px]">
                    GIG_{String(index).padStart(2, '0')}
                  </div>
                  
                  <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-primary/5 to-primary/0 opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-opacity duration-300" />
                  <div className="absolute inset-0 bg-primary/0 group-active:bg-primary/5 transition-colors duration-100 pointer-events-none" />
                  
                  <div className="relative flex flex-col gap-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div className="flex items-start gap-3 md:gap-4 flex-1">
                        {gig.photo && (
                          <img
                            src={gig.photo}
                            alt={gig.venue}
                            className="flex-shrink-0 w-16 h-16 md:w-20 md:h-20 rounded-md object-cover border border-border"
                          />
                        )}
                        <div className="flex-shrink-0 pt-1">
                          <CalendarDots size={24} className="md:hidden text-primary" />
                          <CalendarDots size={28} className="hidden md:block text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <time className="text-base md:text-lg lg:text-xl font-semibold text-foreground/90">
                              {format(new Date(gig.date), 'EEEE, MMMM d, yyyy')}
                            </time>
                            {gig.gigType && (
                              <span className={`text-[10px] md:text-xs font-bold px-2 py-0.5 rounded uppercase tracking-wider ${gig.gigType === 'concert' ? 'bg-primary/20 text-primary' : 'bg-accent/20 text-accent'}`}>
                                {gig.gigType === 'concert' ? 'CONCERT' : 'DJ SET'}
                              </span>
                            )}
                            {gig.status && (
                              <span className={`text-[10px] md:text-xs font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                                gig.status === 'confirmed' ? 'bg-green-500/20 text-green-400' :
                                gig.status === 'soldout' ? 'bg-yellow-500/20 text-yellow-400' :
                                gig.status === 'cancelled' ? 'bg-red-500/20 text-red-400' :
                                'bg-blue-500/20 text-blue-400'
                              }`}>
                                {gig.status}
                              </span>
                            )}
                          </div>
                          <time className="text-xs md:text-sm text-muted-foreground">
                            {gig.allDay ? 'ALL DAY' : format(new Date(gig.date), 'HH:mm')}
                          </time>
                        </div>
                      </div>

                      {(editMode || gig.ticketUrl || gig.eventLinks) && (
                        <div className="flex items-center gap-2 sm:flex-shrink-0 flex-wrap">
                          {editMode && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setEditingGig(gig)}
                                className="border-primary/30 hover:bg-primary/10 active:scale-95 transition-transform touch-manipulation"
                              >
                                Edit
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleDelete(gig.id)}
                                className="active:scale-95 transition-transform touch-manipulation"
                              >
                                <Trash size={18} />
                              </Button>
                            </>
                          )}
                          {!editMode && gig.eventLinks && (
                            <>
                              {gig.eventLinks.facebook && (
                                <a href={gig.eventLinks.facebook} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors" title="Facebook Event">
                                  <FacebookLogo size={22} />
                                </a>
                              )}
                              {gig.eventLinks.instagram && (
                                <a href={gig.eventLinks.instagram} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors" title="Instagram">
                                  <InstagramLogo size={22} />
                                </a>
                              )}
                              {gig.eventLinks.residentAdvisor && (
                                <a href={gig.eventLinks.residentAdvisor} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors" title="Resident Advisor">
                                  <MusicNote size={22} />
                                </a>
                              )}
                              {gig.eventLinks.other && (
                                <a href={gig.eventLinks.other} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors" title="Event Link">
                                  <Link size={22} />
                                </a>
                              )}
                            </>
                          )}
                          {gig.ticketUrl && !editMode && (
                            <Button
                              asChild
                              className="bg-primary hover:bg-accent transition-all shadow-lg shadow-primary/20 hover:shadow-primary/40 active:scale-95 active:shadow-primary/60 touch-manipulation w-full sm:w-auto"
                            >
                              <a href={gig.ticketUrl} target="_blank" rel="noopener noreferrer">
                                <Ticket className="mr-2" size={20} />
                                <span className="whitespace-nowrap">GET TICKETS</span>
                              </a>
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                    
                    <div className="pl-0 sm:pl-9 md:pl-12">
                      <h3 className="text-xl md:text-2xl lg:text-3xl font-bold mb-2 group-hover:text-primary transition-colors break-words">{gig.venue}</h3>
                      
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <MapPin size={16} className="flex-shrink-0 md:hidden" />
                        <MapPin size={18} className="flex-shrink-0 hidden md:block" />
                        <span className="text-sm md:text-base break-words">{gig.location}</span>
                      </div>

                      {gig.supportingArtists && gig.supportingArtists.length > 0 && (
                        <p className="text-xs md:text-sm text-muted-foreground/70 mt-1 italic">
                          w/ {gig.supportingArtists.join(', ')}
                        </p>
                      )}
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {(editingGig || isAdding) && (
        <GigEditDialog
          gig={editingGig}
          onSave={handleSave}
          onClose={() => {
            setEditingGig(null)
            setIsAdding(false)
          }}
        />
      )}
    </section>
  )
}
