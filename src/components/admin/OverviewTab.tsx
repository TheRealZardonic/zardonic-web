import {
  Key,
  Export,
  ArrowSquareIn,
  Eye,
  Palette,
  FileText,
  Shield,
  ChartBar,
  Database,
  PencilSimple,
  CheckCircle,
  Warning,
  ArrowCounterClockwise,
  Monitor,
} from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'

import type { SiteData } from '@/App'

interface OverviewTabProps {
  siteData: SiteData | undefined
  editMode: boolean
  hasPassword: boolean
  apiHealth: { status: string; services: Record<string, unknown> } | null
  setActiveTab: (tab: string) => void
  onToggleEdit: () => void
  onOpenStats?: () => void
  onExport: () => void
  onImportClick: () => void
  onImportData?: (data: SiteData) => void
  onOpenPasswordDialog: () => void
  fetchApiHealth: () => Promise<void>
}

export default function OverviewTab({
  siteData,
  editMode,
  hasPassword,
  apiHealth,
  setActiveTab,
  onToggleEdit,
  onExport,
  onImportClick,
  onImportData,
  onOpenPasswordDialog,
  fetchApiHealth,
}: OverviewTabProps) {
  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4 mt-0">
      {/* Status bar */}
      <div className="bg-background border border-border rounded-md p-3 space-y-2">
        <h3 className="font-mono text-xs font-bold text-primary uppercase tracking-wider">
          System Status
        </h3>
        <div className="flex items-center gap-2">
          {editMode ? (
            <CheckCircle size={14} className="text-green-500" weight="fill" />
          ) : (
            <Warning size={14} className="text-yellow-500" weight="fill" />
          )}
          <span className="font-mono text-xs">
            Edit Mode: {editMode ? 'Active' : 'Inactive'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <CheckCircle size={14} className="text-green-500" weight="fill" />
          <span className="font-mono text-xs">Admin: Authenticated</span>
        </div>
        <div className="flex items-center gap-2">
          {hasPassword ? (
            <CheckCircle size={14} className="text-green-500" weight="fill" />
          ) : (
            <Warning size={14} className="text-yellow-500" weight="fill" />
          )}
          <span className="font-mono text-xs">
            Password: {hasPassword ? 'Set' : 'Not configured'}
          </span>
        </div>
      </div>

      {/* Quick actions */}
      <div className="space-y-2">
        <h3 className="font-mono text-xs font-bold text-primary uppercase tracking-wider">
          Quick Actions
        </h3>
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            className="justify-start gap-2 font-mono text-xs h-9"
            onClick={onToggleEdit}
          >
            <PencilSimple size={14} />
            {editMode ? 'Exit Edit Mode' : 'Enter Edit Mode'}
          </Button>
          <Button
            variant="outline"
            className="justify-start gap-2 font-mono text-xs h-9"
            onClick={onOpenPasswordDialog}
          >
            <Key size={14} />
            {hasPassword ? 'Change Password' : 'Set Password'}
          </Button>
          <Button
            variant="outline"
            className="justify-start gap-2 font-mono text-xs h-9"
            onClick={onExport}
            disabled={!siteData}
          >
            <Export size={14} />
            Export Data
          </Button>
          <Button
            variant="outline"
            className="justify-start gap-2 font-mono text-xs h-9"
            onClick={onImportClick}
            disabled={!onImportData}
          >
            <ArrowSquareIn size={14} />
            Import Data
          </Button>
        </div>
      </div>

      <Separator />

      {/* Navigation shortcuts */}
      <div className="space-y-2">
        <h3 className="font-mono text-xs font-bold text-primary uppercase tracking-wider">
          Navigate
        </h3>
        <div className="grid grid-cols-3 gap-2">
          {[
            { tab: 'content', label: 'Content', icon: <FileText size={16} /> },
            { tab: 'appearance', label: 'Appearance', icon: <Palette size={16} /> },
            { tab: 'background', label: 'Background', icon: <Monitor size={16} /> },
            { tab: 'sections', label: 'Sections', icon: <Eye size={16} /> },
            { tab: 'security', label: 'Security', icon: <Shield size={16} /> },
            { tab: 'analytics', label: 'Analytics', icon: <ChartBar size={16} /> },
            { tab: 'data', label: 'Data', icon: <Database size={16} /> },
          ].map(({ tab, label, icon }) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="flex flex-col items-center gap-1.5 p-3 bg-background border border-border rounded-md hover:border-primary hover:text-primary transition-colors"
            >
              {icon}
              <span className="font-mono text-[10px] uppercase tracking-wide">{label}</span>
            </button>
          ))}
        </div>
      </div>

      <Separator />

      {/* API Health */}
      <section className="space-y-3">
        <h3 className="font-mono text-xs font-bold text-primary uppercase tracking-wider">
          API Health
        </h3>
        {apiHealth ? (
          <div className="space-y-2">
            {Object.entries(apiHealth.services).map(([service, status]) => (
              <div key={service} className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs uppercase">{service}</span>
                  <span className={`font-mono text-[10px] px-2 py-0.5 rounded border ${
                    status === 'ok' || status === 'configured'
                      ? 'border-green-500/40 text-green-400 bg-green-500/10'
                      : status === 'unconfigured'
                      ? 'border-yellow-500/40 text-yellow-400 bg-yellow-500/10'
                      : 'border-destructive/40 text-destructive bg-destructive/10'
                  }`}>
                    {String(status).toUpperCase()}
                  </span>
                </div>
                {(status === 'unconfigured' || status === 'error') && (
                  <div className="ml-2 border-l-2 border-yellow-500/30 pl-2 font-mono text-[10px] text-muted-foreground space-y-0.5">
                    {service === 'redis' && (<>
                      <div>Set env: <code className="text-yellow-400">UPSTASH_REDIS_REST_URL</code></div>
                      <div>Set env: <code className="text-yellow-400">UPSTASH_REDIS_REST_TOKEN</code></div>
                      <div className="text-foreground/40">→ Free Redis at upstash.com</div>
                    </>)}
                    {service === 'spotify' && (<>
                      <div>Set env: <code className="text-yellow-400">SPOTIFY_CLIENT_ID</code></div>
                      <div>Set env: <code className="text-yellow-400">SPOTIFY_CLIENT_SECRET</code></div>
                      <div className="text-foreground/40">→ developer.spotify.com</div>
                    </>)}
                    {service === 'bandsintown' && (<>
                      <div>Set env: <code className="text-yellow-400">BANDSINTOWN_API_KEY</code></div>
                      <div className="text-foreground/40">→ artists.bandsintown.com</div>
                    </>)}
                    {service === 'itunes' && (<>
                      <div>Set env: <code className="text-yellow-400">ITUNES_ARTIST_ID</code></div>
                      <div className="text-foreground/40">→ iTunes artist ID from store URL</div>
                    </>)}
                    {(service === 'musicbrainz' || service === 'odesli') && (
                      <div className="text-foreground/40">Public API — no configuration needed</div>
                    )}
                    {service === 'discogs' && (<>
                      <div>Set env: <code className="text-yellow-400">DISCOGS_TOKEN</code></div>
                      <div className="text-foreground/40">→ discogs.com → Settings → Developers</div>
                      <div className="text-foreground/40">Parallel release source for maximum coverage</div>
                    </>)}
                    {!['redis', 'spotify', 'bandsintown', 'itunes', 'musicbrainz', 'odesli', 'discogs'].includes(service) && (
                      <div>See <code className="text-yellow-400">.env.example</code></div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="font-mono text-xs text-muted-foreground">Loading health status...</p>
        )}
        <Button
          variant="outline"
          size="sm"
          className="font-mono text-xs w-full"
          onClick={() => { fetchApiHealth().catch(() => {}) }}
        >
          <ArrowCounterClockwise size={13} className="mr-1" /> Refresh
        </Button>
      </section>

      <Separator />

      {/* Enrichment API Endpoints */}
      <section className="space-y-3">
        <h3 className="font-mono text-xs font-bold text-primary uppercase tracking-wider">
          Enrichment API
        </h3>
        <div className="space-y-1.5">
          {[
            { method: 'GET',  path: '/api/releases-enrichment-status', desc: 'Check pending enrichment count (admin)' },
            { method: 'POST', path: '/api/releases-enrich-single',     desc: 'Enrich a single release: MusicBrainz + Odesli (admin)' },
            { method: 'POST', path: '/api/releases-enrich',            desc: 'Bulk cron enrichment — all pending releases' },
          ].map(({ method, path, desc }) => (
            <div key={path} className="flex flex-col gap-0.5 bg-background border border-border rounded px-2 py-1.5">
              <div className="flex items-center gap-2">
                <span className={`font-mono text-[10px] px-1.5 py-0.5 rounded border shrink-0 ${
                  method === 'GET'
                    ? 'border-blue-500/40 border-dashed text-blue-400 bg-blue-500/10'
                    : 'border-green-500/40 text-green-400 bg-green-500/10'
                }`}>{method}</span>
                <code className="font-mono text-[10px] text-foreground/80 truncate">{path}</code>
              </div>
              <p className="font-mono text-xs text-muted-foreground pl-1">{desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
