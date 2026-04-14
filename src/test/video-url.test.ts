import { describe, it, expect } from 'vitest'
import { toDirectVideoUrl } from '@/lib/video-url'

describe('toDirectVideoUrl', () => {
  it('returns empty string for empty input', () => {
    expect(toDirectVideoUrl('')).toBe('')
  })

  it('returns non-Drive URLs unchanged', () => {
    const url = 'https://example.com/video.mp4'
    expect(toDirectVideoUrl(url)).toBe(url)
  })

  it('converts /file/d/{id}/view format', () => {
    const id = 'abc123XYZ'
    expect(toDirectVideoUrl(`https://drive.google.com/file/d/${id}/view`)).toBe(
      `https://drive.google.com/uc?export=download&id=${id}`,
    )
  })

  it('converts /file/d/{id}/preview format', () => {
    const id = 'def456'
    expect(toDirectVideoUrl(`https://drive.google.com/file/d/${id}/preview`)).toBe(
      `https://drive.google.com/uc?export=download&id=${id}`,
    )
  })

  it('converts /file/d/{id}/edit format', () => {
    const id = 'ghi789'
    expect(toDirectVideoUrl(`https://drive.google.com/file/d/${id}/edit`)).toBe(
      `https://drive.google.com/uc?export=download&id=${id}`,
    )
  })

  it('converts open?id={id} format', () => {
    const id = 'openId123'
    expect(toDirectVideoUrl(`https://drive.google.com/open?id=${id}`)).toBe(
      `https://drive.google.com/uc?export=download&id=${id}`,
    )
  })

  it('converts uc?export=view&id={id} format', () => {
    const id = 'ucId456'
    expect(toDirectVideoUrl(`https://drive.google.com/uc?export=view&id=${id}`)).toBe(
      `https://drive.google.com/uc?export=download&id=${id}`,
    )
  })

  it('converts uc?id={id}&export=download (already correct) without duplicating', () => {
    const id = 'alreadyDirect'
    const result = toDirectVideoUrl(`https://drive.google.com/uc?export=download&id=${id}`)
    expect(result).toBe(`https://drive.google.com/uc?export=download&id=${id}`)
  })

  it('returns https:// URLs that are not Drive unchanged', () => {
    const url = 'https://cdn.example.com/bg.webm'
    expect(toDirectVideoUrl(url)).toBe(url)
  })

  it('handles Drive URL with additional query params in open?id format', () => {
    const id = 'extraParam'
    const url = `https://drive.google.com/open?id=${id}&usp=sharing`
    expect(toDirectVideoUrl(url)).toBe(`https://drive.google.com/uc?export=download&id=${id}`)
  })
})
