import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useAutoSave } from '@/cms/hooks/useAutoSave'

const mockFetch = vi.fn()
global.fetch = mockFetch

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

beforeEach(() => {
  vi.useFakeTimers()
  mockFetch.mockReset()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('useAutoSave', () => {
  it('starts with no saved state', () => {
    const { result } = renderHook(() =>
      useAutoSave('zd-cms:hero', { headline: 'test' }, false)
    )
    expect(result.current.lastSaved).toBeNull()
    expect(result.current.isSaving).toBe(false)
    expect(result.current.hasPendingChanges).toBe(false)
  })

  it('sets hasPendingChanges when isDirty becomes true', () => {
    const { result, rerender } = renderHook(
      ({ isDirty }: { isDirty: boolean }) =>
        useAutoSave('zd-cms:hero', { headline: 'test' }, isDirty),
      { initialProps: { isDirty: false } }
    )
    expect(result.current.hasPendingChanges).toBe(false)
    rerender({ isDirty: true })
    expect(result.current.hasPendingChanges).toBe(true)
  })

  it('does not trigger autosave when not dirty', async () => {
    renderHook(() =>
      useAutoSave('zd-cms:hero', { headline: 'test' }, false)
    )
    act(() => { vi.advanceTimersByTime(31_000) })
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('triggers autosave after 30 seconds when dirty', async () => {
    mockFetch.mockResolvedValue({ ok: true })
    const { result } = renderHook(() =>
      useAutoSave('zd-cms:hero', { headline: 'test' }, true)
    )
    // Expect hasPendingChanges set immediately when isDirty=true
    expect(result.current.hasPendingChanges).toBe(true)
    await act(async () => {
      vi.advanceTimersByTime(30_000)
      await Promise.resolve()
    })
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/cms/autosave',
      expect.objectContaining({ method: 'POST' })
    )
  })

  it('updates lastSaved after successful save', async () => {
    mockFetch.mockResolvedValue({ ok: true })
    const { result } = renderHook(() =>
      useAutoSave('zd-cms:hero', { headline: 'test' }, true)
    )
    await act(async () => {
      vi.advanceTimersByTime(30_000)
      await Promise.resolve()
      await Promise.resolve()
    })
    expect(result.current.lastSaved).not.toBeNull()
    expect(result.current.lastSaved).toBeInstanceOf(Date)
  })

  it('clears hasPendingChanges after successful save', async () => {
    mockFetch.mockResolvedValue({ ok: true })
    const { result } = renderHook(() =>
      useAutoSave('zd-cms:hero', { headline: 'test' }, true)
    )
    expect(result.current.hasPendingChanges).toBe(true)
    await act(async () => {
      vi.advanceTimersByTime(30_000)
      await Promise.resolve()
      await Promise.resolve()
    })
    expect(result.current.hasPendingChanges).toBe(false)
  })

  it('sends correct key and value to autosave API', async () => {
    mockFetch.mockResolvedValue({ ok: true })
    const value = { headline: 'My Headline', subtext: 'Details' }
    renderHook(() => useAutoSave('zd-cms:hero', value, true))
    await act(async () => {
      vi.advanceTimersByTime(30_000)
      await Promise.resolve()
    })
    const [url, options] = mockFetch.mock.calls[0] as [string, { body: string }]
    expect(url).toBe('/api/cms/autosave')
    const body = JSON.parse(options.body)
    expect(body.key).toBe('zd-cms:hero')
    expect(body.value).toEqual(value)
  })

  it('clears autosave interval on unmount', () => {
    const { unmount } = renderHook(() =>
      useAutoSave('zd-cms:hero', {}, false)
    )
    unmount()
    // Should not throw or trigger save after unmount
    act(() => { vi.advanceTimersByTime(60_000) })
    expect(mockFetch).not.toHaveBeenCalled()
  })
})
