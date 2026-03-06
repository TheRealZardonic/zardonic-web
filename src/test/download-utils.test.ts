import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { extractDriveFileId, downloadFile } from '@/lib/download'

describe('extractDriveFileId', () => {
  it('extracts file ID from /file/d/ URL', () => {
    expect(extractDriveFileId('https://drive.google.com/file/d/abc123XYZ/view?usp=sharing'))
      .toBe('abc123XYZ')
  })

  it('extracts file ID from /open?id= URL', () => {
    expect(extractDriveFileId('https://drive.google.com/open?id=def456'))
      .toBe('def456')
  })

  it('extracts file ID from /uc?id= URL', () => {
    expect(extractDriveFileId('https://drive.google.com/uc?id=ghi789&export=download'))
      .toBe('ghi789')
  })

  it('returns null for non-Drive URLs', () => {
    expect(extractDriveFileId('https://example.com/file.zip')).toBeNull()
    expect(extractDriveFileId('https://github.com/file')).toBeNull()
  })

  it('returns null for empty string', () => {
    expect(extractDriveFileId('')).toBeNull()
  })

  it('handles IDs with dashes and underscores', () => {
    expect(extractDriveFileId('https://drive.google.com/file/d/abc_123-XYZ/view'))
      .toBe('abc_123-XYZ')
  })
})

describe('downloadFile with Google Drive URLs', () => {
  let appendChildSpy: ReturnType<typeof vi.spyOn>
  let removeChildSpy: ReturnType<typeof vi.spyOn>
  let clickSpy: ReturnType<typeof vi.fn>

  beforeEach(() => {
    // Mock document.body.appendChild and removeChild
    appendChildSpy = vi.spyOn(document.body, 'appendChild')
    removeChildSpy = vi.spyOn(document.body, 'removeChild')
    
    // Mock the click method on anchor elements
    clickSpy = vi.fn()
    const originalCreateElement = document.createElement.bind(document)
    vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      const element = originalCreateElement(tagName)
      if (tagName === 'a') {
        element.click = clickSpy
      }
      return element
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('downloads Google Drive file via native browser download', async () => {
    const fileId = 'abc123XYZ'
    const driveUrl = `https://drive.google.com/file/d/${fileId}/view`
    const fileName = 'test-file.zip'
    const progressUpdates: Array<{ state: string; progress: number }> = []

    await downloadFile(driveUrl, fileName, (progress) => {
      progressUpdates.push({ state: progress.state, progress: progress.progress })
    })

    // Verify progress callbacks
    expect(progressUpdates).toHaveLength(2)
    expect(progressUpdates[0]).toEqual({ state: 'downloading', progress: 0 })
    expect(progressUpdates[1]).toEqual({ state: 'complete', progress: 1 })

    // Verify an anchor element was created and clicked
    expect(appendChildSpy).toHaveBeenCalledTimes(1)
    expect(clickSpy).toHaveBeenCalledTimes(1)
    expect(removeChildSpy).toHaveBeenCalledTimes(1)

    // Verify the anchor element has correct attributes
    const anchorElement = appendChildSpy.mock.calls[0][0] as HTMLAnchorElement
    expect(anchorElement.tagName).toBe('A')
    expect(anchorElement.href).toContain(`/api/drive-download?fileId=${encodeURIComponent(fileId)}`)
    expect(anchorElement.download).toBe(fileName)
  })
})
