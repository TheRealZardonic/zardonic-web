import { useEffect, useRef, useState } from 'react'

interface UseLazyImageProps {
  src: string
  placeholder?: string
}

/**
 * Hook for lazy loading images with IntersectionObserver
 * Improves initial page load performance
 */
export function useLazyImage({ src, placeholder = '' }: UseLazyImageProps) {
  const [imageSrc, setImageSrc] = useState<string>(placeholder)
  const [isLoaded, setIsLoaded] = useState(false)
  const imgRef = useRef<HTMLImageElement>(null)

  useEffect(() => {
    if (!imgRef.current) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setImageSrc(src)
            observer.disconnect()
          }
        })
      },
      {
        rootMargin: '50px', // Start loading slightly before element is visible
      }
    )

    observer.observe(imgRef.current)

    return () => {
      observer.disconnect()
    }
  }, [src])

  useEffect(() => {
    if (imageSrc === placeholder) return

    const img = new Image()
    img.src = imageSrc
    img.onload = () => setIsLoaded(true)
  }, [imageSrc, placeholder])

  return { imgRef, imageSrc, isLoaded }
}
