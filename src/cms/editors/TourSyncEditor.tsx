import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Loader2, RefreshCw, Calendar, Music2, CheckCircle2, AlertCircle } from 'lucide-react'

interface SyncStatus {
  ok: boolean
  lastSync?: string
  count?: number
  error?: string
}

async function triggerGigsSync(): Promise<SyncStatus> {
  const res = await fetch('/api/gigs-sync', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
  })
  if (!res.ok) throw new Error(`Sync failed: ${res.status}`)
  const data = await res.json()
  return { ok: true, count: data.count ?? data.events?.length, lastSync: new Date().toISOString() }
}

async function triggerSetlistSync(): Promise<SyncStatus> {
  const res = await fetch('/api/setlistfm', {
    method: 'GET',
    credentials: 'include',
  })
  if (!res.ok) throw new Error(`Setlist.fm sync failed: ${res.status}`)
  const data = await res.json()
  return { ok: true, count: data.setlists?.length ?? data.total, lastSync: new Date().toISOString() }
}

function StatusBadge({ status }: { status: SyncStatus | null }) {
  if (!status) return <span className="text-zinc-600 text-xs">—</span>
  return status.ok
    ? <span className="flex items-center gap-1 text-green-400 text-xs"><CheckCircle2 size={12} /> OK{status.count != null ? ` (${status.count})` : ''}</span>
    : <span className="flex items-center gap-1 text-red-400 text-xs"><AlertCircle size={12} /> {status.error}</span>
}

export default function TourSyncEditor() {
  const queryClient = useQueryClient()
  const [bandsintownStatus, setBandsintownStatus] = useState<SyncStatus | null>(null)
  const [setlistStatus, setSetlistStatus] = useState<SyncStatus | null>(null)

  const gigsMutation = useMutation({
    mutationFn: triggerGigsSync,
    onSuccess: (data) => {
      setBandsintownStatus(data)
      queryClient.invalidateQueries({ queryKey: ['gigs-status'] })
    },
    onError: (err) => setBandsintownStatus({ ok: false, error: String(err) }),
  })

  const setlistMutation = useMutation({
    mutationFn: triggerSetlistSync,
    onSuccess: (data) => setSetlistStatus(data),
    onError: (err) => setSetlistStatus({ ok: false, error: String(err) }),
  })

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-zinc-100 text-xl font-semibold flex items-center gap-2">
          <Calendar size={20} className="text-red-500" />
          Tour &amp; Live
        </h1>
        <p className="text-zinc-500 text-sm mt-1">
          Sync tour data from Bandsintown and Setlist.fm.
        </p>
      </div>

      {/* Bandsintown */}
      <div className="bg-[#111] border border-zinc-800 rounded p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar size={16} className="text-zinc-400" />
            <h2 className="text-zinc-200 text-sm font-medium">Bandsintown</h2>
          </div>
          <StatusBadge status={bandsintownStatus} />
        </div>
        <p className="text-zinc-500 text-xs">
          Fetches upcoming shows from the Bandsintown REST API and stores them in cache.
        </p>
        <button
          type="button"
          onClick={() => gigsMutation.mutate()}
          disabled={gigsMutation.isPending}
          className="flex items-center gap-2 text-sm bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-3 py-1.5 rounded disabled:opacity-50 transition-colors"
        >
          {gigsMutation.isPending
            ? <Loader2 size={14} className="animate-spin" />
            : <RefreshCw size={14} />}
          Sync now
        </button>
        {bandsintownStatus?.lastSync && (
          <p className="text-zinc-600 text-xs">
            Last synced: {new Date(bandsintownStatus.lastSync).toLocaleString()}
          </p>
        )}
      </div>

      {/* Setlist.fm */}
      <div className="bg-[#111] border border-zinc-800 rounded p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Music2 size={16} className="text-zinc-400" />
            <h2 className="text-zinc-200 text-sm font-medium">Setlist.fm</h2>
          </div>
          <StatusBadge status={setlistStatus} />
        </div>
        <p className="text-zinc-500 text-xs">
          Loads past setlists from Setlist.fm.
        </p>
        <button
          type="button"
          onClick={() => setlistMutation.mutate()}
          disabled={setlistMutation.isPending}
          className="flex items-center gap-2 text-sm bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-3 py-1.5 rounded disabled:opacity-50 transition-colors"
        >
          {setlistMutation.isPending
            ? <Loader2 size={14} className="animate-spin" />
            : <RefreshCw size={14} />}
          Load setlists
        </button>
        {setlistStatus?.lastSync && (
          <p className="text-zinc-600 text-xs">
            Last fetched: {new Date(setlistStatus.lastSync).toLocaleString()}
          </p>
        )}
      </div>
    </div>
  )
}
