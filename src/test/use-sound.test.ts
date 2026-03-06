import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { toDirectAudioUrl, useSound } from '@/hooks/use-sound'

describe('toDirectAudioUrl', () => {
  it('converts Google Drive /file/d/ URLs to direct download URLs', () => {
    const url = 'https://drive.google.com/file/d/1aBcDeFgHiJkLmN/view?usp=sharing'
    expect(toDirectAudioUrl(url)).toBe(
      'https://drive.google.com/uc?export=download&id=1aBcDeFgHiJkLmN'
    )
  })

  it('converts Google Drive open?id= URLs', () => {
    const url = 'https://drive.google.com/open?id=xyz789'
    expect(toDirectAudioUrl(url)).toBe(
      'https://drive.google.com/uc?export=download&id=xyz789'
    )
  })

  it('converts Google Drive uc?export=view URLs', () => {
    const url = 'https://drive.google.com/uc?export=view&id=abc123'
    expect(toDirectAudioUrl(url)).toBe(
      'https://drive.google.com/uc?export=download&id=abc123'
    )
  })

  it('passes through regular URLs unchanged', () => {
    const url = 'https://example.com/audio/song.mp3'
    expect(toDirectAudioUrl(url)).toBe(url)
  })

  it('passes through local asset URLs unchanged', () => {
    const url = '/assets/sounds/click-abc123.wav'
    expect(toDirectAudioUrl(url)).toBe(url)
  })

  it('returns empty string for undefined', () => {
    expect(toDirectAudioUrl(undefined)).toBe('')
  })

  it('returns empty string for empty string', () => {
    expect(toDirectAudioUrl('')).toBe('')
  })

  it('does not route audio URLs through image-proxy', () => {
    const localUrl = '/assets/sounds/click.wav'
    const result = toDirectAudioUrl(localUrl)
    expect(result).not.toContain('image-proxy')

    const remoteUrl = 'https://drive.google.com/file/d/abc123/view'
    const result2 = toDirectAudioUrl(remoteUrl)
    expect(result2).not.toContain('image-proxy')
  })
})

describe('useSound', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear()
  })

  afterEach(() => {
    localStorage.clear()
  })

  it('should default to muted when no localStorage value exists', () => {
    const { result } = renderHook(() => useSound())
    expect(result.current.muted).toBe(true)
  })

  it('should respect localStorage value when set to true', () => {
    localStorage.setItem('nk-sound-muted', 'true')
    const { result } = renderHook(() => useSound())
    expect(result.current.muted).toBe(true)
  })

  it('should respect localStorage value when set to false', () => {
    localStorage.setItem('nk-sound-muted', 'false')
    const { result } = renderHook(() => useSound())
    expect(result.current.muted).toBe(false)
  })

  it('should prioritize settings.defaultMuted over localStorage', () => {
    localStorage.setItem('nk-sound-muted', 'false')
    const { result } = renderHook(() => useSound({ defaultMuted: true }))
    expect(result.current.muted).toBe(true)
  })

  it('should use settings.defaultMuted when set to false', () => {
    const { result } = renderHook(() => useSound({ defaultMuted: false }))
    expect(result.current.muted).toBe(false)
  })

  it('should toggle mute state', () => {
    const { result } = renderHook(() => useSound())
    const initialMuted = result.current.muted
    
    act(() => {
      result.current.toggleMute()
    })
    
    expect(result.current.muted).toBe(!initialMuted)
  })

  it('should persist mute state to localStorage when toggled', () => {
    const { result } = renderHook(() => useSound())
    
    act(() => {
      result.current.toggleMute()
    })
    
    expect(localStorage.getItem('nk-sound-muted')).toBe(String(result.current.muted))
  })
})
