import { useState, useEffect } from 'react'
import { useCmsContent } from '../hooks/useCmsContent'
import { useAutoSave } from '../hooks/useAutoSave'
import { useUnsavedChanges } from '../hooks/useUnsavedChanges'
import { RichTextEditor } from './RichTextEditor'
import { type NewsArticle } from '../schemas'
import { Loader2, Plus, Trash2, ChevronLeft, Check } from 'lucide-react'

const inputClass = 'bg-[#1a1a1a] border border-zinc-700 text-zinc-100 rounded px-3 py-2 w-full focus:outline-none focus:border-red-500'
const labelClass = 'text-zinc-400 text-sm block mb-1'

interface NewsData {
  articles: NewsArticle[]
}

function emptyArticle(): NewsArticle {
  return {
    id: crypto.randomUUID(),
    title: '',
    content: {},
    featuredImageUrl: '',
    publishedAt: new Date().toISOString().slice(0, 10),
    isDraft: true,
  }
}

export default function NewsEditor() {
  const { data, isLoading, isDraft, save } = useCmsContent<NewsData>('zd-cms:news')
  const [articles, setArticles] = useState<NewsArticle[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isDirty, setIsDirty] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (data) setArticles(data.articles ?? [])
  }, [data])

  useAutoSave('zd-cms:news', { articles }, isDirty)
  useUnsavedChanges(isDirty)

  const editingArticle = articles.find(a => a.id === editingId) ?? null

  const updateArticle = (updated: NewsArticle) => {
    setArticles(prev => prev.map(a => a.id === updated.id ? updated : a))
    setIsDirty(true)
  }

  const addArticle = () => {
    const a = emptyArticle()
    setArticles(prev => [...prev, a])
    setEditingId(a.id)
    setIsDirty(true)
  }

  const deleteArticle = (id: string) => {
    setArticles(prev => prev.filter(a => a.id !== id))
    if (editingId === id) setEditingId(null)
    setIsDirty(true)
  }

  const onSaveDraft = async () => {
    setIsSaving(true)
    try { await save({ articles }, true); setIsDirty(false) } finally { setIsSaving(false) }
  }

  const onPublish = async () => {
    setIsSaving(true)
    try { await save({ articles }, false); setIsDirty(false) } finally { setIsSaving(false) }
  }

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="animate-spin text-red-500" size={32} />
    </div>
  )

  if (editingArticle) {
    return (
      <div className="p-6 max-w-3xl mx-auto space-y-5">
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => setEditingId(null)} className="text-zinc-400 hover:text-zinc-100 flex items-center gap-1 text-sm">
            <ChevronLeft size={16} /> Back to list
          </button>
          {isDraft && <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded">Draft</span>}
        </div>

        <div className="bg-[#111] border border-zinc-800 rounded p-5 space-y-4">
          <div>
            <label className={labelClass}>Title *</label>
            <input
              value={editingArticle.title}
              onChange={e => updateArticle({ ...editingArticle, title: e.target.value })}
              className={inputClass}
              placeholder="Article title"
            />
          </div>
          <div>
            <label className={labelClass}>Featured Image URL</label>
            <input
              value={editingArticle.featuredImageUrl ?? ''}
              onChange={e => updateArticle({ ...editingArticle, featuredImageUrl: e.target.value })}
              className={inputClass}
              placeholder="https://…"
            />
          </div>
          <div>
            <label className={labelClass}>Published At</label>
            <input
              type="date"
              value={editingArticle.publishedAt ?? ''}
              onChange={e => updateArticle({ ...editingArticle, publishedAt: e.target.value })}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Content</label>
            <RichTextEditor
              content={editingArticle.content}
              onChange={json => updateArticle({ ...editingArticle, content: json })}
              placeholder="Write article content…"
            />
          </div>
        </div>

        <div className="flex gap-3">
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

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-zinc-100 text-xl font-semibold">News Editor</h1>
        <div className="flex items-center gap-2">
          {isDraft && <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded">Draft</span>}
          <button type="button" onClick={addArticle} className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-3 py-1.5 rounded text-sm flex items-center gap-1">
            <Plus size={14} /> New Article
          </button>
        </div>
      </div>

      {articles.length === 0 && (
        <div className="bg-[#111] border border-zinc-800 rounded p-8 text-center text-zinc-500 text-sm">
          No articles yet. Click "New Article" to get started.
        </div>
      )}

      <div className="space-y-2">
        {articles.map(article => (
          <div key={article.id} className="bg-[#111] border border-zinc-800 rounded p-3 flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-zinc-100 text-sm font-medium truncate">{article.title || <span className="text-zinc-600 italic">Untitled article</span>}</p>
              <p className="text-zinc-500 text-xs">{article.publishedAt ?? 'No date'} · {article.isDraft ? 'Draft' : 'Published'}</p>
            </div>
            <button type="button" onClick={() => setEditingId(article.id)} className="text-zinc-400 hover:text-zinc-100 text-xs px-2 py-1 bg-zinc-800 rounded">Edit</button>
            <button type="button" onClick={() => deleteArticle(article.id)} className="text-red-500 hover:text-red-400 p-1"><Trash2 size={15} /></button>
          </div>
        ))}
      </div>

      {articles.length > 0 && (
        <div className="flex gap-3 pt-2">
          <button onClick={onSaveDraft} disabled={isSaving} className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-4 py-2 rounded disabled:opacity-50 flex items-center gap-2">
            {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Save as Draft
          </button>
          <button onClick={onPublish} disabled={isSaving} className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded disabled:opacity-50 flex items-center gap-2">
            {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Publish
          </button>
        </div>
      )}
    </div>
  )
}
