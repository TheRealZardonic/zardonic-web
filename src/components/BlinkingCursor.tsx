import { useEffect, useState } from 'react'
import { get } from '@/lib/config'

interface BlinkingCursorProps {
  className?: string
}

/**
 * BlinkingCursor - Terminal-style blinking block cursor
 * Can be appended to text elements for a retro terminal aesthetic
 */
export function BlinkingCursor({ className = '' }: BlinkingCursorProps) {
  const [enabled, setEnabled] = useState(true)

  useEffect(() => {
    const isEnabled = get('CURSOR_BLINK_ENABLED')
    setEnabled(Boolean(isEnabled))
  }, [])

  if (!enabled) return null

  const blinkSpeed = get('CURSOR_BLINK_SPEED_MS')

  return (
    <span
      className={`ml-1 inline-block h-[1em] w-[0.6em] bg-primary ${className}`}
      style={{
        animation: `cursor-blink ${blinkSpeed}ms step-end infinite`,
      }}
    >
      <style>
        {`
          @keyframes cursor-blink {
            0%, 49% {
              opacity: 1;
            }
            50%, 100% {
              opacity: 0;
            }
          }
        `}
      </style>
    </span>
  )
}
