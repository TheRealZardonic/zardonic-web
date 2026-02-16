import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Trash, Eye, CursorClick, X, ArrowSquareOut, DeviceMobile, Desktop, Globe, Browser } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { getAnalyticsData, resetAnalytics } from '@/hooks/use-analytics'
import type { AnalyticsData, HeatmapPoint } from '@/hooks/use-analytics'

interface StatsDashboardProps {
  open: boolean
  onClose: () => void
}

function CornerDecoration({ position }: { position: 'tl' | 'tr' | 'bl' | 'br' }) {
  const classes: Record<string, string> = {
    tl: 'top-0 left-0 border-t-2 border-l-2',
    tr: 'top-0 right-0 border-t-2 border-r-2',
    bl: 'bottom-0 left-0 border-b-2 border-l-2',
    br: 'bottom-0 right-0 border-b-2 border-r-2',
  }
  return <div className={`absolute w-4 h-4 border-primary/50 ${classes[position]}`} />
}

function StatCard({ icon: Icon, label, value, sublabel }: { icon: React.ComponentType<{ size: number }>; label: string; value: number | string; sublabel?: string }) {
  return (
    <div className="bg-secondary/30 border border-primary/20 p-4 relative">
      <CornerDecoration position="tl" />
      <CornerDecoration position="br" />
      <div className="flex items-center gap-2 text-primary/60 mb-2">
        <Icon size={16} />
        <span className="text-[10px] tracking-wider uppercase">{label}</span>
      </div>
      <p className="text-2xl text-primary">{value}</p>
      {sublabel && <p className="text-[9px] text-primary/40 mt-1">{sublabel}</p>}
    </div>
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

function TopList({ items, limit = 5 }: { items: Record<string, number>; limit?: number }) {
  const sorted = Object.entries(items)
    .sort(([, a], [, b]) => b - a)
    .slice(0, limit)

  if (sorted.length === 0) {
    return <p className="text-[10px] text-primary/30 font-mono">NO DATA YET</p>
  }

  const max = sorted[0][1]

  return (
    <div className="space-y-1.5">
      {sorted.map(([name, count]) => (
        <div key={name} className="space-y-0.5">
          <div className="flex justify-between text-[10px] font-mono">
            <span className="text-foreground/70 truncate mr-2">{name}</span>
            <span className="text-primary/60 flex-shrink-0">{count}</span>
          </div>
          <div className="h-[3px] bg-primary/10 overflow-hidden">
            <div className="h-full bg-primary/50" style={{ width: `${(count / max) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  )
}

function HeatmapCanvas({ points }: { points: HeatmapPoint[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || points.length === 0) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const w = canvas.width
    const h = canvas.height
    ctx.clearRect(0, 0, w, h)

    // Draw grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)'
    ctx.lineWidth = 1
    for (let i = 1; i < 4; i++) {
      ctx.beginPath()
      ctx.moveTo((w / 4) * i, 0)
      ctx.lineTo((w / 4) * i, h)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(0, (h / 4) * i)
      ctx.lineTo(w, (h / 4) * i)
      ctx.stroke()
    }

    ctx.font = '9px monospace'
    ctx.fillStyle = 'rgba(255, 255, 255, 0.25)'
    ctx.fillText('TOP-LEFT', 4, 12)
    ctx.textAlign = 'right'
    ctx.fillText('TOP-RIGHT', w - 4, 12)
    ctx.fillText('BOTTOM-RIGHT', w - 4, h - 4)
    ctx.textAlign = 'left'
    ctx.fillText('BOTTOM-LEFT', 4, h - 4)

    // Draw each point as a radial gradient
    for (const p of points) {
      const px = p.x * w
      const py = p.y * h
      const radius = 12
      const gradient = ctx.createRadialGradient(px, py, 0, px, py, radius)
      gradient.addColorStop(0, 'rgba(255, 0, 0, 0.3)')
      gradient.addColorStop(1, 'rgba(255, 0, 0, 0)')
      ctx.beginPath()
      ctx.fillStyle = gradient
      ctx.arc(px, py, radius, 0, Math.PI * 2)
      ctx.fill()
    }
  }, [points])

  useEffect(() => {
    draw()
  }, [draw])

  if (points.length === 0) {
    return <p className="text-[10px] text-primary/30 font-mono">NO HEATMAP DATA YET</p>
  }

  return (
    <div className="space-y-2">
      <canvas
        ref={canvasRef}
        width={600}
        height={400}
        className="w-full h-64 border border-primary/10 bg-black/50"
      />
      <div className="flex items-center gap-4 text-[9px] font-mono text-primary/40">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full" style={{ background: 'radial-gradient(rgba(255,0,0,0.6), rgba(255,0,0,0))' }} />
          <span>HIGH ACTIVITY</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full" style={{ background: 'radial-gradient(rgba(255,0,0,0.2), rgba(255,0,0,0))' }} />
          <span>LOW ACTIVITY</span>
        </div>
        <span className="ml-auto">X/Y = viewport position ratio</span>
      </div>
    </div>
  )
}

function ClickTable({ points }: { points: HeatmapPoint[] }) {
  const elementCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const p of points) {
      const key = p.el || 'unknown'
      counts[key] = (counts[key] || 0) + 1
    }
    return Object.entries(counts).sort(([, a], [, b]) => b - a)
  }, [points])

  if (elementCounts.length === 0) {
    return <p className="text-[10px] text-primary/30 font-mono">NO CLICK DATA YET</p>
  }

  const total = elementCounts.reduce((sum, [, c]) => sum + c, 0)

  return (
    <div className="border border-primary/10 overflow-hidden">
      <table className="w-full text-[10px] font-mono">
        <thead>
          <tr className="bg-primary/10 text-primary/70">
            <th className="text-left px-3 py-1.5 tracking-wider">ELEMENT</th>
            <th className="text-right px-3 py-1.5 tracking-wider">CLICKS</th>
            <th className="text-right px-3 py-1.5 tracking-wider">%</th>
          </tr>
        </thead>
        <tbody>
          {elementCounts.map(([el, count]) => (
            <tr key={el} className="border-t border-primary/5 hover:bg-primary/5 transition-colors">
              <td className="px-3 py-1 text-foreground/70 uppercase">{el}</td>
              <td className="px-3 py-1 text-right text-foreground/60">{count}</td>
              <td className="px-3 py-1 text-right text-primary/50">{((count / total) * 100).toFixed(1)}%</td>
            </tr>
          ))}
          <tr className="border-t border-primary/20 bg-primary/5">
            <td className="px-3 py-1 text-foreground/80 font-bold">TOTAL</td>
            <td className="px-3 py-1 text-right text-foreground/80 font-bold">{total}</td>
            <td className="px-3 py-1 text-right text-primary/60">100%</td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}

export default function StatsDashboard({ open, onClose }: StatsDashboardProps) {
  const [data, setData] = useState<AnalyticsData>({
    pageViews: 0,
    sectionViews: {},
    clicks: {},
    visitors: [],
    redirects: {},
    devices: {},
    referrers: {},
    browsers: {},
    screenResolutions: {},
    heatmap: [],
    countries: {},
    languages: {},
  })
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      const analyticsData = await getAnalyticsData()
      setData(analyticsData)
    } catch (error) {
      console.error('[StatsDashboard] Failed to load analytics:', error)
    } finally {
      setLoading(false)
    }
  }, [])

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

  const totalRedirects = useMemo(
    () => Object.values(data.redirects).reduce((a, b) => a + b, 0),
    [data.redirects],
  )

  const handleReset = async () => {
    await resetAnalytics()
    await reload()
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
                  SITE ANALYTICS // ADMIN DASHBOARD
                </span>
              </div>
              <button onClick={onClose} aria-label="Close analytics dashboard" className="text-primary/60 hover:text-primary p-1">
                <X size={20} />
              </button>
            </div>

            {/* Stats summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 border-b border-primary/20">
              <StatCard icon={Eye} label="Page Views" value={data.pageViews} sublabel={data.firstTracked ? `Since ${data.firstTracked}` : undefined} />
              <StatCard icon={Eye} label="Section Views" value={totalSectionViews} />
              <StatCard icon={CursorClick} label="Total Clicks" value={totalClicks} />
              <StatCard icon={ArrowSquareOut} label="Redirects" value={totalRedirects} />
            </div>

            {/* Content */}
            <div className="max-h-[60vh] overflow-y-auto p-4 space-y-6">
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

              {/* Redirects */}
              {Object.keys(data.redirects).length > 0 && (
                <div>
                  <h3 className="text-xs text-primary/60 tracking-wider uppercase mb-3 border-b border-primary/10 pb-1">
                    <ArrowSquareOut size={12} className="inline mr-1" /> Outbound Redirects
                  </h3>
                  <TopList items={data.redirects} />
                </div>
              )}

              {/* Breakdown grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {/* Countries */}
                {Object.keys(data.countries).length > 0 && (
                  <div className="space-y-3 sm:col-span-2">
                    <h3 className="text-xs text-primary/60 tracking-wider uppercase border-b border-primary/10 pb-1">
                      <Globe size={12} className="inline mr-1" /> Visitor Countries
                    </h3>
                    <BarChart data={data.countries} color="bg-primary/70" />
                  </div>
                )}

                {/* Languages */}
                {Object.keys(data.languages || {}).length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-xs text-primary/60 tracking-wider uppercase border-b border-primary/10 pb-1">
                      {'>'} Languages
                    </h3>
                    <TopList items={data.languages || {}} />
                  </div>
                )}

                {/* Devices */}
                <div className="space-y-3">
                  <h3 className="text-xs text-primary/60 tracking-wider uppercase border-b border-primary/10 pb-1">
                    {'>'} Devices
                  </h3>
                  {Object.keys(data.devices).length === 0 ? (
                    <p className="text-[10px] text-primary/30 font-mono">NO DATA YET</p>
                  ) : (
                    <div className="flex gap-4">
                      {Object.entries(data.devices).map(([device, count]) => (
                        <div key={device} className="flex items-center gap-2">
                          {device === 'mobile' ? <DeviceMobile size={16} className="text-primary/60" /> : <Desktop size={16} className="text-primary/60" />}
                          <div>
                            <p className="text-xs text-foreground/80 capitalize">{device}</p>
                            <p className="text-[9px] text-primary/40">{count} visits</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Referrers */}
                <div className="space-y-3">
                  <h3 className="text-xs text-primary/60 tracking-wider uppercase border-b border-primary/10 pb-1">
                    <Globe size={12} className="inline mr-1" /> Traffic Sources
                  </h3>
                  <TopList items={data.referrers} />
                </div>

                {/* Browsers */}
                {Object.keys(data.browsers).length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-xs text-primary/60 tracking-wider uppercase border-b border-primary/10 pb-1">
                      <Browser size={12} className="inline mr-1" /> Browsers
                    </h3>
                    <TopList items={data.browsers} />
                  </div>
                )}

                {/* Screen Resolutions */}
                {Object.keys(data.screenResolutions).length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-xs text-primary/60 tracking-wider uppercase border-b border-primary/10 pb-1">
                      {'>'} Screen Resolutions
                    </h3>
                    <TopList items={data.screenResolutions} />
                  </div>
                )}
              </div>

              {/* Heatmap */}
              <div className="space-y-3">
                <h3 className="text-xs text-primary/60 tracking-wider uppercase border-b border-primary/10 pb-1">
                  {'>'} Click Heatmap // {data.heatmap.length} Points
                </h3>
                <p className="text-[9px] font-mono text-primary/30">
                  Shows where users click on the page. Red areas = more clicks.
                </p>
                <HeatmapCanvas points={data.heatmap} />
              </div>

              {/* Click table by element */}
              <div className="space-y-3">
                <h3 className="text-xs text-primary/60 tracking-wider uppercase border-b border-primary/10 pb-1">
                  {'>'} Clicks by Button / Element
                </h3>
                <ClickTable points={data.heatmap} />
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
              <div className="text-[9px] text-primary/40">
                {data.firstTracked && <span>Data since {data.firstTracked}</span>}
              </div>
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
