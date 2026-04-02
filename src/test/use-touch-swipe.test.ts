import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useTouchSwipe } from '@/hooks/use-touch-swipe'

function makeTouchEvent(x: number, y: number): React.TouchEvent {
  return {
    targetTouches: [{ clientX: x, clientY: y }],
  } as unknown as React.TouchEvent
}

describe('useTouchSwipe', () => {
  let onSwipeLeft: ReturnType<typeof vi.fn>
  let onSwipeRight: ReturnType<typeof vi.fn>
  let onSwipeUp: ReturnType<typeof vi.fn>
  let onSwipeDown: ReturnType<typeof vi.fn>

  beforeEach(() => {
    onSwipeLeft = vi.fn()
    onSwipeRight = vi.fn()
    onSwipeUp = vi.fn()
    onSwipeDown = vi.fn()
  })

  it('returns touch handler functions', () => {
    const { result } = renderHook(() =>
      useTouchSwipe({ onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown })
    )
    expect(typeof result.current.onTouchStart).toBe('function')
    expect(typeof result.current.onTouchMove).toBe('function')
    expect(typeof result.current.onTouchEnd).toBe('function')
  })

  it('calls onSwipeLeft when swiping left beyond threshold', () => {
    const { result } = renderHook(() =>
      useTouchSwipe({ onSwipeLeft, threshold: 75 })
    )
    act(() => result.current.onTouchStart(makeTouchEvent(300, 100)))
    act(() => result.current.onTouchMove(makeTouchEvent(200, 100)))
    act(() => result.current.onTouchEnd())
    expect(onSwipeLeft).toHaveBeenCalledTimes(1)
  })

  it('calls onSwipeRight when swiping right beyond threshold', () => {
    const { result } = renderHook(() =>
      useTouchSwipe({ onSwipeRight, threshold: 75 })
    )
    act(() => result.current.onTouchStart(makeTouchEvent(100, 100)))
    act(() => result.current.onTouchMove(makeTouchEvent(220, 100)))
    act(() => result.current.onTouchEnd())
    expect(onSwipeRight).toHaveBeenCalledTimes(1)
  })

  it('calls onSwipeUp when swiping up beyond threshold', () => {
    const { result } = renderHook(() =>
      useTouchSwipe({ onSwipeUp, threshold: 75 })
    )
    act(() => result.current.onTouchStart(makeTouchEvent(100, 300)))
    act(() => result.current.onTouchMove(makeTouchEvent(100, 200)))
    act(() => result.current.onTouchEnd())
    expect(onSwipeUp).toHaveBeenCalledTimes(1)
  })

  it('calls onSwipeDown when swiping down beyond threshold', () => {
    const { result } = renderHook(() =>
      useTouchSwipe({ onSwipeDown, threshold: 75 })
    )
    act(() => result.current.onTouchStart(makeTouchEvent(100, 100)))
    act(() => result.current.onTouchMove(makeTouchEvent(100, 220)))
    act(() => result.current.onTouchEnd())
    expect(onSwipeDown).toHaveBeenCalledTimes(1)
  })

  it('does not trigger swipe when movement is below threshold', () => {
    const { result } = renderHook(() =>
      useTouchSwipe({ onSwipeLeft, onSwipeRight, threshold: 75 })
    )
    act(() => result.current.onTouchStart(makeTouchEvent(100, 100)))
    act(() => result.current.onTouchMove(makeTouchEvent(130, 100))) // only 30px
    act(() => result.current.onTouchEnd())
    expect(onSwipeLeft).not.toHaveBeenCalled()
    expect(onSwipeRight).not.toHaveBeenCalled()
  })

  it('does not trigger when touch end is called without touch start', () => {
    const { result } = renderHook(() =>
      useTouchSwipe({ onSwipeLeft, onSwipeRight })
    )
    act(() => result.current.onTouchEnd())
    expect(onSwipeLeft).not.toHaveBeenCalled()
    expect(onSwipeRight).not.toHaveBeenCalled()
  })

  it('uses default threshold of 75 when not specified', () => {
    const { result } = renderHook(() =>
      useTouchSwipe({ onSwipeLeft })
    )
    // 80px is above default 75 threshold
    act(() => result.current.onTouchStart(makeTouchEvent(200, 100)))
    act(() => result.current.onTouchMove(makeTouchEvent(120, 100)))
    act(() => result.current.onTouchEnd())
    expect(onSwipeLeft).toHaveBeenCalledTimes(1)
  })

  it('handles custom threshold', () => {
    const { result } = renderHook(() =>
      useTouchSwipe({ onSwipeLeft, threshold: 200 })
    )
    // 150px is below custom 200 threshold
    act(() => result.current.onTouchStart(makeTouchEvent(300, 100)))
    act(() => result.current.onTouchMove(makeTouchEvent(150, 100)))
    act(() => result.current.onTouchEnd())
    expect(onSwipeLeft).not.toHaveBeenCalled()
  })
})
