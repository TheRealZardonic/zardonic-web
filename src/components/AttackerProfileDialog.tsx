import { Warning, Globe, User, ChartLine, List, Shield, X } from '@phosphor-icons/react'
import { Dialog, DialogClose, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { useState, useEffect, useCallback } from 'react'
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface AttackerProfileDialogProps {
  open: boolean
  onClose: () => void
  hashedIp: string
}

interface ThreatScoreEntry {
  score: number
  level: string
  timestamp: string
  reason: string
}

interface Incident {
  type: string
  key: string
  method: string
  timestamp: string
  threatScore?: number
  threatLevel?: string
}

interface BehavioralPattern {
  type: string
  severity: string
  description: string
  details: Record<string, unknown>
}

interface UserAgentInfo {
  userAgent: string
  count: number
  category: string
}

interface Profile {
  hashedIp: string
  firstSeen: string
  lastSeen: string
  totalIncidents: number
  attackTypes: Record<string, number>
  userAgents: Record<string, number>
  threatScoreHistory: ThreatScoreEntry[]
  incidents: Incident[]
  behavioralPatterns: BehavioralPattern[]
  userAgentAnalysis: {
    total: number
    unique: number
    userAgents: UserAgentInfo[]
    topUserAgent: UserAgentInfo | null
    diversity: string
  }
}

const SEVERITY_COLORS = {
  high: '#ef4444',
  medium: '#f97316',
  low: '#eab308',
}

const ATTACK_TYPE_COLORS = [
  '#ef4444',
  '#f97316',
  '#eab308',
  '#84cc16',
  '#06b6d4',
  '#8b5cf6',
  '#ec4899',
]

const THREAT_LEVEL_COLORS = {
  BLOCK: '#dc2626',
  TARPIT: '#f97316',
  WARN: '#eab308',
  CLEAN: '#22c55e',
}

export default function AttackerProfileDialog({ open, onClose, hashedIp }: AttackerProfileDialogProps) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadProfile = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/attacker-profile?hashedIp=${hashedIp}`, { credentials: 'same-origin' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setProfile(data.profile)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [hashedIp])

  useEffect(() => {
    if (!open || !hashedIp) return
    loadProfile()
  }, [open, hashedIp, loadProfile])

  const formatShortTime = (ts: string) => {
    try {
      const date = new Date(ts)
      return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
    } catch {
      return ts
    }
  }

  // Prepare chart data
  const threatScoreChartData = profile?.threatScoreHistory.map((entry, idx) => ({
    index: idx + 1,
    score: entry.score,
    level: entry.level,
    time: formatShortTime(entry.timestamp),
    reason: entry.reason,
  })) || []

  const attackTypeChartData = Object.entries(profile?.attackTypes || {})
    .map(([type, count]) => ({
      name: type.replace(/_/g, ' ').toUpperCase(),
      value: count,
    }))
    .sort((a, b) => b.value - a.value)

  const uaCategoryData = profile?.userAgentAnalysis.userAgents.reduce((acc, ua) => {
    const existing = acc.find(item => item.name === ua.category)
    if (existing) {
      existing.value += ua.count
    } else {
      acc.push({ name: ua.category.toUpperCase(), value: ua.count })
    }
    return acc
  }, [] as { name: string; value: number }[]) || []

  const getSeverityIcon = (severity: string) => {
    if (severity === 'high') return <Warning size={18} className="text-red-400" weight="bold" />
    if (severity === 'medium') return <Warning size={18} className="text-orange-400" />
    return <Warning size={18} className="text-yellow-400" />
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="w-full max-w-6xl bg-card border border-primary/30 p-0 overflow-hidden flex flex-col max-h-[90dvh] [&>button:last-child]:hidden">
        <DialogTitle className="sr-only">Attacker Profile</DialogTitle>

        {/* HUD corners */}
        <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-primary/50 pointer-events-none" />
        <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-primary/50 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-primary/50 pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-primary/50 pointer-events-none" />

        {/* Header */}
        <div className="h-10 bg-primary/10 border-b border-primary/30 flex items-center justify-between px-4 flex-shrink-0">
          <div className="flex items-center gap-3">
            <Shield size={16} className="text-primary/70" />
            <span className="font-mono text-[11px] text-primary/70 tracking-wider uppercase">
              ATTACKER PROFILE // DETAILED ANALYSIS
            </span>
          </div>
          <DialogClose className="text-primary/60 hover:text-primary transition-colors font-mono text-xs tracking-wider uppercase flex items-center gap-1">
            <X size={12} /> CLOSE
          </DialogClose>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="w-4 h-4 border-2 border-primary/40 border-t-primary rounded-full animate-spin" />
              <span className="ml-3 font-mono text-[11px] text-primary/50">LOADING PROFILE...</span>
            </div>
          )}

          {error && (
            <div className="border border-red-500/30 bg-red-500/10 p-4 text-center">
              <p className="font-mono text-[12px] text-red-400">FAILED TO LOAD: {error}</p>
            </div>
          )}

          {!loading && !error && profile && (
            <>
              {/* Summary Stats */}
              <div className="border border-primary/20 bg-primary/5 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-mono text-xs text-primary/50 uppercase">IP Hash (SHA-256)</p>
                    <p className="font-mono text-[12px] text-foreground/90 mt-1">{hashedIp}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-xs text-primary/50 uppercase">Current Threat Score</p>
                    {(() => {
                      const lastEntry = profile.threatScoreHistory[profile.threatScoreHistory.length - 1]
                      const threatColor = lastEntry?.level
                        ? THREAT_LEVEL_COLORS[lastEntry.level as keyof typeof THREAT_LEVEL_COLORS] || '#22c55e'
                        : '#22c55e'
                      return (
                        <p className="font-mono text-[24px] font-bold" style={{ color: threatColor }}>
                          {lastEntry?.score || 0}
                        </p>
                      )
                    })()}
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-4 pt-2 border-t border-primary/10">
                  <div>
                    <p className="font-mono text-xs text-primary/50">Total Incidents</p>
                    <p className="font-mono text-[16px] text-foreground/90 font-bold">{profile.totalIncidents}</p>
                  </div>
                  <div>
                    <p className="font-mono text-xs text-primary/50">First Seen</p>
                    <p className="font-mono text-[11px] text-foreground/80">{formatShortTime(profile.firstSeen)}</p>
                  </div>
                  <div>
                    <p className="font-mono text-xs text-primary/50">Last Seen</p>
                    <p className="font-mono text-[11px] text-foreground/80">{formatShortTime(profile.lastSeen)}</p>
                  </div>
                  <div>
                    <p className="font-mono text-xs text-primary/50">UA Diversity</p>
                    <p className="font-mono text-[11px] text-foreground/80">{profile.userAgentAnalysis.diversity}</p>
                  </div>
                </div>
              </div>

              {/* Behavioral Patterns */}
              {profile.behavioralPatterns.length > 0 && (
                <div className="border border-primary/20 bg-card p-4">
                  <h3 className="font-mono text-[12px] text-primary/70 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <ChartLine size={14} />
                    Behavioral Patterns Detected ({profile.behavioralPatterns.length})
                  </h3>
                  <div className="space-y-2">
                    {profile.behavioralPatterns.map((pattern, idx) => (
                      <div key={idx} className="border border-primary/10 bg-primary/5 p-3 flex items-start gap-3">
                        {getSeverityIcon(pattern.severity)}
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-mono text-[11px] text-foreground/90 uppercase">{pattern.type.replace(/_/g, ' ')}</p>
                            <span
                              className="px-2 py-0.5 text-xs font-mono font-bold rounded"
                              style={{
                                backgroundColor: SEVERITY_COLORS[pattern.severity as keyof typeof SEVERITY_COLORS] + '30',
                                color: SEVERITY_COLORS[pattern.severity as keyof typeof SEVERITY_COLORS],
                              }}
                            >
                              {pattern.severity.toUpperCase()}
                            </span>
                          </div>
                          <p className="text-xs text-primary/60">{pattern.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Charts Row */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Threat Score Timeline */}
                <div className="border border-primary/20 bg-card p-4">
                  <h3 className="font-mono text-[12px] text-primary/70 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <ChartLine size={14} />
                    Threat Score Timeline
                  </h3>
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={threatScoreChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                      <XAxis
                        dataKey="time"
                        stroke="#666"
                        style={{ fontSize: '10px' }}
                        tick={{ fill: '#999' }}
                      />
                      <YAxis
                        stroke="#666"
                        style={{ fontSize: '10px' }}
                        tick={{ fill: '#999' }}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#000',
                          border: '1px solid #333',
                          borderRadius: 0,
                          fontSize: '11px',
                          fontFamily: 'monospace',
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="score"
                        stroke="#ef4444"
                        strokeWidth={2}
                        dot={{ r: 3, fill: '#ef4444' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* Attack Type Distribution */}
                <div className="border border-primary/20 bg-card p-4">
                  <h3 className="font-mono text-[12px] text-primary/70 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Globe size={14} />
                    Attack Type Distribution
                  </h3>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={attackTypeChartData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={(entry) => `${entry.name}: ${entry.value}`}
                        outerRadius={70}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {attackTypeChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={ATTACK_TYPE_COLORS[index % ATTACK_TYPE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#000',
                          border: '1px solid #333',
                          fontSize: '11px',
                          fontFamily: 'monospace',
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* User-Agent Analysis */}
              <div className="border border-primary/20 bg-card p-4">
                <h3 className="font-mono text-[12px] text-primary/70 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <User size={14} />
                  User-Agent Analysis ({profile.userAgentAnalysis.unique} unique)
                </h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Category breakdown chart */}
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={uaCategoryData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                      <XAxis
                        dataKey="name"
                        stroke="#666"
                        style={{ fontSize: '10px' }}
                        tick={{ fill: '#999' }}
                      />
                      <YAxis
                        stroke="#666"
                        style={{ fontSize: '10px' }}
                        tick={{ fill: '#999' }}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#000',
                          border: '1px solid #333',
                          fontSize: '11px',
                          fontFamily: 'monospace',
                        }}
                      />
                      <Bar dataKey="value" fill="#8b5cf6" />
                    </BarChart>
                  </ResponsiveContainer>

                  {/* Top User-Agents table */}
                  <div className="border border-primary/10 overflow-hidden">
                    <div className="bg-primary/10 px-3 py-2 font-mono text-xs text-primary/60 uppercase">
                      Top User-Agents
                    </div>
                    <div className="divide-y divide-primary/10 max-h-[180px] overflow-y-auto">
                      {profile.userAgentAnalysis.userAgents.slice(0, 10).map((ua, idx) => (
                        <div key={idx} className="px-3 py-2 flex items-center justify-between hover:bg-primary/5">
                          <div className="flex-1 mr-2">
                            <p className="font-mono text-xs text-foreground/80 truncate" title={ua.userAgent}>
                              {ua.userAgent}
                            </p>
                            <span className={`inline-block mt-1 px-1.5 py-0.5 text-[8px] font-mono rounded ${
                              ua.category === 'attack_tool' ? 'bg-red-500/20 text-red-400' :
                              ua.category === 'bot' ? 'bg-orange-500/20 text-orange-400' :
                              ua.category === 'script' ? 'bg-yellow-500/20 text-yellow-400' :
                              'bg-blue-500/20 text-blue-400'
                            }`}>
                              {ua.category}
                            </span>
                          </div>
                          <span className="font-mono text-[11px] text-primary/60">{ua.count}×</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Incident Timeline */}
              <div className="border border-primary/20 bg-card p-4">
                <h3 className="font-mono text-[12px] text-primary/70 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <List size={14} />
                  Recent Incidents ({profile.incidents.length})
                </h3>
                <div className="border border-primary/10 overflow-hidden">
                  <div className="bg-primary/10 px-3 py-2 grid grid-cols-[1fr,2fr,1fr,1fr,1fr] gap-2 font-mono text-xs text-primary/60 uppercase">
                    <span>Time</span>
                    <span>Type</span>
                    <span>Method</span>
                    <span>Score</span>
                    <span>Level</span>
                  </div>
                  <div className="divide-y divide-primary/10 max-h-[250px] overflow-y-auto">
                    {profile.incidents.slice().reverse().map((incident, idx) => (
                      <div key={idx} className="px-3 py-2 grid grid-cols-[1fr,2fr,1fr,1fr,1fr] gap-2 hover:bg-primary/5">
                        <span className="font-mono text-xs text-primary/50">{formatShortTime(incident.timestamp)}</span>
                        <span className="font-mono text-xs text-foreground/80 truncate" title={incident.key}>
                          {incident.type.replace(/_/g, ' ')}
                        </span>
                        <span className="font-mono text-xs text-primary/60">{incident.method}</span>
                        <span className="font-mono text-xs text-foreground/80">{incident.threatScore || '—'}</span>
                        <span
                          className="font-mono text-xs px-1.5 py-0.5 rounded w-fit"
                          style={{
                            backgroundColor: incident.threatLevel
                              ? THREAT_LEVEL_COLORS[incident.threatLevel as keyof typeof THREAT_LEVEL_COLORS] + '30'
                              : '#33333330',
                            color: incident.threatLevel
                              ? THREAT_LEVEL_COLORS[incident.threatLevel as keyof typeof THREAT_LEVEL_COLORS]
                              : '#666',
                          }}
                        >
                          {incident.threatLevel || '—'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Automatische Reaktionen */}
              <div className="border border-primary/20 bg-card p-4">
                <h3 className="font-mono text-[12px] text-primary/70 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Shield size={14} />
                  Automatische Reaktionen
                </h3>
                {(() => {
                  const blocked = profile.incidents.filter(i => i.threatLevel === 'BLOCK' || i.key?.startsWith('blocked:'))
                  const tarpitted = profile.incidents.filter(i => i.threatLevel === 'TARPIT' || i.key?.startsWith('threat:'))
                  const warned = profile.incidents.filter(i => i.threatLevel === 'WARN')
                  const firstAlert = profile.incidents.length > 0
                    ? [...profile.incidents].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())[0]
                    : null
                  return (
                    <div className="space-y-2 text-[11px] font-mono">
                      {firstAlert && (
                        <p className="text-foreground/60">
                          <span className="text-primary/50">Erster Alert:</span>{' '}
                          {new Date(firstAlert.timestamp).toLocaleString('de-DE')}
                        </p>
                      )}
                      <div className="grid grid-cols-3 gap-2 mt-2">
                        <div className="border border-red-500/20 bg-red-500/5 p-2 text-center">
                          <p className="text-red-400 text-lg font-bold">{blocked.length}</p>
                          <p className="text-xs text-red-400/60 uppercase">BLOCKED</p>
                        </div>
                        <div className="border border-orange-500/20 bg-orange-500/5 p-2 text-center">
                          <p className="text-orange-400 text-lg font-bold">{tarpitted.length}</p>
                          <p className="text-xs text-orange-400/60 uppercase">TARPITTED</p>
                        </div>
                        <div className="border border-yellow-500/20 bg-yellow-500/5 p-2 text-center">
                          <p className="text-yellow-400 text-lg font-bold">{warned.length}</p>
                          <p className="text-xs text-yellow-400/60 uppercase">GEWARNT</p>
                        </div>
                      </div>
                      <p className="text-xs text-foreground/40 mt-2">
                        IP Status: {blocked.length > 0 ? 'War geblockt' : tarpitted.length > 0 ? 'War getarpit' : 'Überwacht'}
                      </p>
                    </div>
                  )
                })()}
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
