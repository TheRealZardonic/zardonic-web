import { useState, useEffect } from 'react'
import { useCmsContent } from '../hooks/useCmsContent'
import { useAutoSave } from '../hooks/useAutoSave'
import { useUnsavedChanges } from '../hooks/useUnsavedChanges'
import { type MemberSlot } from '../schemas'
import { Loader2, Plus, Trash2, ChevronUp, ChevronDown, Check } from 'lucide-react'

const inputClass = 'bg-[#1a1a1a] border border-zinc-700 text-zinc-100 rounded px-3 py-2 w-full focus:outline-none focus:border-red-500'
const labelClass = 'text-zinc-400 text-sm block mb-1'

interface MembersData {
  members: MemberSlot[]
}

function emptyMember(order: number): MemberSlot {
  return {
    id: crypto.randomUUID(),
    name: '',
    role: '',
    photoUrl: '',
    bio: '',
    socialLinks: [],
    type: 'entity',
    order,
  }
}

interface MemberRowProps {
  member: MemberSlot
  index: number
  total: number
  onChange: (updated: MemberSlot) => void
  onDelete: () => void
  onMoveUp: () => void
  onMoveDown: () => void
}

function MemberRow({ member, index, total, onChange, onDelete, onMoveUp, onMoveDown }: MemberRowProps) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="bg-[#111] border border-zinc-800 rounded overflow-hidden">
      <div className="flex items-center gap-3 p-3">
        <div className="flex flex-col gap-0.5">
          <button type="button" onClick={onMoveUp} disabled={index === 0} className="text-zinc-500 hover:text-zinc-200 disabled:opacity-30 p-0.5"><ChevronUp size={14} /></button>
          <button type="button" onClick={onMoveDown} disabled={index === total - 1} className="text-zinc-500 hover:text-zinc-200 disabled:opacity-30 p-0.5"><ChevronDown size={14} /></button>
        </div>
        {member.photoUrl && (
          <img src={member.photoUrl} alt={member.name} className="w-8 h-8 rounded-full object-cover border border-zinc-700" />
        )}
        <div className="flex-1 min-w-0">
          <p className="text-zinc-100 text-sm font-medium truncate">{member.name || <span className="text-zinc-600 italic">Unnamed member</span>}</p>
          <p className="text-zinc-500 text-xs">{member.role || 'No role'} · {member.type}</p>
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
              <label className={labelClass}>Name *</label>
              <input value={member.name} onChange={e => onChange({ ...member, name: e.target.value })} className={inputClass} placeholder="Name" />
            </div>
            <div>
              <label className={labelClass}>Role *</label>
              <input value={member.role} onChange={e => onChange({ ...member, role: e.target.value })} className={inputClass} placeholder="Role" />
            </div>
          </div>
          <div>
            <label className={labelClass}>Photo URL</label>
            <input value={member.photoUrl ?? ''} onChange={e => onChange({ ...member, photoUrl: e.target.value })} className={inputClass} placeholder="https://…" />
          </div>
          <div>
            <label className={labelClass}>Type</label>
            <select
              value={member.type}
              onChange={e => onChange({ ...member, type: e.target.value as 'entity' | 'engineer' })}
              className={inputClass}
            >
              <option value="entity">Entity</option>
              <option value="engineer">Engineer</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Bio</label>
            <textarea
              value={member.bio ?? ''}
              onChange={e => onChange({ ...member, bio: e.target.value })}
              className={inputClass + ' min-h-[80px] resize-y'}
              placeholder="Short biography…"
            />
          </div>
        </div>
      )}
    </div>
  )
}

export default function MembersEditor() {
  const { data, isLoading, isDraft, save } = useCmsContent<MembersData>('zd-cms:members')
  const [members, setMembers] = useState<MemberSlot[]>([])
  const [isDirty, setIsDirty] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (data) setMembers(data.members ?? [])
  }, [data])

  useAutoSave('zd-cms:members', { members }, isDirty)
  useUnsavedChanges(isDirty)

  const updateMember = (index: number, updated: MemberSlot) => {
    setMembers(prev => prev.map((m, i) => i === index ? updated : m))
    setIsDirty(true)
  }

  const addMember = () => {
    setMembers(prev => [...prev, emptyMember(prev.length)])
    setIsDirty(true)
  }

  const deleteMember = (index: number) => {
    setMembers(prev => prev.filter((_, i) => i !== index).map((m, i) => ({ ...m, order: i })))
    setIsDirty(true)
  }

  const moveUp = (index: number) => {
    if (index === 0) return
    setMembers(prev => {
      const arr = [...prev]
      ;[arr[index - 1], arr[index]] = [arr[index], arr[index - 1]]
      return arr.map((m, i) => ({ ...m, order: i }))
    })
    setIsDirty(true)
  }

  const moveDown = (index: number) => {
    setMembers(prev => {
      if (index >= prev.length - 1) return prev
      const arr = [...prev]
      ;[arr[index], arr[index + 1]] = [arr[index + 1], arr[index]]
      return arr.map((m, i) => ({ ...m, order: i }))
    })
    setIsDirty(true)
  }

  const onSaveDraft = async () => {
    setIsSaving(true)
    try { await save({ members }, true); setIsDirty(false) } finally { setIsSaving(false) }
  }

  const onPublish = async () => {
    setIsSaving(true)
    try { await save({ members }, false); setIsDirty(false) } finally { setIsSaving(false) }
  }

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="animate-spin text-red-500" size={32} />
    </div>
  )

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-zinc-100 text-xl font-semibold">Members Editor</h1>
        <div className="flex items-center gap-2">
          {isDraft && <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded">Draft</span>}
          <button type="button" onClick={addMember} className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-3 py-1.5 rounded text-sm flex items-center gap-1">
            <Plus size={14} /> Add Member
          </button>
        </div>
      </div>

      {members.length === 0 && (
        <div className="bg-[#111] border border-zinc-800 rounded p-8 text-center text-zinc-500 text-sm">
          No members yet. Click "Add Member" to get started.
        </div>
      )}

      <div className="space-y-2">
        {members.map((member, index) => (
          <MemberRow
            key={member.id}
            member={member}
            index={index}
            total={members.length}
            onChange={(updated) => updateMember(index, updated)}
            onDelete={() => deleteMember(index)}
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
