import { motion } from 'framer-motion'
import { YoutubeLogo } from '@phosphor-icons/react'
import { extractYouTubeId } from '@/lib/youtube'

interface YouTubeEmbedProps {
  videoId: string
  title?: string
}

export default function YouTubeEmbed({ videoId, title }: YouTubeEmbedProps) {
  // Validate videoId to prevent URL injection
  const safeVideoId = /^[A-Za-z0-9_-]{11}$/.test(videoId) ? videoId : null

  if (!safeVideoId) return null

  return (
    <motion.div
      className="space-y-2"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {title && (
        <div className="flex items-center gap-2 text-xs text-primary/70 font-mono tracking-wider">
          <YoutubeLogo size={14} weight="fill" className="text-primary/50" />
          <span className="truncate uppercase">{title}</span>
        </div>
      )}
      <div className="relative w-full aspect-video border border-primary/20 bg-black overflow-hidden">
        {/* sandbox: allow-same-origin is required for YouTube player API; safe because
            youtube-nocookie.com is a different origin from our site */}
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${safeVideoId}`}
          title={title || 'YouTube video'}
          className="absolute inset-0 w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; fullscreen; gyroscope; picture-in-picture"
          sandbox="allow-scripts allow-same-origin allow-presentation allow-popups"
          loading="lazy"
          referrerPolicy="no-referrer"
        />
      </div>
    </motion.div>
  )
}
