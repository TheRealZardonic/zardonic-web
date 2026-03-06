import { useCallback, useRef } from 'react'

interface LongPressOptions {
  onLongPress: () => void
  onClick?: () => void
  delay?: number
}

interface LongPressHandlers {
  onMouseDown: () => void
  onMouseUp: () => void
  onMouseLeave: () => void
  onTouchStart: () => void
  onTouchEnd: () => void
}

export function useLongPress({
  onLongPress,
  onClick,
  delay = 500
}: LongPressOptions): LongPressHandlers {
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isLongPress = useRef(false)

  const start = useCallback(() => {
    isLongPress.current = false
    timeout.current = setTimeout(() => {
      isLongPress.current = true
      onLongPress()
    }, delay)
  }, [onLongPress, delay])

  const clear = useCallback(() => {
    if (timeout.current) {
      clearTimeout(timeout.current)
    }
  }, [])

  const handleClick = useCallback(() => {
    if (!isLongPress.current && onClick) {
      onClick()
    }
    isLongPress.current = false
  }, [onClick])

  return {
    onMouseDown: start,
    onMouseUp: useCallback(() => {
      clear()
      handleClick()
    }, [clear, handleClick]),
    onMouseLeave: useCallback(() => clear(), [clear]),
    onTouchStart: start,
    onTouchEnd: useCallback(() => {
      clear()
      handleClick()
    }, [clear, handleClick])
  }
}
