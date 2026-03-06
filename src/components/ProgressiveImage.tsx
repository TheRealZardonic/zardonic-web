import { useState, useEffect } from 'react'
import { toDirectImageUrl } from '@/lib/image-cache'

interface ProgressiveImageProps {
  src: string
  alt: string
  className?: string
  style?: React.CSSProperties
  draggable?: boolean
  loading?: 'lazy' | 'eager'
}

function resolveInitialSrc(src: string): string {
  // Convert Google Drive URLs to wsrv.nl format and use directly (no double proxying)
  return toDirectImageUrl(src)
}

/**
 * Image component with a progress bar shown while loading.
 * Automatically transforms Google Drive share links into wsrv.nl-proxied URLs
 * for direct loading. Falls back to the server-side image proxy only on error.
 */
export default function ProgressiveImage({ src, alt, className, style, draggable, loading }: ProgressiveImageProps) {
  const [loaded, setLoaded] = useState(false)
  const [effectiveSrc, setEffectiveSrc] = useState(() => resolveInitialSrc(src))
  const [proxyAttempted, setProxyAttempted] = useState(false)

  useEffect(() => {
    const newSrc = resolveInitialSrc(src)
    setEffectiveSrc(newSrc)
    setLoaded(false)
    setProxyAttempted(false)

    // Check if image is already cached by the browser
    const img = new Image()
    img.src = newSrc
    if (img.complete) {
      setLoaded(true)
    }
    return () => { img.src = '' }
  }, [src])

  const handleError = () => {
    // If direct loading fails, only then try the server-side proxy as fallback
    if (!proxyAttempted) {
      setProxyAttempted(true)
      const directUrl = toDirectImageUrl(src)
      setEffectiveSrc(`/api/image-proxy?url=${encodeURIComponent(directUrl)}`)
    }
  }

  return (
    <div className="relative w-full h-full">
      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center z-[1]">
          <div className="w-3/4 max-w-[200px]">
            <div className="h-[2px] bg-primary/20 overflow-hidden">
              <div
                className="h-full bg-primary/80 animate-progress-bar"
              />
            </div>
            <p className="text-[9px] font-mono text-primary/40 text-center mt-1 tracking-wider">LOADING...</p>
          </div>
        </div>
      )}
      <img
        src={effectiveSrc}
        alt={alt}
        className={className}
        style={{ ...style, opacity: loaded ? 1 : 0, transition: 'opacity 0.3s ease-in' }}
        draggable={draggable}
        loading={loading}
        onLoad={() => setLoaded(true)}
        onError={handleError}
      />
    </div>
  )
}
