import { useEffect, useRef, useCallback } from 'react'

declare global {
  interface Window {
    onSpotifyIframeApiReady?: (IFrameAPI: SpotifyIFrameAPI) => void
    SpotifyIframeApi?: SpotifyIFrameAPI
  }
}

interface SpotifyIFrameAPI {
  createController(
    element: HTMLElement,
    options: SpotifyEmbedOptions,
    callback?: (controller: SpotifyEmbedController) => void,
  ): void
}

interface SpotifyEmbedController {
  loadUri(uri: string): void
  play(): void
  togglePlay(): void
  seek(seconds: number): void
  destroy(): void
}

interface SpotifyEmbedOptions {
  uri: string
  width?: string | number
  height?: string | number
  theme?: string
}

interface SpotifyEmbedProps {
  uri: string
  width?: string | number
  height?: string | number
  theme?: '0' | '1'
  className?: string
}

export function SpotifyEmbed({
  uri,
  width = '100%',
  height = 352,
  theme = '0',
  className,
}: SpotifyEmbedProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const controllerRef = useRef<SpotifyEmbedController | null>(null)
  const initializedRef = useRef(false)

  const createPlayer = useCallback(
    (IFrameAPI: SpotifyIFrameAPI) => {
      if (!containerRef.current || initializedRef.current) return
      initializedRef.current = true

      const options: SpotifyEmbedOptions = {
        uri,
        width,
        height,
        theme,
      }

      IFrameAPI.createController(containerRef.current, options, (controller) => {
        controllerRef.current = controller
      })
    },
    [uri, width, height, theme],
  )

  useEffect(() => {
    // If the API is already loaded, create the player directly
    if (window.SpotifyIframeApi) {
      createPlayer(window.SpotifyIframeApi)
      return
    }

    // Check if the script is already in the document
    const existingScript = document.querySelector(
      'script[src="https://open.spotify.com/embed/iframe-api/v1"]',
    )

    if (!existingScript) {
      // Set up the callback before loading the script
      const previousCallback = window.onSpotifyIframeApiReady
      window.onSpotifyIframeApiReady = (IFrameAPI) => {
        window.SpotifyIframeApi = IFrameAPI
        if (previousCallback) previousCallback(IFrameAPI)
        createPlayer(IFrameAPI)
      }

      const script = document.createElement('script')
      script.src = 'https://open.spotify.com/embed/iframe-api/v1'
      script.async = true
      document.body.appendChild(script)
    } else {
      // Script exists but API not ready yet — wait for callback
      const previousCallback = window.onSpotifyIframeApiReady
      window.onSpotifyIframeApiReady = (IFrameAPI) => {
        window.SpotifyIframeApi = IFrameAPI
        if (previousCallback) previousCallback(IFrameAPI)
        createPlayer(IFrameAPI)
      }
    }

    return () => {
      if (controllerRef.current) {
        controllerRef.current.destroy()
        controllerRef.current = null
      }
      initializedRef.current = false
    }
  }, [createPlayer])

  return <div ref={containerRef} className={className} />
}
