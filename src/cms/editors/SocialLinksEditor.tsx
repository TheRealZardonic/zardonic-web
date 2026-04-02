import { useState, useEffect } from 'react'
import { useCmsContent } from '../hooks/useCmsContent'
import { useAutoSave } from '../hooks/useAutoSave'
import { useUnsavedChanges } from '../hooks/useUnsavedChanges'
import { type SocialLink } from '../schemas'
import { Loader2, Plus, Trash2, Check } from 'lucide-react'

const inputClass = 'bg-[#1a1a1a] border border-zinc-700 text-zinc-100 rounded px-3 py-2 w-full focus:outline-none focus:border-red-500'
const labelClass = 'text-zinc-400 text-sm block mb-1'

const PLATFORMS: SocialLink['platform'][] = [
  'spotify', 'instagram', 'youtube', 'twitter', 'facebook',
  'soundcloud', 'bandcamp', 'tiktok', 'apple-music', 'other',
]

interface SocialLinksData {
  links: SocialLink[]
}

function emptyLink(order: number): SocialLink {
  return { platform: 'other', url: '', label: '', order }
}

export default function SocialLinksEditor() {
  const { data, isLoading, isDraft, save } = useCmsContent<SocialLinksData>('zd-cms:social-links')
  const [links, setLinks] = useState<SocialLink[]>([])
  const [isDirty, setIsDirty] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (data) setLinks(data.links ?? [])
  }, [data])

  useAutoSave('zd-cms:social-links', { links }, isDirty)
  useUnsavedChanges(isDirty)

  const updateLink = (index: number, updated: SocialLink) => {
    setLinks(prev => prev.map((l, i) => i === index ? updated : l))
    setIsDirty(true)
  }

  const addLink = () => {
    setLinks(prev => [...prev, emptyLink(prev.length)])
    setIsDirty(true)
  }

  const deleteLink = (index: number) => {
    setLinks(prev => prev.filter((_, i) => i !== index).map((l, i) => ({ ...l, order: i })))
    setIsDirty(true)
  }

  const onSaveDraft = async () => {
    setIsSaving(true)
    try { await save({ links }, true); setIsDirty(false) } finally { setIsSaving(false) }
  }

  const onPublish = async () => {
    setIsSaving(true)
    try { await save({ links }, false); setIsDirty(false) } finally { setIsSaving(false) }
  }

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="animate-spin text-red-500" size={32} />
    </div>
  )

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-zinc-100 text-xl font-semibold">Social Links</h1>
        <div className="flex items-center gap-2">
          {isDraft && <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded">Draft</span>}
          <button type="button" onClick={addLink} className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-3 py-1.5 rounded text-sm flex items-center gap-1">
            <Plus size={14} /> Add Link
          </button>
        </div>
      </div>

      {links.length === 0 && (
        <div className="bg-[#111] border border-zinc-800 rounded p-8 text-center text-zinc-500 text-sm">
          No social links yet. Click "Add Link" to get started.
        </div>
      )}

      <div className="space-y-3">
        {links.map((link, index) => (
          <div key={index} className="bg-[#111] border border-zinc-800 rounded p-4">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className={labelClass}>Platform</label>
                <select
                  value={link.platform}
                  onChange={e => updateLink(index, { ...link, platform: e.target.value as SocialLink['platform'] })}
                  className={inputClass}
                >
                  {PLATFORMS.map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
              <div className="col-span-2">
                <label className={labelClass}>URL *</label>
                <input
                  value={link.url}
                  onChange={e => updateLink(index, { ...link, url: e.target.value })}
                  className={inputClass}
                  placeholder="https://…"
                />
              </div>
            </div>
            <div className="flex items-center gap-3 mt-3">
              <div className="flex-1">
                <label className={labelClass}>Label (optional)</label>
                <input
                  value={link.label ?? ''}
                  onChange={e => updateLink(index, { ...link, label: e.target.value })}
                  className={inputClass}
                  placeholder="Custom label"
                />
              </div>
              <button type="button" onClick={() => deleteLink(index)} className="text-red-500 hover:text-red-400 p-2 mt-5">
                <Trash2 size={16} />
              </button>
            </div>
          </div>
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
