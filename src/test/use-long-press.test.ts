import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useLongPress } from '@/hooks/use-long-press'

describe('useLongPress', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns event handler functions', () => {
    const { result } = renderHook(() =>
      useLongPress({ onLongPress: vi.fn() })
    )
    expect(typeof result.current.onMouseDown).toBe('function')
    expect(typeof result.current.onMouseUp).toBe('function')
    expect(typeof result.current.onMouseLeave).toBe('function')
    expect(typeof result.current.onTouchStart).toBe('function')
    expect(typeof result.current.onTouchEnd).toBe('function')
  })

  it('calls onLongPress after default 500ms delay', () => {
    const onLongPress = vi.fn()
    const { result } = renderHook(() => useLongPress({ onLongPress }))
    act(() => { result.current.onMouseDown() })
    act(() => { vi.advanceTimersByTime(500) })
    expect(onLongPress).toHaveBeenCalledTimes(1)
  })

  it('calls onLongPress after custom delay', () => {
    const onLongPress = vi.fn()
    const { result } = renderHook(() => useLongPress({ onLongPress, delay: 1000 }))
    act(() => { result.current.onMouseDown() })
    act(() => { vi.advanceTimersByTime(999) })
    expect(onLongPress).not.toHaveBeenCalled()
    act(() => { vi.advanceTimersByTime(1) })
    expect(onLongPress).toHaveBeenCalledTimes(1)
  })

  it('does not call onLongPress if mouseUp fires before delay', () => {
    const onLongPress = vi.fn()
    const { result } = renderHook(() => useLongPress({ onLongPress }))
    act(() => { result.current.onMouseDown() })
    act(() => { vi.advanceTimersByTime(200) })
    act(() => { result.current.onMouseUp() })
    act(() => { vi.advanceTimersByTime(400) })
    expect(onLongPress).not.toHaveBeenCalled()
  })

  it('does not call onLongPress if mouseLeave fires before delay', () => {
    const onLongPress = vi.fn()
    const { result } = renderHook(() => useLongPress({ onLongPress }))
    act(() => { result.current.onMouseDown() })
    act(() => { vi.advanceTimersByTime(200) })
    act(() => { result.current.onMouseLeave() })
    act(() => { vi.advanceTimersByTime(400) })
    expect(onLongPress).not.toHaveBeenCalled()
  })

  it('calls onClick on short press (not long press)', () => {
    const onLongPress = vi.fn()
    const onClick = vi.fn()
    const { result } = renderHook(() => useLongPress({ onLongPress, onClick }))
    act(() => { result.current.onMouseDown() })
    act(() => { vi.advanceTimersByTime(100) }) // short press
    act(() => { result.current.onMouseUp() })
    expect(onClick).toHaveBeenCalledTimes(1)
    expect(onLongPress).not.toHaveBeenCalled()
  })

  it('does not call onClick on long press', () => {
    const onLongPress = vi.fn()
    const onClick = vi.fn()
    const { result } = renderHook(() => useLongPress({ onLongPress, onClick }))
    act(() => { result.current.onMouseDown() })
    act(() => { vi.advanceTimersByTime(600) }) // long press
    act(() => { result.current.onMouseUp() })
    expect(onClick).not.toHaveBeenCalled()
    expect(onLongPress).toHaveBeenCalledTimes(1)
  })

  it('handles touch events - touch long press', () => {
    const onLongPress = vi.fn()
    const { result } = renderHook(() => useLongPress({ onLongPress }))
    act(() => { result.current.onTouchStart() })
    act(() => { vi.advanceTimersByTime(500) })
    expect(onLongPress).toHaveBeenCalledTimes(1)
  })

  it('cancels on touchEnd before delay', () => {
    const onLongPress = vi.fn()
    const { result } = renderHook(() => useLongPress({ onLongPress }))
    act(() => { result.current.onTouchStart() })
    act(() => { vi.advanceTimersByTime(200) })
    act(() => { result.current.onTouchEnd() })
    act(() => { vi.advanceTimersByTime(400) })
    expect(onLongPress).not.toHaveBeenCalled()
  })
})
