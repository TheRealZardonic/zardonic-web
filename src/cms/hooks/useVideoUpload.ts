import { useState, useCallback, useRef, useEffect } from 'react'
import { toast } from 'sonner'

interface VideoUploadResponse {
  url: string
  fileName: string
  mimeType: string
  size: number
}

interface UseVideoUploadResult {
  upload: (file: File) => Promise<VideoUploadResponse | null>
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

export function useVideoUpload(): UseVideoUploadResult {
  const [progress, setProgress] = useState(0)
  const [isUploading, setIsUploading] = useState(false)
  const progressResetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Clear pending reset timer on unmount to prevent state update on unmounted component
  useEffect(() => {
    return () => {
      if (progressResetTimerRef.current !== null) {
        clearTimeout(progressResetTimerRef.current)
      }
    }
  }, [])

  const upload = useCallback(async (file: File): Promise<VideoUploadResponse | null> => {
    // Cancel any pending progress reset before starting a new upload
    if (progressResetTimerRef.current !== null) {
      clearTimeout(progressResetTimerRef.current)
      progressResetTimerRef.current = null
    }

    setIsUploading(true)
    setProgress(0)

    try {
      setProgress(10)
      const dataUrl = await fileToDataUrl(file)
      setProgress(40)

      const res = await fetch('/api/cms/video', {
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

      const result = await res.json() as VideoUploadResponse
      setProgress(100)
      toast.success(`"${file.name}" uploaded.`)
      return result
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Upload failed.'
      toast.error(message)
      return null
    } finally {
      setIsUploading(false)
      // Reset progress after a short delay so the UI can show 100%
      progressResetTimerRef.current = setTimeout(() => {
        setProgress(0)
        progressResetTimerRef.current = null
      }, 800)
    }
  }, [])

  return { upload, progress, isUploading }
}
