/**
 * useDocumentTitle – Updates document.title based on the currently visible section.
 *
 * Uses IntersectionObserver to detect which section is in the viewport and
 * updates the browser tab title accordingly.
 */
import { useEffect } from 'react'

const SECTION_TITLES: Record<string, string> = {
  bio: 'Biography | ZARDONIC',
  music: 'Music | ZARDONIC',
  gigs: 'Upcoming Shows | ZARDONIC',
  releases: 'Releases | ZARDONIC',
  gallery: 'Gallery | ZARDONIC',
  connect: 'Connect | ZARDONIC',
  contact: 'Contact | ZARDONIC',
  shell: 'Team | ZARDONIC',
  creditHighlights: 'Credits | ZARDONIC',
  media: 'Media | ZARDONIC',
}

const DEFAULT_TITLE = 'ZARDONIC'

export function useDocumentTitle(artistName: string) {
  useEffect(() => {
    if (!('IntersectionObserver' in window)) return

    const sectionIds = Object.keys(SECTION_TITLES)

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const id = entry.target.id
            const title = SECTION_TITLES[id]
            if (title) {
              document.title = artistName ? title.replace('ZARDONIC', artistName) : title
              return
            }
          }
        }
      },
      { threshold: 0.3 },
    )

    const elements = sectionIds.map(id => document.getElementById(id)).filter(Boolean)
    elements.forEach(el => observer.observe(el!))

    return () => {
      observer.disconnect()
      document.title = artistName || DEFAULT_TITLE
    }
  }, [artistName])
}
