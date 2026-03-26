import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render } from '@testing-library/react'
import { SpotifyEmbed } from './SpotifyEmbed'

describe('SpotifyEmbed', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    delete window.SpotifyIframeApi
    delete window.onSpotifyIframeApiReady
    // Remove any previously injected scripts
    document.querySelectorAll('script[src*="spotify"]').forEach((s) => s.remove())
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders a container div with placeholder', () => {
    const { container, getByText } = render(
      <SpotifyEmbed uri="spotify:artist:7BqEidErPMNiUXCRE0dV2n" />,
    )
    expect(container.firstChild).toBeInstanceOf(HTMLDivElement)
    expect(getByText(/Click to load Spotify Player/i)).toBeInTheDocument()
  })

  it('applies className to the container', () => {
    const { container } = render(
      <SpotifyEmbed
        uri="spotify:artist:7BqEidErPMNiUXCRE0dV2n"
        className="test-class"
      />,
    )
    expect(container.firstChild).toHaveClass('test-class')
  })

  it('does not inject script on mount (GDPR consent required)', () => {
    render(<SpotifyEmbed uri="spotify:artist:7BqEidErPMNiUXCRE0dV2n" />)
    const script = document.querySelector(
      'script[src="https://open.spotify.com/embed/iframe-api/v1"]',
    )
    expect(script).toBeNull()
  })

})
