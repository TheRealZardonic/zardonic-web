import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useTypingEffect } from '@/hooks/use-typing-effect'

describe('useTypingEffect', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('starts with empty displayed text', () => {
    const { result } = renderHook(() => useTypingEffect('Hello', 30))
    expect(result.current.displayedText).toBe('')
    expect(result.current.isComplete).toBe(false)
  })

  it('types text character by character', () => {
    const { result } = renderHook(() => useTypingEffect('Hi', 50))
    act(() => { vi.advanceTimersByTime(50) })
    expect(result.current.displayedText).toBe('H')
    act(() => { vi.advanceTimersByTime(50) })
    expect(result.current.displayedText).toBe('Hi')
  })

  it('sets isComplete to true after typing all characters', () => {
    const { result } = renderHook(() => useTypingEffect('A', 50))
    act(() => { vi.advanceTimersByTime(50) })
    expect(result.current.displayedText).toBe('A')
    // isComplete is set on the next interval tick after the last char
    act(() => { vi.advanceTimersByTime(50) })
    expect(result.current.isComplete).toBe(true)
  })

  it('handles empty string immediately', () => {
    const { result } = renderHook(() => useTypingEffect('', 30))
    expect(result.current.isComplete).toBe(true)
    expect(result.current.displayedText).toBe('')
  })

  it('respects start delay before typing begins', () => {
    const { result } = renderHook(() => useTypingEffect('Hello', 30, 200))
    act(() => { vi.advanceTimersByTime(100) })
    expect(result.current.displayedText).toBe('')
    // advance to exactly 200ms (delay) + 30ms (first char) = 230ms total
    act(() => { vi.advanceTimersByTime(130) }) // now at 230ms
    expect(result.current.displayedText).toBe('H')
  })

  it('resets when text prop changes', () => {
    const { result, rerender } = renderHook(
      ({ text }: { text: string }) => useTypingEffect(text, 50),
      { initialProps: { text: 'Hello' } }
    )
    // Advance enough ticks for all 5 chars + the isComplete tick (6 ticks = 300ms)
    act(() => { vi.advanceTimersByTime(300) })
    expect(result.current.isComplete).toBe(true)
    rerender({ text: 'World' })
    expect(result.current.displayedText).toBe('')
    expect(result.current.isComplete).toBe(false)
  })

  it('types the full text correctly', () => {
    const text = 'Test'
    const { result } = renderHook(() => useTypingEffect(text, 30))
    act(() => { vi.advanceTimersByTime(30 * text.length + 50) })
    expect(result.current.displayedText).toBe(text)
    expect(result.current.isComplete).toBe(true)
  })
})
