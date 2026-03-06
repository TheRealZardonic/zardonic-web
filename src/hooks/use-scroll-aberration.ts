import { useState, useEffect } from 'react'

export const useScrollAberration = () => {
  const [scrollY, setScrollY] = useState(0)
  const [aberrationIntensity, setAberrationIntensity] = useState(0)

  useEffect(() => {
    let rafId: number
    let lastScrollY = window.scrollY

    const handleScroll = () => {
      const currentScrollY = window.scrollY
      const scrollDelta = Math.abs(currentScrollY - lastScrollY)
      // Begrenzt die Intensität auf maximal 1
      const intensity = Math.min(scrollDelta / 100, 1)

      lastScrollY = currentScrollY

      cancelAnimationFrame(rafId)
      rafId = requestAnimationFrame(() => {
        setScrollY(currentScrollY)
        setAberrationIntensity(intensity)
      })
    }

    // Reduziert die Intensität schrittweise, wenn nicht gescrollt wird
    const decayInterval = setInterval(() => {
      setAberrationIntensity((prev) => (prev > 0.001 ? prev * 0.9 : 0))
    }, 100)

    window.addEventListener('scroll', handleScroll, { passive: true })

    return () => {
      window.removeEventListener('scroll', handleScroll)
      cancelAnimationFrame(rafId)
      clearInterval(decayInterval)
    }
  }, [])

  return { scrollY, aberrationIntensity }
}
