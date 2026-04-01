import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { type SectionConfig } from '../schemas'
import { Loader2, ChevronUp, ChevronDown, Check } from 'lucide-react'
import { toast } from 'sonner'

interface SectionsResponse {
  sections: SectionConfig[]
}

async function fetchSections(): Promise<SectionsResponse> {
  const res = await fetch('/api/cms/sections', { credentials: 'include' })
  if (!res.ok) throw new Error(`Failed to load sections: ${res.status}`)
  return res.json() as Promise<SectionsResponse>
}

async function saveSections(sections: SectionConfig[]): Promise<void> {
  const res = await fetch('/api/cms/sections', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sections }),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { error?: string }
    throw new Error(body.error ?? `Save failed: ${res.status}`)
  }
}

export default function SectionsManager() {
  const queryClient = useQueryClient()
  const { data, isLoading, error } = useQuery({ queryKey: ['cms-sections'], queryFn: fetchSections, staleTime: 30_000 })
  const [sections, setSections] = useState<SectionConfig[] | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const working = sections ?? data?.sections ?? []

  const setWorking = (updater: (prev: SectionConfig[]) => SectionConfig[]) => {
    setSections(prev => updater(prev ?? data?.sections ?? []))
  }

  const toggleEnabled = (index: number) => {
    setWorking(prev => prev.map((s, i) => i === index ? { ...s, enabled: !s.enabled } : s))
  }

  const moveUp = (index: number) => {
    if (index === 0) return
    setWorking(prev => {
      const arr = [...prev]
      ;[arr[index - 1], arr[index]] = [arr[index], arr[index - 1]]
      return arr.map((s, i) => ({ ...s, order: i }))
    })
  }

  const moveDown = (index: number) => {
    setWorking(prev => {
      if (index >= prev.length - 1) return prev
      const arr = [...prev]
      ;[arr[index], arr[index + 1]] = [arr[index + 1], arr[index]]
      return arr.map((s, i) => ({ ...s, order: i }))
    })
  }

  const onSave = async () => {
    setIsSaving(true)
    try {
      await saveSections(working)
      await queryClient.invalidateQueries({ queryKey: ['cms-sections'] })
      setSections(null)
      toast.success('Sections saved.')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Save failed.'
      toast.error(message)
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="animate-spin text-red-500" size={32} />
    </div>
  )

  if (error) return (
    <div className="flex items-center justify-center h-64 text-red-400 text-sm">
      Failed to load sections.
    </div>
  )

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-zinc-100 text-xl font-semibold">Sections Manager</h1>
        <button
          type="button"
          onClick={onSave}
          disabled={isSaving || sections === null}
          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded disabled:opacity-50 flex items-center gap-2 text-sm"
        >
          {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Save Order
        </button>
      </div>

      <p className="text-zinc-500 text-sm">Toggle sections on/off and reorder them.</p>

      {working.length === 0 && (
        <div className="bg-[#111] border border-zinc-800 rounded p-8 text-center text-zinc-500 text-sm">
          No sections configured.
        </div>
      )}

      <div className="space-y-2">
        {working.map((section, index) => (
          <div
            key={section.id}
            className={`bg-[#111] border rounded p-3 flex items-center gap-3 transition-colors ${section.enabled ? 'border-zinc-700' : 'border-zinc-800 opacity-60'}`}
          >
            <div className="flex flex-col gap-0.5">
              <button type="button" onClick={() => moveUp(index)} disabled={index === 0} className="text-zinc-500 hover:text-zinc-200 disabled:opacity-30 p-0.5"><ChevronUp size={14} /></button>
              <button type="button" onClick={() => moveDown(index)} disabled={index === working.length - 1} className="text-zinc-500 hover:text-zinc-200 disabled:opacity-30 p-0.5"><ChevronDown size={14} /></button>
            </div>

            <button
              type="button"
              onClick={() => toggleEnabled(index)}
              className={`relative inline-flex w-10 h-5 rounded-full transition-colors flex-shrink-0 ${section.enabled ? 'bg-red-500' : 'bg-zinc-600'}`}
              aria-label={section.enabled ? 'Disable section' : 'Enable section'}
            >
              <span className={`inline-block w-4 h-4 bg-white rounded-full shadow transform transition-transform mt-0.5 ${section.enabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </button>

            <div className="flex-1">
              <p className="text-zinc-100 text-sm font-medium">{section.label}</p>
              <p className="text-zinc-500 text-xs">{section.type}</p>
            </div>

            <span className={`text-xs px-2 py-0.5 rounded ${section.enabled ? 'bg-green-500/20 text-green-400' : 'bg-zinc-700 text-zinc-400'}`}>
              {section.enabled ? 'Enabled' : 'Disabled'}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
