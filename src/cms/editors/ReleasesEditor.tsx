import { useState, useEffect } from 'react'
import { useCmsContent } from '../hooks/useCmsContent'
import { useAutoSave } from '../hooks/useAutoSave'
import { useUnsavedChanges } from '../hooks/useUnsavedChanges'
import { type Release } from '../schemas'
import { Loader2, Plus, Trash2, ChevronUp, ChevronDown, Check } from 'lucide-react'

const inputClass = 'bg-[#1a1a1a] border border-zinc-700 text-zinc-100 rounded px-3 py-2 w-full focus:outline-none focus:border-red-500'
const labelClass = 'text-zinc-400 text-sm block mb-1'

interface ReleasesData {
  releases: Release[]
}

function emptyRelease(): Release {
  return {
    id: crypto.randomUUID(),
    title: '',
    coverUrl: '',
    releaseDate: new Date().toISOString().slice(0, 10),
    type: 'single',
    streamingLinks: [],
    description: '',
  }
}

interface ReleaseRowProps {
  release: Release
  index: number
  total: number
  onChange: (updated: Release) => void
  onDelete: () => void
  onMoveUp: () => void
  onMoveDown: () => void
}

function ReleaseRow({ release, index, total, onChange, onDelete, onMoveUp, onMoveDown }: ReleaseRowProps) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="bg-[#111] border border-zinc-800 rounded overflow-hidden">
      <div className="flex items-center gap-3 p-3">
        <div className="flex flex-col gap-0.5">
          <button type="button" onClick={onMoveUp} disabled={index === 0} className="text-zinc-500 hover:text-zinc-200 disabled:opacity-30 p-0.5"><ChevronUp size={14} /></button>
          <button type="button" onClick={onMoveDown} disabled={index === total - 1} className="text-zinc-500 hover:text-zinc-200 disabled:opacity-30 p-0.5"><ChevronDown size={14} /></button>
        </div>
        {release.coverUrl && (
          <img src={release.coverUrl} alt={release.title} className="w-10 h-10 rounded object-cover border border-zinc-700" />
        )}
        <div className="flex-1 min-w-0">
          <p className="text-zinc-100 text-sm font-medium truncate">{release.title || <span className="text-zinc-600 italic">Untitled release</span>}</p>
          <p className="text-zinc-500 text-xs capitalize">{release.type} · {release.releaseDate}</p>
        </div>
        <button type="button" onClick={() => setExpanded(e => !e)} className="text-zinc-400 hover:text-zinc-100 text-xs px-2 py-1 bg-zinc-800 rounded">
          {expanded ? 'Collapse' : 'Edit'}
        </button>
        <button type="button" onClick={onDelete} className="text-red-500 hover:text-red-400 p-1"><Trash2 size={15} /></button>
      </div>

      {expanded && (
        <div className="border-t border-zinc-800 p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Title *</label>
              <input value={release.title} onChange={e => onChange({ ...release, title: e.target.value })} className={inputClass} placeholder="Release title" />
            </div>
            <div>
              <label className={labelClass}>Type</label>
              <select
                value={release.type}
                onChange={e => onChange({ ...release, type: e.target.value as Release['type'] })}
                className={inputClass}
              >
                <option value="album">Album</option>
                <option value="single">Single</option>
                <option value="ep">EP</option>
                <option value="remix">Remix</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Cover URL</label>
              <input value={release.coverUrl ?? ''} onChange={e => onChange({ ...release, coverUrl: e.target.value })} className={inputClass} placeholder="https://…" />
            </div>
            <div>
              <label className={labelClass}>Release Date</label>
              <input type="date" value={release.releaseDate} onChange={e => onChange({ ...release, releaseDate: e.target.value })} className={inputClass} />
            </div>
          </div>
          <div>
            <label className={labelClass}>Description</label>
            <textarea
              value={release.description ?? ''}
              onChange={e => onChange({ ...release, description: e.target.value })}
              className={inputClass + ' min-h-[80px] resize-y'}
              placeholder="Release description…"
            />
          </div>
        </div>
      )}
    </div>
  )
}

export default function ReleasesEditor() {
  const { data, isLoading, isDraft, save } = useCmsContent<ReleasesData>('zd-cms:releases')
  const [releases, setReleases] = useState<Release[]>([])
  const [isDirty, setIsDirty] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (data) setReleases(data.releases ?? [])
  }, [data])

  useAutoSave('zd-cms:releases', { releases }, isDirty)
  useUnsavedChanges(isDirty)

  const updateRelease = (index: number, updated: Release) => {
    setReleases(prev => prev.map((r, i) => i === index ? updated : r))
    setIsDirty(true)
  }

  const addRelease = () => {
    setReleases(prev => [...prev, emptyRelease()])
    setIsDirty(true)
  }

  const deleteRelease = (index: number) => {
    setReleases(prev => prev.filter((_, i) => i !== index))
    setIsDirty(true)
  }

  const moveUp = (index: number) => {
    if (index === 0) return
    setReleases(prev => {
      const arr = [...prev]
      ;[arr[index - 1], arr[index]] = [arr[index], arr[index - 1]]
      return arr
    })
    setIsDirty(true)
  }

  const moveDown = (index: number) => {
    setReleases(prev => {
      if (index >= prev.length - 1) return prev
      const arr = [...prev]
      ;[arr[index], arr[index + 1]] = [arr[index + 1], arr[index]]
      return arr
    })
    setIsDirty(true)
  }

  const onSaveDraft = async () => {
    setIsSaving(true)
    try { await save({ releases }, true); setIsDirty(false) } finally { setIsSaving(false) }
  }

  const onPublish = async () => {
    setIsSaving(true)
    try { await save({ releases }, false); setIsDirty(false) } finally { setIsSaving(false) }
  }

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="animate-spin text-red-500" size={32} />
    </div>
  )

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-zinc-100 text-xl font-semibold">Releases Editor</h1>
        <div className="flex items-center gap-2">
          {isDraft && <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded">Draft</span>}
          <button type="button" onClick={addRelease} className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-3 py-1.5 rounded text-sm flex items-center gap-1">
            <Plus size={14} /> Add Release
          </button>
        </div>
      </div>

      {releases.length === 0 && (
        <div className="bg-[#111] border border-zinc-800 rounded p-8 text-center text-zinc-500 text-sm">
          No releases yet. Click "Add Release" to get started.
        </div>
      )}

      <div className="space-y-2">
        {releases.map((release, index) => (
          <ReleaseRow
            key={release.id}
            release={release}
            index={index}
            total={releases.length}
            onChange={(updated) => updateRelease(index, updated)}
            onDelete={() => deleteRelease(index)}
            onMoveUp={() => moveUp(index)}
            onMoveDown={() => moveDown(index)}
          />
        ))}
      </div>

      <div className="flex gap-3 pt-2">
        <button onClick={onSaveDraft} disabled={isSaving} className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-4 py-2 rounded disabled:opacity-50 flex items-center gap-2">
          {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Save as Draft
        </button>
        <button onClick={onPublish} disabled={isSaving} className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded disabled:opacity-50 flex items-center gap-2">
          {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Publish
        </button>
      </div>
    </div>
  )
}
