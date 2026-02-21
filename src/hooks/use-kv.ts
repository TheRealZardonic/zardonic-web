import { useState, useEffect, useCallback, useRef } from 'react'

/**
 * Sentinel value to indicate that a state update should be skipped.
 * Use this in updater functions when you want to abort an update without changing the state.
 * 
 * @example
 * ```ts
 * setSiteData((data) => {
 *   if (!data) return SKIP_UPDATE as any
 *   return { ...data, newField: 'value' }
 * })
 * ```
 */
export const SKIP_UPDATE = Symbol('SKIP_UPDATE')

/**
 * Custom KV hook with localStorage fallback
 * 
 * Uses /api/kv (Vercel KV) for persistence, with localStorage as fallback.
 * All data is stored server-side in Vercel KV (Redis) when available,
 * but also immediately saved to localStorage for offline/local dev support.
 * 
 * Returns [value, updateValue, loaded] — `loaded` is true once the initial
 * KV fetch has completed.
 * 
 * The updater function can return SKIP_UPDATE to abort the update without changing state.
 */
export function useKV<T>(key: string, defaultValue: T): [T | undefined, (updater: T | ((current: T | undefined) => T | undefined | typeof SKIP_UPDATE)) => void, boolean] {
  const [value, setValue] = useState<T | undefined>(undefined)
  const [loaded, setLoaded] = useState(false)
  const initializedRef = useRef(false)
  const defaultRef = useRef(defaultValue)
  const loadedRef = useRef(false)

  useEffect(() => {
    if (initializedRef.current) return
    initializedRef.current = true

    // Helper to get localStorage key
    const localStorageKey = `kv:${key}`

    // Helper function to load from localStorage fallback
    const loadFromLocalStorage = (): T | undefined => {
      try {
        const localData = localStorage.getItem(localStorageKey)
        if (localData !== null) {
          return JSON.parse(localData) as T
        }
      } catch (e) {
        console.warn('[KV] Failed to read from localStorage:', e)
      }
      return defaultRef.current
    }

    fetch(`/api/kv?key=${encodeURIComponent(key)}`)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data && data.value !== null && data.value !== undefined) {
          // API returned valid data - use it and sync to localStorage
          setValue(data.value as T)
          try {
            localStorage.setItem(localStorageKey, JSON.stringify(data.value))
          } catch (e) {
            console.warn('[KV] Failed to save to localStorage:', e)
          }
        } else {
          // API returned null - try localStorage fallback
          setValue(loadFromLocalStorage())
        }
      })
      .catch(() => {
        // API not available, try localStorage fallback
        setValue(loadFromLocalStorage())
      })
      .finally(() => {
        loadedRef.current = true
        setLoaded(true)
      })
  }, [key])

  const updateValue = useCallback((updater: T | ((current: T | undefined) => T | undefined | typeof SKIP_UPDATE)) => {
    setValue(prev => {
      const newValue = typeof updater === 'function'
        ? (updater as (current: T | undefined) => T | undefined | typeof SKIP_UPDATE)(prev)
        : updater

      // Check if update should be skipped (explicit sentinel or implicit undefined with defined prev)
      if (newValue === SKIP_UPDATE || (newValue === undefined && prev !== undefined)) {
        // Skip update - return previous value unchanged
        return prev
      }

      // Save to localStorage immediately (as backup)
      const localStorageKey = `kv:${key}`
      try {
        localStorage.setItem(localStorageKey, JSON.stringify(newValue))
      } catch (e) {
        console.warn('[KV] Failed to save to localStorage:', e)
      }

      // Get admin token from localStorage (backward-compat with legacy session system)
      const adminToken = localStorage.getItem('admin-token') || ''

      // Only write to the remote KV once the initial load has finished and
      // the user is authenticated (has an admin token or active cookie session)
      // to prevent unnecessary 403 errors for non-admin visitors.
      if (loadedRef.current && adminToken) {
        fetch('/api/kv', {
          method: 'POST',
          credentials: 'same-origin',
          headers: {
            'Content-Type': 'application/json',
            // x-session-token: supports both legacy localStorage token and new
            // cookie-based sessions (validateSession checks this header as fallback)
            'x-session-token': adminToken,
          },
          body: JSON.stringify({ key, value: newValue }),
        }).then(async res => {
          if (!res.ok) {
            try {
              const errorData = await res.json()
              if (res.status === 503) {
                console.error(`[KV] Service unavailable (${res.status}) for key "${key}":`, errorData.message || errorData.error)
              } else {
                console.error(`[KV] POST failed (${res.status}) for key "${key}":`, errorData)
              }
            } catch {
              console.warn(`[KV] POST failed (${res.status}) for key "${key}"`)
            }
          }
        }).catch(err => {
          console.error('[KV] POST error:', err)
        })
      }

      return newValue
    })
  }, [key])

  return [value, updateValue, loaded]
}

