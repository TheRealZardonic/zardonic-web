import React from 'react'
import { motion } from 'framer-motion'
import { InstagramLogo, FacebookLogo, SpotifyLogo, YoutubeLogo, SoundcloudLogo, TiktokLogo, type Icon as PhosphorIcon } from '@phosphor-icons/react'

interface SocialLink {
  platform: string
  url: string
  icon?: PhosphorIcon
}

interface SocialSectionProps {
  title?: string
  socialLinks?: SocialLink[]
  videoEmbedUrl?: string
}

const defaultSocialLinks: SocialLink[] = [
  { platform: 'Instagram', url: '{{INSTAGRAM_URL}}', icon: InstagramLogo },
  { platform: 'Facebook', url: '{{FACEBOOK_URL}}', icon: FacebookLogo },
  { platform: 'Spotify', url: '{{SPOTIFY_URL}}', icon: SpotifyLogo },
  { platform: 'YouTube', url: '{{YOUTUBE_URL}}', icon: YoutubeLogo },
  { platform: 'SoundCloud', url: '{{SOUNDCLOUD_URL}}', icon: SoundcloudLogo },
  { platform: 'TikTok', url: '{{TIKTOK_URL}}', icon: TiktokLogo },
]

export default function SocialSection({
  title = 'CONNECT',
  socialLinks = defaultSocialLinks,
  videoEmbedUrl
}: SocialSectionProps) {
  return (
    <section id="connect" className="py-24 px-4 bg-card/50 zardonic-theme-scanline-effect">
      <div className="container mx-auto max-w-4xl">
        <motion.div
          initial={{ opacity: 0, x: -30, filter: 'blur(10px)', clipPath: 'polygon(0 0, 0 0, 0 100%, 0 100%)' }}
          whileInView={{ opacity: 1, x: 0, filter: 'blur(0px)', clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 100%)' }}
          viewport={{ once: true }}
          transition={{ duration: 1, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="text-center"
        >
          <h2 className="text-4xl md:text-6xl font-bold mb-12 uppercase tracking-tighter text-foreground zardonic-theme-hover-chromatic zardonic-theme-hover-glitch">
            {title}
          </h2>

          <div className="zardonic-theme-data-label mb-8">// SOCIAL.NETWORK.LINKS</div>

          <div className="flex flex-wrap justify-center gap-6 mb-12">
            {socialLinks.map((link, index) => {
              const Icon = link.icon
              return (
                <motion.a
                  key={link.platform}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: 0.1 + index * 0.08, ease: [0.25, 0.46, 0.45, 0.94] }}
                  className="text-foreground hover:text-primary transition-colors zardonic-theme-hover-glitch zardonic-theme-hover-chromatic relative flex flex-col items-center gap-1"
                  title={link.platform}
                >
                  {Icon && <Icon className="w-12 h-12" weight="fill" />}
                  <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">{link.platform}</span>
                </motion.a>
              )
            })}
          </div>

          {videoEmbedUrl && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.6 }}
              className="relative aspect-video bg-muted border border-border zardonic-theme-cyber-card"
            >
              <div className="zardonic-theme-data-label absolute top-2 left-2" style={{ zIndex: 'var(--z-content)' } as React.CSSProperties}>// VIDEO.EMBED</div>
              <iframe
                src={videoEmbedUrl}
                className="absolute inset-0 w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; fullscreen; gyroscope; picture-in-picture"
              />
            </motion.div>
          )}
        </motion.div>
      </div>
    </section>
  )
}
