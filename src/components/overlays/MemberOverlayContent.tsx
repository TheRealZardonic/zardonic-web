import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { InstagramLogo } from '@phosphor-icons/react'
import type { Member } from '@/lib/app-types'
import type { DecorativeTexts } from '@/lib/types'

interface MemberOverlayContentProps {
  data: Member
  decorativeTexts?: DecorativeTexts
}

export function MemberOverlayContent({ data, decorativeTexts }: MemberOverlayContentProps) {
  const profileLabel = decorativeTexts?.memberProfileLabel ?? '// MEMBER.PROFILE'
  return (
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
        {data.image && (
          <div className="w-48 h-48 bg-muted relative">
            <img
              src={data.image}
              alt={data.name}
              className="w-full h-full object-cover"
            />
          </div>
        )}
        <div className="flex-1">
          <div className="text-xs text-primary uppercase tracking-widest font-mono mb-2">{profileLabel}</div>
          <h2 className="text-4xl font-bold uppercase font-mono mb-2 crt-flash-in" data-text={data.name}>
            {data.name}
          </h2>
          <p className="text-xl text-muted-foreground font-mono mb-4">{data.role}</p>
          <p className="text-foreground/90 leading-relaxed">{data.bio}</p>
          {data.instagram && (
            <Button asChild variant="outline" className="mt-4 font-mono">
              <a href={data.instagram} target="_blank" rel="noopener noreferrer">
                <InstagramLogo className="w-5 h-5 mr-2" weight="fill" />
                Follow
              </a>
            </Button>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}
