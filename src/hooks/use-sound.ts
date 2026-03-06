import { useCallback, useEffect, useRef, useState } from 'react'
import type { SoundSettings } from '@/lib/types'
import { DEFAULT_SOUND_VOLUME } from '@/lib/config'

// Import sound files as Vite assets so they resolve correctly in dev and production
import textTypingUrl from '@/assets/sounds/texttyping.wav'
import clickUrl from '@/assets/sounds/click.wav'
import loadingFinishedUrl from '@/assets/sounds/laodingfinished.mp3'

// Default local sound files (resolved by Vite)
const DEFAULT_SOUNDS = {
  typing: textTypingUrl,
  button: clickUrl,
  loadingFinished: loadingFinishedUrl,
}

/** Convert Drive share links to direct download URLs for audio files */
export function toDirectAudioUrl(url?: string): string {
  if (!url) return ''
  // Google Drive: /file/d/{fileId}/view → direct download URL
  const driveFileMatch = url.match(/drive\.google\.com\/file\/d\/([^/?#]+)/)
  if (driveFileMatch) {
    return `https://drive.google.com/uc?export=download&id=${driveFileMatch[1]}`
  }
  // Google Drive: open?id={fileId}
  const driveOpenMatch = url.match(/drive\.google\.com\/open\?id=([^&#]+)/)
  if (driveOpenMatch) {
    return `https://drive.google.com/uc?export=download&id=${driveOpenMatch[1]}`
  }
  // Google Drive: uc?export=view&id={fileId}
  const driveUcMatch = url.match(/drive\.google\.com\/uc\?[^#]*?id=([^&#]+)/)
  if (driveUcMatch) {
    return `https://drive.google.com/uc?export=download&id=${driveUcMatch[1]}`
  }
  return url
}

const audioCache = new Map<string, HTMLAudioElement>()

function getCachedAudio(url: string): HTMLAudioElement | null {
  if (!url) return null
  const cached = audioCache.get(url)
  if (cached) return cached
  try {
    // Audio files are loaded directly — never route through the image proxy
    const audio = new Audio(url)
    audio.preload = 'auto'
    audioCache.set(url, audio)
    return audio
  } catch {
    return null
  }
}

export function useSound(settings?: SoundSettings, editMode?: boolean) {
  const [muted, setMuted] = useState(() => {
    // Check if defaultMuted is set in settings, otherwise check localStorage
    if (settings?.defaultMuted !== undefined) {
      return settings.defaultMuted
    }
    try {
      const stored = localStorage.getItem('nk-sound-muted')
      // Default to muted (true) if no preference is stored
      return stored !== null ? stored === 'true' : true
    } catch {
      return true
    }
  })
  const cachedRef = useRef(false)
  const backgroundMusicRef = useRef<HTMLAudioElement | null>(null)

  // Use default sounds if not specified in settings
  const effectiveSounds = {
    terminalSound: settings?.terminalSound,
    typingSound: settings?.typingSound || DEFAULT_SOUNDS.typing,
    buttonSound: settings?.buttonSound || DEFAULT_SOUNDS.button,
    loadingFinishedSound: settings?.loadingFinishedSound || DEFAULT_SOUNDS.loadingFinished,
    backgroundMusic: settings?.backgroundMusic,
  }

  // Determine whether any sounds are configured
  const hasSounds = !!(effectiveSounds.terminalSound || effectiveSounds.typingSound || effectiveSounds.buttonSound)

  // Pre-cache sounds when leaving edit mode
  useEffect(() => {
    if (editMode || cachedRef.current) return
    const urls = [
      toDirectAudioUrl(effectiveSounds.terminalSound),
      toDirectAudioUrl(effectiveSounds.typingSound),
      toDirectAudioUrl(effectiveSounds.buttonSound),
      toDirectAudioUrl(effectiveSounds.loadingFinishedSound),
    ].filter(Boolean)
    urls.forEach(getCachedAudio)
    cachedRef.current = true
  }, [effectiveSounds, editMode])

  // Invalidate cache when settings change
  useEffect(() => {
    cachedRef.current = false
  }, [settings?.terminalSound, settings?.typingSound, settings?.buttonSound, settings?.loadingFinishedSound])

  // Background music management
  useEffect(() => {
    if (!effectiveSounds.backgroundMusic || muted) {
      // Stop background music if muted or no music configured
      if (backgroundMusicRef.current) {
        backgroundMusicRef.current.pause()
        backgroundMusicRef.current = null
      }
      return
    }

    // Start background music
    const url = toDirectAudioUrl(effectiveSounds.backgroundMusic)
    if (!url) return

    // Audio files are loaded directly — never route through the image proxy
    const audio = new Audio(url)
    audio.loop = true
    audio.volume = settings?.backgroundMusicVolume ?? 0.3
    audio.preload = 'auto'
    
    // Try to play, handling autoplay restrictions
    const playPromise = audio.play()
    if (playPromise !== undefined) {
      playPromise.catch(() => {
        // Silently handle autoplay prevention
      })
    }

    backgroundMusicRef.current = audio

    return () => {
      audio.pause()
      backgroundMusicRef.current = null
    }
  }, [effectiveSounds.backgroundMusic, muted, settings?.backgroundMusicVolume])

  // Persist mute preference
  useEffect(() => {
    try { localStorage.setItem('nk-sound-muted', String(muted)) } catch { /* noop */ }
  }, [muted])

  const play = useCallback((type: 'terminal' | 'typing' | 'button' | 'loadingFinished') => {
    if (muted) return
    const urlMap: Record<string, string | undefined> = {
      terminal: effectiveSounds.terminalSound,
      typing: effectiveSounds.typingSound,
      button: effectiveSounds.buttonSound,
      loadingFinished: effectiveSounds.loadingFinishedSound,
    }
    const rawUrl = urlMap[type]
    if (!rawUrl) return
    const url = toDirectAudioUrl(rawUrl)
    const audio = getCachedAudio(url)
    if (audio) {
      // Clone to allow overlapping playback
      const clone = audio.cloneNode() as HTMLAudioElement
      clone.volume = DEFAULT_SOUND_VOLUME
      clone.play().catch(() => { /* ignore autoplay restrictions */ })
    }
  }, [muted, effectiveSounds])

  const toggleMute = useCallback(() => setMuted(m => !m), [])

  return { play, muted, toggleMute, hasSounds }
}
