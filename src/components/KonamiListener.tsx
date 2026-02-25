import { useEffect } from 'react'

interface KonamiListenerProps {
  onCodeActivated: () => void
  /** Custom key sequence. Falls back to the classic Konami code when omitted. */
  customCode?: string[]
}

export const DEFAULT_KONAMI_CODE = [
  'ArrowUp',
  'ArrowUp',
  'ArrowDown',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'ArrowLeft',
  'ArrowRight',
  'b',
  'a'
]

export default function KonamiListener({ onCodeActivated, customCode }: KonamiListenerProps) {
  const code = customCode && customCode.length > 0 ? customCode : DEFAULT_KONAMI_CODE

  useEffect(() => {
    let konamiIndex = 0

    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase()
      const expectedKey = code[konamiIndex].toLowerCase()

      if (key === expectedKey) {
        konamiIndex++
        
        if (konamiIndex === code.length) {
          konamiIndex = 0
          onCodeActivated()
        }
      } else {
        konamiIndex = 0
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [onCodeActivated, code])

  return null
}
