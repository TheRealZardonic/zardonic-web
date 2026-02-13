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

  it('renders a container div', () => {
    const { container } = render(
      <SpotifyEmbed uri="spotify:artist:7BqEidErPMNiUXCRE0dV2n" />,
    )
    expect(container.firstChild).toBeInstanceOf(HTMLDivElement)
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

  it('injects the Spotify iFrame API script', () => {
    render(<SpotifyEmbed uri="spotify:artist:7BqEidErPMNiUXCRE0dV2n" />)
    const script = document.querySelector(
      'script[src="https://open.spotify.com/embed/iframe-api/v1"]',
    )
    expect(script).not.toBeNull()
  })

  it('does not inject duplicate scripts', () => {
    render(<SpotifyEmbed uri="spotify:artist:7BqEidErPMNiUXCRE0dV2n" />)
    render(<SpotifyEmbed uri="spotify:artist:7BqEidErPMNiUXCRE0dV2n" />)
    const scripts = document.querySelectorAll(
      'script[src="https://open.spotify.com/embed/iframe-api/v1"]',
    )
    expect(scripts.length).toBe(1)
  })

  it('sets up onSpotifyIframeApiReady callback', () => {
    render(<SpotifyEmbed uri="spotify:artist:7BqEidErPMNiUXCRE0dV2n" />)
    expect(window.onSpotifyIframeApiReady).toBeTypeOf('function')
  })

  it('calls createController when API is already loaded', () => {
    const mockCreateController = vi.fn()
    window.SpotifyIframeApi = { createController: mockCreateController } as never

    render(<SpotifyEmbed uri="spotify:artist:7BqEidErPMNiUXCRE0dV2n" />)

    expect(mockCreateController).toHaveBeenCalledTimes(1)
    expect(mockCreateController).toHaveBeenCalledWith(
      expect.any(HTMLDivElement),
      expect.objectContaining({
        uri: 'spotify:artist:7BqEidErPMNiUXCRE0dV2n',
        width: '100%',
        height: 352,
        theme: '0',
      }),
      expect.any(Function),
    )
  })

  it('calls createController with custom props', () => {
    const mockCreateController = vi.fn()
    window.SpotifyIframeApi = { createController: mockCreateController } as never

    render(
      <SpotifyEmbed
        uri="spotify:artist:7BqEidErPMNiUXCRE0dV2n"
        width={300}
        height={80}
        theme="1"
      />,
    )

    expect(mockCreateController).toHaveBeenCalledWith(
      expect.any(HTMLDivElement),
      expect.objectContaining({
        uri: 'spotify:artist:7BqEidErPMNiUXCRE0dV2n',
        width: 300,
        height: 80,
        theme: '1',
      }),
      expect.any(Function),
    )
  })
})
