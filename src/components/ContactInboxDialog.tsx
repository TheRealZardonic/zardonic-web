import { useEffect, useState, useCallback } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Envelope, EnvelopeOpen, Trash, CircleNotch } from '@phosphor-icons/react'
import type { ContactMessage } from '@/lib/types'
import { useLocale } from '@/contexts/LocaleContext'

interface Props {
  open: boolean
  onClose: () => void
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export default function ContactInboxDialog({ open, onClose }: Props) {
  const { t } = useLocale()
  const [messages, setMessages] = useState<ContactMessage[]>([])
  const [loading, setLoading] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const fetchMessages = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/contact', { credentials: 'same-origin' })
      if (res.ok) {
        const { messages: data }: { messages: ContactMessage[] } = await res.json()
        setMessages((data ?? []).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()))
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (open) {
      setExpandedId(null)
      fetchMessages()
    }
  }, [open, fetchMessages])

  const markAsRead = async (id: string) => {
    await fetch('/api/contact', {
      method: 'PATCH',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, read: true }),
    })
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, read: true } : m)))
  }

  const handleExpand = (id: string) => {
    const next = expandedId === id ? null : id
    setExpandedId(next)
    const msg = messages.find((m) => m.id === id)
    if (next && msg && !msg.read) {
      markAsRead(id)
    }
  }

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    await fetch('/api/contact', {
      method: 'DELETE',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    setMessages((prev) => prev.filter((m) => m.id !== id))
    if (expandedId === id) setExpandedId(null)
  }

  const unreadCount = messages.filter((m) => !m.read).length

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent data-admin-ui="true" className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-mono text-primary flex items-center gap-2">
            {t('inbox.title')}
            {unreadCount > 0 && (
              <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">
                {unreadCount}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="overflow-y-auto flex-1 space-y-1 pr-1">
          {loading ? (
            <div className="flex items-center justify-center py-12 font-mono text-foreground/50">
              <CircleNotch className="animate-spin mr-2" size={20} />
              {t('inbox.loading')}
            </div>
          ) : messages.length === 0 ? (
            <div className="flex items-center justify-center py-12 font-mono text-foreground/50">
              {t('inbox.noMessages')}
            </div>
          ) : (
            messages.map((msg) => {
              const isExpanded = expandedId === msg.id
              return (
                <div
                  key={msg.id}
                  onClick={() => handleExpand(msg.id)}
                  className={`cursor-pointer rounded p-3 transition-colors font-mono ${
                    msg.read
                      ? 'opacity-70 hover:bg-foreground/5'
                      : 'border-l-2 border-primary bg-primary/5 hover:bg-primary/10'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 shrink-0 text-primary">
                      {msg.read ? <EnvelopeOpen size={18} /> : <Envelope size={18} weight="fill" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-semibold truncate">{msg.name}</span>
                        <span className="text-xs text-foreground/40 shrink-0">
                          {formatDate(msg.date)}
                        </span>
                      </div>
                      <div className="text-xs text-foreground/60 truncate">{msg.email}</div>
                      <div className="text-sm mt-1 truncate">{msg.subject}</div>
                      {!isExpanded && (
                        <div className="text-xs text-foreground/40 mt-1 truncate">
                          {msg.message}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={(e) => handleDelete(e, msg.id)}
                      className="shrink-0 mt-0.5 text-foreground/30 hover:text-destructive transition-colors"
                      aria-label={t('inbox.deleteMessage')}
                    >
                      <Trash size={16} />
                    </button>
                  </div>
                  {isExpanded && (
                    <div className="mt-3 ml-8 text-sm whitespace-pre-wrap text-foreground/80 border-t border-foreground/10 pt-3">
                      {msg.message}
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
