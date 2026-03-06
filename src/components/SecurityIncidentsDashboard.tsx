import { motion } from 'framer-motion'
import { Trash, ShieldWarning, Globe, Clock, User, Hash, Eye, ShieldCheck, CaretDown, CaretUp, X } from '@phosphor-icons/react'
import { Dialog, DialogClose, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { useState, useEffect } from 'react'

export interface SecurityIncident {
  key: string
  method: string
  hashedIp: string
  userAgent: string
  timestamp: string
  threatScore?: number
  threatLevel?: string
  countermeasure?: string
  countermeasureDetails?: string
  autoBlocked?: boolean
  blockExpiry?: string
}

interface SecurityIncidentsDashboardProps {
  open: boolean
  onClose: () => void
  onViewProfile?: (hashedIp: string) => void
}

/** Classify incident type from the key field */
export function classifyIncident(key: string): { type: string; label: string; color: string } {
  if (key.startsWith('robots:')) return { type: 'robots', label: 'ROBOTS.TXT VIOLATION', color: 'text-orange-400' }
  if (key.startsWith('threat:')) return { type: 'threat', label: 'THREAT ESCALATION', color: 'text-purple-400' }
  if (key.startsWith('blocked:')) return { type: 'blocked', label: 'HARD BLOCK', color: 'text-red-600' }
  if (key.includes('backup') || key.includes('credential') || key.includes('master-key') || key.includes('password'))
    return { type: 'honeytoken', label: 'HONEYTOKEN ACCESS', color: 'text-red-400' }
  return { type: 'event', label: 'SECURITY EVENT', color: 'text-yellow-400' }
}

/** Shorten hashed IP for display */
function shortHash(hash: string): string {
  if (!hash || hash.length < 12) return hash || '—'
  return `${hash.slice(0, 8)}…${hash.slice(-4)}`
}

export function classifyCountermeasure(incident: SecurityIncident): string {
  if (incident.autoBlocked) return 'BLOCKED'
  if (incident.countermeasure) return incident.countermeasure
  if (incident.threatLevel === 'BLOCK') return 'BLOCKED'
  if (incident.threatLevel === 'TARPIT') return 'TARPITTED'
  if (incident.threatLevel === 'WARN') return 'RATE_LIMITED'
  if (incident.key.startsWith('blocked:')) return 'BLOCKED'
  if (incident.key.startsWith('threat:')) return 'TARPITTED'
  return 'LOGGED'
}

/** Format timestamp for display */
function formatTime(ts: string): string {
  try {
    const d = new Date(ts)
    return d.toLocaleString('en-GB', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    })
  } catch {
    return ts
  }
}

export default function SecurityIncidentsDashboard({ open, onClose, onViewProfile }: SecurityIncidentsDashboardProps) {
  const [incidents, setIncidents] = useState<SecurityIncident[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'honeytoken' | 'robots'>('all')
  const [expandedKey, setExpandedKey] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setLoading(true)
    setError(null)
    fetch('/api/security-incidents', { credentials: 'same-origin' })
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
      .then(data => setIncidents(data.incidents || []))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [open])

  const filteredIncidents = incidents.filter(inc => {
    if (filter === 'all') return true
    if (filter === 'honeytoken') return !inc.key.startsWith('robots:')
    if (filter === 'robots') return inc.key.startsWith('robots:')
    return true
  })

  // Aggregate stats
  const uniqueIps = new Set(incidents.map(i => i.hashedIp)).size
  const honeytokenCount = incidents.filter(i => !i.key.startsWith('robots:')).length
  const robotsCount = incidents.filter(i => i.key.startsWith('robots:')).length
  const autoBlockedCount = incidents.filter(i => i.autoBlocked || i.key?.startsWith('blocked:')).length

  const handleClear = async () => {
    if (!window.confirm('Clear all security incident records? This cannot be undone.')) return
    try {
      const res = await fetch('/api/security-incidents', { method: 'DELETE', credentials: 'same-origin' })
      if (res.ok) setIncidents([])
    } catch { /* ignore */ }
  }

  const toggleExpand = (rowKey: string) => {
    setExpandedKey(prev => prev === rowKey ? null : rowKey)
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="w-full max-w-5xl bg-card border border-primary/30 p-0 overflow-hidden flex flex-col max-h-[90dvh] [&>button:last-child]:hidden">
        <DialogTitle className="sr-only">Security Incidents Dashboard</DialogTitle>

        {/* HUD corners */}
        <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-primary/50 pointer-events-none" />
        <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-primary/50 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-primary/50 pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-primary/50 pointer-events-none" />

        {/* Header */}
        <div className="h-10 bg-primary/10 border-b border-primary/30 flex items-center justify-between px-4 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="font-mono text-[11px] text-primary/70 tracking-wider uppercase">
              SECURITY INCIDENTS // THREAT MONITOR
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleClear}
              className="text-destructive/60 hover:text-destructive transition-colors"
              title="Clear all incidents"
            >
              <Trash size={16} />
            </button>
            <DialogClose className="text-primary/60 hover:text-primary transition-colors font-mono text-[9px] tracking-wider uppercase flex items-center gap-1">
              <X size={12} /> CLOSE
            </DialogClose>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="w-4 h-4 border-2 border-primary/40 border-t-primary rounded-full animate-spin" />
              <span className="ml-3 font-mono text-[11px] text-primary/50">LOADING SECURITY DATA...</span>
            </div>
          )}

          {error && (
            <div className="border border-red-500/30 bg-red-500/10 p-4 text-center">
              <p className="font-mono text-[12px] text-red-400">FAILED TO LOAD: {error}</p>
            </div>
          )}

          {!loading && !error && (
            <>
              {/* Summary cards */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <div className="border border-primary/20 bg-black/30 p-3 space-y-1">
                  <div className="flex items-center gap-2 text-primary/60">
                    <ShieldWarning size={16} />
                    <span className="text-[11px] font-mono tracking-wider uppercase">Total</span>
                  </div>
                  <p className="text-xl font-mono font-bold text-foreground">{incidents.length}</p>
                </div>
                <div className="border border-primary/20 bg-black/30 p-3 space-y-1">
                  <div className="flex items-center gap-2 text-red-400/60">
                    <Hash size={16} />
                    <span className="text-[11px] font-mono tracking-wider uppercase">Honeytoken</span>
                  </div>
                  <p className="text-xl font-mono font-bold text-red-400">{honeytokenCount}</p>
                </div>
                <div className="border border-primary/20 bg-black/30 p-3 space-y-1">
                  <div className="flex items-center gap-2 text-orange-400/60">
                    <Globe size={16} />
                    <span className="text-[11px] font-mono tracking-wider uppercase">Robots</span>
                  </div>
                  <p className="text-xl font-mono font-bold text-orange-400">{robotsCount}</p>
                </div>
                <div className="border border-primary/20 bg-black/30 p-3 space-y-1">
                  <div className="flex items-center gap-2 text-primary/60">
                    <User size={16} />
                    <span className="text-[11px] font-mono tracking-wider uppercase">Unique IPs</span>
                  </div>
                  <p className="text-xl font-mono font-bold text-foreground">{uniqueIps}</p>
                </div>
                <div className="border border-primary/20 bg-black/30 p-3 space-y-1">
                  <div className="flex items-center gap-2 text-green-400/60">
                    <ShieldCheck size={16} />
                    <span className="text-[11px] font-mono tracking-wider uppercase">Geblockt</span>
                  </div>
                  <p className="text-xl font-mono font-bold text-green-400">{autoBlockedCount}</p>
                </div>
              </div>

              {/* Filter tabs */}
              <div className="flex gap-2 border-b border-primary/10 pb-2">
                {(['all', 'honeytoken', 'robots'] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`font-mono text-[11px] px-3 py-1.5 uppercase tracking-wider transition-colors ${
                      filter === f
                        ? 'text-primary bg-primary/10 border border-primary/30'
                        : 'text-primary/40 hover:text-primary/70'
                    }`}
                  >
                    {f === 'all' ? `ALL (${incidents.length})` :
                     f === 'honeytoken' ? `HONEYTOKEN (${honeytokenCount})` :
                     `ROBOTS (${robotsCount})`}
                  </button>
                ))}
              </div>

              {/* Incident list */}
              {filteredIncidents.length === 0 ? (
                <div className="text-center py-12">
                  <ShieldWarning size={32} className="text-primary/20 mx-auto mb-3" />
                  <p className="font-mono text-[12px] text-primary/30">NO INCIDENTS RECORDED</p>
                </div>
              ) : (
                <div className="border border-primary/10 overflow-x-auto">
                  <table className="w-full text-[11px] font-mono min-w-[480px]">
                    <thead>
                      <tr className="bg-primary/10 text-primary/70">
                        <th className="text-left px-3 py-2 tracking-wider w-8" />
                        <th className="text-left px-3 py-2 tracking-wider">TIME</th>
                        <th className="text-left px-3 py-2 tracking-wider">TYPE</th>
                        <th className="text-left px-3 py-2 tracking-wider">TARGET</th>
                        <th className="text-left px-3 py-2 tracking-wider hidden md:table-cell">METHOD</th>
                        <th className="text-left px-3 py-2 tracking-wider hidden md:table-cell">IP HASH</th>
                        {onViewProfile && <th className="text-left px-3 py-2 tracking-wider">ACTION</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredIncidents.map((inc, i) => {
                        const { label, color } = classifyIncident(inc.key)
                        const rowKey = `${inc.timestamp}-${i}`
                        const isExpanded = expandedKey === rowKey
                        const cm = classifyCountermeasure(inc)
                        const cmColors: Record<string, string> = {
                          BLOCKED: 'bg-red-500/20 text-red-400 border-red-500/30',
                          TARPITTED: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
                          RATE_LIMITED: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
                          GELOGGT: 'bg-primary/20 text-primary border-primary/30',
                        }
                        const threatColors: Record<string, string> = {
                          BLOCK: 'bg-red-500/20 text-red-400 border-red-500/30',
                          TARPIT: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
                          WARN: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
                          CLEAN: 'bg-green-500/20 text-green-400 border-green-500/30',
                        }
                        return (
                          <>
                            <tr
                              key={rowKey}
                              className="border-t border-primary/5 hover:bg-primary/5 transition-colors cursor-pointer"
                              onClick={() => toggleExpand(rowKey)}
                            >
                              <td className="px-3 py-2 text-primary/40">
                                {isExpanded ? <CaretUp size={11} /> : <CaretDown size={11} />}
                              </td>
                              <td className="px-3 py-2 text-foreground/50 whitespace-nowrap">
                                <Clock size={11} className="inline mr-1 opacity-50" />
                                {formatTime(inc.timestamp)}
                              </td>
                              <td className={`px-3 py-2 ${color} whitespace-nowrap`}>
                                {label}
                              </td>
                              <td className="px-3 py-2 text-foreground/70 max-w-[200px] truncate" title={inc.key}>
                                {inc.key}
                              </td>
                              <td className="px-3 py-2 text-foreground/50 hidden md:table-cell">
                                {inc.method}
                              </td>
                              <td className="px-3 py-2 text-foreground/40 hidden md:table-cell font-mono" title={inc.hashedIp}>
                                {shortHash(inc.hashedIp)}
                              </td>
                              {onViewProfile && (
                                <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                                  <button
                                    onClick={() => onViewProfile(inc.hashedIp)}
                                    className="px-2 py-1 border border-primary/30 bg-primary/10 hover:bg-primary/20 transition-colors flex items-center gap-1"
                                    title="View attacker profile"
                                  >
                                    <Eye size={12} />
                                    <span className="text-[10px] font-mono uppercase">Profile</span>
                                  </button>
                                </td>
                              )}
                            </tr>
                            {isExpanded && (
                              <tr key={`${rowKey}-detail`} className="bg-primary/5 border-t border-primary/10">
                                <td colSpan={onViewProfile ? 7 : 6} className="px-4 py-4">
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-[11px]">
                                    {/* Threat assessment */}
                                    <div className="space-y-2">
                                      <p className="text-primary/50 uppercase tracking-wider text-[10px] mb-2">Threat Assessment</p>
                                      <div className="flex items-center gap-2">
                                        <span className="text-foreground/40 w-28">Level:</span>
                                        {inc.threatLevel ? (
                                          <span className={`inline-block px-1.5 py-0.5 text-[9px] font-bold tracking-wider border ${threatColors[inc.threatLevel] || threatColors.CLEAN}`}>
                                            {inc.threatLevel} {inc.threatScore ? `(score: ${inc.threatScore})` : ''}
                                          </span>
                                        ) : <span className="text-foreground/30">—</span>}
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <span className="text-foreground/40 w-28">Countermeasure:</span>
                                        <span className={`inline-block px-1.5 py-0.5 text-[9px] font-bold tracking-wider border ${cmColors[cm] || cmColors.GELOGGT}`}>
                                          {cm}
                                        </span>
                                      </div>
                                      {inc.countermeasureDetails && (
                                        <div className="flex items-start gap-2">
                                          <span className="text-foreground/40 w-28 flex-shrink-0">Details:</span>
                                          <span className="text-foreground/60">{inc.countermeasureDetails}</span>
                                        </div>
                                      )}
                                      {inc.autoBlocked && inc.blockExpiry && (
                                        <div className="flex items-center gap-2">
                                          <span className="text-foreground/40 w-28">Block expiry:</span>
                                          <span className="text-red-400/80">{new Date(inc.blockExpiry).toLocaleString('de-DE')}</span>
                                        </div>
                                      )}
                                    </div>
                                    {/* Request details */}
                                    <div className="space-y-2">
                                      <p className="text-primary/50 uppercase tracking-wider text-[10px] mb-2">Request Details</p>
                                      <div className="flex items-center gap-2">
                                        <span className="text-foreground/40 w-28">Full target:</span>
                                        <span className="text-foreground/70 break-all">{inc.key}</span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <span className="text-foreground/40 w-28">Method:</span>
                                        <span className="text-foreground/70">{inc.method || '—'}</span>
                                      </div>
                                      <div className="flex items-start gap-2">
                                        <span className="text-foreground/40 w-28 flex-shrink-0">IP hash:</span>
                                        <span className="text-foreground/40 break-all" title={inc.hashedIp}>{inc.hashedIp || '—'}</span>
                                      </div>
                                      <div className="flex items-start gap-2">
                                        <span className="text-foreground/40 w-28 flex-shrink-0">User agent:</span>
                                        <span className="text-foreground/40 break-all">{inc.userAgent || '—'}</span>
                                      </div>
                                    </div>
                                  </div>
                                  <button
                                    onClick={() => toggleExpand(rowKey)}
                                    className="mt-3 flex items-center gap-1 text-primary/40 hover:text-primary/70 transition-colors text-[10px]"
                                  >
                                    <X size={10} /> COLLAPSE
                                  </button>
                                </td>
                              </tr>
                            )}
                          </>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {/* Footer */}
          <div className="flex items-center gap-2 text-[10px] text-primary/40 pt-2 border-t border-primary/10">
            <div className="w-1.5 h-1.5 rounded-full bg-red-500/60 animate-pulse" />
            <span>THREAT MONITOR ACTIVE</span>
            <span className="ml-auto">
              {incidents.length} events &middot; IPs SHA-256 hashed (GDPR)
            </span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
