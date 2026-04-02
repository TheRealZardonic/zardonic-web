import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useMediaUpload } from '@/cms/hooks/useMediaUpload'

const mockFetch = vi.fn()
global.fetch = mockFetch

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

// Mock FileReader
class MockFileReader {
  result: string | null = null
  onload: (() => void) | null = null
  onerror: (() => void) | null = null
  readAsDataURL(file: File) {
    if ((file as unknown as { shouldFail: boolean }).shouldFail) {
      setTimeout(() => this.onerror?.(), 0)
    } else {
      this.result = `data:${file.type};base64,dGVzdA==`
      setTimeout(() => this.onload?.(), 0)
    }
  }
}

Object.defineProperty(global, 'FileReader', {
  writable: true,
  value: MockFileReader,
})

function makeFile(name = 'test.png', type = 'image/png', shouldFail = false): File {
  const f = new File(['test'], name, { type })
  Object.assign(f, { shouldFail })
  return f
}

beforeEach(() => {
  mockFetch.mockReset()
  vi.useFakeTimers({ shouldAdvanceTime: true })
})

describe('useMediaUpload', () => {
  it('starts with default state', () => {
    const { result } = renderHook(() => useMediaUpload())
    expect(result.current.isUploading).toBe(false)
    expect(result.current.progress).toBe(0)
    expect(typeof result.current.upload).toBe('function')
  })

  it('sets isUploading to true during upload', async () => {
    mockFetch.mockImplementation(() => new Promise(() => {}))
    const { result } = renderHook(() => useMediaUpload())
    act(() => { void result.current.upload(makeFile()) })
    await act(async () => { await new Promise(r => setTimeout(r, 0)) })
    expect(result.current.isUploading).toBe(true)
  })

  it('returns null and shows error on failed upload', async () => {
    const { toast } = await import('sonner')
    mockFetch.mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: 'Unauthorized' }),
    })
    const { result } = renderHook(() => useMediaUpload())
    let uploadResult: unknown
    await act(async () => {
      uploadResult = await result.current.upload(makeFile())
      await new Promise(r => setTimeout(r, 50))
    })
    expect(uploadResult).toBeNull()
    expect(toast.error).toHaveBeenCalled()
  })

  it('returns upload response on success', async () => {
    const mockResponse = {
      id: 'media-1',
      url: 'data:image/webp;base64,abc',
      thumbnailUrl: 'data:image/webp;base64,xyz',
      fileName: 'test.webp',
      mimeType: 'image/webp',
      size: 1024,
      width: 800,
      height: 600,
      uploadedAt: '2024-01-01T00:00:00.000Z',
    }
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    })
    const { result } = renderHook(() => useMediaUpload())
    let uploadResult: unknown
    await act(async () => {
      uploadResult = await result.current.upload(makeFile())
      await new Promise(r => setTimeout(r, 50))
    })
    expect(uploadResult).toEqual(mockResponse)
  })

  it('sends correct POST request to /api/cms/media', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: '1', url: 'x', fileName: 'f', mimeType: 'm', size: 1, uploadedAt: 't' }),
    })
    const { result } = renderHook(() => useMediaUpload())
    await act(async () => {
      await result.current.upload(makeFile('photo.png', 'image/png'))
      await new Promise(r => setTimeout(r, 50))
    })
    const [url, options] = mockFetch.mock.calls[0] as [string, RequestInit & { body: string }]
    expect(url).toBe('/api/cms/media')
    expect(options.method).toBe('POST')
    const body = JSON.parse(options.body)
    expect(body.fileName).toBe('photo.png')
    expect(body.mimeType).toBe('image/png')
    expect(body.dataUrl).toContain('data:image/png;base64,')
  })

  it('resets progress and isUploading after upload completes', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: '1', url: 'x', fileName: 'f', mimeType: 'm', size: 1, uploadedAt: 't' }),
    })
    const { result } = renderHook(() => useMediaUpload())
    await act(async () => {
      await result.current.upload(makeFile())
      await new Promise(r => setTimeout(r, 50))
    })
    expect(result.current.isUploading).toBe(false)
  })

  it('handles network error gracefully', async () => {
    const { toast } = await import('sonner')
    mockFetch.mockRejectedValue(new Error('Network failure'))
    const { result } = renderHook(() => useMediaUpload())
    let uploadResult: unknown
    await act(async () => {
      uploadResult = await result.current.upload(makeFile())
      await new Promise(r => setTimeout(r, 50))
    })
    expect(uploadResult).toBeNull()
    expect(toast.error).toHaveBeenCalled()
    expect(result.current.isUploading).toBe(false)
  })
})
