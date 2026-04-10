import { useState, useCallback } from 'react'
import { Export, ArrowSquareIn, ArrowsClockwise } from '@phosphor-icons/react'
import { TabsContent } from '@/components/ui/tabs'
import type { SiteData } from '@/App'
import { ReleaseEnrichProgress, type PendingRelease } from '@/components/admin/ReleaseEnrichProgress'

interface DataTabProps {
  siteData: SiteData | undefined
  onImportData?: (data: SiteData) => void
  onExport: () => void
  onImportClick: () => void
}

export default function DataTab({ siteData, onImportData, onExport, onImportClick }: DataTabProps) {
  const [syncState, setSyncState] = useState<'idle' | 'loading' | 'open'>('idle')
  const [pendingReleases, setPendingReleases] = useState<PendingRelease[]>([])

  const handleSyncClick = useCallback(async () => {
    setSyncState('loading')
    try {
      const resp = await fetch('/api/releases-enrichment-status', { credentials: 'include' })
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
      const data = await resp.json()
      setPendingReleases(data.pending ?? [])
      setSyncState('open')
    } catch (e) {
      console.error('[DataTab] Failed to fetch enrichment status:', e)
      setSyncState('idle')
    }
  }, [])

  return (
    <TabsContent value="data" className="flex-1 overflow-y-auto p-4 space-y-4 mt-0">
      <h3 className="font-mono text-xs font-bold text-primary uppercase tracking-wider">
        Data Management
      </h3>
      <p className="font-mono text-xs text-muted-foreground">
        Export all site data and settings as a JSON file, or import a previously exported backup.
      </p>

      <div className="space-y-3">
        <button
          onClick={onExport}
          disabled={!siteData}
          className="w-full flex items-center gap-4 p-4 bg-background border border-border rounded-md hover:border-primary text-left transition-colors group disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Export size={20} weight="bold" className="text-green-500 shrink-0" />
          <div>
            <div className="font-mono text-sm font-bold group-hover:text-primary transition-colors">
              Export JSON
            </div>
            <div className="font-mono text-xs text-muted-foreground">
              Download all site data and admin settings as a JSON backup
            </div>
          </div>
        </button>

        <button
          onClick={onImportClick}
          disabled={!onImportData}
          className="w-full flex items-center gap-4 p-4 bg-background border border-border rounded-md hover:border-primary text-left transition-colors group disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ArrowSquareIn size={20} weight="bold" className="text-blue-500 shrink-0" />
          <div>
            <div className="font-mono text-sm font-bold group-hover:text-primary transition-colors">
              Import JSON
            </div>
            <div className="font-mono text-xs text-muted-foreground">
              Restore site data and settings from a previously exported JSON file
            </div>
          </div>
        </button>

        {/* ── Release Enrichment ─────────────────────────────────────────── */}
        <div className="border-t border-border pt-3">
          <h4 className="font-mono text-xs font-bold text-primary uppercase tracking-wider mb-3">
            Release Enrichment
          </h4>
          <button
            onClick={handleSyncClick}
            disabled={syncState === 'loading'}
            className="w-full flex items-center gap-4 p-4 bg-background border border-border rounded-md hover:border-primary text-left transition-colors group disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ArrowsClockwise
              size={20}
              weight="bold"
              className={`text-primary shrink-0 ${syncState === 'loading' ? 'animate-spin' : ''}`}
            />
            <div>
              <div className="font-mono text-sm font-bold group-hover:text-primary transition-colors">
                Sync Releases (MusicBrainz + Odesli)
              </div>
              <div className="font-mono text-xs text-muted-foreground">
                Enriches all non-enriched releases one by one: type, tracklist, streaming links
              </div>
            </div>
          </button>
        </div>
      </div>

      {syncState === 'open' && (
        <ReleaseEnrichProgress
          releases={pendingReleases}
          onClose={() => setSyncState('idle')}
          onComplete={() => { /* progress already shown in modal */ }}
        />
      )}
    </TabsContent>
  )
}
