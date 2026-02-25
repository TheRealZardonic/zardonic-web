import { useEffect, useState, useRef } from 'react'
import { get } from '@/lib/config'

interface DecryptTextProps {
  children: string
  className?: string
  delay?: number
}

/**
 * DecryptText - Displays text with a decryption/reveal effect
 * Characters cycle through random symbols before revealing the final text
 */
export function DecryptText({ children, className = '', delay = 0 }: DecryptTextProps) {
  const [displayText, setDisplayText] = useState('')
  const [isDecrypting, setIsDecrypting] = useState(true)
  const mounted = useRef(false)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  useEffect(() => {
    const enabled = get('TEXT_DECRYPT_ENABLED')
    if (!enabled || !children) {
      setDisplayText(children)
      setIsDecrypting(false)
      return
    }

    const duration = get('TEXT_DECRYPT_DURATION_MS')
    const charDelay = get('TEXT_DECRYPT_CHAR_DELAY_MS')
    const decryptChars = get('TEXT_DECRYPT_CHARS')

    const targetText = children
    const chars = decryptChars.split('')
    
    let currentIteration = 0
    const totalIterations = Math.ceil(duration / charDelay)
    
    const startTime = Date.now() + delay

    const animate = () => {
      if (!mounted.current) return

      const elapsed = Date.now() - startTime
      if (elapsed < 0) {
        // Still in delay phase
        requestAnimationFrame(animate)
        return
      }

      currentIteration++
      
      if (currentIteration >= totalIterations) {
        setDisplayText(targetText)
        setIsDecrypting(false)
        return
      }

      const progress = currentIteration / totalIterations
      const revealedCount = Math.floor(targetText.length * progress)

      const newText = targetText
        .split('')
        .map((char, index) => {
          if (char === ' ') return ' '
          if (index < revealedCount) return char
          return chars[Math.floor(Math.random() * chars.length)]
        })
        .join('')

      setDisplayText(newText)
      
      setTimeout(() => {
        if (mounted.current) {
          animate()
        }
      }, charDelay)
    }

    // Start with scrambled text
    const scrambledText = targetText
      .split('')
      .map((char) => (char === ' ' ? ' ' : chars[Math.floor(Math.random() * chars.length)]))
      .join('')
    setDisplayText(scrambledText)
    
    requestAnimationFrame(animate)

  }, [children, delay])

  return (
    <span className={className}>
      {displayText}
      {isDecrypting && <span className="ml-0.5 animate-pulse text-primary">_</span>}
    </span>
  )
}
