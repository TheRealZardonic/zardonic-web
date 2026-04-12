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
  // Proxy all external URLs through wsrv.nl to bypass CORS restrictions
  return toDirectImageUrl(src)
}

/**
 * Image component with a progress bar shown while loading.
 * Automatically proxies all external URLs through wsrv.nl to bypass CORS.
 */
export default function ProgressiveImage({ src, alt, className, style, draggable, loading }: ProgressiveImageProps) {
  const [loaded, setLoaded] = useState(false)
  const [effectiveSrc, setEffectiveSrc] = useState(() => resolveInitialSrc(src))

  useEffect(() => {
    const newSrc = resolveInitialSrc(src)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEffectiveSrc(newSrc)
    setLoaded(false)

    // Check if image is already cached by the browser
    const img = new Image()
    img.src = newSrc
    if (img.complete) {
      setLoaded(true)
    }
    return () => { img.src = '' }
  }, [src])

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
            <p className="text-xs font-mono text-primary/40 text-center mt-1 tracking-wider">LOADING...</p>
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
      />
    </div>
  )
}
