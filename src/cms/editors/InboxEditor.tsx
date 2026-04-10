import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Loader2, Mail, Trash2, MailOpen } from 'lucide-react'

interface ContactMessage {
  id: string
  name: string
  email: string
  subject: string
  message: string
  date: string
  read: boolean
}

async function fetchMessages(): Promise<ContactMessage[]> {
  const res = await fetch('/api/contact', { credentials: 'include' })
  if (!res.ok) throw new Error(`Failed to load messages: ${res.status}`)
  const data = await res.json()
  return data.messages ?? []
}

async function markRead(id: string): Promise<void> {
  await fetch('/api/contact', {
    method: 'PATCH',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, read: true }),
  })
}

async function deleteMessage(id: string): Promise<void> {
  await fetch('/api/contact', {
    method: 'DELETE',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id }),
  })
}

export default function InboxEditor() {
  const queryClient = useQueryClient()
  const [selected, setSelected] = useState<ContactMessage | null>(null)

  const { data: messages = [], isLoading, error } = useQuery({
    queryKey: ['contact-messages'],
    queryFn: fetchMessages,
    staleTime: 30_000,
  })

  const markReadMutation = useMutation({
    mutationFn: markRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['contact-messages'] }),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteMessage,
    onSuccess: () => {
      setSelected(null)
      queryClient.invalidateQueries({ queryKey: ['contact-messages'] })
    },
  })

  const handleSelect = (msg: ContactMessage) => {
    setSelected(msg)
    if (!msg.read) markReadMutation.mutate(msg.id)
  }

  const unread = messages.filter(m => !m.read).length

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-zinc-100 text-xl font-semibold flex items-center gap-2">
          <Mail size={20} className="text-red-500" />
          Inbox
        </h1>
        {unread > 0 && (
          <span className="text-xs bg-red-600 text-white px-2 py-0.5 rounded-full">
            {unread} unread
          </span>
        )}
      </div>

      {isLoading && (
        <div className="flex items-center justify-center h-32">
          <Loader2 className="animate-spin text-red-500" size={24} />
        </div>
      )}

      {error && (
        <p className="text-red-400 text-sm">Failed to load messages.</p>
      )}

      {!isLoading && messages.length === 0 && (
        <div className="bg-[#111] border border-zinc-800 rounded p-8 text-center">
          <p className="text-zinc-500 text-sm">No messages.</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Message list */}
        <div className="space-y-1">
          {messages.map(msg => (
            <button
              key={msg.id}
              type="button"
              onClick={() => handleSelect(msg)}
              className={[
                'w-full text-left rounded p-3 border transition-colors',
                selected?.id === msg.id
                  ? 'border-red-500/40 bg-red-900/10'
                  : 'border-zinc-800 bg-[#111] hover:border-zinc-700',
              ].join(' ')}
            >
              <div className="flex items-center justify-between gap-2">
                <p className={`text-sm truncate ${msg.read ? 'text-zinc-400' : 'text-zinc-100 font-medium'}`}>
                  {msg.name}
                </p>
                {!msg.read && <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />}
              </div>
              <p className="text-zinc-500 text-xs truncate">{msg.subject}</p>
              <p className="text-zinc-600 text-xs">{new Date(msg.date).toLocaleDateString()}</p>
            </button>
          ))}
        </div>

        {/* Message detail */}
        {selected && (
          <div className="bg-[#111] border border-zinc-800 rounded p-4 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-zinc-100 font-medium">{selected.name}</p>
                <p className="text-zinc-500 text-xs">{selected.email}</p>
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => markReadMutation.mutate(selected.id)}
                  className="p-1.5 rounded text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
                  aria-label="Mark as read"
                  title="Mark as read"
                >
                  <MailOpen size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => deleteMutation.mutate(selected.id)}
                  className="p-1.5 rounded text-red-600 hover:text-red-400 hover:bg-red-900/20 transition-colors"
                  aria-label="Delete message"
                  title="Delete"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
            <p className="text-zinc-300 text-sm font-medium border-t border-zinc-800 pt-3">{selected.subject}</p>
            <p className="text-zinc-400 text-sm whitespace-pre-wrap">{selected.message}</p>
            <p className="text-zinc-600 text-xs">{new Date(selected.date).toLocaleString()}</p>
          </div>
        )}
      </div>
    </div>
  )
}
