import { useState, useEffect } from 'react'
import { useCmsContent } from '../hooks/useCmsContent'
import { useAutoSave } from '../hooks/useAutoSave'
import { useUnsavedChanges } from '../hooks/useUnsavedChanges'
import { type NavItem } from '../schemas'
import { Loader2, Plus, Trash2, ChevronUp, ChevronDown, Check } from 'lucide-react'

const inputClass = 'bg-[#1a1a1a] border border-zinc-700 text-zinc-100 rounded px-3 py-2 w-full focus:outline-none focus:border-red-500'
const labelClass = 'text-zinc-400 text-sm block mb-1'

interface NavigationData {
  items: NavItem[]
}

function emptyItem(order: number): NavItem {
  return { id: crypto.randomUUID(), label: '', anchor: '', order, enabled: true }
}

export default function NavigationEditor() {
  const { data, isLoading, isDraft, save } = useCmsContent<NavigationData>('zd-cms:navigation')
  const [items, setItems] = useState<NavItem[]>([])
  const [isDirty, setIsDirty] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (data) setItems(data.items ?? [])
  }, [data])

  useAutoSave('zd-cms:navigation', { items }, isDirty)
  useUnsavedChanges(isDirty)

  const updateItem = (index: number, updated: NavItem) => {
    setItems(prev => prev.map((item, i) => i === index ? updated : item))
    setIsDirty(true)
  }

  const addItem = () => {
    setItems(prev => [...prev, emptyItem(prev.length)])
    setIsDirty(true)
  }

  const deleteItem = (index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index).map((item, i) => ({ ...item, order: i })))
    setIsDirty(true)
  }

  const moveUp = (index: number) => {
    if (index === 0) return
    setItems(prev => {
      const arr = [...prev]
      ;[arr[index - 1], arr[index]] = [arr[index], arr[index - 1]]
      return arr.map((item, i) => ({ ...item, order: i }))
    })
    setIsDirty(true)
  }

  const moveDown = (index: number) => {
    setItems(prev => {
      if (index >= prev.length - 1) return prev
      const arr = [...prev]
      ;[arr[index], arr[index + 1]] = [arr[index + 1], arr[index]]
      return arr.map((item, i) => ({ ...item, order: i }))
    })
    setIsDirty(true)
  }

  const onSaveDraft = async () => {
    setIsSaving(true)
    try { await save({ items }, true); setIsDirty(false) } finally { setIsSaving(false) }
  }

  const onPublish = async () => {
    setIsSaving(true)
    try { await save({ items }, false); setIsDirty(false) } finally { setIsSaving(false) }
  }

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="animate-spin text-red-500" size={32} />
    </div>
  )

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-zinc-100 text-xl font-semibold">Navigation Editor</h1>
        <div className="flex items-center gap-2">
          {isDraft && <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded">Draft</span>}
          <button type="button" onClick={addItem} className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-3 py-1.5 rounded text-sm flex items-center gap-1">
            <Plus size={14} /> Add Item
          </button>
        </div>
      </div>

      {items.length === 0 && (
        <div className="bg-[#111] border border-zinc-800 rounded p-8 text-center text-zinc-500 text-sm">
          No nav items yet.
        </div>
      )}

      <div className="space-y-2">
        {items.map((item, index) => (
          <div key={item.id} className="bg-[#111] border border-zinc-800 rounded p-3 flex items-center gap-3">
            <div className="flex flex-col gap-0.5">
              <button type="button" onClick={() => moveUp(index)} disabled={index === 0} className="text-zinc-500 hover:text-zinc-200 disabled:opacity-30 p-0.5"><ChevronUp size={14} /></button>
              <button type="button" onClick={() => moveDown(index)} disabled={index === items.length - 1} className="text-zinc-500 hover:text-zinc-200 disabled:opacity-30 p-0.5"><ChevronDown size={14} /></button>
            </div>
            <button
              type="button"
              onClick={() => updateItem(index, { ...item, enabled: !item.enabled })}
              className={`relative inline-flex w-10 h-5 rounded-full transition-colors flex-shrink-0 ${item.enabled ? 'bg-red-500' : 'bg-zinc-600'}`}
              aria-label={item.enabled ? 'Disable' : 'Enable'}
            >
              <span className={`inline-block w-4 h-4 bg-white rounded-full shadow transform transition-transform mt-0.5 ${item.enabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </button>
            <div className="flex-1 grid grid-cols-2 gap-2">
              <div>
                <label className={labelClass}>Label</label>
                <input
                  value={item.label}
                  onChange={e => updateItem(index, { ...item, label: e.target.value })}
                  className={inputClass}
                  placeholder="Label"
                />
              </div>
              <div>
                <label className={labelClass}>Anchor</label>
                <input
                  value={item.anchor}
                  onChange={e => updateItem(index, { ...item, anchor: e.target.value })}
                  className={inputClass}
                  placeholder="#section"
                />
              </div>
            </div>
            <button type="button" onClick={() => deleteItem(index)} className="text-red-500 hover:text-red-400 p-1"><Trash2 size={15} /></button>
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
