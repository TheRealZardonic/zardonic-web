import { useState, useCallback, useEffect } from 'react'

type SetStateAction<T> = T | ((prev: T) => T)

export function useLocalStorage<T>(key: string, defaultValue: T): [T, (action: SetStateAction<T>) => void] {
  const [value, setValue] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(key)
      if (stored !== null) {
        return JSON.parse(stored) as T
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
