import { describe, it, expect, vi, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useIsMobile } from '@/hooks/use-mobile'

describe('useIsMobile', () => {
  const originalMatchMedia = window.matchMedia
  const originalInnerWidth = window.innerWidth

  afterEach(() => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: originalMatchMedia,
    })
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: originalInnerWidth,
    })
  })

  function setViewportWidth(width: number) {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: width,
    })
  }

  function setupMatchMedia(matches: boolean) {
    const listeners: Array<(e: MediaQueryListEvent) => void> = []
    const mql = {
      matches,
      addEventListener: vi.fn((_type: string, listener: (e: MediaQueryListEvent) => void) => {
        listeners.push(listener)
      }),
      removeEventListener: vi.fn(),
      dispatchChange: (newWidth: number) => {
        setViewportWidth(newWidth)
        listeners.forEach(l => l({ matches: newWidth < 768 } as MediaQueryListEvent))
      },
    }
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockReturnValue(mql),
    })
    return mql
  }

  it('returns false (desktop) when viewport is >= 768px', () => {
    setViewportWidth(1024)
    setupMatchMedia(false)
    const { result } = renderHook(() => useIsMobile())
    expect(result.current).toBe(false)
  })

  it('returns true (mobile) when viewport is < 768px', () => {
    setViewportWidth(375)
    setupMatchMedia(true)
    const { result } = renderHook(() => useIsMobile())
    expect(result.current).toBe(true)
  })

  it('returns false at exactly 768px', () => {
    setViewportWidth(768)
    setupMatchMedia(false)
    const { result } = renderHook(() => useIsMobile())
    expect(result.current).toBe(false)
  })

  it('updates when viewport changes to mobile', () => {
    setViewportWidth(1024)
    const mql = setupMatchMedia(false)
    const { result } = renderHook(() => useIsMobile())
    expect(result.current).toBe(false)
    act(() => {
      mql.dispatchChange(375)
    })
    expect(result.current).toBe(true)
  })

  it('removes event listener on unmount', () => {
    setViewportWidth(1024)
    const mql = setupMatchMedia(false)
    const { unmount } = renderHook(() => useIsMobile())
    unmount()
    expect(mql.removeEventListener).toHaveBeenCalledWith('change', expect.any(Function))
  })
})
