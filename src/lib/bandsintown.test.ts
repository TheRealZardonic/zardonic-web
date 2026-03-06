import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fetchBandsintownEvents } from './bandsintown'

describe('fetchBandsintownEvents', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('should fetch and parse events from proxy', async () => {
    const mockData = [
      {
        id: '101',
        venue: { name: 'Club Voltage', city: 'Berlin', region: 'BE', country: 'Germany' },
        datetime: '2025-03-15T20:00:00',
        url: 'https://bandsintown.com/e/101',
        lineup: ['Zardonic', 'Support Act'],
      },
    ]

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockData),
    })

    const result = await fetchBandsintownEvents()

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/bandsintown?')
    )
    expect(result).toHaveLength(1)
    expect(result[0]).toEqual({
      id: 'bit-101',
      venue: 'Club Voltage',
      location: 'Berlin, BE, Germany',
      date: '2025-03-15',
      startsAt: '2025-03-15T20:00:00',
      ticketUrl: 'https://bandsintown.com/e/101',
      lineup: ['Zardonic', 'Support Act'],
      streetAddress: undefined,
      postalCode: undefined,
      latitude: undefined,
      longitude: undefined,
      soldOut: false,
      description: undefined,
      title: undefined,
    })
  })

  it('should return empty array when API returns non-ok response', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
    })

    const result = await fetchBandsintownEvents()
    expect(result).toEqual([])
  })

  it('should return empty array when fetch throws', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'))

    const result = await fetchBandsintownEvents()
    expect(result).toEqual([])
  })

  it('should return empty array when response is not an array', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ error: 'not found' }),
    })

    const result = await fetchBandsintownEvents()
    expect(result).toEqual([])
  })

  it('should handle missing venue data gracefully', async () => {
    const mockData = [
      {
        id: '202',
        venue: {},
        datetime: '2025-06-01T21:00:00',
        url: null,
        lineup: [],
      },
    ]

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockData),
    })

    const result = await fetchBandsintownEvents()
    expect(result[0].venue).toBe('TBA')
    expect(result[0].location).toBe('')
    expect(result[0].ticketUrl).toBeUndefined()
  })

  it('should handle missing datetime gracefully', async () => {
    const mockData = [
      {
        id: '303',
        venue: { name: 'Some Venue', city: 'London', country: 'UK' },
        url: 'https://bandsintown.com/e/303',
        lineup: ['Zardonic'],
      },
    ]

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockData),
    })

    const result = await fetchBandsintownEvents()
    expect(result[0].date).toBe('')
  })
})
