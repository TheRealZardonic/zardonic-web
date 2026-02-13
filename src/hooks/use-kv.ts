import { useState, useEffect, useCallback, useRef } from 'react'

/**
 * Custom KV hook backed by localStorage.
 * Uses localStorage for persistence with simple JSON serialization.
 *
 * Returns [value, updateValue, loaded] — `loaded` is true once the initial
 * localStorage/default fetch has completed so consumers can avoid acting on
 * stale default data.
 */
export function useKV<T>(key: string, defaultValue: T): [T | undefined, (updater: T | ((current: T | undefined) => T)) => void, boolean] {
  const [value, setValue] = useState<T | undefined>(undefined)
  const [loaded, setLoaded] = useState(false)
  const initializedRef = useRef(false)
  const defaultRef = useRef(defaultValue)
  const loadedRef = useRef(false)

  useEffect(() => {
    if (initializedRef.current) return
    initializedRef.current = true

    // Try to load from localStorage
    try {
      const stored = localStorage.getItem(`kv:${key}`)
      if (stored !== null) {
        setValue(JSON.parse(stored) as T)
      } else {
        setValue(defaultRef.current)
      }
    } catch {
      setValue(defaultRef.current)
    } finally {
      loadedRef.current = true
      setLoaded(true)
    }
  }, [key])

  const updateValue = useCallback((updater: T | ((current: T | undefined) => T)) => {
    setValue(prev => {
      const newValue = typeof updater === 'function'
        ? (updater as (current: T | undefined) => T)(prev)
        : updater

      // Persist to localStorage
      try {
        localStorage.setItem(`kv:${key}`, JSON.stringify(newValue))
      } catch (e) {
        console.warn('Failed to persist KV:', e)
      }

      return newValue
    })
  }, [key])

  return [value, updateValue, loaded]
}
