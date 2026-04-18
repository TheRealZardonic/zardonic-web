/**
 * Performance Logger — development tool for diagnosing page load times.
 *
 * Captures:
 *   - Navigation Timing (TTFB, DOM load, full load)
 *   - Core Web Vitals via PerformanceObserver (LCP, FID, CLS, FCP, INP)
 *   - Resource timing: scripts, stylesheets, fonts, images, fetch/XHR
 *     including transfer size, decoded body size, and duration
 *   - Manual markers via `perfMark()` and `perfMeasure()`
 *
 * Data is stored in sessionStorage under `nk-perf-log` (cleared on tab close).
 * The logger is enabled only when `devTools.performanceLogEnabled` is true
 * in AdminSettings — it is never active on production for regular visitors.
 *
 * Usage:
 *   initPerfLog()        — call once, sets up observers and captures nav timing
 *   perfMark(name)       — add a named timestamp
 *   perfMeasure(name, start, end?) — record a duration between two marks
 *   getPerfLog()         — read all stored entries
 *   clearPerfLog()       — delete all stored entries
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type PerfEntryType =
  | 'navigation'
  | 'resource'
  | 'paint'
  | 'lcp'
  | 'fid'
  | 'cls'
  | 'inp'
  | 'mark'
  | 'measure'

export interface PerfResourceEntry {
  /** Entry category */
  type: PerfEntryType
  /** Human-readable name / URL */
  name: string
  /** Resource initiator type (script, link, img, fetch, xmlhttprequest, …) */
  initiatorType?: string
  /** Time from navigation start to request start (ms) */
  startTime: number
  /** Total duration of the request (ms) */
  duration: number
  /** Transfer size over the wire in bytes (0 = from cache) */
  transferSize?: number
  /** Uncompressed size of the response body in bytes */
  decodedBodySize?: number
  /** Time to first byte from request start (ms) */
  ttfb?: number
  /** Absolute wall-clock timestamp (ISO 8601) */
  timestamp: string
  /** Optional extra data (e.g. CLS delta, LCP element tag) */
  meta?: Record<string, unknown>
}

export interface PerfNavigationEntry {
  type: 'navigation'
  name: string
  /** startTime is always 0 for navigation entries (navigation start). */
  startTime: 0
  /** duration mirrors loadEnd for consistency. */
  duration: number
  /** DNS lookup duration (ms) */
  dns: number
  /** TCP connection duration (ms) */
  tcp: number
  /** TLS handshake duration (ms) */
  tls: number
  /** Time to first byte (ms) */
  ttfb: number
  /** DOM content loaded (ms from nav start) */
  domContentLoaded: number
  /** Load event end (ms from nav start) */
  loadEnd: number
  /** Transfer size of the HTML document (bytes) */
  transferSize: number
  /** Decoded body size (bytes) */
  decodedBodySize: number
  timestamp: string
}

export type PerfLogEntry = PerfResourceEntry | PerfNavigationEntry

// ─── Storage ──────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'nk-perf-log'
const MAX_ENTRIES = 500

function readLog(): PerfLogEntry[] {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as PerfLogEntry[]) : []
  } catch {
    return []
  }
}

function writeLog(entries: PerfLogEntry[]): void {
  try {
    const capped = entries.slice(-MAX_ENTRIES)
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(capped))
  } catch {
    // sessionStorage may be full — silent fail
  }
}

function appendEntry(entry: PerfLogEntry): void {
  const log = readLog()
  log.push(entry)
  writeLog(log)
}

// ─── Public read/write API ────────────────────────────────────────────────────

/** Read all performance log entries (oldest first). */
export function getPerfLog(): PerfLogEntry[] {
  return readLog()
}

/** Delete all performance log entries. */
export function clearPerfLog(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignore
  }
}

/** Add a named timestamp mark. */
export function perfMark(name: string): void {
  appendEntry({
    type: 'mark',
    name,
    startTime: performance.now(),
    duration: 0,
    timestamp: new Date().toISOString(),
  })
}

/** Record a named duration between two `performance.mark` names or explicit ms values. */
export function perfMeasure(label: string, startMark: string, endMark?: string): void {
  try {
    performance.measure(label, startMark, endMark)
    const measures = performance.getEntriesByName(label, 'measure')
    const m = measures[measures.length - 1]
    if (m) {
      appendEntry({
        type: 'measure',
        name: label,
        startTime: m.startTime,
        duration: m.duration,
        timestamp: new Date().toISOString(),
      })
    }
  } catch {
    // mark may not exist yet
  }
}

// ─── Navigation Timing ────────────────────────────────────────────────────────

function captureNavigationTiming(): void {
  const navEntries = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[]
  const nav = navEntries[0]
  if (!nav) return

  const entry: PerfNavigationEntry = {
    type: 'navigation',
    name: window.location.href,
    startTime: 0,
    dns: nav.domainLookupEnd - nav.domainLookupStart,
    tcp: nav.connectEnd - nav.connectStart,
    tls: nav.secureConnectionStart > 0 ? nav.connectEnd - nav.secureConnectionStart : 0,
    ttfb: nav.responseStart - nav.requestStart,
    domContentLoaded: nav.domContentLoadedEventEnd - nav.startTime,
    loadEnd: nav.loadEventEnd - nav.startTime,
    duration: nav.loadEventEnd - nav.startTime,
    transferSize: nav.transferSize,
    decodedBodySize: nav.decodedBodySize,
    timestamp: new Date().toISOString(),
  }
  appendEntry(entry)
}

// ─── Resource Timing ─────────────────────────────────────────────────────────

function resourceEntryFromPerf(r: PerformanceResourceTiming): PerfResourceEntry {
  return {
    type: 'resource',
    name: r.name,
    initiatorType: r.initiatorType,
    startTime: Math.round(r.startTime),
    duration: Math.round(r.duration),
    transferSize: r.transferSize,
    decodedBodySize: r.decodedBodySize,
    ttfb: r.responseStart > r.requestStart ? Math.round(r.responseStart - r.requestStart) : 0,
    timestamp: new Date().toISOString(),
  }
}

function captureExistingResources(): void {
  const entries = performance.getEntriesByType('resource') as PerformanceResourceTiming[]
  for (const r of entries) {
    appendEntry(resourceEntryFromPerf(r))
  }
}

// ─── PerformanceObserver ──────────────────────────────────────────────────────

let _observer: PerformanceObserver | null = null
let _clsValue = 0

function startObservers(): void {
  if (_observer) return // already running

  try {
    _observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'resource') {
          appendEntry(resourceEntryFromPerf(entry as PerformanceResourceTiming))
        } else if (entry.entryType === 'paint') {
          appendEntry({
            type: 'paint',
            name: entry.name, // 'first-paint' | 'first-contentful-paint'
            startTime: Math.round(entry.startTime),
            duration: Math.round(entry.duration),
            timestamp: new Date().toISOString(),
          })
        } else if (entry.entryType === 'largest-contentful-paint') {
          const lcp = entry as PerformanceEntry & { size?: number; element?: Element | null; url?: string }
          appendEntry({
            type: 'lcp',
            name: 'largest-contentful-paint',
            startTime: Math.round(lcp.startTime),
            duration: 0,
            timestamp: new Date().toISOString(),
            meta: {
              size: lcp.size,
              element: lcp.element?.tagName ?? null,
              url: lcp.url ?? null,
            },
          })
        } else if (entry.entryType === 'first-input') {
          const fid = entry as PerformanceEventTiming
          appendEntry({
            type: 'fid',
            name: 'first-input-delay',
            startTime: Math.round(fid.startTime),
            duration: Math.round(fid.processingStart - fid.startTime),
            timestamp: new Date().toISOString(),
            meta: { eventType: fid.name },
          })
        } else if (entry.entryType === 'layout-shift') {
          const ls = entry as PerformanceEntry & { value: number; hadRecentInput: boolean }
          if (!ls.hadRecentInput) {
            _clsValue += ls.value
            appendEntry({
              type: 'cls',
              name: 'cumulative-layout-shift',
              startTime: Math.round(entry.startTime),
              duration: 0,
              timestamp: new Date().toISOString(),
              meta: { shift: ls.value, cumulative: _clsValue },
            })
          }
        } else if (entry.entryType === 'event') {
          const evt = entry as PerformanceEventTiming
          if (evt.duration > 40) {
            // Only log "long" interaction events (> 40 ms = INP candidate)
            appendEntry({
              type: 'inp',
              name: 'interaction',
              startTime: Math.round(evt.startTime),
              duration: Math.round(evt.duration),
              timestamp: new Date().toISOString(),
              meta: { eventType: evt.name },
            })
          }
        }
      }
    })

    _observer.observe({
      type: 'resource',
      buffered: true,
    })
    _observer.observe({ type: 'paint', buffered: true })

    try { _observer.observe({ type: 'largest-contentful-paint', buffered: true }) } catch { /* not supported */ }
    try { _observer.observe({ type: 'first-input', buffered: true }) } catch { /* not supported */ }
    try { _observer.observe({ type: 'layout-shift', buffered: true }) } catch { /* not supported */ }
    try { _observer.observe({ type: 'event', buffered: true, durationThreshold: 40 } as PerformanceObserverInit) } catch { /* not supported */ }
  } catch {
    // PerformanceObserver not available in this environment
  }
}

function stopObservers(): void {
  if (_observer) {
    _observer.disconnect()
    _observer = null
  }
}

// ─── Initialisation ───────────────────────────────────────────────────────────

let _initialized = false

/**
 * Initialise the performance logger.
 * Safe to call multiple times — subsequent calls are no-ops.
 * Call this once on app start when `devTools.performanceLogEnabled` is true.
 */
export function initPerfLog(): void {
  if (_initialized) return
  _initialized = true

  clearPerfLog()
  perfMark('app-init')

  // Capture navigation timing after the load event (data is fully populated then)
  if (document.readyState === 'complete') {
    captureNavigationTiming()
    captureExistingResources()
  } else {
    window.addEventListener('load', () => {
      captureNavigationTiming()
      captureExistingResources()
    }, { once: true })
  }

  startObservers()
}

/**
 * Shut down the performance logger and stop collecting new entries.
 * The existing log entries in sessionStorage are preserved until `clearPerfLog()`.
 */
export function teardownPerfLog(): void {
  stopObservers()
  _initialized = false
}

// ─── Summary helpers ─────────────────────────────────────────────────────────

export interface PerfSummary {
  /** Time to First Byte (ms) from navigation timing */
  ttfb: number | null
  /** First Contentful Paint (ms) */
  fcp: number | null
  /** Largest Contentful Paint (ms) */
  lcp: number | null
  /** First Input Delay (ms) */
  fid: number | null
  /** Cumulative Layout Shift score */
  cls: number | null
  /** Total DOM content loaded time (ms) */
  domContentLoaded: number | null
  /** Total page load time (ms) */
  loadEnd: number | null
  /** Total number of resources loaded */
  resourceCount: number
  /** Total transfer size of all resources (bytes) */
  totalTransferSize: number
  /** Transfer sizes grouped by initiator type */
  byType: Record<string, { count: number; transferSize: number; totalDuration: number }>
  /** Top 10 slowest resources (by duration) */
  slowest: PerfResourceEntry[]
  /** Top 10 largest resources (by transferSize) */
  largest: PerfResourceEntry[]
}

/** Compute a summary object from the current log. */
export function computePerfSummary(entries?: PerfLogEntry[]): PerfSummary {
  const log = entries ?? getPerfLog()

  const nav = log.find((e): e is PerfNavigationEntry => e.type === 'navigation')
  const fcp = log.find((e): e is PerfResourceEntry => e.type === 'paint' && e.name === 'first-contentful-paint')
  const lcp = log.find((e): e is PerfResourceEntry => e.type === 'lcp')
  const fid = log.find((e): e is PerfResourceEntry => e.type === 'fid')
  const clsEntries = log.filter(e => e.type === 'cls')
  const lastCls = clsEntries[clsEntries.length - 1] as PerfResourceEntry | undefined
  const clsValue = lastCls?.meta?.['cumulative'] as number | undefined

  const resources = log.filter((e): e is PerfResourceEntry => e.type === 'resource')

  const byType: PerfSummary['byType'] = {}
  let totalTransferSize = 0

  for (const r of resources) {
    const k = r.initiatorType ?? 'other'
    if (!byType[k]) byType[k] = { count: 0, transferSize: 0, totalDuration: 0 }
    byType[k].count++
    byType[k].transferSize += r.transferSize ?? 0
    byType[k].totalDuration += r.duration
    totalTransferSize += r.transferSize ?? 0
  }

  const slowest = [...resources]
    .sort((a, b) => b.duration - a.duration)
    .slice(0, 10)

  const largest = [...resources]
    .sort((a, b) => (b.transferSize ?? 0) - (a.transferSize ?? 0))
    .slice(0, 10)

  return {
    ttfb: nav?.ttfb ?? null,
    fcp: fcp ? Math.round(fcp.startTime) : null,
    lcp: lcp ? Math.round(lcp.startTime) : null,
    fid: fid ? Math.round(fid.duration) : null,
    cls: clsValue ?? null,
    domContentLoaded: nav?.domContentLoaded ?? null,
    loadEnd: nav?.loadEnd ?? null,
    resourceCount: resources.length,
    totalTransferSize,
    byType,
    slowest,
    largest,
  }
}

/** Format a byte count as a human-readable string (e.g. "128 KB"). */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}
