import { useState, useEffect } from 'react'
import { useLenisContext } from '@/contexts/LenisContext'

export const useScrollAberration = () => {
  const [scrollY, setScrollY] = useState(0)
  const [aberrationIntensity, setAberrationIntensity] = useState(0)
  const { lenis, isLiteMode } = useLenisContext()

  useEffect(() => {
    let rafId: number
    let decayRafId: number
    let lastScrollY = window.scrollY

    const startDecay = () => {
      cancelAnimationFrame(decayRafId)
      const decay = () => {
        setAberrationIntensity((prev) => {
          if (prev < 0.001) return 0
          const next = prev * 0.9
          decayRafId = requestAnimationFrame(decay)
          return next
        })
      }
      decayRafId = requestAnimationFrame(decay)
    }

    if (!isLiteMode && lenis) {
      // Lenis mode: subscribe to Lenis scroll events
      const handleLenisScroll = (e: { scroll: number; velocity: number }) => {
        const scrollDelta = Math.abs(e.scroll - lastScrollY)
        const intensity = Math.min(scrollDelta / 100, 1)
        lastScrollY = e.scroll

        cancelAnimationFrame(rafId)
        cancelAnimationFrame(decayRafId)
        rafId = requestAnimationFrame(() => {
          setScrollY(e.scroll)
          if (intensity > 0) {
            setAberrationIntensity(intensity)
            startDecay()
          }
        })
      }

      lenis.on('scroll', handleLenisScroll)

      return () => {
        lenis.off('scroll', handleLenisScroll)
        cancelAnimationFrame(rafId)
        cancelAnimationFrame(decayRafId)
      }
    }

    // Lite mode / no Lenis: fall back to native scroll event
    const handleScroll = () => {
      const currentScrollY = window.scrollY
      const scrollDelta = Math.abs(currentScrollY - lastScrollY)
      const intensity = Math.min(scrollDelta / 100, 1)

      lastScrollY = currentScrollY

      cancelAnimationFrame(rafId)
      cancelAnimationFrame(decayRafId)
      rafId = requestAnimationFrame(() => {
        setScrollY(currentScrollY)
        if (intensity > 0) {
          setAberrationIntensity(intensity)
          startDecay()
        }
      })
    }

    window.addEventListener('scroll', handleScroll, { passive: true })

    return () => {
      window.removeEventListener('scroll', handleScroll)
      cancelAnimationFrame(rafId)
      cancelAnimationFrame(decayRafId)
    }
  }, [lenis, isLiteMode])

  return { scrollY, aberrationIntensity }
}