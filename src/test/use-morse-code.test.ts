import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useMorseCode } from '@/hooks/use-morse-code'

describe('useMorseCode', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('registers a dot for a short press (< 300ms)', () => {
    const onMatch = vi.fn()
    const { result } = renderHook(() =>
      useMorseCode({ targetCode: '.', onMatch })
    )

    vi.setSystemTime(1000)
    act(() => { result.current.onPointerDown() })
    vi.setSystemTime(1100)
    act(() => { result.current.onPointerUp() })

    expect(onMatch).toHaveBeenCalledTimes(1)
  })

  it('registers a dash for a long press (>= 300ms)', () => {
    const onMatch = vi.fn()
    const { result } = renderHook(() =>
      useMorseCode({ targetCode: '-', onMatch })
    )

    vi.setSystemTime(1000)
    act(() => { result.current.onPointerDown() })
    vi.setSystemTime(1400)
    act(() => { result.current.onPointerUp() })

    expect(onMatch).toHaveBeenCalledTimes(1)
  })

  it('matches a multi-symbol target code', () => {
    const onMatch = vi.fn()
    const { result } = renderHook(() =>
      useMorseCode({ targetCode: '.-', onMatch })
    )

    // Short press -> dot
    vi.setSystemTime(1000)
    act(() => { result.current.onPointerDown() })
    vi.setSystemTime(1100)
    act(() => { result.current.onPointerUp() })

    expect(onMatch).not.toHaveBeenCalled()

    // Long press -> dash
    vi.setSystemTime(1500)
    act(() => { result.current.onPointerDown() })
    vi.setSystemTime(1900)
    act(() => { result.current.onPointerUp() })

    expect(onMatch).toHaveBeenCalledTimes(1)
  })

  it('does not fire onMatch for incorrect sequence', () => {
    const onMatch = vi.fn()
    const { result } = renderHook(() =>
      useMorseCode({ targetCode: '.-', onMatch })
    )

    // Two short presses -> ".."
    vi.setSystemTime(1000)
    act(() => { result.current.onPointerDown() })
    vi.setSystemTime(1100)
    act(() => { result.current.onPointerUp() })

    vi.setSystemTime(1200)
    act(() => { result.current.onPointerDown() })
    vi.setSystemTime(1250)
    act(() => { result.current.onPointerUp() })

    expect(onMatch).not.toHaveBeenCalled()
  })

  it('resets sequence after 1500ms of inactivity', () => {
    const onMatch = vi.fn()
    const { result } = renderHook(() =>
      useMorseCode({ targetCode: '.', onMatch })
    )

    // Long press -> dash (doesn't match '.')
    vi.setSystemTime(1000)
    act(() => { result.current.onPointerDown() })
    vi.setSystemTime(1400)
    act(() => { result.current.onPointerUp() })

    expect(onMatch).not.toHaveBeenCalled()

    // Wait 1500ms — sequence should reset
    act(() => { vi.advanceTimersByTime(1500) })

    // Now short press -> dot (matches '.')
    vi.setSystemTime(3000)
    act(() => { result.current.onPointerDown() })
    vi.setSystemTime(3050)
    act(() => { result.current.onPointerUp() })

    expect(onMatch).toHaveBeenCalledTimes(1)
  })

  it('does not fire when target code is empty', () => {
    const onMatch = vi.fn()
    const { result } = renderHook(() =>
      useMorseCode({ targetCode: '', onMatch })
    )

    vi.setSystemTime(1000)
    act(() => { result.current.onPointerDown() })
    vi.setSystemTime(1100)
    act(() => { result.current.onPointerUp() })

    expect(onMatch).not.toHaveBeenCalled()
  })

  it('resets sequence after successful match', () => {
    const onMatch = vi.fn()
    const { result } = renderHook(() =>
      useMorseCode({ targetCode: '.', onMatch })
    )

    // First match
    vi.setSystemTime(1000)
    act(() => { result.current.onPointerDown() })
    vi.setSystemTime(1100)
    act(() => { result.current.onPointerUp() })
    expect(onMatch).toHaveBeenCalledTimes(1)

    // Second match
    vi.setSystemTime(1200)
    act(() => { result.current.onPointerDown() })
    vi.setSystemTime(1250)
    act(() => { result.current.onPointerUp() })
    expect(onMatch).toHaveBeenCalledTimes(2)
  })

  it('ignores pointerUp without preceding pointerDown', () => {
    const onMatch = vi.fn()
    const { result } = renderHook(() =>
      useMorseCode({ targetCode: '.', onMatch })
    )

    act(() => { result.current.onPointerUp() })

    expect(onMatch).not.toHaveBeenCalled()
  })

  it('treats exactly 300ms press as a dash', () => {
    const onMatch = vi.fn()
    const { result } = renderHook(() =>
      useMorseCode({ targetCode: '-', onMatch })
    )

    vi.setSystemTime(1000)
    act(() => { result.current.onPointerDown() })
    vi.setSystemTime(1300)
    act(() => { result.current.onPointerUp() })

    expect(onMatch).toHaveBeenCalledTimes(1)
  })
})
