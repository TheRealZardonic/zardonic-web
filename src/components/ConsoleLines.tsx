import { useState, useEffect } from 'react'
import {
  CONSOLE_LINES_DEFAULT_SPEED_MS,
  CONSOLE_LINES_DEFAULT_DELAY_MS,
} from '@/lib/config'

interface ConsoleLinesProps {
  lines: string[]
  speed?: number
  delayBetween?: number
}

/** Terminal-style line-by-line text reveal with typing animation */
export default function ConsoleLines({ lines, speed = CONSOLE_LINES_DEFAULT_SPEED_MS, delayBetween = CONSOLE_LINES_DEFAULT_DELAY_MS }: ConsoleLinesProps) {
  const [visibleCount, setVisibleCount] = useState(0)
  const [currentText, setCurrentText] = useState('')
  const [lineComplete, setLineComplete] = useState(false)
  const [skipped, setSkipped] = useState(false)

  useEffect(() => {
    if (skipped || visibleCount >= lines.length) return
    const line = lines[visibleCount]
    let charIdx = 0
    setCurrentText('')
    setLineComplete(false)
    const interval = setInterval(() => {
      charIdx++
      if (charIdx <= line.length) {
        setCurrentText(line.slice(0, charIdx))
      } else {
        clearInterval(interval)
        setLineComplete(true)
        setTimeout(() => setVisibleCount((c) => c + 1), delayBetween)
      }
    }, speed)
    return () => clearInterval(interval)
  }, [visibleCount, lines, speed, delayBetween, skipped])

  const handleSkip = () => {
    if (!skipped) {
      setSkipped(true)
      setVisibleCount(lines.length)
      setCurrentText('')
    }
  }

  return (
    <div className="space-y-1 cursor-pointer" onClick={handleSkip} onTouchEnd={handleSkip}>
      {(skipped ? lines : lines.slice(0, visibleCount)).map((line, i) => (
        <p key={i} className="text-xs font-mono text-foreground/80 whitespace-pre-wrap">{line}</p>
      ))}
      {!skipped && visibleCount < lines.length && (
        <p className="text-xs font-mono text-foreground/80 whitespace-pre-wrap">
          {currentText}
          {!lineComplete && <span className="console-cursor" />}
        </p>
      )}
    </div>
  )
}
