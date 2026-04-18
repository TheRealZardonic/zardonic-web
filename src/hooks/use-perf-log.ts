/**
 * usePerfLog — React hook that activates or deactivates the performance logger
 * based on the `adminSettings.devTools.performanceLogEnabled` flag.
 *
 * Call this hook once in `main.tsx` (or in the root `App` component).
 * It is safe to mount when `adminSettings` is not yet loaded — the logger
 * will start as soon as the flag becomes truthy.
 */

import { useEffect, useRef } from 'react'
import { initPerfLog, teardownPerfLog, perfMark } from '@/lib/perf-log'

interface UsePerfLogOptions {
  /** Whether the performance logger is currently enabled (from AdminSettings). */
  enabled: boolean
}

export function usePerfLog({ enabled }: UsePerfLogOptions): void {
  const wasEnabled = useRef(false)

  useEffect(() => {
    if (enabled && !wasEnabled.current) {
      wasEnabled.current = true
      initPerfLog()
      perfMark('react-mounted')
    } else if (!enabled && wasEnabled.current) {
      wasEnabled.current = false
      teardownPerfLog()
    }
  }, [enabled])
}
