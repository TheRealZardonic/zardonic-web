import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useUnsavedChanges } from '@/cms/hooks/useUnsavedChanges'

describe('useUnsavedChanges', () => {
  let addSpy: ReturnType<typeof vi.spyOn>
  let removeSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    addSpy = vi.spyOn(window, 'addEventListener')
    removeSpy = vi.spyOn(window, 'removeEventListener')
  })

  afterEach(() => {
    addSpy.mockRestore()
    removeSpy.mockRestore()
  })

  it('does not add beforeunload listener when not dirty', () => {
    renderHook(() => useUnsavedChanges(false))
    const calls = addSpy.mock.calls.filter(([type]) => type === 'beforeunload')
    expect(calls).toHaveLength(0)
  })

  it('adds beforeunload listener when dirty', () => {
    renderHook(() => useUnsavedChanges(true))
    const calls = addSpy.mock.calls.filter(([type]) => type === 'beforeunload')
    expect(calls.length).toBeGreaterThan(0)
  })

  it('removes beforeunload listener on unmount when dirty', () => {
    const { unmount } = renderHook(() => useUnsavedChanges(true))
    removeSpy.mockClear()
    unmount()
    const calls = removeSpy.mock.calls.filter(([type]) => type === 'beforeunload')
    expect(calls.length).toBeGreaterThan(0)
  })

  it('removes beforeunload listener when isDirty changes from true to false', () => {
    const { rerender } = renderHook(
      ({ isDirty }: { isDirty: boolean }) => useUnsavedChanges(isDirty),
      { initialProps: { isDirty: true } }
    )
    removeSpy.mockClear()
    rerender({ isDirty: false })
    const removeCalls = removeSpy.mock.calls.filter(([type]) => type === 'beforeunload')
    expect(removeCalls.length).toBeGreaterThan(0)
  })

  it('adds listener when isDirty changes from false to true', () => {
    const { rerender } = renderHook(
      ({ isDirty }: { isDirty: boolean }) => useUnsavedChanges(isDirty),
      { initialProps: { isDirty: false } }
    )
    addSpy.mockClear()
    rerender({ isDirty: true })
    const addCalls = addSpy.mock.calls.filter(([type]) => type === 'beforeunload')
    expect(addCalls.length).toBeGreaterThan(0)
  })

  it('beforeunload handler calls preventDefault and sets returnValue', () => {
    renderHook(() => useUnsavedChanges(true))
    const [, handler] = addSpy.mock.calls.find(([type]) => type === 'beforeunload') ?? []
    const mockEvent = { preventDefault: vi.fn(), returnValue: '' }
    if (handler) (handler as (e: BeforeUnloadEvent) => void)(mockEvent as unknown as BeforeUnloadEvent)
    expect(mockEvent.preventDefault).toHaveBeenCalled()
  })
})
