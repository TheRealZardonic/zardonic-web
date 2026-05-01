/**
 * LenisContext tests.
 *
 * We test the context's public interface (scrollTo native fallback, isLiteMode
 * flag) in a jsdom environment where Lenis itself is mocked because:
 *   - jsdom has no layout engine and no requestAnimationFrame (polyfilled by vitest)
 *   - We only care that the React context wires up correctly and that the native
 *     fallback path is exercised
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, act, renderHook } from '@testing-library/react'
import { LenisProvider, useLenisContext } from '@/contexts/LenisContext'
import type { ReactNode } from 'react'

// Mock lenis so we don't need a real DOM layout engine
vi.mock('lenis', () => {
  const MockLenis = vi.fn().mockImplementation(() => ({
    on: vi.fn(),
    off: vi.fn(),
    raf: vi.fn(),
    scrollTo: vi.fn(),
    destroy: vi.fn(),
  }))
  return { default: MockLenis }
})

// Mock device-capability — default: capable device (Lenis enabled)
vi.mock('@/lib/device-capability', () => ({
  usePrefersReducedMotion: vi.fn().mockReturnValue(false),
  isSlowConnection: vi.fn().mockReturnValue(false),
  isLowEndHardware: vi.fn().mockReturnValue(false),
}))

import { usePrefersReducedMotion, isSlowConnection, isLowEndHardware } from '@/lib/device-capability'

const wrapper = ({ children }: { children: ReactNode }) => (
  <LenisProvider>{children}</LenisProvider>
)

describe('LenisContext — capable device', () => {
  beforeEach(() => {
    vi.mocked(usePrefersReducedMotion).mockReturnValue(false)
    vi.mocked(isSlowConnection).mockReturnValue(false)
    vi.mocked(isLowEndHardware).mockReturnValue(false)
  })

  it('provides isLiteMode = false on capable device', () => {
    const { result } = renderHook(() => useLenisContext(), { wrapper })
    expect(result.current.isLiteMode).toBe(false)
  })

  it('exposes a scrollTo function', () => {
    const { result } = renderHook(() => useLenisContext(), { wrapper })
    expect(typeof result.current.scrollTo).toBe('function')
  })

  it('exposes scrollY = 0 on mount', () => {
    const { result } = renderHook(() => useLenisContext(), { wrapper })
    expect(result.current.scrollY).toBe(0)
  })

  it('exposes velocityY = 0 on mount', () => {
    const { result } = renderHook(() => useLenisContext(), { wrapper })
    expect(result.current.velocityY).toBe(0)
  })
})

describe('LenisContext — lite mode device', () => {
  beforeEach(() => {
    vi.mocked(usePrefersReducedMotion).mockReturnValue(true)
    vi.mocked(isSlowConnection).mockReturnValue(false)
    vi.mocked(isLowEndHardware).mockReturnValue(false)
  })

  it('provides isLiteMode = true on low-end device', () => {
    const { result } = renderHook(() => useLenisContext(), { wrapper })
    expect(result.current.isLiteMode).toBe(true)
  })

  it('native scrollTo does not throw when element not found', () => {
    const { result } = renderHook(() => useLenisContext(), { wrapper })
    expect(() => result.current.scrollTo('#nonexistent', { offset: -80 })).not.toThrow()
  })

  it('native scrollTo number target calls window.scrollTo', () => {
    const scrollToSpy = vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
    const { result } = renderHook(() => useLenisContext(), { wrapper })
    act(() => { result.current.scrollTo(500) })
    expect(scrollToSpy).toHaveBeenCalledWith({ top: 500, behavior: 'smooth' })
    scrollToSpy.mockRestore()
  })
})

describe('LenisProvider — renders children', () => {
  it('renders child elements', () => {
    const { getByText } = render(
      <LenisProvider><span>hello lenis</span></LenisProvider>
    )
    expect(getByText('hello lenis')).toBeTruthy()
  })
})

describe('LenisContext — lite mode native scroll tracking', () => {
  beforeEach(() => {
    vi.mocked(usePrefersReducedMotion).mockReturnValue(true)
    vi.mocked(isSlowConnection).mockReturnValue(false)
    vi.mocked(isLowEndHardware).mockReturnValue(false)
  })

  it('registers a native scroll listener in lite mode', () => {
    const addSpy = vi.spyOn(window, 'addEventListener')
    renderHook(() => useLenisContext(), { wrapper })
    const scrollListeners = addSpy.mock.calls.filter(([event]) => event === 'scroll')
    expect(scrollListeners.length).toBeGreaterThan(0)
    addSpy.mockRestore()
  })

  it('scrollY updates when window scroll event fires in lite mode', () => {
    Object.defineProperty(window, 'scrollY', { value: 200, writable: true, configurable: true })
    const { result } = renderHook(() => useLenisContext(), { wrapper })
    act(() => {
      window.dispatchEvent(new Event('scroll'))
    })
    expect(result.current.scrollY).toBe(200)
    Object.defineProperty(window, 'scrollY', { value: 0, writable: true, configurable: true })
  })
})
