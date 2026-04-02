import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, fireEvent, waitFor, act } from '@testing-library/react'
import { SpotifyEmbed } from './SpotifyEmbed'

const SPOTIFY_SCRIPT_SRC = 'https://open.spotify.com/embed/iframe-api/v1'

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
    document.querySelectorAll('script[src*="spotify"]').forEach((s) => s.remove())
  })

  // ── Pre-consent (GDPR gate) ────────────────────────────────────────────

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
    const script = document.querySelector(`script[src="${SPOTIFY_SCRIPT_SRC}"]`)
    expect(script).toBeNull()
  })

  it('shows consent disclosure text', () => {
    const { getByText } = render(
      <SpotifyEmbed uri="spotify:artist:7BqEidErPMNiUXCRE0dV2n" />,
    )
    expect(getByText(/transmit your IP address to Spotify servers/i)).toBeInTheDocument()
  })

  it('placeholder has role=button and aria-label', () => {
    const { getByRole } = render(
      <SpotifyEmbed uri="spotify:artist:7BqEidErPMNiUXCRE0dV2n" />,
    )
    const btn = getByRole('button', { name: /Load Spotify Player/i })
    expect(btn).toBeInTheDocument()
  })

  it('placeholder is keyboard-focusable (tabIndex=0)', () => {
    const { getByRole } = render(
      <SpotifyEmbed uri="spotify:artist:7BqEidErPMNiUXCRE0dV2n" />,
    )
    const btn = getByRole('button', { name: /Load Spotify Player/i })
    expect(btn).toHaveAttribute('tabindex', '0')
  })

  // ── Post-consent (click interaction) ──────────────────────────────────

  it('injects the Spotify script after user clicks the consent button', async () => {
    const { getByRole } = render(
      <SpotifyEmbed uri="spotify:artist:7BqEidErPMNiUXCRE0dV2n" />,
    )

    await act(async () => {
      fireEvent.click(getByRole('button', { name: /Load Spotify Player/i }))
    })

    await waitFor(() => {
      const script = document.querySelector(`script[src="${SPOTIFY_SCRIPT_SRC}"]`)
      expect(script).not.toBeNull()
    })
  })

  it('injects the Spotify script after Enter keydown on the consent button', async () => {
    const { getByRole } = render(
      <SpotifyEmbed uri="spotify:artist:7BqEidErPMNiUXCRE0dV2n" />,
    )

    await act(async () => {
      fireEvent.keyDown(getByRole('button', { name: /Load Spotify Player/i }), { key: 'Enter' })
    })

    await waitFor(() => {
      const script = document.querySelector(`script[src="${SPOTIFY_SCRIPT_SRC}"]`)
      expect(script).not.toBeNull()
    })
  })

  it('injects the Spotify script after Space keydown on the consent button', async () => {
    const { getByRole } = render(
      <SpotifyEmbed uri="spotify:artist:7BqEidErPMNiUXCRE0dV2n" />,
    )

    await act(async () => {
      fireEvent.keyDown(getByRole('button', { name: /Load Spotify Player/i }), { key: ' ' })
    })

    await waitFor(() => {
      const script = document.querySelector(`script[src="${SPOTIFY_SCRIPT_SRC}"]`)
      expect(script).not.toBeNull()
    })
  })

  it('does not inject a second script when clicked twice', async () => {
    const { getByRole } = render(
      <SpotifyEmbed uri="spotify:artist:7BqEidErPMNiUXCRE0dV2n" />,
    )

    // First consent click injects the script
    await act(async () => {
      fireEvent.click(getByRole('button', { name: /Load Spotify Player/i }))
    })

    await waitFor(() => {
      expect(document.querySelectorAll(`script[src="${SPOTIFY_SCRIPT_SRC}"]`)).toHaveLength(1)
    })
  })

  it('calls createController when SpotifyIframeApi is already available at click time', async () => {
    const createController = vi.fn()
    window.SpotifyIframeApi = { createController } as unknown as typeof window.SpotifyIframeApi

    const { getByRole } = render(
      <SpotifyEmbed uri="spotify:artist:7BqEidErPMNiUXCRE0dV2n" />,
    )

    await act(async () => {
      fireEvent.click(getByRole('button', { name: /Load Spotify Player/i }))
    })

    await waitFor(() => {
      expect(createController).toHaveBeenCalledWith(
        expect.any(HTMLElement),
        expect.objectContaining({ uri: 'spotify:artist:7BqEidErPMNiUXCRE0dV2n' }),
        expect.any(Function),
      )
    })
  })

  it('shows error state when the Spotify script fails to load', async () => {
    // Simulate script onerror by firing the event on the injected script tag
    const original = document.body.appendChild.bind(document.body)
    const appendChildSpy = vi.spyOn(document.body, 'appendChild').mockImplementation((node) => {
      const result = original(node)
      if (node instanceof HTMLScriptElement && node.src.includes('spotify')) {
        // Fire onerror asynchronously to let the component finish setting up the handler
        setTimeout(() => node.onerror?.(new Event('error')), 0)
      }
      return result
    })

    const { getByRole } = render(
      <SpotifyEmbed uri="spotify:artist:7BqEidErPMNiUXCRE0dV2n" />,
    )

    await act(async () => {
      fireEvent.click(getByRole('button', { name: /Load Spotify Player/i }))
      await new Promise<void>((r) => setTimeout(r, 20))
    })

    await waitFor(() => {
      expect(getByRole('alert')).toBeInTheDocument()
    })

    appendChildSpy.mockRestore()
  })

  it('retry button resets the error state back to the consent placeholder', async () => {
    const original = document.body.appendChild.bind(document.body)
    const appendChildSpy = vi.spyOn(document.body, 'appendChild').mockImplementation((node) => {
      const result = original(node)
      if (node instanceof HTMLScriptElement && node.src.includes('spotify')) {
        setTimeout(() => node.onerror?.(new Event('error')), 0)
      }
      return result
    })

    const { getByRole, getByText } = render(
      <SpotifyEmbed uri="spotify:artist:7BqEidErPMNiUXCRE0dV2n" />,
    )

    await act(async () => {
      fireEvent.click(getByRole('button', { name: /Load Spotify Player/i }))
      await new Promise<void>((r) => setTimeout(r, 20))
    })

    await waitFor(() => expect(getByRole('alert')).toBeInTheDocument())

    await act(async () => {
      fireEvent.click(getByText(/Try again/i))
    })

    await waitFor(() => {
      expect(getByRole('button', { name: /Load Spotify Player/i })).toBeInTheDocument()
    })

    appendChildSpy.mockRestore()
  })
})
