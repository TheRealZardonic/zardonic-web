import { describe, it, expect } from 'vitest'
import { toDirectImageUrl } from '@/lib/image-cache'

describe('toDirectImageUrl', () => {
  it('converts Google Drive /file/d/ URLs to wsrv.nl proxy URLs', () => {
    const url = 'https://drive.google.com/file/d/1aBcDeFgHiJkLmN/view?usp=sharing'
    expect(toDirectImageUrl(url)).toBe(
      'https://wsrv.nl/?url=https://lh3.googleusercontent.com/d/1aBcDeFgHiJkLmN'
    )
  })

  it('converts Google Drive /file/d/ URLs without query params', () => {
    const url = 'https://drive.google.com/file/d/abc123/view'
    expect(toDirectImageUrl(url)).toBe(
      'https://wsrv.nl/?url=https://lh3.googleusercontent.com/d/abc123'
    )
  })

  it('converts Google Drive open?id= URLs', () => {
    const url = 'https://drive.google.com/open?id=xyz789'
    expect(toDirectImageUrl(url)).toBe(
      'https://wsrv.nl/?url=https://lh3.googleusercontent.com/d/xyz789'
    )
  })

  it('converts Google Drive open?id= with extra params', () => {
    const url = 'https://drive.google.com/open?id=xyz789&other=1'
    expect(toDirectImageUrl(url)).toBe(
      'https://wsrv.nl/?url=https://lh3.googleusercontent.com/d/xyz789'
    )
  })

  it('converts Google Drive uc?export=view URLs', () => {
    const url = 'https://drive.google.com/uc?export=view&id=abc123'
    expect(toDirectImageUrl(url)).toBe(
      'https://wsrv.nl/?url=https://lh3.googleusercontent.com/d/abc123'
    )
  })

  it('converts Google Drive /file/d/ URLs with usp=drive_link', () => {
    const url = 'https://drive.google.com/file/d/1T9UYw6j0W5TzNi0gZLOLgbH_5HXhBueD/view?usp=drive_link'
    expect(toDirectImageUrl(url)).toBe(
      'https://wsrv.nl/?url=https://lh3.googleusercontent.com/d/1T9UYw6j0W5TzNi0gZLOLgbH_5HXhBueD'
    )
  })

  it('wraps bare lh3.googleusercontent.com URLs through wsrv.nl', () => {
    const url = 'https://lh3.googleusercontent.com/d/1aBcDeFgHiJkLmN'
    expect(toDirectImageUrl(url)).toBe(
      'https://wsrv.nl/?url=https://lh3.googleusercontent.com/d/1aBcDeFgHiJkLmN'
    )
  })

  it('wraps regular external http/https URLs through wsrv.nl', () => {
    const url = 'https://example.com/images/photo.jpg'
    expect(toDirectImageUrl(url)).toBe(
      `https://wsrv.nl/?url=${encodeURIComponent(url)}`
    )
  })

  it('wraps http URLs through wsrv.nl', () => {
    const url = 'http://example.com/images/photo.jpg'
    expect(toDirectImageUrl(url)).toBe(
      `https://wsrv.nl/?url=${encodeURIComponent(url)}`
    )
  })

  it('wraps CORS-blocked CDN URLs through wsrv.nl', () => {
    const url = 'https://cdn2.steamgriddb.com/logo/7fdd8d8997a41afbdd8381c287d9a984.png'
    expect(toDirectImageUrl(url)).toBe(
      `https://wsrv.nl/?url=${encodeURIComponent(url)}`
    )
  })

  it('passes through data URLs unchanged', () => {
    const url = 'data:image/jpeg;base64,/9j/4AAQ...'
    expect(toDirectImageUrl(url)).toBe(url)
  })

  it('passes through relative URLs unchanged', () => {
    const url = '/assets/images/photo.png'
    expect(toDirectImageUrl(url)).toBe(url)
  })

  it('does not double-wrap already-wsrv.nl URLs', () => {
    const url = 'https://wsrv.nl/?url=https%3A%2F%2Fexample.com%2Fphoto.jpg'
    expect(toDirectImageUrl(url)).toBe(url)
  })
})
