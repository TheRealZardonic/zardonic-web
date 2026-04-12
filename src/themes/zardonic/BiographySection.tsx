import { motion } from 'framer-motion'
import Card from './Card'

interface BiographySectionProps {
  title?: string
  bioText?: string
  photoUrl?: string
  photoAlt?: string
  layout?: 'text-first' | 'image-first'
}

export default function BiographySection({
  title = 'BIOGRAPHY',
  bioText = '{{BIO_TEXT}}',
  photoUrl,
  photoAlt = '{{BAND_NAME}}',
  layout = 'text-first'
}: BiographySectionProps) {
  const content = (
    <div className="container mx-auto max-w-6xl px-4">
      <motion.div
        initial={{ opacity: 0, x: -30, filter: 'blur(10px)', clipPath: 'polygon(0 0, 0 0, 0 100%, 0 100%)' }}
        whileInView={{ opacity: 1, x: 0, filter: 'blur(0px)', clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 100%)' }}
        viewport={{ once: true }}
        transition={{ duration: 1, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="relative"
      >
        <h2
          className="text-4xl md:text-6xl font-bold mb-12 uppercase tracking-tighter text-foreground zardonic-theme-hover-chromatic zardonic-theme-hover-glitch"
          style={{ fontFamily: 'var(--font-heading)' }}
        >
          {title}
        </h2>
        
        <div className={`grid md:grid-cols-2 gap-8 items-start ${layout === 'image-first' ? 'md:grid-flow-dense' : ''}`}>
          {/* Photo */}
          {photoUrl && (
            <motion.div 
              className={`aspect-square bg-muted relative ${layout === 'image-first' ? 'md:col-start-2' : ''}`}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <Card variant="cyber" animate={false}>
                <img
                  src={photoUrl}
                  alt={photoAlt}
                  className="w-full h-full object-cover zardonic-theme-hover-chromatic-image"
                />
              </Card>
            </motion.div>
          )}

          {/* Text */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: photoUrl ? 0.3 : 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
            className={`space-y-4 ${layout === 'image-first' ? 'md:col-start-1 md:row-start-1' : ''}`}
          >
            <div className="zardonic-theme-data-label mb-4">// ARTIST.PROFILE.DATA</div>
            <Card variant="cyber" animate={false} className="p-6">
              <p
                className="text-lg leading-relaxed text-muted-foreground font-light whitespace-pre-wrap"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                {bioText}
              </p>
            </Card>
          </motion.div>
        </div>
      </motion.div>
    </div>
  )

  return (
    <section id="bio" className="py-24 zardonic-theme-scanline-effect">
      {content}
    </section>
  )
}
