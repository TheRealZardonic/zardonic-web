import { useEffect, useRef } from 'react'
import { trackSectionView } from '@/lib/analytics'

/** Track when a section becomes visible in the viewport (fires once per page load) */
export function useTrackSection(sectionId: string, enabled = true) {
  const tracked = useRef(false)
  const ref = useRef<HTMLElement>(null)

  useEffect(() => {
    if (!enabled || tracked.current || !ref.current) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !tracked.current) {
          tracked.current = true
          trackSectionView(sectionId)
          observer.disconnect()
        }
      },
      { threshold: 0.2 }
    )

    observer.observe(ref.current)
    return () => observer.disconnect()
  }, [sectionId, enabled])

  return ref
}
