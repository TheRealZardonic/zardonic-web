import { useState, useEffect } from 'react'
import { useCmsContent } from '../hooks/useCmsContent'
import { useAutoSave } from '../hooks/useAutoSave'
import { useUnsavedChanges } from '../hooks/useUnsavedChanges'
import { RichTextEditor } from './RichTextEditor'
import { Loader2 } from 'lucide-react'

interface BiographyContent {
  content: unknown
}

export default function BiographyEditor() {
  const { data, isLoading, isDraft, save } = useCmsContent<BiographyContent>('zd-cms:biography')
  const [content, setContent] = useState<unknown>(null)
  const [isDirty, setIsDirty] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (data) setContent(data.content)
  }, [data])

  useAutoSave('zd-cms:biography', { content }, isDirty)
  useUnsavedChanges(isDirty)

  const handleChange = (json: unknown) => {
    setContent(json)
    setIsDirty(true)
  }

  const onSaveDraft = async () => {
    setIsSaving(true)
    try { await save({ content }, true); setIsDirty(false) } finally { setIsSaving(false) }
  }

  const onPublish = async () => {
    setIsSaving(true)
    try { await save({ content }, false); setIsDirty(false) } finally { setIsSaving(false) }
  }

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="animate-spin text-red-500" size={32} />
    </div>
  )

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-zinc-100 text-xl font-semibold">Biography Editor</h1>
        {isDraft && <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded">Draft</span>}
      </div>

      <div className="bg-[#111] border border-zinc-800 rounded p-5">
        <RichTextEditor
          content={content}
          onChange={handleChange}
          placeholder="Write the band biography…"
        />
      </div>

      <div className="flex gap-3">
        <button onClick={onSaveDraft} disabled={isSaving} className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-4 py-2 rounded disabled:opacity-50 flex items-center gap-2">
          {isSaving && <Loader2 size={14} className="animate-spin" />} Save as Draft
        </button>
        <button onClick={onPublish} disabled={isSaving} className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded disabled:opacity-50 flex items-center gap-2">
          {isSaving && <Loader2 size={14} className="animate-spin" />} Publish
        </button>
      </div>
    </div>
  )
}
