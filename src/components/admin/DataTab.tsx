// @deprecated — replaced by functional CMS dashboards (e.g. ReleasesEditor, InboxEditor). Do not extend.
import { useState, useCallback } from 'react'
import { TabsContent } from '@/components/ui/tabs'
import { Export, ArrowSquareIn, ArrowsClockwise, MapPin, Trash } from '@phosphor-icons/react'
import type { SiteData } from '@/App'

interface DataTabProps {
  siteData: SiteData | undefined
  onImportData?: (data: SiteData) => void
  onRefreshSiteData?: () => void
  onExport: () => void
  onImportClick: () => void
  onFetchBandsintown?: () => Promise<void>
  onFetchITunes?: () => Promise<void>
  onResetReleases?: () => Promise<void>
  onResetGigs?: () => Promise<void>
}

export default function DataTab({ siteData, onRefreshSiteData, onExport, onImportClick, onFetchBandsintown, onFetchITunes, onResetReleases, onResetGigs }: DataTabProps) {
  const [isGigsSyncing, setIsGigsSyncing] = useState(false)
  const [isReleasesSyncing, setIsReleasesSyncing] = useState(false)
  const [isReleasesResetting, setIsReleasesResetting] = useState(false)
  const [isGigsResetting, setIsGigsResetting] = useState(false)

  const handleGigsSync = useCallback(async () => {
    if (!onFetchBandsintown || isGigsSyncing) return
    setIsGigsSyncing(true)
    try {
      await onFetchBandsintown()
    } finally {
      setIsGigsSyncing(false)
    }
  }, [onFetchBandsintown, isGigsSyncing])

  const handleReleasesSync = useCallback(async () => {
    if (!onFetchITunes || isReleasesSyncing) return
    setIsReleasesSyncing(true)
    try {
      await onFetchITunes()
      onRefreshSiteData?.()
    } finally {
      setIsReleasesSyncing(false)
    }
  }, [onFetchITunes, isReleasesSyncing, onRefreshSiteData])

  const handleResetReleases = useCallback(async () => {
    if (!onResetReleases || isReleasesResetting) return
    setIsReleasesResetting(true)
    try {
      await onResetReleases()
      onRefreshSiteData?.()
    } finally {
      setIsReleasesResetting(false)
    }
  }, [onResetReleases, isReleasesResetting, onRefreshSiteData])

  const handleResetGigs = useCallback(async () => {
    if (!onResetGigs || isGigsResetting) return
    setIsGigsResetting(true)
    try {
      await onResetGigs()
      onRefreshSiteData?.()
    } finally {
      setIsGigsResetting(false)
    }
  }, [onResetGigs, isGigsResetting, onRefreshSiteData])

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

        {/* ── Manual Sync ──────────────────────────────────────────────── */}
        <div className="border-t border-border pt-3 space-y-2">
          <h4 className="font-mono text-xs font-bold text-primary uppercase tracking-wider mb-3">
            Manual Sync
          </h4>

          {/* Releases Sync (iTunes → MusicBrainz → Odesli) */}
          <button
            onClick={handleReleasesSync}
            disabled={isReleasesSyncing || !onFetchITunes}
            className="w-full flex items-center gap-4 p-4 bg-background border border-border rounded-md hover:border-primary text-left transition-colors group disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ArrowsClockwise
              size={20}
              weight="bold"
              className={`text-primary shrink-0 ${isReleasesSyncing ? 'animate-spin' : ''}`}
            />
            <div>
              <div className="font-mono text-sm font-bold group-hover:text-primary transition-colors">
                {isReleasesSyncing ? 'Syncing Releases…' : 'Sync Releases'}
              </div>
              <div className="font-mono text-xs text-muted-foreground">
                Full sync: iTunes (fallback Spotify) → MusicBrainz metadata → Odesli streaming links. Overwrites all cached release data.
              </div>
            </div>
          </button>

          {/* Gig Sync */}
          <button
            onClick={handleGigsSync}
            disabled={isGigsSyncing || !onFetchBandsintown}
            className="w-full flex items-center gap-4 p-4 bg-background border border-border rounded-md hover:border-primary text-left transition-colors group disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <MapPin
              size={20}
              weight="bold"
              className={`text-green-400 shrink-0 ${isGigsSyncing ? 'animate-pulse' : ''}`}
            />
            <div>
              <div className="font-mono text-sm font-bold group-hover:text-primary transition-colors">
                {isGigsSyncing ? 'Syncing Gigs…' : 'Sync Gigs (Bandsintown + Geocode)'}
              </div>
              <div className="font-mono text-xs text-muted-foreground">
                Fetches upcoming shows from Bandsintown, geocodes missing lat/lon via OpenStreetMap
              </div>
            </div>
          </button>
        </div>

        {/* ── Danger Zone ──────────────────────────────────────────────── */}
        <div className="border-t border-red-800/40 pt-3 space-y-2">
          <h4 className="font-mono text-xs font-bold text-red-500 uppercase tracking-wider mb-3">
            Danger Zone
          </h4>

          {/* Delete All Releases */}
          <button
            onClick={handleResetReleases}
            disabled={isReleasesResetting || !onResetReleases}
            className="w-full flex items-center gap-4 p-4 bg-background border border-red-800/40 rounded-md hover:border-red-500 text-left transition-colors group disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Trash
              size={20}
              weight="bold"
              className={`text-red-500 shrink-0 ${isReleasesResetting ? 'animate-pulse' : ''}`}
            />
            <div>
              <div className="font-mono text-sm font-bold text-red-400 group-hover:text-red-300 transition-colors">
                {isReleasesResetting ? 'Clearing Releases…' : 'Delete All Releases'}
              </div>
              <div className="font-mono text-xs text-muted-foreground">
                Permanently removes all release data from the server. Use before a fresh import.
              </div>
            </div>
          </button>

          {/* Delete All Gigs */}
          <button
            onClick={handleResetGigs}
            disabled={isGigsResetting || !onResetGigs}
            className="w-full flex items-center gap-4 p-4 bg-background border border-red-800/40 rounded-md hover:border-red-500 text-left transition-colors group disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Trash
              size={20}
              weight="bold"
              className={`text-red-500 shrink-0 ${isGigsResetting ? 'animate-pulse' : ''}`}
            />
            <div>
              <div className="font-mono text-sm font-bold text-red-400 group-hover:text-red-300 transition-colors">
                {isGigsResetting ? 'Clearing Gigs…' : 'Delete All Gigs'}
              </div>
              <div className="font-mono text-xs text-muted-foreground">
                Permanently removes all gig data from the server. Use before a fresh import.
              </div>
            </div>
          </button>
        </div>
      </div>
    </TabsContent>
  )
}
