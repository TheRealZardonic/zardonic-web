import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useLocalStorage } from './use-local-storage'

describe('useLocalStorage', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('should return the default value when no stored value exists', () => {
    const { result } = renderHook(() => useLocalStorage('test-key', { name: 'default' }))
    expect(result.current[0]).toEqual({ name: 'default' })
  })

  it('should return stored value from localStorage', () => {
    localStorage.setItem('test-key', JSON.stringify({ name: 'stored' }))
    const { result } = renderHook(() => useLocalStorage('test-key', { name: 'default' }))
    expect(result.current[0]).toEqual({ name: 'stored' })
  })

  it('should update value and persist to localStorage', () => {
    const { result } = renderHook(() => useLocalStorage('test-key', { name: 'default' }))

    act(() => {
      result.current[1]({ name: 'updated' })
    })

    expect(result.current[0]).toEqual({ name: 'updated' })
    expect(JSON.parse(localStorage.getItem('test-key')!)).toEqual({ name: 'updated' })
  })

  it('should support functional updates', () => {
    const { result } = renderHook(() => useLocalStorage('test-key', { count: 0 }))

    act(() => {
      result.current[1]((prev) => ({ count: prev.count + 1 }))
    })

    expect(result.current[0]).toEqual({ count: 1 })
  })

  it('should handle invalid JSON in localStorage gracefully', () => {
    localStorage.setItem('test-key', 'not valid json')
    const { result } = renderHook(() => useLocalStorage('test-key', { name: 'default' }))
    expect(result.current[0]).toEqual({ name: 'default' })
  })
})
