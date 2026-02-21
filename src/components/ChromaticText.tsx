import { useEffect, useRef, useState, type ReactNode } from 'react'

interface ChromaticTextProps {
  children: ReactNode
  className?: string
  as?: keyof JSX.IntrinsicElements
}

/**
 * ChromaticText — applies a scroll-driven chromatic aberration effect.
 *
 * On scroll, red and blue text-shadow offsets are computed from scroll velocity
 * and applied as CSS custom properties.  The effect fades out smoothly once
 * scrolling stops via requestAnimationFrame.
 */
export default function ChromaticText({ children, className = '', as: Tag = 'span' }: ChromaticTextProps) {
  const ref = useRef<HTMLElement | null>(null)
  const [offset, setOffset] = useState(0)
  const lastScrollY = useRef(0)
  const rafId = useRef<number | null>(null)
  const velocityRef = useRef(0)

  useEffect(() => {
    const handleScroll = () => {
      const currentY = window.scrollY
      const delta = currentY - lastScrollY.current
      lastScrollY.current = currentY
      velocityRef.current = delta
    }

    const animate = () => {
      // Decay the velocity smoothly
      velocityRef.current *= 0.8
      const clamped = Math.max(-12, Math.min(12, velocityRef.current))
      setOffset(prev => {
        const next = clamped
        if (Math.abs(prev - next) < 0.05) return 0
        return next
      })
      rafId.current = requestAnimationFrame(animate)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    rafId.current = requestAnimationFrame(animate)

    return () => {
      window.removeEventListener('scroll', handleScroll)
      if (rafId.current !== null) cancelAnimationFrame(rafId.current)
    }
  }, [])

  const px = offset.toFixed(2)
  const textShadow = offset === 0
    ? 'none'
    : `${px}px 0 0 rgba(255,0,0,0.6), -${px}px 0 0 rgba(0,0,255,0.6)`

  const El = Tag as React.ElementType
  return (
    <El
      ref={ref as React.RefObject<HTMLElement>}
      className={className}
      style={{ textShadow, display: 'inline-block' }}
    >
      {children}
    </El>
  )
}
