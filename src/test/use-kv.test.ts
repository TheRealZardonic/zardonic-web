import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useKV } from '@/hooks/use-kv'

describe('useKV', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns undefined initially and then the default value when API returns nothing', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ value: null }), { status: 200 })
    )

    const { result } = renderHook(() => useKV('test-key', { foo: 'bar' }))

    // Initially undefined and not loaded
    expect(result.current[0]).toBeUndefined()
    expect(result.current[2]).toBe(false)

    // After loading
    await waitFor(() => expect(result.current[2]).toBe(true))
    expect(result.current[0]).toEqual({ foo: 'bar' })
  })

  it('returns value from API when available', async () => {
    const apiData = { name: 'ZARDONIC', genres: ['DnB'] }
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ value: apiData }), { status: 200 })
    )

    const { result } = renderHook(() => useKV('band-data', { name: '', genres: [] }))

    await waitFor(() => expect(result.current[2]).toBe(true))
    expect(result.current[0]).toEqual(apiData)
  })

  it('uses default value when API fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network error'))

    const { result } = renderHook(() => useKV('fallback-key', { saved: true }))

    await waitFor(() => expect(result.current[2]).toBe(true))
    expect(result.current[0]).toEqual({ saved: true })
  })

  it('updateValue changes state immediately', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ value: null }), { status: 200 })
    )

    const { result } = renderHook(() => useKV('update-key', 'initial'))

    await waitFor(() => expect(result.current[2]).toBe(true))

    act(() => {
      result.current[1]('updated')
    })

    expect(result.current[0]).toBe('updated')
  })

  it('updateValue with updater function receives current value', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ value: 10 }), { status: 200 })
    )

    const { result } = renderHook(() => useKV<number>('counter', 0))

    await waitFor(() => expect(result.current[2]).toBe(true))

    act(() => {
      result.current[1]((prev) => (prev || 0) + 5)
    })

    expect(result.current[0]).toBe(15)
  })

  it('does not POST to KV before initial load completes', async () => {
    let resolveApi: ((v: Response) => void) | undefined
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation((url) => {
      if (typeof url === 'string' && url.includes('/api/kv?')) {
        return new Promise((res) => { resolveApi = res })
      }
      return Promise.resolve(new Response(JSON.stringify({ success: true }), { status: 200 }))
    })

    const { result } = renderHook(() => useKV('race-key', 'default'))

    // Update BEFORE load completes
    act(() => {
      result.current[1]('premature-update')
    })

    // Only the initial GET should have been called, no POST
    const postCalls = fetchSpy.mock.calls.filter(
      (call) => call[1] && (call[1] as RequestInit).method === 'POST'
    )
    expect(postCalls).toHaveLength(0)

    // Now resolve the initial load
    resolveApi!(new Response(JSON.stringify({ value: 'real-data' }), { status: 200 }))

    await waitFor(() => expect(result.current[2]).toBe(true))
  })

  it('sends x-session-token and credentials on authenticated POST', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ value: 'data' }), { status: 200 })
    )

    localStorage.setItem('admin-token', 'my-session-token')

    const { result } = renderHook(() => useKV('auth-key', 'default'))
    await waitFor(() => expect(result.current[2]).toBe(true))

    act(() => { result.current[1]('new-value') })

    await waitFor(() => {
      const postCalls = fetchSpy.mock.calls.filter(
        (call) => call[1] && (call[1] as RequestInit).method === 'POST'
      )
      expect(postCalls).toHaveLength(1)
      const opts = postCalls[0][1] as RequestInit
      const headers = opts.headers as Record<string, string>
      expect(headers['x-session-token']).toBe('my-session-token')
      expect(opts.credentials).toBe('same-origin')
    })
  })

  it('does not POST when no admin token is present', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ value: 'data' }), { status: 200 })
    )

    localStorage.removeItem('admin-token')

    const { result } = renderHook(() => useKV('no-auth-key', 'default'))
    await waitFor(() => expect(result.current[2]).toBe(true))

    act(() => { result.current[1]('new-value') })

    const postCalls = fetchSpy.mock.calls.filter(
      (call) => call[1] && (call[1] as RequestInit).method === 'POST'
    )
    expect(postCalls).toHaveLength(0)
  })

  it('handles non-200 GET response gracefully', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('Server Error', { status: 500 })
    )

    const { result } = renderHook(() => useKV('server-error-key', 'fallback'))
    await waitFor(() => expect(result.current[2]).toBe(true))
    expect(result.current[0]).toBe('fallback')
  })

  it('loads from localStorage when API returns null', async () => {
    const localData = { name: 'ZARDONIC', source: 'localStorage' }
    localStorage.setItem('kv:local-fallback-key', JSON.stringify(localData))

    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ value: null }), { status: 200 })
    )

    const { result } = renderHook(() => useKV('local-fallback-key', { name: '', source: '' }))
    await waitFor(() => expect(result.current[2]).toBe(true))
    expect(result.current[0]).toEqual(localData)
  })

  it('loads from localStorage when API fails', async () => {
    const localData = { offline: true }
    localStorage.setItem('kv:offline-key', JSON.stringify(localData))

    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network error'))

    const { result } = renderHook(() => useKV('offline-key', { offline: false }))
    await waitFor(() => expect(result.current[2]).toBe(true))
    expect(result.current[0]).toEqual(localData)
  })

  it('saves to localStorage immediately on update', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ value: 'initial' }), { status: 200 })
    )

    const { result } = renderHook(() => useKV('save-test-key', 'default'))
    await waitFor(() => expect(result.current[2]).toBe(true))

    act(() => {
      result.current[1]('updated-value')
    })

    expect(result.current[0]).toBe('updated-value')
    const savedData = localStorage.getItem('kv:save-test-key')
    expect(savedData).toBe(JSON.stringify('updated-value'))
  })

  it('syncs localStorage with API data on successful fetch', async () => {
    const apiData = { source: 'api', synced: true }
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ value: apiData }), { status: 200 })
    )

    const { result } = renderHook(() => useKV('sync-key', { source: '', synced: false }))
    await waitFor(() => expect(result.current[2]).toBe(true))
    
    expect(result.current[0]).toEqual(apiData)
    const savedData = localStorage.getItem('kv:sync-key')
    expect(savedData).toBe(JSON.stringify(apiData))
  })
})
