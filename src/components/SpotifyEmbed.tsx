import { useEffect, useRef, useCallback, useState } from 'react'
import { Play } from '@phosphor-icons/react'

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
  const [isLoaded, setIsLoaded] = useState(false)
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
    if (!isLoaded) return

    // If the API is already loaded, create the player directly
    if (window.SpotifyIframeApi) {
      createPlayer(window.SpotifyIframeApi)
      return
    }

    const setupCallback = () => {
      const previousCallback = window.onSpotifyIframeApiReady
      window.onSpotifyIframeApiReady = (IFrameAPI) => {
        window.SpotifyIframeApi = IFrameAPI
        if (previousCallback) previousCallback(IFrameAPI)
        createPlayer(IFrameAPI)
      }
    }

    // Check if the script is already in the document
    const existingScript = document.querySelector(
      'script[src="https://open.spotify.com/embed/iframe-api/v1"]',
    )

    if (!existingScript) {
      setupCallback()
      const script = document.createElement('script')
      script.src = 'https://open.spotify.com/embed/iframe-api/v1'
      script.async = true
      document.body.appendChild(script)
    } else {
      // Script exists but API not ready yet — wait for callback
      setupCallback()
    }

    return () => {
      if (controllerRef.current) {
        controllerRef.current.destroy()
        controllerRef.current = null
      }
    }
  }, [createPlayer, isLoaded])

  if (!isLoaded) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-black/40 border border-primary/20 cursor-pointer hover:bg-primary/5 hover:border-primary/50 transition-all group ${className}`}
        style={{ width, height }}
        onClick={() => setIsLoaded(true)}
      >
        <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center group-hover:scale-110 group-hover:bg-primary/30 transition-transform">
          <Play weight="fill" className="w-8 h-8 text-primary ml-1" />
        </div>
        <p className="mt-4 font-mono text-sm text-muted-foreground group-hover:text-primary transition-colors uppercase tracking-wider text-center px-4">
          Click to load Spotify Player<br/>
          <span className="text-xs opacity-60 normal-case tracking-normal block mt-2">
            By clicking, you consent to loading external content from Spotify. <br/>
            This may transmit your IP address to Spotify servers.
          </span>
        </p>
      </div>
    )
  }

  return <div ref={containerRef} className={className} />
}
