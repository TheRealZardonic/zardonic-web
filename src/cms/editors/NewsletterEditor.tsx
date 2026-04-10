import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Loader2, Mail, Trash2, Download } from 'lucide-react'

interface Subscriber {
  email: string
  source?: string
  date: string
}

async function fetchSubscribers(): Promise<Subscriber[]> {
  const res = await fetch('/api/subscribers', { credentials: 'include' })
  if (!res.ok) throw new Error(`Failed to load subscribers: ${res.status}`)
  const data = await res.json()
  return data.subscribers ?? []
}

async function deleteSubscriber(email: string): Promise<void> {
  await fetch('/api/subscribers', {
    method: 'DELETE',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  })
}

function downloadCsv(subscribers: Subscriber[]) {
  const header = 'Email,Source,Date'
  const rows = subscribers.map(s => `${s.email},${s.source ?? ''},${s.date}`)
  const csv = [header, ...rows].join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'subscribers.csv'
  a.click()
  URL.revokeObjectURL(url)
}

export default function NewsletterEditor() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')

  const { data: subscribers = [], isLoading, error } = useQuery({
    queryKey: ['cms-subscribers'],
    queryFn: fetchSubscribers,
    staleTime: 60_000,
  })

  const deleteMutation = useMutation({
    mutationFn: deleteSubscriber,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cms-subscribers'] }),
  })

  const filtered = subscribers.filter(s =>
    s.email.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-zinc-100 text-xl font-semibold flex items-center gap-2">
          <Mail size={20} className="text-red-500" />
          Newsletter
        </h1>
        <div className="flex items-center gap-2">
          <span className="text-zinc-500 text-sm">{subscribers.length} subscribers</span>
          {subscribers.length > 0 && (
            <button
              type="button"
              onClick={() => downloadCsv(subscribers)}
              className="flex items-center gap-1.5 text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-3 py-1.5 rounded transition-colors"
            >
              <Download size={12} />
              CSV Export
            </button>
          )}
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center h-32">
          <Loader2 className="animate-spin text-red-500" size={24} />
        </div>
      )}

      {error && (
        <p className="text-red-400 text-sm">Failed to load subscribers.</p>
      )}

      {!isLoading && subscribers.length === 0 && (
        <div className="bg-[#111] border border-zinc-800 rounded p-8 text-center">
          <p className="text-zinc-500 text-sm">No subscribers yet.</p>
        </div>
      )}

      {subscribers.length > 0 && (
        <>
          <input
            type="search"
            placeholder="Search email address…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-[#1a1a1a] border border-zinc-700 text-zinc-100 rounded px-3 py-2 text-sm focus:outline-none focus:border-red-500"
          />

          <div className="bg-[#111] border border-zinc-800 rounded overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="text-left text-zinc-500 font-medium px-4 py-2">Email</th>
                  <th className="text-left text-zinc-500 font-medium px-4 py-2 hidden sm:table-cell">Source</th>
                  <th className="text-left text-zinc-500 font-medium px-4 py-2 hidden md:table-cell">Date</th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody>
                {filtered.map(sub => (
                  <tr key={sub.email} className="border-b border-zinc-800/50 hover:bg-zinc-900/40 transition-colors">
                    <td className="px-4 py-2 text-zinc-300">{sub.email}</td>
                    <td className="px-4 py-2 text-zinc-500 hidden sm:table-cell">{sub.source ?? '—'}</td>
                    <td className="px-4 py-2 text-zinc-500 hidden md:table-cell">
                      {new Date(sub.date).toLocaleDateString()}
                    </td>
                    <td className="px-2 py-2">
                      <button
                        type="button"
                        onClick={() => deleteMutation.mutate(sub.email)}
                        className="p-1 text-red-600 hover:text-red-400 transition-colors rounded"
                        aria-label={`Remove ${sub.email}`}
                        title="Remove"
                      >
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <p className="text-zinc-600 text-sm px-4 py-4">No results for &quot;{search}&quot;.</p>
            )}
          </div>
        </>
      )}
    </div>
  )
}
