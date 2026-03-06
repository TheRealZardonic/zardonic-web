import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { getSyncTimestamps, updateReleasesSync, updateGigsSync } from './sync'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function mockFetchOk(body: unknown) {
  return vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve(body),
  } as unknown as Response)
}

// ---------------------------------------------------------------------------

describe('getSyncTimestamps', () => {
  afterEach(() => { vi.restoreAllMocks() })

  it('returns timestamps from API on success', async () => {
    const fetchMock = mockFetchOk({ lastReleasesSync: 1000, lastGigsSync: 2000 })
    vi.spyOn(globalThis, 'fetch').mockImplementation(fetchMock)
    const result = await getSyncTimestamps()
    expect(result).toEqual({ lastReleasesSync: 1000, lastGigsSync: 2000 })
    expect(fetchMock).toHaveBeenCalledWith('/api/sync')
  })

  it('returns zeroed timestamps when fetch fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('network error'))
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const result = await getSyncTimestamps()
    expect(result).toEqual({ lastReleasesSync: 0, lastGigsSync: 0 })
    consoleSpy.mockRestore()
  })

  it('returns zeroed timestamps when API returns non-ok status', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      status: 503,
    } as unknown as Response)
    const result = await getSyncTimestamps()
    expect(result).toEqual({ lastReleasesSync: 0, lastGigsSync: 0 })
  })
})

// ---------------------------------------------------------------------------

describe('updateReleasesSync', () => {
  afterEach(() => { vi.restoreAllMocks() })

  it('POSTs to /api/sync with lastReleasesSync and credentials: same-origin', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true } as Response)
    vi.spyOn(globalThis, 'fetch').mockImplementation(fetchMock)
    const ts = 1708000000000
    await updateReleasesSync(ts)

    expect(fetchMock).toHaveBeenCalledWith('/api/sync', expect.objectContaining({
      method: 'POST',
      credentials: 'same-origin',
      body: JSON.stringify({ lastReleasesSync: ts }),
    }))
  })

  it('uses Date.now() as default timestamp', async () => {
    const now = Date.now()
    const fetchMock = vi.fn().mockResolvedValue({ ok: true } as Response)
    vi.spyOn(globalThis, 'fetch').mockImplementation(fetchMock)
    await updateReleasesSync()

    const body = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string)
    expect(body.lastReleasesSync).toBeGreaterThanOrEqual(now)
  })

  it('swallows network errors silently', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('network error'))
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    await expect(updateReleasesSync()).resolves.not.toThrow()
    consoleSpy.mockRestore()
  })
})

// ---------------------------------------------------------------------------

describe('updateGigsSync', () => {
  afterEach(() => { vi.restoreAllMocks() })

  it('POSTs to /api/sync with lastGigsSync and credentials: same-origin', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true } as Response)
    vi.spyOn(globalThis, 'fetch').mockImplementation(fetchMock)
    const ts = 1708000099999
    await updateGigsSync(ts)

    expect(fetchMock).toHaveBeenCalledWith('/api/sync', expect.objectContaining({
      method: 'POST',
      credentials: 'same-origin',
      body: JSON.stringify({ lastGigsSync: ts }),
    }))
  })

  it('uses Date.now() as default timestamp', async () => {
    const now = Date.now()
    const fetchMock = vi.fn().mockResolvedValue({ ok: true } as Response)
    vi.spyOn(globalThis, 'fetch').mockImplementation(fetchMock)
    await updateGigsSync()

    const body = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string)
    expect(body.lastGigsSync).toBeGreaterThanOrEqual(now)
  })

  it('swallows network errors silently', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('network error'))
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    await expect(updateGigsSync()).resolves.not.toThrow()
    consoleSpy.mockRestore()
  })
})
