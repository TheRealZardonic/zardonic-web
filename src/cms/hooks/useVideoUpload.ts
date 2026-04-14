import { useState, useCallback, useRef, useEffect } from 'react'
import { toast } from 'sonner'

interface VideoUploadResponse {
  url: string
  fileName: string
  mimeType: string
  size: number
}

/** Shape of the JSON returned by /api/cms/video-upload */
interface VideoUploadApiResponse {
  url: string
  pathname: string
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

  const upload = useCallback((file: File): Promise<VideoUploadResponse | null> => {
    // Cancel any pending progress reset before starting a new upload
    if (progressResetTimerRef.current !== null) {
      clearTimeout(progressResetTimerRef.current)
      progressResetTimerRef.current = null
    }

    setIsUploading(true)
    setProgress(0)

    // Sanitise filename — keep only safe characters; include a timestamp to avoid collisions
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 255)
    const pathname = `videos/${Date.now()}-${safeName}`

    const resetProgressAfterDelay = () => {
      progressResetTimerRef.current = setTimeout(() => {
        setProgress(0)
        progressResetTimerRef.current = null
      }, 800)
    }

    return new Promise<VideoUploadResponse | null>((resolve) => {
      const xhr = new XMLHttpRequest()

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          setProgress(Math.round((e.loaded / e.total) * 100))
        }
      })

      xhr.addEventListener('load', () => {
        setIsUploading(false)

        if (xhr.status >= 200 && xhr.status < 300) {
          let data: VideoUploadApiResponse
          try {
            data = JSON.parse(xhr.responseText) as VideoUploadApiResponse
          } catch {
            toast.error('Upload failed: invalid response from server.')
            resetProgressAfterDelay()
            resolve(null)
            return
          }

          setProgress(100)
          toast.success(`"${file.name}" uploaded.`)
          resetProgressAfterDelay()

          resolve({
            url: data.url,
            fileName: safeName,
            mimeType: file.type,
            size: file.size,
          })
        } else {
          let message = 'Upload failed.'
          try {
            const errData = JSON.parse(xhr.responseText) as { error?: string }
            if (errData.error) message = errData.error
          } catch {
            // use default message
          }
          toast.error(message)
          resetProgressAfterDelay()
          resolve(null)
        }
      })

      xhr.addEventListener('error', () => {
        setIsUploading(false)
        toast.error('Upload failed: network error.')
        resetProgressAfterDelay()
        resolve(null)
      })

      xhr.addEventListener('abort', () => {
        setIsUploading(false)
        resetProgressAfterDelay()
        resolve(null)
      })

      xhr.open('POST', '/api/cms/video-upload')
      xhr.withCredentials = true
      xhr.setRequestHeader('x-blob-pathname', pathname)
      xhr.setRequestHeader('Content-Type', file.type)
      xhr.send(file)
    })
  }, [])

  return { upload, progress, isUploading }
}
