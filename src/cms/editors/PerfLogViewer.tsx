/**
 * PerfLogViewer — CMS editor panel for the performance log dev-tool.
 *
 * Accessible via: #cms/devtools/perf-log
 *
 * Shows:
 *   - Core Web Vitals summary (TTFB, FCP, LCP, FID, CLS, load time)
 *   - Transfer size breakdown by resource type
 *   - Top 10 slowest resources
 *   - Top 10 largest resources
 *   - Full log table with filter + sort
 *   - Enable/disable toggle (persists to AdminSettings via KV)
 *   - Export to JSON / Clear log buttons
 */

import { useState, useEffect, useCallback } from 'react'
import { useKV } from '@/hooks/use-kv'
import type { AdminSettings } from '@/lib/types'
import {
  getPerfLog,
  clearPerfLog,
  computePerfSummary,
  formatBytes,
  initPerfLog,
  teardownPerfLog,
  type PerfLogEntry,
  type PerfResourceEntry,
  type PerfSummary,
} from '@/lib/perf-log'
import { ArrowsClockwise, DownloadSimple, Trash, Gauge, Table, ChartBar } from '@phosphor-icons/react'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function clsRating(cls: number | null): { label: string; color: string } {
  if (cls === null) return { label: 'N/A', color: 'text-zinc-500' }
  if (cls <= 0.1) return { label: 'Good', color: 'text-green-400' }
  if (cls <= 0.25) return { label: 'Needs Improvement', color: 'text-yellow-400' }
  return { label: 'Poor', color: 'text-red-400' }
}

function webVitalRating(ms: number | null, good: number, poor: number): { label: string; color: string } {
  if (ms === null) return { label: 'N/A', color: 'text-zinc-500' }
  if (ms <= good) return { label: 'Good', color: 'text-green-400' }
  if (ms <= poor) return { label: 'Needs Improvement', color: 'text-yellow-400' }
  return { label: 'Poor', color: 'text-red-400' }
}

function VitalCard({ label, value, rating }: { label: string; value: string; rating: { label: string; color: string } }) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded p-3 space-y-1">
      <div className="font-mono text-[10px] text-zinc-500 uppercase tracking-wider">{label}</div>
      <div className="font-mono text-lg font-bold text-zinc-100">{value}</div>
      <div className={`font-mono text-[10px] ${rating.color}`}>{rating.label}</div>
    </div>
  )
}

type SortField = 'startTime' | 'duration' | 'transferSize' | 'name'
type FilterType = 'all' | 'resource' | 'paint' | 'lcp' | 'fid' | 'cls' | 'inp' | 'mark' | 'measure'
type ViewMode = 'summary' | 'table' | 'breakdown'

// ─── Main Component ───────────────────────────────────────────────────────────

export default function PerfLogViewer() {
  const [adminSettings, setAdminSettings] = useKV<AdminSettings>('admin-settings', {})

  const enabled = adminSettings?.devTools?.performanceLogEnabled ?? false

  const [entries, setEntries] = useState<PerfLogEntry[]>([])
  const [summary, setSummary] = useState<PerfSummary | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('summary')
  const [filter, setFilter] = useState<FilterType>('all')
  const [sortField, setSortField] = useState<SortField>('startTime')
  const [sortAsc, setSortAsc] = useState(true)
  const [search, setSearch] = useState('')

  const refresh = useCallback(() => {
    const log = getPerfLog()
    setEntries(log)
    setSummary(computePerfSummary(log))
  }, [])

  useEffect(() => {
    const initial = setTimeout(refresh, 0)
    const id = setInterval(refresh, 2000)
    return () => {
      clearTimeout(initial)
      clearInterval(id)
    }
  }, [refresh])

  const handleToggle = (next: boolean) => {
    setAdminSettings({
      ...(adminSettings ?? {}),
      devTools: { ...(adminSettings?.devTools ?? {}), performanceLogEnabled: next },
    })
    if (next) {
      initPerfLog()
    } else {
      teardownPerfLog()
    }
  }

  const handleClear = () => {
    clearPerfLog()
    refresh()
  }

  const handleExport = () => {
    const json = JSON.stringify(entries, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `perf-log-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Filter + sort
  const filtered = entries
    .filter(e => {
      if (filter !== 'all' && e.type !== filter) return false
      if (search) {
        const s = search.toLowerCase()
        return e.name.toLowerCase().includes(s)
      }
      return true
    })
    .sort((a, b) => {
      const aVal = (a as unknown as Record<string, unknown>)[sortField] as number | string | undefined ?? 0
      const bVal = (b as unknown as Record<string, unknown>)[sortField] as number | string | undefined ?? 0
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortAsc ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal)
      }
      return sortAsc ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number)
    })

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortAsc(v => !v)
    else { setSortField(field); setSortAsc(true) }
  }

  return (
    <div className="flex flex-col h-full overflow-hidden" data-admin-ui="true">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 flex-shrink-0">
        <div>
          <h2 className="font-mono text-sm font-bold text-zinc-100">Performance Log</h2>
          <p className="font-mono text-[10px] text-zinc-500">
            Dev-only load time diagnostics — {entries.length} entries
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Enable toggle */}
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <span className="font-mono text-xs text-zinc-400">Logging</span>
            <button
              type="button"
              role="switch"
              aria-checked={enabled}
              onClick={() => handleToggle(!enabled)}
              className={`relative w-9 h-5 rounded-full transition-colors ${enabled ? 'bg-red-600' : 'bg-zinc-700'}`}
              aria-label={enabled ? 'Disable performance logging' : 'Enable performance logging'}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${enabled ? 'translate-x-4' : ''}`}
              />
            </button>
            <span className={`font-mono text-[10px] ${enabled ? 'text-green-400' : 'text-zinc-600'}`}>
              {enabled ? 'ON' : 'OFF'}
            </span>
          </label>

          {/* Refresh */}
          <button
            type="button"
            onClick={refresh}
            className="p-1.5 rounded text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
            aria-label="Refresh log"
          >
            <ArrowsClockwise size={14} />
          </button>

          {/* Export */}
          <button
            type="button"
            onClick={handleExport}
            disabled={entries.length === 0}
            className="p-1.5 rounded text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors disabled:opacity-30"
            aria-label="Export log as JSON"
          >
            <DownloadSimple size={14} />
          </button>

          {/* Clear */}
          <button
            type="button"
            onClick={handleClear}
            disabled={entries.length === 0}
            className="p-1.5 rounded text-zinc-500 hover:text-red-400 hover:bg-red-900/20 transition-colors disabled:opacity-30"
            aria-label="Clear log"
          >
            <Trash size={14} />
          </button>
        </div>
      </div>

      {/* View mode tabs */}
      <div className="flex gap-1 px-4 py-2 border-b border-zinc-800 flex-shrink-0">
        {([['summary', <Gauge key="g" size={12} />, 'Summary'] as const,
           ['breakdown', <ChartBar key="c" size={12} />, 'By Type'] as const,
           ['table', <Table key="t" size={12} />, 'Full Log'] as const] as const).map(([mode, icon, label]) => (
          <button
            key={mode}
            type="button"
            onClick={() => setViewMode(mode)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono transition-colors ${
              viewMode === mode
                ? 'bg-red-900/30 text-red-400 border border-red-800/50'
                : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800'
            }`}
          >
            {icon}{label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {!enabled && entries.length === 0 && (
          <div className="flex flex-col items-center justify-center h-64 gap-3 text-zinc-600">
            <Gauge size={32} />
            <p className="font-mono text-sm">Performance logging is disabled.</p>
            <p className="font-mono text-xs">Toggle "Logging ON" above to start collecting data.</p>
          </div>
        )}

        {/* Summary view */}
        {viewMode === 'summary' && (entries.length > 0 || enabled) && summary && (
          <div className="space-y-4">
            {/* Core Web Vitals */}
            <section>
              <h3 className="font-mono text-[10px] text-zinc-500 uppercase tracking-widest mb-2">Core Web Vitals</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
                <VitalCard
                  label="TTFB"
                  value={summary.ttfb !== null ? `${summary.ttfb.toFixed(0)} ms` : 'N/A'}
                  rating={webVitalRating(summary.ttfb, 200, 500)}
                />
                <VitalCard
                  label="FCP"
                  value={summary.fcp !== null ? `${summary.fcp} ms` : 'N/A'}
                  rating={webVitalRating(summary.fcp, 1800, 3000)}
                />
                <VitalCard
                  label="LCP"
                  value={summary.lcp !== null ? `${summary.lcp} ms` : 'N/A'}
                  rating={webVitalRating(summary.lcp, 2500, 4000)}
                />
                <VitalCard
                  label="FID"
                  value={summary.fid !== null ? `${summary.fid} ms` : 'N/A'}
                  rating={webVitalRating(summary.fid, 100, 300)}
                />
                <VitalCard
                  label="CLS"
                  value={summary.cls !== null ? summary.cls.toFixed(3) : 'N/A'}
                  rating={clsRating(summary.cls)}
                />
                <VitalCard
                  label="Load"
                  value={summary.loadEnd !== null ? `${summary.loadEnd.toFixed(0)} ms` : 'N/A'}
                  rating={webVitalRating(summary.loadEnd, 2500, 4000)}
                />
              </div>
            </section>

            {/* Resource summary */}
            <section>
              <h3 className="font-mono text-[10px] text-zinc-500 uppercase tracking-widest mb-2">Resource Overview</h3>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-zinc-900 border border-zinc-800 rounded p-3">
                  <div className="font-mono text-[10px] text-zinc-500">Total Resources</div>
                  <div className="font-mono text-xl font-bold text-zinc-100">{summary.resourceCount}</div>
                </div>
                <div className="bg-zinc-900 border border-zinc-800 rounded p-3">
                  <div className="font-mono text-[10px] text-zinc-500">Total Transfer Size</div>
                  <div className="font-mono text-xl font-bold text-zinc-100">{formatBytes(summary.totalTransferSize)}</div>
                </div>
              </div>
            </section>

            {/* Top slowest */}
            {summary.slowest.length > 0 && (
              <section>
                <h3 className="font-mono text-[10px] text-zinc-500 uppercase tracking-widest mb-2">⏱ Top 10 Slowest Resources</h3>
                <ResourceTable resources={summary.slowest} sortKey="duration" />
              </section>
            )}

            {/* Top largest */}
            {summary.largest.length > 0 && (
              <section>
                <h3 className="font-mono text-[10px] text-zinc-500 uppercase tracking-widest mb-2">📦 Top 10 Largest Resources</h3>
                <ResourceTable resources={summary.largest} sortKey="transferSize" />
              </section>
            )}
          </div>
        )}

        {/* Breakdown by type */}
        {viewMode === 'breakdown' && summary && (
          <div className="space-y-3">
            <h3 className="font-mono text-[10px] text-zinc-500 uppercase tracking-widest">Transfer Size by Resource Type</h3>
            {Object.entries(summary.byType)
              .sort((a, b) => b[1].transferSize - a[1].transferSize)
              .map(([type, data]) => (
                <div key={type} className="bg-zinc-900 border border-zinc-800 rounded p-3 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-zinc-200 capitalize">{type}</span>
                    <span className="font-mono text-xs text-zinc-400">{data.count} files</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div>
                      <div className="font-mono text-[10px] text-zinc-600">Transfer Size</div>
                      <div className="font-mono text-sm text-zinc-200">{formatBytes(data.transferSize)}</div>
                    </div>
                    <div>
                      <div className="font-mono text-[10px] text-zinc-600">Avg Duration</div>
                      <div className="font-mono text-sm text-zinc-200">
                        {data.count > 0 ? `${(data.totalDuration / data.count).toFixed(0)} ms` : 'N/A'}
                      </div>
                    </div>
                  </div>
                  {/* Bar */}
                  <div className="h-1.5 rounded bg-zinc-800 overflow-hidden">
                    <div
                      className="h-full bg-red-600 rounded"
                      style={{
                        width: `${Math.min(100, (data.transferSize / (summary.totalTransferSize || 1)) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
          </div>
        )}

        {/* Full log table */}
        {viewMode === 'table' && (
          <div className="space-y-3">
            {/* Filters */}
            <div className="flex flex-wrap gap-2">
              <input
                type="search"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by name…"
                className="px-2 py-1 bg-zinc-900 border border-zinc-700 rounded text-xs font-mono text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-zinc-500 w-48"
              />
              <select
                value={filter}
                onChange={e => setFilter(e.target.value as FilterType)}
                className="px-2 py-1 bg-zinc-900 border border-zinc-700 rounded text-xs font-mono text-zinc-200 focus:outline-none focus:border-zinc-500"
              >
                <option value="all">All types</option>
                <option value="navigation">navigation</option>
                <option value="resource">resource</option>
                <option value="paint">paint</option>
                <option value="lcp">lcp</option>
                <option value="fid">fid</option>
                <option value="cls">cls</option>
                <option value="inp">inp</option>
                <option value="mark">mark</option>
                <option value="measure">measure</option>
              </select>
              <span className="font-mono text-[10px] text-zinc-600 self-center">{filtered.length} entries</span>
            </div>

            {/* Table */}
            <div className="overflow-x-auto rounded border border-zinc-800">
              <table className="w-full text-xs font-mono">
                <thead>
                  <tr className="border-b border-zinc-800 bg-zinc-900/60">
                    <SortTh label="Type" field="name" current={sortField} asc={sortAsc} onSort={toggleSort} className="w-20" />
                    <SortTh label="Name" field="name" current={sortField} asc={sortAsc} onSort={toggleSort} />
                    <SortTh label="Start (ms)" field="startTime" current={sortField} asc={sortAsc} onSort={toggleSort} className="w-24 text-right" />
                    <SortTh label="Duration (ms)" field="duration" current={sortField} asc={sortAsc} onSort={toggleSort} className="w-28 text-right" />
                    <SortTh label="Size" field="transferSize" current={sortField} asc={sortAsc} onSort={toggleSort} className="w-20 text-right" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={5} className="text-center text-zinc-600 py-6">No entries</td>
                    </tr>
                  )}
                  {filtered.map((e, i) => {
                    const res = e as PerfResourceEntry
                    return (
                      <tr
                        key={i}
                        className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors"
                      >
                        <td className="px-2 py-1.5">
                          <span className={`px-1 rounded text-[9px] uppercase tracking-wider ${typeColor(e.type)}`}>
                            {e.type}
                          </span>
                        </td>
                        <td className="px-2 py-1.5 text-zinc-300 max-w-xs truncate" title={e.name}>
                          {shortName(e.name)}
                        </td>
                        <td className="px-2 py-1.5 text-zinc-400 text-right">{Math.round(e.startTime)}</td>
                        <td className={`px-2 py-1.5 text-right font-bold ${durationColor(e.duration)}`}>
                          {Math.round(e.duration)}
                        </td>
                        <td className="px-2 py-1.5 text-zinc-400 text-right">
                          {res.transferSize !== undefined ? formatBytes(res.transferSize) : '—'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function ResourceTable({ resources, sortKey: _sortKey }: { resources: PerfResourceEntry[]; sortKey: 'duration' | 'transferSize' }) {
  return (
    <div className="overflow-x-auto rounded border border-zinc-800">
      <table className="w-full text-xs font-mono">
        <thead>
          <tr className="border-b border-zinc-800 bg-zinc-900/60">
            <th className="px-2 py-1.5 text-left text-zinc-500 font-normal">Name</th>
            <th className="px-2 py-1.5 text-left text-zinc-500 font-normal">Type</th>
            <th className="px-2 py-1.5 text-right text-zinc-500 font-normal">Duration</th>
            <th className="px-2 py-1.5 text-right text-zinc-500 font-normal">Size</th>
          </tr>
        </thead>
        <tbody>
          {resources.map((r, i) => (
            <tr key={i} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
              <td className="px-2 py-1.5 text-zinc-300 max-w-xs truncate" title={r.name}>{shortName(r.name)}</td>
              <td className="px-2 py-1.5 text-zinc-500">{r.initiatorType ?? '—'}</td>
              <td className={`px-2 py-1.5 text-right font-bold ${durationColor(r.duration)}`}>{Math.round(r.duration)} ms</td>
              <td className="px-2 py-1.5 text-right text-zinc-400">{r.transferSize !== undefined ? formatBytes(r.transferSize) : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function SortTh({
  label, field, current, asc, onSort, className,
}: {
  label: string
  field: SortField
  current: SortField
  asc: boolean
  onSort: (f: SortField) => void
  className?: string
}) {
  const isActive = field === current
  return (
    <th
      className={`px-2 py-1.5 text-left text-zinc-500 font-normal cursor-pointer hover:text-zinc-300 transition-colors select-none ${className ?? ''}`}
      onClick={() => onSort(field)}
    >
      {label}{isActive ? (asc ? ' ▲' : ' ▼') : ''}
    </th>
  )
}

function typeColor(type: string): string {
  const map: Record<string, string> = {
    navigation: 'bg-blue-900/50 text-blue-300',
    resource: 'bg-zinc-800 text-zinc-400',
    paint: 'bg-green-900/50 text-green-300',
    lcp: 'bg-purple-900/50 text-purple-300',
    fid: 'bg-yellow-900/50 text-yellow-300',
    cls: 'bg-orange-900/50 text-orange-300',
    inp: 'bg-red-900/50 text-red-300',
    mark: 'bg-zinc-800 text-zinc-300',
    measure: 'bg-zinc-800 text-zinc-300',
  }
  return map[type] ?? 'bg-zinc-800 text-zinc-400'
}

function durationColor(ms: number): string {
  if (ms < 100) return 'text-green-400'
  if (ms < 500) return 'text-yellow-400'
  return 'text-red-400'
}

function shortName(url: string): string {
  try {
    const u = new URL(url)
    const path = u.pathname
    const parts = path.split('/')
    return parts[parts.length - 1] || path || url
  } catch {
    // Not a URL (e.g. mark name)
    return url.length > 60 ? url.slice(0, 57) + '…' : url
  }
}
