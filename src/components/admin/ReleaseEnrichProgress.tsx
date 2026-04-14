/**
 * ReleaseEnrichProgress — frontend-orchestrated enrichment modal.
 *
 * The frontend acts as the director: it calls /api/releases-enrich-single
 * once per release, sequentially, with a configurable delay between calls.
 * This avoids Vercel Serverless Function timeouts and API rate-limit errors
 * while providing full live-progress feedback to the admin.
 */
import { useState, useRef, useCallback } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { XCircle, CheckCircle, Warning, ArrowsClockwise, Stop } from '@phosphor-icons/react'

const DELAY_BETWEEN_MS = 1_500   // 1.5 s between releases — respects MB + Odesli rate limits

export interface PendingRelease {
  id: string
  title: string
}

interface LogEntry {
  id: string
  title: string
  status: 'ok' | 'error' | 'skip'
  message: string
}

interface Props {
  releases: PendingRelease[]
  onClose: () => void
  onComplete?: () => void
}

export function ReleaseEnrichProgress({ releases, onClose, onComplete }: Props) {
  const [running, setRunning] = useState(false)
  const [done, setDone] = useState(false)
  const [current, setCurrent] = useState<string>('')
  const [processedCount, setProcessedCount] = useState(0)
  const [log, setLog] = useState<LogEntry[]>([])
  const abortRef = useRef(false)

  const addLog = useCallback((entry: LogEntry) => {
    setLog(prev => [entry, ...prev].slice(0, 50))
  }, [])

  const run = useCallback(async () => {
    abortRef.current = false
    setRunning(true)
    setDone(false)
    setProcessedCount(0)
    setLog([])

    for (let i = 0; i < releases.length; i++) {
      if (abortRef.current) break

      const release = releases[i]
      setCurrent(release.title)

      try {
        const resp = await fetch('/api/releases-enrich-single', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ id: release.id }),
        })

        if (resp.ok) {
          const data = await resp.json()
          const summary = (data.steps as string[] | undefined)?.slice(-1)[0] ?? 'enriched'
          addLog({ id: release.id, title: release.title, status: 'ok', message: summary })
        } else {
          const err = await resp.json().catch(() => ({}))
          addLog({ id: release.id, title: release.title, status: 'error', message: err.error ?? `HTTP ${resp.status}` })
        }
      } catch (e) {
        addLog({ id: release.id, title: release.title, status: 'error', message: String(e) })
      }

      setProcessedCount(i + 1)

      // Wait between requests (except after the last one)
      if (i < releases.length - 1 && !abortRef.current) {
        await new Promise(r => setTimeout(r, DELAY_BETWEEN_MS))
      }
    }

    setRunning(false)
    setCurrent('')
    setDone(true)
    onComplete?.()
  }, [releases, addLog, onComplete])

  const abort = () => { abortRef.current = true }

  const total = releases.length
  const progress = total > 0 ? (processedCount / total) * 100 : 0

  return (
    <Dialog open onOpenChange={open => { if (!open && !running) onClose() }}>
      <DialogContent data-admin-ui="true" className="max-w-xl font-mono">
        <DialogHeader>
          <DialogTitle className="text-sm uppercase tracking-widest flex items-center gap-2">
            <ArrowsClockwise size={16} className={running ? 'animate-spin text-primary' : 'text-primary'} />
            Release Sync
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Summary line */}
          <div className="text-xs text-muted-foreground">
            {done
              ? `Fertig. ${processedCount} von ${total} Releases verarbeitet.`
              : running
                ? `Verarbeite ${processedCount + 1} von ${total}…`
                : `${total} Release${total !== 1 ? 's' : ''} müssen angereichert werden.`}
          </div>

          {/* Progress bar */}
          <div className="h-2 bg-border rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="text-xs text-right text-muted-foreground tabular-nums">
            {processedCount} / {total}
          </div>

          {/* Current item */}
          {running && current && (
            <div className="flex items-center gap-2 text-xs text-primary border border-primary/30 rounded px-3 py-2 bg-primary/5">
              <ArrowsClockwise size={12} className="animate-spin shrink-0" />
              <span className="truncate">{current}</span>
            </div>
          )}

          {/* Log history */}
          {log.length > 0 && (
            <div className="space-y-1 max-h-52 overflow-y-auto">
              {log.map((entry, idx) => (
                <div
                  key={`${entry.id}-${idx}`}
                  className={`flex items-start gap-2 text-xs rounded px-2 py-1.5 ${
                    entry.status === 'ok'
                      ? 'bg-green-950/30 border border-green-700/30 text-green-400'
                      : entry.status === 'error'
                        ? 'bg-red-950/30 border border-red-700/30 text-red-400'
                        : 'bg-yellow-950/30 border border-yellow-700/30 text-yellow-400'
                  }`}
                >
                  {entry.status === 'ok'
                    ? <CheckCircle size={13} className="shrink-0 mt-0.5" />
                    : entry.status === 'error'
                      ? <XCircle size={13} className="shrink-0 mt-0.5" />
                      : <Warning size={13} className="shrink-0 mt-0.5" />}
                  <div className="min-w-0">
                    <span className="font-semibold truncate block">{entry.title}</span>
                    <span className="text-[11px] opacity-70">{entry.message}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex justify-end gap-2 pt-1">
            {!running && !done && (
              <>
                <Button variant="ghost" size="sm" onClick={onClose}>
                  Abbrechen
                </Button>
                <Button size="sm" onClick={run} className="gap-1.5">
                  <ArrowsClockwise size={14} />
                  Sync starten
                </Button>
              </>
            )}
            {running && (
              <Button variant="destructive" size="sm" onClick={abort} className="gap-1.5">
                <Stop size={14} />
                Abbrechen
              </Button>
            )}
            {done && (
              <Button size="sm" onClick={onClose}>
                Schließen
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
