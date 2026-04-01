import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useKV } from '@/hooks/use-kv'

/**
 * Test to reproduce the Bandsintown gigs not appearing after sync issue
 */
describe('Bandsintown sync issue', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should update gigs when setSiteData is called with updater function', async () => {
    // Mock API to return initial data
    const initialData = {
      artistName: 'ZARDONIC',
      gigs: [
        { id: '1', venue: 'Venue 1', location: 'City 1', date: '2025-01-01', ticketUrl: '', support: '', lineup: [] },
      ],
    }
    
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ value: initialData }), { status: 200 })
    )

    const { result } = renderHook(() => useKV('zardonic-site-data', { artistName: '', gigs: [] as Array<{ id: string; venue: string; location: string; date: string; ticketUrl: string; support: string; lineup: string[] }> }))

    // Wait for initial load
    await waitFor(() => expect(result.current[2]).toBe(true))
    expect(result.current[0]).toEqual(initialData)

    // Simulate Bandsintown sync: call setSiteData with updater function
    act(() => {
      const setSiteData = result.current[1]
      setSiteData((data) => {
        // This is the pattern used in handleFetchBandsintownEvents
        if (!data) return data as any // This is the bug!
        
        const newGigs = [
          { id: 'bit-123', venue: 'New Venue', location: 'New City', date: '2025-02-01', ticketUrl: '', support: '', lineup: [] },
        ]
        
        return { ...data, gigs: [...data.gigs, ...newGigs] }
      })
    })

    // Wait for update
    await waitFor(() => {
      expect(result.current[0]?.gigs.length).toBe(2)
    })
    
    expect(result.current[0]?.gigs).toHaveLength(2)
    expect(result.current[0]?.gigs[1].id).toBe('bit-123')
  })

  it('should handle the case where data is undefined during update', async () => {
    // Mock API to return null initially
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ value: null }), { status: 200 })
    )

    const defaultData = { artistName: '', gigs: [] as Array<{ id: string; venue: string; location: string; date: string; ticketUrl: string; support: string; lineup: string[] }> }
    const { result } = renderHook(() => useKV('zardonic-site-data', defaultData))

    // Wait for initial load (should use default value)
    await waitFor(() => expect(result.current[2]).toBe(true))
    expect(result.current[0]).toEqual(defaultData)

    // Now try to update with new gigs
    act(() => {
      const setSiteData = result.current[1]
      setSiteData((data) => {
        if (!data) return data as any // Bug: returns undefined
        
        const newGigs = [
          { id: 'bit-123', venue: 'New Venue', location: 'New City', date: '2025-02-01', ticketUrl: '', support: '', lineup: [] },
        ]
        
        return { ...data, gigs: [...data.gigs, ...newGigs] }
      })
    })

    // The update should work even if data was initially undefined
    await waitFor(() => {
      expect(result.current[0]?.gigs.length).toBe(1)
    })
    
    expect(result.current[0]?.gigs).toHaveLength(1)
  })
})
