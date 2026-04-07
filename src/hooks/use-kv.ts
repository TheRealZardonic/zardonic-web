import { useState, useEffect, useCallback, useRef } from 'react'

/**
 * Custom KV hook backed by Vercel KV API routes, with localStorage fallback for local dev.
 * Uses /api/kv (Vercel KV) for persistence, with localStorage fallback for local dev.
 * Auth is handled via HttpOnly session cookies (set by /api/auth).
 *
 * Returns [value, updateValue, loaded] — `loaded` is true once the initial
 * KV/localStorage/default fetch has completed so consumers can avoid acting on
 * stale default data.
 */
export function useKV<T>(key: string, defaultValue: T): [T, (updater: T | ((current: T) => T)) => void, boolean] {
  const [value, setValue] = useState<T>(defaultValue)
  const [loaded, setLoaded] = useState(false)
  const initializedRef = useRef(false)
  const defaultRef = useRef(defaultValue)
  const loadedRef = useRef(false)
  // Ref tracking the latest value so the updater function always sees
  // the most recent state, even when React batches multiple setState calls.
  const valueRef = useRef<T>(defaultValue)
  // AbortController for cancelling in-flight POST requests when a newer
  // update supersedes them.
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    if (initializedRef.current) return
    initializedRef.current = true

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 8000)

    fetch(`/api/kv?key=${encodeURIComponent(key)}`, { signal: controller.signal })
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data && data.value !== null && data.value !== undefined) {
          setValue(data.value as T)
          valueRef.current = data.value as T
          // Keep localStorage in sync as backup
          try { localStorage.setItem(`kv:${key}`, JSON.stringify(data.value)) } catch { /* ignore */ }
        } else {
          // API returned null — try localStorage before falling back to default
          try {
            const stored = localStorage.getItem(`kv:${key}`)
            if (stored !== null) {
              const parsed = JSON.parse(stored) as T
              setValue(parsed)
              valueRef.current = parsed
              return
            }
          } catch { /* ignore */ }
          setValue(defaultRef.current)
          valueRef.current = defaultRef.current
        }
      })
      .catch(() => {
        // API not available (local dev / timeout), try localStorage as last resort
        try {
          const stored = localStorage.getItem(`kv:${key}`)
          if (stored !== null) {
            const parsed = JSON.parse(stored) as T
            setValue(parsed)
            valueRef.current = parsed
          } else {
            setValue(defaultRef.current)
            valueRef.current = defaultRef.current
          }
        } catch {
          setValue(defaultRef.current)
          valueRef.current = defaultRef.current
        }
      })
      .finally(() => {
        clearTimeout(timeoutId)
        loadedRef.current = true
        setLoaded(true)
      })
  }, [key])

  // Cancel any in-flight KV POST on unmount to prevent writes after the
  // component has been removed from the tree.
  useEffect(() => {
    return () => { abortRef.current?.abort() }
  }, [])

  const updateValue = useCallback((updater: T | ((current: T) => T)) => {
    // Compute the new value from the latest ref (always up-to-date, even when
    // React batches state updates).
    const prev = valueRef.current
    const newValue = typeof updater === 'function'
      ? (updater as (current: T) => T)(prev)
      : updater

    // Update React state and value ref synchronously
    setValue(newValue)
    valueRef.current = newValue

    // Persist to localStorage immediately (synchronous, always succeeds locally)
    try {
      localStorage.setItem(`kv:${key}`, JSON.stringify(newValue))
    } catch (e) {
      console.warn('Failed to persist KV:', e)
    }

    // Write to the remote KV once the initial load has finished.
    // Auth is handled via HttpOnly session cookie (sent automatically).
    // Non-admin writes will get 403 which we suppress silently.
    // Cancel any previous in-flight request so only the latest value is synced.
    if (loadedRef.current) {
      abortRef.current?.abort()
      abortRef.current = new AbortController()

      fetch('/api/kv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ key, value: newValue }),
        signal: abortRef.current.signal,
      }).then(async res => {
        if (res.status === 403) {
          // Session may have expired — check auth status and reload if needed
          // so the next login starts with a clean state (no stale 503 errors)
          try {
            const authRes = await fetch('/api/auth', { credentials: 'same-origin' })
            if (authRes.ok) {
              const authData = await authRes.json()
              if (!authData.authenticated) {
                window.location.reload()
                return
              }
            }
          } catch { /* ignore — transient network error */ }
          return
        }
        if (!res.ok) {
          try {
            const errorData = await res.json()
            if (res.status === 503) {
              console.error(`KV service unavailable (${res.status}) for key "${key}":`, errorData.message || errorData.error)
              console.warn('Data is saved locally in localStorage but not synced to server.')
            } else {
              console.error(`KV POST failed (${res.status}) for key "${key}":`, errorData)
            }
          } catch {
            console.warn(`KV POST failed (${res.status}) for key "${key}"`)
          }
        }
      }).catch(err => {
        // Suppress AbortError from cancelled requests — this is expected when
        // a newer update supersedes an in-flight one.
        if (err instanceof DOMException && err.name === 'AbortError') return
        console.error('KV POST error:', err)
      })
    }
  }, [key])

  return [value, updateValue, loaded]
}
