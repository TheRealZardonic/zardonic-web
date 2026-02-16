import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useKonami } from '@/hooks/use-konami'

describe('useKonami', () => {
  beforeEach(() => {
    // Clear any previous event listeners
    document.body.innerHTML = ''
  })

  it('should not trigger callback initially', () => {
    const callback = vi.fn()
    renderHook(() => useKonami(callback))
    
    expect(callback).not.toHaveBeenCalled()
  })

  it('should trigger callback when konami code is entered', () => {
    const callback = vi.fn()
    renderHook(() => useKonami(callback))
    
    // Konami code: ↑ ↑ ↓ ↓ ← → ← → B A
    const konamiSequence = [
      'ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown',
      'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight',
      'b', 'a'
    ]
    
    act(() => {
      konamiSequence.forEach(key => {
        const event = new KeyboardEvent('keydown', { key })
        document.dispatchEvent(event)
      })
    })
    
    expect(callback).toHaveBeenCalledTimes(1)
  })

  it('should reset sequence on wrong key', () => {
    const callback = vi.fn()
    renderHook(() => useKonami(callback))
    
    act(() => {
      // Start correct sequence
      const event1 = new KeyboardEvent('keydown', { key: 'ArrowUp' })
      document.dispatchEvent(event1)
      
      const event2 = new KeyboardEvent('keydown', { key: 'ArrowUp' })
      document.dispatchEvent(event2)
      
      // Wrong key - should reset
      const eventWrong = new KeyboardEvent('keydown', { key: 'x' })
      document.dispatchEvent(eventWrong)
      
      // Try complete sequence again
      const konamiSequence = [
        'ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown',
        'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight',
        'b', 'a'
      ]
      
      konamiSequence.forEach(key => {
        const event = new KeyboardEvent('keydown', { key })
        document.dispatchEvent(event)
      })
    })
    
    expect(callback).toHaveBeenCalledTimes(1)
  })

  it('should clean up event listener on unmount', () => {
    const callback = vi.fn()
    const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener')
    
    const { unmount } = renderHook(() => useKonami(callback))
    
    unmount()
    
    expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function))
    
    removeEventListenerSpy.mockRestore()
  })

  it('should handle case insensitive letters', () => {
    const callback = vi.fn()
    renderHook(() => useKonami(callback))
    
    act(() => {
      const sequence = [
        'ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown',
        'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight',
        'B', 'A' // Uppercase letters
      ]
      
      sequence.forEach(key => {
        const event = new KeyboardEvent('keydown', { key })
        document.dispatchEvent(event)
      })
    })
    
    expect(callback).toHaveBeenCalledTimes(1)
  })
})
