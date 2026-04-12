import { motion } from 'framer-motion'
import { MapPin, CalendarBlank, Ticket } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import Card from './Card'

interface Gig {
  id: string
  venue: string
  location: string
  date: string
  ticketUrl?: string
  support?: string
}

interface GigsSectionProps {
  title?: string
  gigs?: Gig[]
  onTicketClick?: (gig: Gig) => void
}

const placeholderGigs: Gig[] = [
  {
    id: '1',
    venue: '{{GIG_VENUE_1}}',
    location: '{{GIG_LOCATION_1}}',
    date: '{{GIG_DATE_1}}',
    ticketUrl: '#',
    support: '{{SUPPORT_ACT_1}}'
  },
  {
    id: '2',
    venue: '{{GIG_VENUE_2}}',
    location: '{{GIG_LOCATION_2}}',
    date: '{{GIG_DATE_2}}',
    ticketUrl: '#',
    support: '{{SUPPORT_ACT_2}}'
  },
]

export default function GigsSection({
  title = 'UPCOMING GIGS',
  gigs = placeholderGigs,
  onTicketClick
}: GigsSectionProps) {
  const handleTicketClick = (gig: Gig) => {
    if (onTicketClick) {
      onTicketClick(gig)
    } else if (gig.ticketUrl) {
      window.open(gig.ticketUrl, '_blank')
    }
  }

  return (
    <section id="gigs" className="py-24 px-4 zardonic-theme-noise-effect">
      <div className="container mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, x: -30, filter: 'blur(10px)', clipPath: 'polygon(0 0, 0 0, 0 100%, 0 100%)' }}
          whileInView={{ opacity: 1, x: 0, filter: 'blur(0px)', clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 100%)' }}
          viewport={{ once: true }}
          transition={{ duration: 1, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          <h2 className="text-4xl md:text-6xl font-bold mb-12 uppercase tracking-tighter text-foreground zardonic-theme-hover-chromatic zardonic-theme-hover-glitch">
            {title}
          </h2>

          {gigs.length === 0 ? (
            <Card variant="cyber" className="p-12 text-center">
              <p className="text-xl text-muted-foreground uppercase tracking-wide font-mono">
                No upcoming shows - Check back soon
              </p>
            </Card>
          ) : (
            <div className="space-y-4">
              {gigs.map((gig, index) => (
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
                  <Card variant="cyber" className="p-6">
                    <div className="zardonic-theme-data-label mb-2">// EVENT.{gig.id}</div>
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="space-y-2">
                        <h3 className="text-xl font-bold uppercase font-mono zardonic-theme-hover-chromatic">{gig.venue}</h3>
                        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground font-mono">
                          <span className="flex items-center gap-2">
                            <MapPin className="w-4 h-4" />
                            {gig.location}
                          </span>
                          <span className="flex items-center gap-2">
                            <CalendarBlank className="w-4 h-4" />
                            {gig.date}
                          </span>
                        </div>
                        {gig.support && (
                          <p className="text-sm text-muted-foreground font-mono">
                            Support: {gig.support}
                          </p>
                        )}
                      </div>

                      {gig.ticketUrl && (
                        <Button
                          onClick={() => handleTicketClick(gig)}
                          className="font-mono uppercase tracking-wider zardonic-theme-cyber-border"
                        >
                          <Ticket className="w-5 h-5 mr-2" />
                          <span className="zardonic-theme-hover-chromatic">Get Tickets</span>
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
  )
}
