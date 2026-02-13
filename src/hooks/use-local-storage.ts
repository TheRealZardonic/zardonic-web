import { useState, useCallback, useEffect } from 'react'

type SetStateAction<T> = T | ((prev: T) => T)

function mergeWithDefaults<T>(stored: T, defaults: T): T {
  if (
    defaults === null || defaults === undefined ||
    typeof defaults !== 'object' || Array.isArray(defaults)
  ) {
    return stored
  }

  const result = { ...defaults, ...stored }
  for (const key of Object.keys(defaults as Record<string, unknown>)) {
    const defaultVal = (defaults as Record<string, unknown>)[key]
    const storedVal = (result as Record<string, unknown>)[key]
    if (storedVal === undefined || storedVal === null) {
      (result as Record<string, unknown>)[key] = defaultVal
    } else if (
      typeof defaultVal === 'object' && defaultVal !== null &&
      !Array.isArray(defaultVal) &&
      typeof storedVal === 'object' && !Array.isArray(storedVal)
    ) {
      (result as Record<string, unknown>)[key] = mergeWithDefaults(storedVal, defaultVal)
    }
  }
  return result
}

export function useLocalStorage<T>(key: string, defaultValue: T): [T, (action: SetStateAction<T>) => void] {
  const [value, setValue] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(key)
      if (stored !== null) {
        const parsed = JSON.parse(stored) as T
        return mergeWithDefaults(parsed, defaultValue)
      }
    } catch {
      // ignore parse errors
    }
    return defaultValue
  })

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch {
      // ignore storage errors
    }
  }, [key, value])

  const updateValue = useCallback((action: SetStateAction<T>) => {
    setValue(action)
  }, [])

  return [value, updateValue]
}
