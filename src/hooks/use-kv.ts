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
 * Custom KV hook backed ONLY by Vercel KV API - NO localStorage!
 * 
 * Uses /api/kv (Vercel KV) for persistence.
 * All data is stored server-side in Vercel KV (Redis).
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

    fetch(`/api/kv?key=${encodeURIComponent(key)}`)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data && data.value !== null && data.value !== undefined) {
          setValue(data.value as T)
        } else {
          // API returned null, use default value
          setValue(defaultRef.current)
        }
      })
      .catch(() => {
        // API not available, use default value
        setValue(defaultRef.current)
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

      // Get admin token from sessionStorage (secure, cleared on tab close)
      const adminToken = sessionStorage.getItem('admin-session-token') || ''

      // Only write to the remote KV once the initial load has finished and
      // the user is authenticated (has an admin token) to prevent
      // unnecessary 500 errors for non-admin visitors.
      if (loadedRef.current && adminToken) {
        fetch('/api/kv', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-admin-token': adminToken
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

