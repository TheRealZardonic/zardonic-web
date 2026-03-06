import { useRef, useCallback, useEffect } from 'react'

const DOT_THRESHOLD_MS = 300
const IDLE_RESET_MS = 1500

interface MorseCodeOptions {
  targetCode: string
  onMatch: () => void
}

interface MorseCodeHandlers {
  onPointerDown: () => void
  onPointerUp: () => void
}

export function useMorseCode({ targetCode, onMatch }: MorseCodeOptions): MorseCodeHandlers {
  const sequenceRef = useRef('')
  const downTime = useRef<number | null>(null)
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const targetRef = useRef(targetCode)
  const matchRef = useRef(onMatch)

  targetRef.current = targetCode
  matchRef.current = onMatch

  const clearIdleTimer = useCallback(() => {
    if (idleTimer.current) {
      clearTimeout(idleTimer.current)
      idleTimer.current = null
    }
  }, [])

  const resetSequence = useCallback(() => {
    sequenceRef.current = ''
  }, [])

  const onPointerDown = useCallback(() => {
    clearIdleTimer()
    downTime.current = Date.now()
  }, [clearIdleTimer])

  const onPointerUp = useCallback(() => {
    if (downTime.current === null) return
    if (!targetRef.current?.trim()) return
    const duration = Date.now() - downTime.current
    downTime.current = null
    const symbol = duration < DOT_THRESHOLD_MS ? '.' : '-'

    sequenceRef.current += symbol

    if (targetRef.current.length > 0 && sequenceRef.current.length > targetRef.current.length) {
      sequenceRef.current = symbol
    }

    if (sequenceRef.current.length > 0 && sequenceRef.current === targetRef.current) {
      matchRef.current()
      resetSequence()
    }

    clearIdleTimer()
    idleTimer.current = setTimeout(resetSequence, IDLE_RESET_MS)
  }, [clearIdleTimer, resetSequence])

  // Cleanup on unmount
  useEffect(() => {
    return () => clearIdleTimer()
  }, [clearIdleTimer])

  return { onPointerDown, onPointerUp }
}
