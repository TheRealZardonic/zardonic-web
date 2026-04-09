import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { MapPin, CalendarBlank, Ticket } from '@phosphor-icons/react'
import type { Gig } from '@/lib/app-types'
import type { DecorativeTexts } from '@/lib/types'

interface GigOverlayContentProps {
  data: Gig
  artistName?: string
  decorativeTexts?: DecorativeTexts
}

export function GigOverlayContent({ data, artistName = '', decorativeTexts }: GigOverlayContentProps) {
  const dataStreamLabel = decorativeTexts?.gigDataStreamLabel ?? '// EVENT.DATA.STREAM'
  const statusPrefix = decorativeTexts?.gigStatusPrefix ?? '// SYSTEM.STATUS:'
  return (
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
        <div className="data-label mb-2">{dataStreamLabel}</div>
        {data.title && (
          <p className="text-sm font-mono text-primary uppercase tracking-widest mb-1">{data.title}</p>
        )}
        <h2 className="text-4xl md:text-5xl font-bold uppercase font-mono mb-4 hover-chromatic crt-flash-in" data-text={data.venue}>
          {data.venue}
        </h2>
        {data.soldOut && (
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
            {data.location}
          </div>
          {data.streetAddress && (
            <p className="text-sm text-muted-foreground font-mono mt-2 ml-7">
              {data.streetAddress}
              {data.postalCode && `, ${data.postalCode}`}
            </p>
          )}
        </motion.div>

        <motion.div
          className="cyber-grid p-4"
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="data-label mb-2">Date &amp; Time</div>
          <div className="flex items-center gap-2 text-xl font-mono hover-chromatic">
            <CalendarBlank className="w-5 h-5 text-primary shrink-0" />
            {new Date(data.date).toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </div>
          {data.startsAt && (
            <p className="text-sm text-muted-foreground font-mono mt-2 ml-7">
              Doors: {new Date(data.startsAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
            </p>
          )}
        </motion.div>
      </div>

      {data.description && (
        <motion.div
          className="cyber-grid p-4"
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.35 }}
        >
          <div className="data-label mb-2">Info</div>
          <p className="text-foreground/90 font-mono text-sm">{data.description}</p>
        </motion.div>
      )}

      {data.lineup && data.lineup.length > 0 && (
        <motion.div
          className="cyber-grid p-4"
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
        >
          <div className="data-label mb-3">Lineup</div>
          <div className="flex flex-wrap gap-2">
            {data.lineup.map((artist: string, i: number) => (
              <motion.span
                key={i}
                className={`px-3 py-1.5 text-sm font-mono border transition-colors ${
                  artistName && artist.toLowerCase() === artistName.toLowerCase()
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

      {data.support && !data.lineup?.length && (
        <motion.div
          className="cyber-grid p-4"
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
        >
          <div className="data-label mb-2">Support Acts</div>
          <p className="text-lg font-mono text-foreground/90 hover-chromatic">{data.support}</p>
        </motion.div>
      )}

      {data.ticketUrl && (
        <motion.div
          className="pt-4"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Button
            asChild
            size="lg"
            className={`w-full md:w-auto font-mono uppercase tracking-wider hover-noise cyber-border ${data.soldOut ? 'opacity-50 pointer-events-none' : ''}`}
          >
            <a href={data.ticketUrl} target="_blank" rel="noopener noreferrer">
              <Ticket className="w-5 h-5 mr-2" />
              <span className="hover-chromatic">{data.soldOut ? 'Sold Out' : 'Get Tickets'}</span>
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
        <div className="data-label">{statusPrefix} [{data.soldOut ? 'SOLD_OUT' : 'ACTIVE'}]</div>
      </motion.div>
    </motion.div>
  )
}
