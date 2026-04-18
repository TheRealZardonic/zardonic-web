/**
 * Unit tests for src/lib/perf-log.ts
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  getPerfLog,
  clearPerfLog,
  perfMark,
  computePerfSummary,
  formatBytes,
  initPerfLog,
  teardownPerfLog,
} from '@/lib/perf-log'

// ─── sessionStorage mock ──────────────────────────────────────────────────────

const sessionStorageStore: Record<string, string> = {}

beforeEach(() => {
  // Clear in-memory store before each test
  Object.keys(sessionStorageStore).forEach(k => delete sessionStorageStore[k])

  vi.stubGlobal('sessionStorage', {
    getItem: (k: string) => sessionStorageStore[k] ?? null,
    setItem: (k: string, v: string) => { sessionStorageStore[k] = v },
    removeItem: (k: string) => { delete sessionStorageStore[k] },
    clear: () => { Object.keys(sessionStorageStore).forEach(k => delete sessionStorageStore[k]) },
  })

  // Reset perf-log module internals between tests (teardown resets _initialized)
  teardownPerfLog()
})

afterEach(() => {
  teardownPerfLog()
  vi.unstubAllGlobals()
})

// ─── formatBytes ─────────────────────────────────────────────────────────────

describe('formatBytes', () => {
  it('returns "0 B" for zero', () => {
    expect(formatBytes(0)).toBe('0 B')
  })

  it('formats bytes < 1024 as "X B"', () => {
    expect(formatBytes(512)).toBe('512 B')
  })

  it('formats bytes >= 1024 as "X.X KB"', () => {
    expect(formatBytes(2048)).toBe('2.0 KB')
  })

  it('formats bytes >= 1 MB', () => {
    expect(formatBytes(1.5 * 1024 * 1024)).toBe('1.50 MB')
  })
})

// ─── clearPerfLog / getPerfLog ────────────────────────────────────────────────

describe('clearPerfLog / getPerfLog', () => {
  it('returns empty array when nothing is stored', () => {
    expect(getPerfLog()).toEqual([])
  })

  it('clears log entries', () => {
    perfMark('test-mark')
    expect(getPerfLog().length).toBeGreaterThan(0)
    clearPerfLog()
    expect(getPerfLog()).toEqual([])
  })
})

// ─── perfMark ─────────────────────────────────────────────────────────────────

describe('perfMark', () => {
  it('appends a mark entry to the log', () => {
    perfMark('my-mark')
    const log = getPerfLog()
    expect(log).toHaveLength(1)
    expect(log[0].type).toBe('mark')
    expect(log[0].name).toBe('my-mark')
  })

  it('stores a timestamp as ISO string', () => {
    perfMark('ts-test')
    const entry = getPerfLog()[0]
    expect(entry.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/)
  })

  it('appending multiple marks preserves order', () => {
    perfMark('first')
    perfMark('second')
    perfMark('third')
    const names = getPerfLog().map(e => e.name)
    expect(names).toEqual(['first', 'second', 'third'])
  })
})

// ─── computePerfSummary ────────────────────────────────────────────────────────

describe('computePerfSummary', () => {
  it('returns null vitals when log is empty', () => {
    const s = computePerfSummary([])
    expect(s.ttfb).toBeNull()
    expect(s.fcp).toBeNull()
    expect(s.lcp).toBeNull()
    expect(s.fid).toBeNull()
    expect(s.cls).toBeNull()
    expect(s.resourceCount).toBe(0)
    expect(s.totalTransferSize).toBe(0)
  })

  it('computes resource count and transfer size from resource entries', () => {
    const entries = [
      {
        type: 'resource' as const,
        name: '/js/main.js',
        initiatorType: 'script',
        startTime: 100,
        duration: 200,
        transferSize: 50000,
        decodedBodySize: 120000,
        timestamp: new Date().toISOString(),
      },
      {
        type: 'resource' as const,
        name: '/css/styles.css',
        initiatorType: 'link',
        startTime: 50,
        duration: 80,
        transferSize: 10000,
        decodedBodySize: 25000,
        timestamp: new Date().toISOString(),
      },
    ]

    const s = computePerfSummary(entries)
    expect(s.resourceCount).toBe(2)
    expect(s.totalTransferSize).toBe(60000)
    expect(s.byType['script']).toEqual({
      count: 1,
      transferSize: 50000,
      totalDuration: 200,
    })
    expect(s.byType['link']).toEqual({
      count: 1,
      transferSize: 10000,
      totalDuration: 80,
    })
  })

  it('identifies slowest and largest resources', () => {
    const mkResource = (name: string, duration: number, transferSize: number) => ({
      type: 'resource' as const,
      name,
      initiatorType: 'fetch',
      startTime: 0,
      duration,
      transferSize,
      decodedBodySize: transferSize,
      timestamp: new Date().toISOString(),
    })

    const entries = [
      mkResource('a', 500, 1000),
      mkResource('b', 1500, 2000),
      mkResource('c', 200, 5000),
    ]

    const s = computePerfSummary(entries)
    expect(s.slowest[0].name).toBe('b') // highest duration
    expect(s.largest[0].name).toBe('c') // highest transferSize
  })

  it('extracts FCP from paint entries', () => {
    const entries = [
      {
        type: 'paint' as const,
        name: 'first-contentful-paint',
        startTime: 1200,
        duration: 0,
        timestamp: new Date().toISOString(),
      },
    ]
    const s = computePerfSummary(entries)
    expect(s.fcp).toBe(1200)
  })

  it('extracts LCP from lcp entries', () => {
    const entries = [
      {
        type: 'lcp' as const,
        name: 'largest-contentful-paint',
        startTime: 2400,
        duration: 0,
        timestamp: new Date().toISOString(),
        meta: { size: 5000, element: 'IMG', url: '/hero.jpg' },
      },
    ]
    const s = computePerfSummary(entries)
    expect(s.lcp).toBe(2400)
  })

  it('reads cumulative CLS from cls entries', () => {
    const entries = [
      {
        type: 'cls' as const,
        name: 'cumulative-layout-shift',
        startTime: 500,
        duration: 0,
        timestamp: new Date().toISOString(),
        meta: { shift: 0.05, cumulative: 0.05 },
      },
      {
        type: 'cls' as const,
        name: 'cumulative-layout-shift',
        startTime: 800,
        duration: 0,
        timestamp: new Date().toISOString(),
        meta: { shift: 0.03, cumulative: 0.08 },
      },
    ]
    const s = computePerfSummary(entries)
    expect(s.cls).toBeCloseTo(0.08)
  })
})

// ─── initPerfLog + teardownPerfLog ────────────────────────────────────────────

describe('initPerfLog / teardownPerfLog', () => {
  it('clears the log on init', () => {
    perfMark('pre-init')
    expect(getPerfLog()).toHaveLength(1)

    // Stub performance API for initPerfLog
    vi.stubGlobal('performance', {
      now: () => 0,
      mark: vi.fn(),
      measure: vi.fn(),
      getEntriesByName: () => [],
      getEntriesByType: () => [],
    })
    vi.stubGlobal('PerformanceObserver', class {
      observe() {}
      disconnect() {}
    })

    initPerfLog()
    // Log should be cleared (initPerfLog calls clearPerfLog), then a 'mark' for 'app-init' is added
    const log = getPerfLog()
    const hasAppInit = log.some(e => e.name === 'app-init')
    expect(hasAppInit).toBe(true)
    // The pre-init mark should be gone
    const hasPreInit = log.some(e => e.name === 'pre-init')
    expect(hasPreInit).toBe(false)
  })

  it('teardown resets initialized state so init can be called again', () => {
    vi.stubGlobal('performance', {
      now: () => 0,
      mark: vi.fn(),
      measure: vi.fn(),
      getEntriesByName: () => [],
      getEntriesByType: () => [],
    })
    vi.stubGlobal('PerformanceObserver', class {
      observe() {}
      disconnect() {}
    })

    initPerfLog()
    teardownPerfLog()
    // Should not throw when called again after teardown
    initPerfLog()
    const log = getPerfLog()
    expect(log.some(e => e.name === 'app-init')).toBe(true)
  })
})
