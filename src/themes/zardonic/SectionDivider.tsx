interface SectionDividerProps {
  variant?: 'line' | 'circuit' | 'glitch' | 'none'
  className?: string
}

export default function SectionDivider({ variant = 'line', className = '' }: SectionDividerProps) {
  if (variant === 'none') return null

  if (variant === 'line') {
    return <div className={`h-px bg-border ${className}`} />
  }

  if (variant === 'circuit') {
    return (
      <div className={`relative h-16 overflow-hidden ${className}`}>
        <div className="absolute inset-0 flex items-center justify-center">
          <svg 
            className="w-full h-full opacity-30" 
            viewBox="0 0 1200 100" 
            preserveAspectRatio="none"
          >
            <line x1="0" y1="50" x2="400" y2="50" stroke="currentColor" strokeWidth="1" className="text-primary" />
            <circle cx="400" cy="50" r="4" fill="currentColor" className="text-primary" />
            <line x1="400" y1="50" x2="600" y2="50" stroke="currentColor" strokeWidth="1" className="text-primary" strokeDasharray="5,5" />
            <circle cx="600" cy="50" r="4" fill="currentColor" className="text-primary" />
            <line x1="600" y1="50" x2="1200" y2="50" stroke="currentColor" strokeWidth="1" className="text-primary" />
          </svg>
        </div>
      </div>
    )
  }

  if (variant === 'glitch') {
    return (
      <div className={`relative h-1 overflow-hidden ${className}`}>
        <div className="absolute inset-0 bg-border" />
        <div 
          className="absolute inset-0 bg-primary/50"
          style={{
            clipPath: 'polygon(0 0, 20% 0, 20% 100%, 0 100%, 0 80%, 10% 80%, 10% 20%, 0 20%)',
            animation: 'zardonic-theme-glitch-shift 3s infinite'
          }}
        />
      </div>
    )
  }

  return <div className={`h-px bg-border ${className}`} />
}
