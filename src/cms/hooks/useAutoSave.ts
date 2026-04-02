import { useEffect, useRef, useState, useCallback } from 'react'
import { toast } from 'sonner'

interface UseAutoSaveResult {
  lastSaved: Date | null
  isSaving: boolean
  hasPendingChanges: boolean
}

const AUTOSAVE_INTERVAL_MS = 30_000

export function useAutoSave(
  key: string,
  value: unknown,
  isDirty: boolean,
): UseAutoSaveResult {
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [hasPendingChanges, setHasPendingChanges] = useState(false)

  const valueRef = useRef(value)
  const isDirtyRef = useRef(isDirty)
  const keyRef = useRef(key)

  useEffect(() => { valueRef.current = value }, [value])
  useEffect(() => { isDirtyRef.current = isDirty }, [isDirty])
  useEffect(() => { keyRef.current = key }, [key])

  useEffect(() => {
    if (isDirty) setHasPendingChanges(true)
  }, [isDirty])

  const doSave = useCallback(async () => {
    if (!isDirtyRef.current) return
    setIsSaving(true)
    try {
      const res = await fetch('/api/cms/autosave', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: keyRef.current, value: valueRef.current }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string }
        throw new Error(body.error ?? `Autosave failed: ${res.status}`)
      }
      setLastSaved(new Date())
      setHasPendingChanges(false)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Autosave fehlgeschlagen.'
      toast.error(message)
    } finally {
      setIsSaving(false)
    }
  }, [])

  useEffect(() => {
    const interval = setInterval(() => {
      if (isDirtyRef.current) void doSave()
    }, AUTOSAVE_INTERVAL_MS)

    return () => clearInterval(interval)
  }, [doSave])

  return { lastSaved, isSaving, hasPendingChanges }
}
