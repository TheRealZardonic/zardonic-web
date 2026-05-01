import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render } from '@testing-library/react'
import VideoBackground from '@/components/VideoBackground'

// Mock device-capability so we can control fallback behaviour in tests
vi.mock('@/lib/device-capability', () => ({
  shouldDisableVideoBackground: vi.fn().mockReturnValue(false),
}))

// Mock image-cache to return the URL unchanged
vi.mock('@/lib/image-cache', () => ({
  toDirectImageUrl: (url: string) => url,
}))

// Mock useIsMobile — default to desktop (false)
vi.mock('@/hooks/use-mobile', () => ({
  useIsMobile: vi.fn().mockReturnValue(false),
}))

import { shouldDisableVideoBackground } from '@/lib/device-capability'
import { useIsMobile } from '@/hooks/use-mobile'

describe('VideoBackground — capable device', () => {
  beforeEach(() => {
    vi.mocked(shouldDisableVideoBackground).mockReturnValue(false)
    vi.mocked(useIsMobile).mockReturnValue(false)
  })

  it('renders a <video> element by default', () => {
    const { container } = render(
      <VideoBackground videoUrl="https://example.com/bg.mp4" />
    )
    const video = container.querySelector('video')
    expect(video).not.toBeNull()
  })

  it('sets autoPlay, muted, loop, playsInline on the video', () => {
    const { container } = render(
      <VideoBackground videoUrl="https://example.com/bg.mp4" />
    )
    const video = container.querySelector('video') as HTMLVideoElement
    expect(video.autoplay).toBe(true)
    expect(video.muted).toBe(true)
    expect(video.loop).toBe(true)
    expect(video.playsInline).toBe(true)
  })

  it('does NOT render fallback <img> alongside video when video is active', () => {
    const { container } = render(
      <VideoBackground
        videoUrl="https://example.com/bg.mp4"
        fallbackImageUrl="https://example.com/poster.jpg"
      />
    )
    // Fallback image must NOT be present while the video is playing
    expect(container.querySelector('img')).toBeNull()
    // The video must still be present
    expect(container.querySelector('video')).not.toBeNull()
  })

  it('is aria-hidden', () => {
    const { container } = render(
      <VideoBackground videoUrl="https://example.com/bg.mp4" />
    )
    const video = container.querySelector('video')
    expect(video?.getAttribute('aria-hidden')).toBe('true')
  })

  it('renders a wrapper div with --z-bg-video zIndex', () => {
    const { container } = render(
      <VideoBackground videoUrl="https://example.com/bg.mp4" />
    )
    const wrapper = container.firstElementChild as HTMLElement
    expect(wrapper.tagName).toBe('DIV')
    expect(wrapper.style.zIndex).toContain('--z-bg-video')
  })
})

describe('VideoBackground — lite mode device', () => {
  beforeEach(() => {
    vi.mocked(shouldDisableVideoBackground).mockReturnValue(true)
    vi.mocked(useIsMobile).mockReturnValue(false)
  })

  it('renders an <img> instead of <video> in lite mode', () => {
    const { container } = render(
      <VideoBackground
        videoUrl="https://example.com/bg.mp4"
        fallbackImageUrl="https://example.com/poster.jpg"
      />
    )
    expect(container.querySelector('video')).toBeNull()
    const img = container.querySelector('img')
    expect(img).not.toBeNull()
    expect(img?.src).toContain('poster.jpg')
  })

  it('renders nothing if no fallback image is provided in lite mode', () => {
    const { container } = render(
      <VideoBackground videoUrl="https://example.com/bg.mp4" />
    )
    expect(container.querySelector('video')).toBeNull()
    expect(container.querySelector('img')).toBeNull()
    expect(container.firstChild).toBeNull()
  })

  it('fallback img has aria-hidden', () => {
    const { container } = render(
      <VideoBackground
        videoUrl="https://example.com/bg.mp4"
        fallbackImageUrl="https://example.com/poster.jpg"
      />
    )
    expect(container.querySelector('img')?.getAttribute('aria-hidden')).toBe('true')
  })
})

describe('VideoBackground — opacity prop', () => {
  beforeEach(() => {
    vi.mocked(shouldDisableVideoBackground).mockReturnValue(false)
    vi.mocked(useIsMobile).mockReturnValue(false)
  })

  it('applies opacity style to the video element only (not the wrapper)', () => {
    const { container } = render(
      <VideoBackground videoUrl="https://example.com/bg.mp4" opacity={0.5} />
    )
    const video = container.querySelector('video') as HTMLVideoElement
    expect(video.style.opacity).toBe('0.5')
    // Wrapper should not have opacity set
    const wrapper = container.firstElementChild as HTMLElement
    expect(wrapper.style.opacity).toBe('')
  })

  it('fallback image is NOT rendered alongside video regardless of video opacity', () => {
    const { container } = render(
      <VideoBackground
        videoUrl="https://example.com/bg.mp4"
        fallbackImageUrl="https://example.com/poster.jpg"
        opacity={0.2}
      />
    )
    // Fallback image must NOT be rendered while video is active
    expect(container.querySelector('img')).toBeNull()
    const video = container.querySelector('video') as HTMLVideoElement
    expect(video.style.opacity).toBe('0.2')
  })
})

describe('VideoBackground — mobileVideoUrl', () => {
  beforeEach(() => {
    vi.mocked(shouldDisableVideoBackground).mockReturnValue(false)
  })

  it('uses mobileVideoUrl on mobile viewports', () => {
    vi.mocked(useIsMobile).mockReturnValue(true)
    const { container } = render(
      <VideoBackground
        videoUrl="https://example.com/desktop.mp4"
        mobileVideoUrl="https://example.com/mobile.mp4"
      />
    )
    const video = container.querySelector('video') as HTMLVideoElement
    expect(video.src).toContain('mobile.mp4')
  })

  it('uses videoUrl on desktop viewports', () => {
    vi.mocked(useIsMobile).mockReturnValue(false)
    const { container } = render(
      <VideoBackground
        videoUrl="https://example.com/desktop.mp4"
        mobileVideoUrl="https://example.com/mobile.mp4"
      />
    )
    const video = container.querySelector('video') as HTMLVideoElement
    expect(video.src).toContain('desktop.mp4')
  })

  it('falls back to videoUrl when mobileVideoUrl is not provided on mobile', () => {
    vi.mocked(useIsMobile).mockReturnValue(true)
    const { container } = render(
      <VideoBackground videoUrl="https://example.com/desktop.mp4" />
    )
    const video = container.querySelector('video') as HTMLVideoElement
    expect(video.src).toContain('desktop.mp4')
  })
})

