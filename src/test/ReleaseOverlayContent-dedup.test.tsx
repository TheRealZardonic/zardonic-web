import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ReleaseOverlayContent } from '../components/overlays/ReleaseOverlayContent'
import type { Release } from '../lib/app-types'

const mockRelease: Release = {
  id: 'test-id',
  title: 'Test Release',
  releaseDate: '2023-01-01',
  type: 'album',
  artwork: '',
  year: '2023',
  tracks: [
    { title: 'Track 1 (feat. Main Artist)', artist: 'Main Artist' },
    { title: 'Track 2', artist: 'Main Artist', featuredArtists: ['Main Artist', 'Guest'] },
    { title: 'Track 3', artist: 'Main Artist', featuredArtists: [] }
  ]
}

describe('ReleaseOverlayContent Track Rendering Dedup', () => {
  it('deduplicates Main Artist from track level rendering', () => {
    const { container } = render(<ReleaseOverlayContent data={mockRelease} mainArtistName="Main Artist" />)

    // Track 3 should only render the title, no artist line, because it's just the main artist.
    expect(screen.getByText('Track 3')).toBeInTheDocument()

    // We expect 1 instance of 'Main Artist' in the document (the main release artist at the top).
    // Let's verify by counting instances of 'Main Artist' text content.
    // The component renders mainArtistName at the top level, but not on track 3.
    // However, it's safer to query the list items.

    const items = container.querySelectorAll('li')
    expect(items.length).toBe(3)

    // Track 1: 'Track 1', artist line shouldn't be there because both trackArtist and extracted are 'Main Artist'
    expect(items[0].textContent).toContain('Track 1')
    expect(items[0].textContent).not.toContain('Main Artist')

    // Track 2: 'Track 2', artist line should be 'Main Artist, Guest'
    expect(items[1].textContent).toContain('Track 2')
    expect(items[1].textContent).toContain('Main Artist, Guest')

    // Track 3: 'Track 3', artist line should not be there
    expect(items[2].textContent).toContain('Track 3')
    expect(items[2].textContent).not.toContain('Main Artist')
  })
})

describe('ReleaseOverlayContent Track Rendering – compound artist dedup', () => {
  it('splits compound trackArtist and avoids double-listing the main artist', () => {
    const release: Release = {
      id: 'compound-test',
      title: 'Compound Release',
      releaseDate: '2023-01-01',
      type: 'album',
      artwork: '',
      year: '2023',
      tracks: [
        {
          // "The Last Bear Ender & Zardonic" — Zardonic must not appear twice
          title: 'Kernel Breaker (feat. Noisesmith, Roel Peijs & Kylee Brielle) [Remix]',
          artist: 'The Last Bear Ender & Zardonic',
        },
      ],
    }

    const { container } = render(
      <ReleaseOverlayContent data={release} mainArtistName="Zardonic" />,
    )

    const item = container.querySelector('li')!

    // Clean title preserves [Remix] and strips feat. block
    expect(item.textContent).toContain('Kernel Breaker [Remix]')

    // Zardonic must appear exactly once in the track row
    const artistSpans = item.querySelectorAll('span')
    const zardonicMatches = Array.from(artistSpans).filter(
      s => s.textContent?.trim().toLowerCase() === 'zardonic',
    )
    expect(zardonicMatches.length).toBe(1)

    // Co-artist and feat. artists should all be present
    expect(item.textContent).toContain('The Last Bear Ender')
    expect(item.textContent).toContain('Noisesmith')
    expect(item.textContent).toContain('Roel Peijs')
    expect(item.textContent).toContain('Kylee Brielle')
  })

  it('omits main artist when they are NOT credited on a track', () => {
    const release: Release = {
      id: 'not-credited',
      title: 'Various Artists Release',
      releaseDate: '2023-01-01',
      type: 'compilation',
      artwork: '',
      year: '2023',
      tracks: [
        { title: 'Some Track', artist: 'Other Artist' },
      ],
    }

    const { container } = render(
      <ReleaseOverlayContent data={release} mainArtistName="Zardonic" />,
    )

    const item = container.querySelector('li')!
    // "Other Artist" is the sole artist — no artist line (length ≤ 1 rule)
    // But "Zardonic" must definitely not appear here
    expect(item.textContent).not.toContain('Zardonic')
  })
})
