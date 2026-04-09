import { useState, useEffect, useCallback, useRef } from 'react'

/**
 * Custom KV hook backed by Vercel KV API routes, with localStorage fallback for local dev.
 * Uses /api/kv (Vercel KV) for persistence, with localStorage fallback for local dev.
 * Auth is handled via HttpOnly session cookies (set by /api/auth).
 *
 * Returns [value, updateValue, loaded, refetch] — `loaded` is true once the initial
 * KV/localStorage/default fetch has completed so consumers can avoid acting on
 * stale default data. `refetch` re-fetches the value from the server (e.g. after
 * login, when authentication state changes and the server returns more fields).
 */
export function useKV<T>(key: string, defaultValue: T): [T, (updater: T | ((current: T) => T)) => void, boolean, () => void] {
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
  // Debounce timer for KV writes — prevents 429 rate-limit errors when the
  // admin panel fires rapid successive updates (e.g. color pickers, sliders).
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Incrementing counter used to re-trigger the fetch effect after refetch()
  const [fetchTick, setFetchTick] = useState(0)

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
        } else {
          // API returned null — fall back to default
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
  }, [key, fetchTick])

  // Cancel any in-flight KV POST on unmount to prevent writes after the
  // component has been removed from the tree.
  useEffect(() => {
    return () => {
      abortRef.current?.abort()
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
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

    // Write to the remote KV once the initial load has finished.
    // Auth is handled via HttpOnly session cookie (sent automatically).
    // Non-admin writes will get 403 which we suppress silently.
    // Debounce the POST to avoid flooding the API with rapid successive writes
    // (e.g. admin color pickers / sliders) which cause 429 rate-limit errors.
    if (loadedRef.current) {
      // Clear any pending debounce timer — only the latest value will be sent.
      if (debounceRef.current) clearTimeout(debounceRef.current)

      debounceRef.current = setTimeout(() => {
        debounceRef.current = null

        // Cancel any previous in-flight request so only the latest value is synced.
        abortRef.current?.abort()
        abortRef.current = new AbortController()

        fetch('/api/kv', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({ key, value: valueRef.current }),
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
      }, 800)
    }
  }, [key])

  // Refetch from the server — resets initialization guards so the fetch
  // effect re-runs. Useful after login when the server returns more fields
  // (e.g. admin:settings strips sensitive fields for unauthenticated reads).
  const refetch = useCallback(() => {
    initializedRef.current = false
    loadedRef.current = false
    setLoaded(false)
    setFetchTick(t => t + 1)
  }, [])

  return [value, updateValue, loaded, refetch]
}
