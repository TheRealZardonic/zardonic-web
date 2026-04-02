import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { usePublishedContent } from '@/hooks/usePublishedContent'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'

const mockFetch = vi.fn()
global.fetch = mockFetch

function makeWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
    },
  })
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children)
  }
}

beforeEach(() => {
  mockFetch.mockReset()
})

describe('usePublishedContent', () => {
  it('returns fallback while loading', () => {
    mockFetch.mockImplementation(() => new Promise(() => {})) // never resolves
    const { result } = renderHook(
      () => usePublishedContent('zd-cms:hero', { headline: 'fallback' }),
      { wrapper: makeWrapper() }
    )
    expect(result.current).toEqual({ headline: 'fallback' })
  })

  it('returns published content when fetch succeeds', async () => {
    const published = { headline: 'Live Content' }
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ value: published, source: 'published' }),
    })
    const { result } = renderHook(
      () => usePublishedContent<{ headline: string }>('zd-cms:hero', { headline: 'fallback' }),
      { wrapper: makeWrapper() }
    )
    await act(async () => {
      await new Promise(r => setTimeout(r, 100))
    })
    expect(result.current).toEqual(published)
  })

  it('returns fallback when fetch fails (non-ok response)', async () => {
    mockFetch.mockResolvedValue({ ok: false })
    const fallback = { headline: 'Default Hero' }
    const { result } = renderHook(
      () => usePublishedContent<{ headline: string }>('zd-cms:hero', fallback),
      { wrapper: makeWrapper() }
    )
    await act(async () => {
      await new Promise(r => setTimeout(r, 100))
    })
    expect(result.current).toEqual(fallback)
  })

  it('returns fallback when response value is null', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ value: null, source: 'none' }),
    })
    const fallback = { headline: 'Default' }
    const { result } = renderHook(
      () => usePublishedContent<{ headline: string }>('zd-cms:hero', fallback),
      { wrapper: makeWrapper() }
    )
    await act(async () => {
      await new Promise(r => setTimeout(r, 100))
    })
    expect(result.current).toEqual(fallback)
  })

  it('calls fetch with correct endpoint and draft=false', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ value: null, source: 'none' }),
    })
    renderHook(
      () => usePublishedContent('zd-cms:bio', {}),
      { wrapper: makeWrapper() }
    )
    await act(async () => { await new Promise(r => setTimeout(r, 50)) })
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/cms/content'),
      expect.objectContaining({ credentials: 'include' })
    )
    const url: string = (mockFetch.mock.calls[0] as [string])[0]
    expect(url).toContain('key=zd-cms%3Abio')
    expect(url).toContain('draft=false')
  })

  it('returns fallback when network throws', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'))
    const fallback = { title: 'Fallback' }
    const { result } = renderHook(
      () => usePublishedContent<{ title: string }>('zd-cms:releases', fallback),
      { wrapper: makeWrapper() }
    )
    await act(async () => {
      await new Promise(r => setTimeout(r, 150))
    })
    expect(result.current).toEqual(fallback)
  })
})
