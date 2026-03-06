import { useEffect, useState, useCallback } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Users, Trash, DownloadSimple, CircleNotch } from '@phosphor-icons/react'

interface Subscriber {
  email: string
  source: string
  date: string
}

interface SubscriberListDialogProps {
  open: boolean
  onClose: () => void
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export default function SubscriberListDialog({ open, onClose }: SubscriberListDialogProps) {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([])
  const [loading, setLoading] = useState(false)

  const fetchSubscribers = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/subscribers', { credentials: 'same-origin' })
      if (res.ok) {
        const { subscribers: data }: { subscribers: Subscriber[] } = await res.json()
        setSubscribers(
          (data ?? []).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        )
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (open) fetchSubscribers()
  }, [open, fetchSubscribers])

  const handleDelete = async (email: string) => {
    const res = await fetch('/api/subscribers', {
      method: 'DELETE',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })
    if (res.ok) {
      setSubscribers((prev) => prev.filter((s) => s.email !== email))
    }
  }

  const handleExportCsv = () => {
    const esc = (v: string) => `"${v.replace(/"/g, '""')}"`
    const header = 'Email,Source,Date'
    const rows = subscribers.map(
      (s) => `${esc(s.email)},${esc(s.source)},${esc(s.date)}`
    )
    const csv = [header, ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'subscribers.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-mono text-primary flex items-center gap-2">
            <Users size={20} />
            MAILING LIST
            <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">
              {subscribers.length}
            </span>
            {subscribers.length > 0 && (
              <button
                onClick={handleExportCsv}
                className="ml-auto text-foreground/50 hover:text-primary transition-colors"
                aria-label="Export as CSV"
              >
                <DownloadSimple size={18} />
              </button>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="overflow-y-auto flex-1 pr-1">
          {loading ? (
            <div className="flex items-center justify-center py-12 font-mono text-foreground/50">
              <CircleNotch className="animate-spin mr-2" size={20} />
              Loading...
            </div>
          ) : subscribers.length === 0 ? (
            <div className="flex items-center justify-center py-12 font-mono text-foreground/50">
              No subscribers
            </div>
          ) : (
            <div className="space-y-0.5">
              <div className="flex items-center gap-3 px-3 py-1.5 font-mono text-[10px] text-foreground/40 uppercase tracking-wider">
                <span className="flex-1">Email</span>
                <span className="w-24 text-center">Source</span>
                <span className="w-32 text-right">Date</span>
                <span className="w-8" />
              </div>

              {subscribers.map((sub) => (
                <div
                  key={sub.email}
                  className="flex items-center gap-3 px-3 py-2 rounded font-mono hover:bg-foreground/5 transition-colors group"
                >
                  <span className="flex-1 text-sm truncate text-foreground/80">
                    {sub.email}
                  </span>
                  <span className="w-24 text-center">
                    <span className="text-[10px] bg-primary/10 text-primary/70 px-1.5 py-0.5 rounded">
                      {sub.source}
                    </span>
                  </span>
                  <span className="w-32 text-right text-[10px] text-foreground/40">
                    {formatDate(sub.date)}
                  </span>
                  <button
                    onClick={() => handleDelete(sub.email)}
                    className="w-8 flex justify-center shrink-0 text-foreground/20 hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"
                    aria-label={`Remove ${sub.email}`}
                  >
                    <Trash size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
