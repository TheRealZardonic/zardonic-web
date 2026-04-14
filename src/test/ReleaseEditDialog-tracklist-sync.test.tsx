/**
 * Tests for the tracklist sync + undo feature in ReleaseEditDialog.
 *
 * Verifies:
 *  - "Sync Tracklist" button appears in edit mode (release with id)
 *  - Clicking it calls the enrichment endpoint and updates the track list
 *  - "Undo" button appears after a sync and restores the previous track list
 *  - Multiple undo levels work correctly (stack-based)
 *  - Toast is shown when no tracklist is found
 *  - Error handling shows error toast
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import ReleaseEditDialog from '@/components/ReleaseEditDialog'
import type { Release } from '@/lib/types'

// ── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('@/lib/odesli', () => ({
  fetchOdesliLinks: vi.fn().mockResolvedValue(null),
}))

const mockToastSuccess = vi.fn()
const mockToastError = vi.fn()
const mockToastInfo = vi.fn()
vi.mock('sonner', () => ({
  toast: {
    success: (...args: unknown[]) => mockToastSuccess(...args),
    error: (...args: unknown[]) => mockToastError(...args),
    info: (...args: unknown[]) => mockToastInfo(...args),
  },
}))

// ── Fixtures ─────────────────────────────────────────────────────────────────

const BASE_RELEASE: Release = {
  id: 'release-123',
  title: 'Antihero',
  artwork: 'https://example.com/art.jpg',
  year: '2023',
  releaseDate: '2023-03-15',
  type: 'album',
  tracks: [
    { title: 'Old Track 1', duration: '3:00' },
    { title: 'Old Track 2', duration: '4:30' },
  ],
}

const SYNCED_TRACKS = [
  { title: 'Synced Track A', duration: '2:45' },
  { title: 'Synced Track B', duration: '3:20' },
  { title: 'Synced Track C', duration: '5:10' },
]

// ── Helper ───────────────────────────────────────────────────────────────────

function renderDialog(release: Release | null = BASE_RELEASE) {
  const onSave = vi.fn()
  const onClose = vi.fn()
  render(<ReleaseEditDialog release={release} onSave={onSave} onClose={onClose} />)
  return { onSave, onClose }
}

function mockFetchSuccess(tracks: typeof SYNCED_TRACKS) {
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ release: { tracks } }),
  })
}

function mockFetchNoTracks() {
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ release: { tracks: [] } }),
  })
}

function mockFetchError(errorMsg = 'MusicBrainz timeout') {
  global.fetch = vi.fn().mockResolvedValue({
    ok: false,
    json: async () => ({ error: errorMsg }),
  })
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('ReleaseEditDialog — tracklist sync', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders "Sync Tracklist" button when editing an existing release', () => {
    renderDialog()
    expect(screen.getByRole('button', { name: /sync tracklist/i })).toBeInTheDocument()
  })

  it('does NOT render "Sync Tracklist" button when creating a new release (no id)', () => {
    renderDialog({ ...BASE_RELEASE, id: '' })
    expect(screen.queryByRole('button', { name: /sync tracklist/i })).not.toBeInTheDocument()
  })

  it('shows existing tracks before any sync', () => {
    renderDialog()
    expect(screen.getByDisplayValue('Old Track 1')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Old Track 2')).toBeInTheDocument()
  })

  it('replaces tracks with synced data and shows success toast', async () => {
    mockFetchSuccess(SYNCED_TRACKS)
    renderDialog()

    fireEvent.click(screen.getByRole('button', { name: /sync tracklist/i }))

    await waitFor(() => {
      expect(screen.getByDisplayValue('Synced Track A')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Synced Track B')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Synced Track C')).toBeInTheDocument()
    })

    expect(mockToastSuccess).toHaveBeenCalledWith(expect.stringMatching(/3 tracks/i))
    // Old tracks must be gone
    expect(screen.queryByDisplayValue('Old Track 1')).not.toBeInTheDocument()
  })

  it('shows "Undo" button after a successful sync', async () => {
    mockFetchSuccess(SYNCED_TRACKS)
    renderDialog()

    expect(screen.queryByRole('button', { name: /undo/i })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /sync tracklist/i }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /undo/i })).toBeInTheDocument()
    })
  })

  it('restores previous tracklist when Undo is clicked', async () => {
    mockFetchSuccess(SYNCED_TRACKS)
    renderDialog()

    fireEvent.click(screen.getByRole('button', { name: /sync tracklist/i }))

    await waitFor(() => {
      expect(screen.getByDisplayValue('Synced Track A')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /undo/i }))

    await waitFor(() => {
      expect(screen.getByDisplayValue('Old Track 1')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Old Track 2')).toBeInTheDocument()
      expect(screen.queryByDisplayValue('Synced Track A')).not.toBeInTheDocument()
    })
  })

  it('hides "Undo" button after undoing back to the initial state', async () => {
    mockFetchSuccess(SYNCED_TRACKS)
    renderDialog()

    fireEvent.click(screen.getByRole('button', { name: /sync tracklist/i }))
    await waitFor(() => screen.getByRole('button', { name: /undo/i }))

    fireEvent.click(screen.getByRole('button', { name: /undo/i }))
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /undo/i })).not.toBeInTheDocument()
    })
  })

  it('supports multiple undo levels', async () => {
    const firstSyncTracks = [{ title: 'First Sync', duration: '1:00' }]
    const secondSyncTracks = [{ title: 'Second Sync', duration: '2:00' }]

    global.fetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ release: { tracks: firstSyncTracks } }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ release: { tracks: secondSyncTracks } }) })

    renderDialog()

    // Sync once
    fireEvent.click(screen.getByRole('button', { name: /sync tracklist/i }))
    await waitFor(() => screen.getByDisplayValue('First Sync'))

    // Sync again
    fireEvent.click(screen.getByRole('button', { name: /sync tracklist/i }))
    await waitFor(() => screen.getByDisplayValue('Second Sync'))

    // Undo → back to first sync
    fireEvent.click(screen.getByRole('button', { name: /undo/i }))
    await waitFor(() => {
      expect(screen.getByDisplayValue('First Sync')).toBeInTheDocument()
      expect(screen.queryByDisplayValue('Second Sync')).not.toBeInTheDocument()
    })

    // Undo → back to original
    fireEvent.click(screen.getByRole('button', { name: /undo/i }))
    await waitFor(() => {
      expect(screen.getByDisplayValue('Old Track 1')).toBeInTheDocument()
      expect(screen.queryByDisplayValue('First Sync')).not.toBeInTheDocument()
    })
  })

  it('shows info toast and does NOT show undo button when no tracks are returned', async () => {
    mockFetchNoTracks()
    renderDialog()

    fireEvent.click(screen.getByRole('button', { name: /sync tracklist/i }))

    await waitFor(() => {
      expect(mockToastInfo).toHaveBeenCalledWith(expect.stringMatching(/no tracklist found/i))
    })
    expect(screen.queryByRole('button', { name: /undo/i })).not.toBeInTheDocument()
  })

  it('shows error toast when the API call fails', async () => {
    mockFetchError('MusicBrainz timeout')
    renderDialog()

    fireEvent.click(screen.getByRole('button', { name: /sync tracklist/i }))

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith('MusicBrainz timeout')
    })
    expect(screen.queryByRole('button', { name: /undo/i })).not.toBeInTheDocument()
  })

  it('shows generic error toast when the API returns no error message', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({}),
    })
    renderDialog()

    fireEvent.click(screen.getByRole('button', { name: /sync tracklist/i }))

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith('Tracklist sync failed')
    })
  })

  it('shows generic error toast when fetch throws', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'))
    renderDialog()

    fireEvent.click(screen.getByRole('button', { name: /sync tracklist/i }))

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith('Tracklist sync failed')
    })
  })

  it('resets undo history when a different release is loaded', async () => {
    mockFetchSuccess(SYNCED_TRACKS)
    const { rerender } = render(
      <ReleaseEditDialog release={BASE_RELEASE} onSave={vi.fn()} onClose={vi.fn()} />
    )

    fireEvent.click(screen.getByRole('button', { name: /sync tracklist/i }))
    await waitFor(() => screen.getByRole('button', { name: /undo/i }))

    // Swap to a different release
    const otherRelease: Release = { ...BASE_RELEASE, id: 'other-release', title: 'Another Album' }
    rerender(<ReleaseEditDialog release={otherRelease} onSave={vi.fn()} onClose={vi.fn()} />)

    expect(screen.queryByRole('button', { name: /undo/i })).not.toBeInTheDocument()
  })
})
