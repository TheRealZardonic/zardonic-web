export default function NeuroklastTitle({ className = '' }: { className?: string }) {
  return (
    <svg 
      viewBox="0 0 1400 140" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <filter id="glow">
          <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
        <linearGradient id="redGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="oklch(0.55 0.22 25)" />
          <stop offset="50%" stopColor="oklch(0.65 0.25 25)" />
          <stop offset="100%" stopColor="oklch(0.55 0.22 25)" />
        </linearGradient>
      </defs>
      
      <text
        x="50%"
        y="52%"
        dominantBaseline="middle"
        textAnchor="middle"
        fill="url(#redGradient)"
        fontSize="110"
        fontWeight="900"
        fontFamily="var(--font-sans), sans-serif"
        letterSpacing="0.08em"
        filter="url(#glow)"
        style={{
          textTransform: 'uppercase',
        }}
      >
        NEUR⊕KLAST
      </text>
    </svg>
  )
}

