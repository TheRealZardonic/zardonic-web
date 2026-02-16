import { useState, useEffect, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Trash, Eye, CursorClick, X } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'

interface AnalyticsData {
  pageViews: number
  sectionViews: Record<string, number>
  clicks: Record<string, number>
  visitors: string[]
}

interface StatsDashboardProps {
  open: boolean
  onClose: () => void
}

function getAnalyticsData(): AnalyticsData {
  try {
    const stored = localStorage.getItem('zardonic-analytics')
    if (stored) {
      return JSON.parse(stored)
    }
  } catch {
    // ignore parse errors
  }
  return { pageViews: 0, sectionViews: {}, clicks: {}, visitors: [] }
}

function CornerDecoration({ position }: { position: 'tl' | 'tr' | 'bl' | 'br' }) {
  const classes: Record<string, string> = {
    tl: 'top-0 left-0 border-t-2 border-l-2',
    tr: 'top-0 right-0 border-t-2 border-r-2',
    bl: 'bottom-0 left-0 border-b-2 border-l-2',
    br: 'bottom-0 right-0 border-b-2 border-r-2',
  }
  return (
    <div
      className={`absolute w-4 h-4 border-primary/50 ${classes[position]}`}
    />
  )
}

function BarChart({ data, color }: { data: Record<string, number>; color: string }) {
  const sorted = useMemo(
    () => Object.entries(data).sort(([, a], [, b]) => b - a).slice(0, 10),
    [data],
  )
  const max = useMemo(() => Math.max(...sorted.map(([, v]) => v), 1), [sorted])

  if (sorted.length === 0) {
    return <p className="text-xs text-muted-foreground font-mono">No data yet</p>
  }

  return (
    <div className="space-y-2">
      {sorted.map(([label, value]) => (
        <div key={label} className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground font-mono w-28 truncate text-right shrink-0">
            {label}
          </span>
          <div className="flex-1 h-5 bg-secondary/50 relative overflow-hidden">
            <motion.div
              className={`h-full ${color}`}
              initial={{ width: 0 }}
              animate={{ width: `${(value / max) * 100}%` }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
            />
          </div>
          <span className="text-xs text-primary font-mono w-10 text-right shrink-0">
            {value}
          </span>
        </div>
      ))}
    </div>
  )
}

export default function StatsDashboard({ open, onClose }: StatsDashboardProps) {
  const [data, setData] = useState<AnalyticsData>(getAnalyticsData)

  const reload = useCallback(() => setData(getAnalyticsData()), [])

  useEffect(() => {
    if (open) reload()
  }, [open, reload])

  useEffect(() => {
    if (!open) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  const totalSectionViews = useMemo(
    () => Object.values(data.sectionViews).reduce((a, b) => a + b, 0),
    [data.sectionViews],
  )

  const totalClicks = useMemo(
    () => Object.values(data.clicks).reduce((a, b) => a + b, 0),
    [data.clicks],
  )

  const topSections = useMemo(
    () => Object.entries(data.sectionViews).sort(([, a], [, b]) => b - a).slice(0, 5),
    [data.sectionViews],
  )

  const topClicks = useMemo(
    () => Object.entries(data.clicks).sort(([, a], [, b]) => b - a).slice(0, 5),
    [data.clicks],
  )

  const handleReset = () => {
    try {
      localStorage.removeItem('zardonic-analytics')
    } catch {
      // ignore storage errors
    }
    reload()
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[10000] bg-background/95 backdrop-blur-sm flex items-start justify-center p-4 pt-8 overflow-y-auto font-mono"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="stats-dashboard-title"
            className="w-full max-w-4xl bg-card border-2 border-primary/30 relative overflow-hidden"
            initial={{ scale: 0.9, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, y: 20, opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={(e) => e.stopPropagation()}
          >
            <CornerDecoration position="tl" />
            <CornerDecoration position="tr" />
            <CornerDecoration position="bl" />
            <CornerDecoration position="br" />

            {/* Header */}
            <div className="h-12 bg-primary/10 border-b border-primary/30 flex items-center justify-between px-4">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                <span id="stats-dashboard-title" className="text-xs text-primary/70 tracking-wider uppercase">
                  ANALYTICS DASHBOARD
                </span>
              </div>
              <button onClick={onClose} aria-label="Close analytics dashboard" className="text-primary/60 hover:text-primary p-1">
                <X size={20} />
              </button>
            </div>

            {/* Stats summary */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 border-b border-primary/20">
              <div className="bg-secondary/30 border border-primary/20 p-4 relative">
                <CornerDecoration position="tl" />
                <CornerDecoration position="br" />
                <div className="flex items-center gap-2 text-primary/60 mb-2">
                  <Eye size={16} />
                  <span className="text-[10px] tracking-wider uppercase">Page Views</span>
                </div>
                <p className="text-2xl text-primary">{data.pageViews}</p>
              </div>
              <div className="bg-secondary/30 border border-primary/20 p-4 relative">
                <CornerDecoration position="tl" />
                <CornerDecoration position="br" />
                <div className="flex items-center gap-2 text-primary/60 mb-2">
                  <Eye size={16} />
                  <span className="text-[10px] tracking-wider uppercase">Section Views</span>
                </div>
                <p className="text-2xl text-primary">{totalSectionViews}</p>
              </div>
              <div className="bg-secondary/30 border border-primary/20 p-4 relative">
                <CornerDecoration position="tl" />
                <CornerDecoration position="br" />
                <div className="flex items-center gap-2 text-primary/60 mb-2">
                  <CursorClick size={16} />
                  <span className="text-[10px] tracking-wider uppercase">Total Clicks</span>
                </div>
                <p className="text-2xl text-primary">{totalClicks}</p>
              </div>
            </div>

            {/* Charts */}
            <div className="max-h-[55vh] overflow-y-auto p-4 space-y-6">
              {/* Section Views Chart */}
              <div>
                <h3 className="text-xs text-primary/60 tracking-wider uppercase mb-3 border-b border-primary/10 pb-1">
                  {'>'} Section Views
                </h3>
                <BarChart data={data.sectionViews} color="bg-primary/70" />
              </div>

              {/* Clicks Chart */}
              <div>
                <h3 className="text-xs text-primary/60 tracking-wider uppercase mb-3 border-b border-primary/10 pb-1">
                  {'>'} Click Events
                </h3>
                <BarChart data={data.clicks} color="bg-accent/70" />
              </div>

              {/* Top lists */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <h3 className="text-xs text-primary/60 tracking-wider uppercase mb-3 border-b border-primary/10 pb-1">
                    {'>'} Top Sections
                  </h3>
                  {topSections.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No data yet</p>
                  ) : (
                    <ol className="space-y-1">
                      {topSections.map(([name, count], i) => (
                        <li key={name} className="flex items-center gap-2 text-xs">
                          <span className="text-primary/40 w-4 text-right">{i + 1}.</span>
                          <span className="text-foreground/80 flex-1 truncate">{name}</span>
                          <span className="text-primary">{count}</span>
                        </li>
                      ))}
                    </ol>
                  )}
                </div>
                <div>
                  <h3 className="text-xs text-primary/60 tracking-wider uppercase mb-3 border-b border-primary/10 pb-1">
                    {'>'} Top Clicked Elements
                  </h3>
                  {topClicks.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No data yet</p>
                  ) : (
                    <ol className="space-y-1">
                      {topClicks.map(([name, count], i) => (
                        <li key={name} className="flex items-center gap-2 text-xs">
                          <span className="text-primary/40 w-4 text-right">{i + 1}.</span>
                          <span className="text-foreground/80 flex-1 truncate">{name}</span>
                          <span className="text-primary">{count}</span>
                        </li>
                      ))}
                    </ol>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-primary/20 flex items-center justify-between">
              <Button
                variant="outline"
                size="sm"
                onClick={handleReset}
                className="gap-1 text-xs border-primary/30 text-destructive hover:text-destructive"
              >
                <Trash size={14} />
                Reset Analytics
              </Button>
              <Button variant="outline" size="sm" onClick={onClose}>
                Close
              </Button>
            </div>

            {/* Active indicator */}
            <div className="h-8 bg-primary/5 border-t border-primary/10 flex items-center justify-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              <span className="text-[10px] text-primary/40 tracking-widest uppercase">
                Analytics Module Active
              </span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
