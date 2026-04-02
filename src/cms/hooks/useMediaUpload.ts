import { useState, useCallback } from 'react'
import { toast } from 'sonner'

interface MediaUploadResponse {
  id: string
  url: string
  thumbnailUrl?: string
  fileName: string
  mimeType: string
  size: number
  width?: number
  height?: number
  uploadedAt: string
}

interface UseMediaUploadResult {
  upload: (file: File) => Promise<MediaUploadResponse | null>
  progress: number
  isUploading: boolean
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsDataURL(file)
  })
}

export function useMediaUpload(): UseMediaUploadResult {
  const [progress, setProgress] = useState(0)
  const [isUploading, setIsUploading] = useState(false)

  const upload = useCallback(async (file: File): Promise<MediaUploadResponse | null> => {
    setIsUploading(true)
    setProgress(0)

    try {
      setProgress(10)
      const dataUrl = await fileToDataUrl(file)
      setProgress(40)

      const res = await fetch('/api/cms/media', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: file.name,
          mimeType: file.type,
          dataUrl,
        }),
      })

      setProgress(90)

      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string }
        throw new Error(body.error ?? `Upload failed: ${res.status}`)
      }

      const result = await res.json() as MediaUploadResponse
      setProgress(100)
      toast.success(`"${file.name}" hochgeladen.`)
      return result
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Upload fehlgeschlagen.'
      toast.error(message)
      return null
    } finally {
      setIsUploading(false)
      // Reset progress after a short delay so the UI can show 100%
      setTimeout(() => setProgress(0), 800)
    }
  }, [])

  return { upload, progress, isUploading }
}
