import { useState, useEffect, useCallback } from 'react'

export function useTypingEffect(
  text: string,
  speed: number = 30,
  startDelay: number = 0
) {
  const [displayedText, setDisplayedText] = useState('')
  const [isComplete, setIsComplete] = useState(false)

  useEffect(() => {
    setDisplayedText('')
    setIsComplete(false)

    if (!text) {
      setIsComplete(true)
      return
    }

    let intervalId: ReturnType<typeof setInterval> | undefined

    const startTimeout = setTimeout(() => {
      let currentIndex = 0

      intervalId = setInterval(() => {
        if (currentIndex < text.length) {
          setDisplayedText(text.slice(0, currentIndex + 1))
          currentIndex++
        } else {
          clearInterval(intervalId)
          setIsComplete(true)
        }
      }, speed)
    }, startDelay)

    return () => {
      clearTimeout(startTimeout)
      if (intervalId) clearInterval(intervalId)
    }
  }, [text, speed, startDelay])

  /** Skip the animation and show the full text immediately */
  const skipAnimation = useCallback(() => {
    if (!isComplete && text) {
      setDisplayedText(text)
      setIsComplete(true)
    }
  }, [isComplete, text])

  return { displayedText, isComplete, skipAnimation }
}
