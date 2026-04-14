import { useState, useCallback, useRef, useEffect } from 'react'
import { upload as blobUpload } from '@vercel/blob/client'
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
      // Sanitise filename — keep only safe characters; include a timestamp to avoid collisions
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 255)
      const pathname = `videos/${Date.now()}-${safeName}`

      const blob = await blobUpload(pathname, file, {
        access: 'public',
        handleUploadUrl: '/api/cms/video-upload-token',
        onUploadProgress: ({ percentage }) => {
          setProgress(Math.round(percentage))
        },
      })

      setProgress(100)
      toast.success(`"${file.name}" uploaded.`)
      return {
        url: blob.url,
        fileName: safeName,
        mimeType: file.type,
        size: file.size,
      }
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
