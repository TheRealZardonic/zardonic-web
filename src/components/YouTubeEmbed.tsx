import { useState } from 'react'
import { motion } from 'framer-motion'
import { YoutubeLogo, Play } from '@phosphor-icons/react'

interface YouTubeEmbedProps {
  videoId: string
  title?: string
}

/**
 * Two-click consent gate for YouTube embeds.
 *
 * GDPR / ePrivacy compliance: No request is sent to Google servers until the
 * user explicitly clicks "Load Video". Before consent the component renders a
 * static placeholder that contains zero third-party requests.
 */
export default function YouTubeEmbed({ videoId, title }: YouTubeEmbedProps) {
  const [consented, setConsented] = useState(false)

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
        {consented ? (
          /* Only rendered after explicit user consent — no Google contact before this */
          /* sandbox: allow-same-origin is required for YouTube player API; safe because
             youtube-nocookie.com is a different origin from our site */
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${safeVideoId}?autoplay=1`}
            title={title || 'YouTube video'}
            className="absolute inset-0 w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; fullscreen; gyroscope; picture-in-picture"
            sandbox="allow-scripts allow-same-origin allow-presentation allow-popups"
            loading="eager"
            referrerPolicy="no-referrer"
          />
        ) : (
          /* Consent placeholder — no third-party requests, no cookies */
          <button
            type="button"
            onClick={() => setConsented(true)}
            className="absolute inset-0 w-full h-full flex flex-col items-center justify-center gap-3 bg-black/80 hover:bg-black/70 transition-colors cursor-pointer group"
            aria-label={`Load YouTube video${title ? `: ${title}` : ''}`}
          >
            <span className="flex items-center justify-center w-16 h-16 rounded-full bg-primary/20 border border-primary/30 group-hover:bg-primary/30 transition-colors">
              <Play size={32} weight="fill" className="text-primary ml-1" />
            </span>
            <span className="text-xs text-muted-foreground font-mono text-center px-4 max-w-xs leading-relaxed">
              Click to load video.
              <br />
              This will connect to YouTube (Google).
            </span>
          </button>
        )}
      </div>
    </motion.div>
  )
}
