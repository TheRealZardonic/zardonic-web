import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fetchBandsintownEvents } from '../lib/bandsintown'

/**
 * Test gig display using the exact Bandsintown API structure
 * This ensures that the gig display works correctly with real API responses
 */
describe('Gig display with real Bandsintown API structure', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('should correctly parse and display the exact Bandsintown API response', async () => {
    // Exact structure from Bandsintown API as provided in the issue
    const bandsintownApiResponse = [
      {
        "offers": [
          {
            "type": "Tickets",
            "url": "https://www.bandsintown.com/t/1037947501?app_id=3f27e39d51d64514d466e1eb7422cb07&came_from=267&utm_medium=api&utm_source=public_api&utm_campaign=ticket",
            "status": "available"
          }
        ],
        "venue": {
          "street_address": "Plynární 1634/7",
          "country": "Czech Republic",
          "city": "Ostrava",
          "latitude": "49.8333333",
          "name": "Fabric",
          "location": "Ostrava, Czech Republic",
          "postal_code": "702 00",
          "region": "",
          "longitude": "18.2833333"
        },
        "starts_at": "2026-03-06T21:00:00",
        "artist": {
          "thumb_url": "https://photos.bandsintown.com/thumb/16762319.jpeg",
          "mbid": "993a72cf-d48c-446a-a6f6-97b2b7ea3831",
          "facebook_page_url": "http://www.facebook.com/185409924829123",
          "image_url": "https://photos.bandsintown.com/large/16762319.jpeg",
          "tracker_count": 22488,
          "tracking": [],
          "upcoming_event_count": 3,
          "url": "https://www.bandsintown.com/a/372971?came_from=267&app_id=3f27e39d51d64514d466e1eb7422cb07",
          "support_url": "",
          "show_multi_ticket": true,
          "name": "Zardonic",
          "options": {
            "display_listen_unit": false
          },
          "links": [
            {
              "type": "vkontakte",
              "url": "zardonicofficial"
            },
            {
              "type": "website",
              "url": "http://www.zardonic.net/epk"
            },
            {
              "type": "shazam",
              "url": "https://www.shazam.com/artist/-/184996964?utm_source=bandsintown"
            },
            {
              "type": "youtube",
              "url": "djzardonic"
            },
            {
              "type": "amazon",
              "url": "https://music.amazon.com/artists/B000RSG2JI"
            },
            {
              "type": "itunes",
              "url": "https://music.apple.com/artist/184996964?utm_source=bandsintown"
            },
            {
              "type": "snapchat",
              "url": "djzardonic"
            },
            {
              "type": "spotify",
              "url": "https://open.spotify.com/artist/7BqEidErPMNiUXCRE0dV2n?utm_source=bandsintown"
            },
            {
              "type": "soundcloud",
              "url": "zardonic"
            },
            {
              "type": "twitter",
              "url": "zardonic"
            },
            {
              "type": "instagram",
              "url": "djzardonic"
            },
            {
              "type": "facebook",
              "url": "https://www.facebook.com/zardonic/"
            }
          ],
          "artist_optin_show_phone_number": false,
          "id": "372971"
        },
        "festival_datetime_display_rule": "",
        "description": "",
        "lineup": [
          "Zardonic",
          "DJ Bones",
          "Teya",
          "Shmidoo",
          "Qo",
          "Symplex",
          "JOSHU4"
        ],
        "festival_start_date": "",
        "bandsintown_plus": false,
        "title": "",
        "artist_id": "372971",
        "presale": "",
        "url": "https://www.bandsintown.com/e/1037947501?app_id=3f27e39d51d64514d466e1eb7422cb07&came_from=267&utm_medium=api&utm_source=public_api&utm_campaign=event",
        "datetime_display_rule": "datetime",
        "datetime": "2026-03-06T21:00:00",
        "on_sale_datetime": "2026-02-06T00:00:00",
        "sold_out": false,
        "id": "1037947501",
        "ends_at": "",
        "free": false,
        "festival_end_date": ""
      },
      {
        "offers": [
          {
            "type": "Tickets",
            "url": "https://www.bandsintown.com/t/1037907422?app_id=3f27e39d51d64514d466e1eb7422cb07&came_from=267&utm_medium=api&utm_source=public_api&utm_campaign=ticket",
            "status": "available"
          }
        ],
        "venue": {
          "street_address": "Plynární 1096/23",
          "country": "Czech Republic",
          "city": "Prague",
          "latitude": "50.108181",
          "name": "Cross Club",
          "location": "Prague, Czech Republic",
          "postal_code": "170 00",
          "region": "",
          "longitude": "14.4431801"
        },
        "starts_at": "2026-04-24T21:00:00",
        "festival_datetime_display_rule": "",
        "description": "",
        "lineup": [
          "Zardonic",
          "T-Virus",
          "Mantis",
          "Reeve",
          "Ill Fated",
          "Illya",
          "The Duplicates",
          "VirCZ",
          "Dogzan",
          "Shandrill",
          "Spiritual"
        ],
        "festival_start_date": "",
        "bandsintown_plus": false,
        "title": "",
        "artist_id": "372971",
        "presale": "",
        "url": "https://www.bandsintown.com/e/1037907422?app_id=3f27e39d51d64514d466e1eb7422cb07&came_from=267&utm_medium=api&utm_source=public_api&utm_campaign=event",
        "datetime_display_rule": "datetime",
        "datetime": "2026-04-24T21:00:00",
        "on_sale_datetime": "2026-02-03T00:00:00",
        "sold_out": false,
        "id": "1037907422",
        "ends_at": "",
        "free": false,
        "festival_end_date": ""
      },
      {
        "offers": [
          {
            "type": "Tickets",
            "url": "https://www.bandsintown.com/t/1037995121?app_id=3f27e39d51d64514d466e1eb7422cb07&came_from=267&utm_medium=api&utm_source=public_api&utm_campaign=ticket",
            "status": "available"
          }
        ],
        "venue": {
          "street_address": "Lindava 315",
          "country": "Czechia",
          "city": "Cvikov",
          "latitude": "50.77668",
          "name": "Pekelné doly",
          "location": "Cvikov, Czechia",
          "postal_code": "",
          "region": "",
          "longitude": "14.63298"
        },
        "starts_at": "2026-05-16T20:00:00",
        "festival_datetime_display_rule": "",
        "description": "",
        "lineup": [
          "Zardonic",
          "Drax",
          "Cockroach",
          "Kayra",
          "Kaira",
          "RAIDO",
          "Shmidoo",
          "DAEV",
          "Kaama",
          "Kletis",
          "SIREN",
          "KARPA",
          "Prdk",
          "Zigi SC"
        ],
        "festival_start_date": "",
        "bandsintown_plus": false,
        "title": "",
        "artist_id": "372971",
        "presale": "",
        "url": "https://www.bandsintown.com/e/1037995121?app_id=3f27e39d51d64514d466e1eb7422cb07&came_from=267&utm_medium=api&utm_source=public_api&utm_campaign=event",
        "datetime_display_rule": "datetime",
        "datetime": "2026-05-16T20:00:00",
        "on_sale_datetime": "2026-01-13T19:24:58",
        "sold_out": false,
        "id": "1037995121",
        "ends_at": "",
        "free": false,
        "festival_end_date": ""
      }
    ]

    // Mock fetch to return the exact API response
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(bandsintownApiResponse),
    })

    // Fetch events
    const result = await fetchBandsintownEvents()

    // Verify that we got 3 events
    expect(result).toHaveLength(3)

    // Verify first event (Fabric, Ostrava)
    expect(result[0]).toEqual({
      id: 'bit-1037947501',
      venue: 'Fabric',
      location: 'Ostrava, Czech Republic',
      date: '2026-03-06',
      startsAt: '2026-03-06T21:00:00',
      ticketUrl: 'https://www.bandsintown.com/t/1037947501?app_id=3f27e39d51d64514d466e1eb7422cb07&came_from=267&utm_medium=api&utm_source=public_api&utm_campaign=ticket',
      lineup: [
        "Zardonic",
        "DJ Bones",
        "Teya",
        "Shmidoo",
        "Qo",
        "Symplex",
        "JOSHU4"
      ],
      streetAddress: "Plynární 1634/7",
      postalCode: "702 00",
      latitude: "49.8333333",
      longitude: "18.2833333",
      soldOut: false,
      description: undefined,
      title: undefined,
    })

    // Verify second event (Cross Club, Prague)
    expect(result[1]).toEqual({
      id: 'bit-1037907422',
      venue: 'Cross Club',
      location: 'Prague, Czech Republic',
      date: '2026-04-24',
      startsAt: '2026-04-24T21:00:00',
      ticketUrl: 'https://www.bandsintown.com/t/1037907422?app_id=3f27e39d51d64514d466e1eb7422cb07&came_from=267&utm_medium=api&utm_source=public_api&utm_campaign=ticket',
      lineup: [
        "Zardonic",
        "T-Virus",
        "Mantis",
        "Reeve",
        "Ill Fated",
        "Illya",
        "The Duplicates",
        "VirCZ",
        "Dogzan",
        "Shandrill",
        "Spiritual"
      ],
      streetAddress: "Plynární 1096/23",
      postalCode: "170 00",
      latitude: "50.108181",
      longitude: "14.4431801",
      soldOut: false,
      description: undefined,
      title: undefined,
    })

    // Verify third event (Pekelné doly, Cvikov)
    expect(result[2]).toEqual({
      id: 'bit-1037995121',
      venue: 'Pekelné doly',
      location: 'Cvikov, Czechia',
      date: '2026-05-16',
      startsAt: '2026-05-16T20:00:00',
      ticketUrl: 'https://www.bandsintown.com/t/1037995121?app_id=3f27e39d51d64514d466e1eb7422cb07&came_from=267&utm_medium=api&utm_source=public_api&utm_campaign=ticket',
      lineup: [
        "Zardonic",
        "Drax",
        "Cockroach",
        "Kayra",
        "Kaira",
        "RAIDO",
        "Shmidoo",
        "DAEV",
        "Kaama",
        "Kletis",
        "SIREN",
        "KARPA",
        "Prdk",
        "Zigi SC"
      ],
      streetAddress: "Lindava 315",
      postalCode: undefined,
      latitude: "50.77668",
      longitude: "14.63298",
      soldOut: false,
      description: undefined,
      title: undefined,
    })
  })

  it('should handle venue with empty region field correctly', async () => {
    const bandsintownApiResponse = [
      {
        "id": "1037947501",
        "venue": {
          "name": "Fabric",
          "city": "Ostrava",
          "region": "",
          "country": "Czech Republic",
        },
        "datetime": "2026-03-06T21:00:00",
        "lineup": ["Zardonic"],
      }
    ]

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(bandsintownApiResponse),
    })

    const result = await fetchBandsintownEvents()

    expect(result[0].location).toBe('Ostrava, Czech Republic')
    expect(result[0].venue).toBe('Fabric')
  })

  it('should extract ticket URL from offers array', async () => {
    const bandsintownApiResponse = [
      {
        "id": "1037947501",
        "offers": [
          {
            "type": "Tickets",
            "url": "https://www.bandsintown.com/t/1037947501",
            "status": "available"
          }
        ],
        "venue": {
          "name": "Test Venue",
          "city": "Test City",
          "country": "Test Country",
        },
        "datetime": "2026-03-06T21:00:00",
        "url": "https://www.bandsintown.com/e/1037947501",
      }
    ]

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(bandsintownApiResponse),
    })

    const result = await fetchBandsintownEvents()

    // Should prioritize offers[0].url over url
    expect(result[0].ticketUrl).toBe('https://www.bandsintown.com/t/1037947501')
  })

  it('should use event url if offers is missing', async () => {
    const bandsintownApiResponse = [
      {
        "id": "1037947501",
        "venue": {
          "name": "Test Venue",
          "city": "Test City",
          "country": "Test Country",
        },
        "datetime": "2026-03-06T21:00:00",
        "url": "https://www.bandsintown.com/e/1037947501",
      }
    ]

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(bandsintownApiResponse),
    })

    const result = await fetchBandsintownEvents()

    expect(result[0].ticketUrl).toBe('https://www.bandsintown.com/e/1037947501')
  })

  it('should preserve all lineup members', async () => {
    const bandsintownApiResponse = [
      {
        "id": "1037947501",
        "venue": {
          "name": "Test Venue",
          "city": "Test City",
          "country": "Test Country",
        },
        "datetime": "2026-03-06T21:00:00",
        "lineup": [
          "Zardonic",
          "DJ Bones",
          "Teya",
          "Shmidoo",
          "Qo",
          "Symplex",
          "JOSHU4"
        ],
      }
    ]

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(bandsintownApiResponse),
    })

    const result = await fetchBandsintownEvents()

    expect(result[0].lineup).toHaveLength(7)
    expect(result[0].lineup).toContain('Zardonic')
    expect(result[0].lineup).toContain('DJ Bones')
    expect(result[0].lineup).toContain('JOSHU4')
  })

  it('should handle sold_out flag correctly', async () => {
    const bandsintownApiResponse = [
      {
        "id": "1037947501",
        "venue": {
          "name": "Test Venue",
          "city": "Test City",
          "country": "Test Country",
        },
        "datetime": "2026-03-06T21:00:00",
        "sold_out": true,
      }
    ]

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(bandsintownApiResponse),
    })

    const result = await fetchBandsintownEvents()

    expect(result[0].soldOut).toBe(true)
  })

  it('should parse date from datetime field correctly', async () => {
    const bandsintownApiResponse = [
      {
        "id": "1037947501",
        "venue": {
          "name": "Test Venue",
          "city": "Test City",
          "country": "Test Country",
        },
        "datetime": "2026-03-06T21:00:00",
      }
    ]

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(bandsintownApiResponse),
    })

    const result = await fetchBandsintownEvents()

    expect(result[0].date).toBe('2026-03-06')
    expect(result[0].startsAt).toBe('2026-03-06T21:00:00')
  })

  it('should prioritize starts_at over datetime', async () => {
    const bandsintownApiResponse = [
      {
        "id": "1037947501",
        "venue": {
          "name": "Test Venue",
          "city": "Test City",
          "country": "Test Country",
        },
        "starts_at": "2026-03-06T21:00:00",
        "datetime": "2026-03-06T20:00:00",
      }
    ]

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(bandsintownApiResponse),
    })

    const result = await fetchBandsintownEvents()

    expect(result[0].startsAt).toBe('2026-03-06T21:00:00')
  })

  it('should include street address and postal code', async () => {
    const bandsintownApiResponse = [
      {
        "id": "1037947501",
        "venue": {
          "name": "Fabric",
          "city": "Ostrava",
          "country": "Czech Republic",
          "street_address": "Plynární 1634/7",
          "postal_code": "702 00",
        },
        "datetime": "2026-03-06T21:00:00",
      }
    ]

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(bandsintownApiResponse),
    })

    const result = await fetchBandsintownEvents()

    expect(result[0].streetAddress).toBe('Plynární 1634/7')
    expect(result[0].postalCode).toBe('702 00')
  })

  it('should include latitude and longitude', async () => {
    const bandsintownApiResponse = [
      {
        "id": "1037947501",
        "venue": {
          "name": "Fabric",
          "city": "Ostrava",
          "country": "Czech Republic",
          "latitude": "49.8333333",
          "longitude": "18.2833333",
        },
        "datetime": "2026-03-06T21:00:00",
      }
    ]

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(bandsintownApiResponse),
    })

    const result = await fetchBandsintownEvents()

    expect(result[0].latitude).toBe('49.8333333')
    expect(result[0].longitude).toBe('18.2833333')
  })

  it('should handle description and title fields', async () => {
    const bandsintownApiResponse = [
      {
        "id": "1037947501",
        "venue": {
          "name": "Test Venue",
          "city": "Test City",
          "country": "Test Country",
        },
        "datetime": "2026-03-06T21:00:00",
        "description": "Special event",
        "title": "Zardonic Live",
      }
    ]

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(bandsintownApiResponse),
    })

    const result = await fetchBandsintownEvents()

    expect(result[0].description).toBe('Special event')
    expect(result[0].title).toBe('Zardonic Live')
  })

  it('should handle empty description and title', async () => {
    const bandsintownApiResponse = [
      {
        "id": "1037947501",
        "venue": {
          "name": "Test Venue",
          "city": "Test City",
          "country": "Test Country",
        },
        "datetime": "2026-03-06T21:00:00",
        "description": "",
        "title": "",
      }
    ]

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(bandsintownApiResponse),
    })

    const result = await fetchBandsintownEvents()

    // Empty strings are converted to undefined (this is intentional behavior)
    expect(result[0].description).toBeUndefined()
    expect(result[0].title).toBeUndefined()
  })
})
