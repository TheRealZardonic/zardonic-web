import React, { type ReactNode } from 'react'
import { motion } from 'framer-motion'

interface CardProps {
  children: ReactNode
  className?: string
  onClick?: () => void
  variant?: 'default' | 'outline' | 'cyber'
  animate?: boolean
  delay?: number
}

export default function Card({
  children,
  className = '',
  onClick,
  variant = 'cyber',
  animate = true,
  delay = 0
}: CardProps) {
  const baseClasses = 'relative overflow-hidden bg-card border-border transition-all'
  
  const variantClasses = {
    default: 'border',
    outline: 'border hover:border-primary/50',
    cyber: 'zardonic-theme-cyber-card zardonic-theme-hover-noise'
  }

  const Wrapper = animate ? motion.div : 'div'
  const animationProps = animate ? {
    initial: { opacity: 0, clipPath: 'inset(0 0 100% 0)' },
    whileInView: { opacity: 1, clipPath: 'inset(0 0 0% 0)' },
    viewport: { once: true },
    transition: { 
      duration: 0.6,
      delay,
      ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number]
    }
  } : {}

  return (
    <Wrapper
      {...(animate ? animationProps : {})}
      className={`${baseClasses} ${variantClasses[variant]} ${className} ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
    >
      {variant === 'cyber' && (
        <>
          <div className="zardonic-theme-scan-line" />
          <div className="zardonic-theme-data-label absolute top-2 left-2 text-[8px]" style={{ zIndex: 'var(--z-content)' } as React.CSSProperties}>
            // CARD.ELEMENT
          </div>
        </>
      )}
      {children}
    </Wrapper>
  )
}
