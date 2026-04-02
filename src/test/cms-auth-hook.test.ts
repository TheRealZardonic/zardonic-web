import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useCmsAuth } from '@/cms/hooks/useCmsAuth'

const mockFetch = vi.fn()
global.fetch = mockFetch

beforeEach(() => {
  mockFetch.mockReset()
})

describe('useCmsAuth', () => {
  it('starts in loading state', () => {
    mockFetch.mockImplementation(() => new Promise(() => {}))
    const { result } = renderHook(() => useCmsAuth())
    expect(result.current.isLoading).toBe(true)
    expect(result.current.isAuthenticated).toBe(false)
  })

  it('sets isAuthenticated to true when session is valid', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ authenticated: true, needsSetup: false, totpEnabled: false }),
    })
    const { result } = renderHook(() => useCmsAuth())
    await act(async () => {
      await new Promise(r => setTimeout(r, 50))
    })
    expect(result.current.isLoading).toBe(false)
    expect(result.current.isAuthenticated).toBe(true)
  })

  it('sets isAuthenticated to false when session is invalid', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ authenticated: false, needsSetup: false, totpEnabled: false }),
    })
    const { result } = renderHook(() => useCmsAuth())
    await act(async () => {
      await new Promise(r => setTimeout(r, 50))
    })
    expect(result.current.isLoading).toBe(false)
    expect(result.current.isAuthenticated).toBe(false)
  })

  it('sets isAuthenticated to false when API returns non-ok', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false })
    const { result } = renderHook(() => useCmsAuth())
    await act(async () => {
      await new Promise(r => setTimeout(r, 50))
    })
    expect(result.current.isAuthenticated).toBe(false)
    expect(result.current.isLoading).toBe(false)
  })

  it('handles network error gracefully', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'))
    const { result } = renderHook(() => useCmsAuth())
    await act(async () => {
      await new Promise(r => setTimeout(r, 50))
    })
    expect(result.current.isAuthenticated).toBe(false)
    expect(result.current.isLoading).toBe(false)
  })

  it('logout calls DELETE /api/auth and clears authentication', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ authenticated: true }),
      })
      .mockResolvedValueOnce({ ok: true })

    const { result } = renderHook(() => useCmsAuth())
    await act(async () => { await new Promise(r => setTimeout(r, 50)) })
    expect(result.current.isAuthenticated).toBe(true)

    await act(async () => { await result.current.logout() })
    expect(mockFetch).toHaveBeenCalledWith('/api/auth', expect.objectContaining({ method: 'DELETE' }))
    expect(result.current.isAuthenticated).toBe(false)
  })

  it('logout handles network errors gracefully', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ authenticated: true }),
      })
      .mockRejectedValueOnce(new Error('Network error'))

    const { result } = renderHook(() => useCmsAuth())
    await act(async () => { await new Promise(r => setTimeout(r, 50)) })
    // Should not throw even on network error
    await act(async () => { await result.current.logout() })
    expect(result.current.isLoading).toBe(false)
  })

  it('calls /api/auth with credentials include', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ authenticated: false }),
    })
    renderHook(() => useCmsAuth())
    await act(async () => { await new Promise(r => setTimeout(r, 50)) })
    expect(mockFetch).toHaveBeenCalledWith('/api/auth', expect.objectContaining({ credentials: 'include' }))
  })
})
