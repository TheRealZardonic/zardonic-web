import { useState, useEffect } from 'react'
import { useForm, useFormState, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { footerConfigSchema, type FooterConfig } from '../schemas'
import { useCmsContent } from '../hooks/useCmsContent'
import { useAutoSave } from '../hooks/useAutoSave'
import { useUnsavedChanges } from '../hooks/useUnsavedChanges'
import { Loader2, Plus, Trash2, Check } from 'lucide-react'

const inputClass = 'bg-[#1a1a1a] border border-zinc-700 text-zinc-100 rounded px-3 py-2 w-full focus:outline-none focus:border-red-500'
const labelClass = 'text-zinc-400 text-sm block mb-1'

export default function FooterEditor() {
  const { data, isLoading, isDraft, save } = useCmsContent<FooterConfig>('zd-cms:footer')
  const [isSaving, setIsSaving] = useState(false)

  const { register, handleSubmit, control, watch, reset, formState: { errors } } = useForm<FooterConfig>({
    resolver: zodResolver(footerConfigSchema),
    defaultValues: { copyrightText: '', contactEmail: '', additionalLinks: [], legalLinks: [] },
  })
  const { isDirty } = useFormState({ control })

  const { fields: additionalFields, append: appendAdditional, remove: removeAdditional } = useFieldArray({ control, name: 'additionalLinks' })
  const { fields: legalFields, append: appendLegal, remove: removeLegal } = useFieldArray({ control, name: 'legalLinks' })

  useEffect(() => {
    if (data) reset(data)
  }, [data, reset])

  const formValues = watch()
  useAutoSave('zd-cms:footer', formValues, isDirty)
  useUnsavedChanges(isDirty)

  const onSaveDraft = handleSubmit(async (values) => {
    setIsSaving(true)
    try { await save(values, true) } finally { setIsSaving(false) }
  })

  const onPublish = handleSubmit(async (values) => {
    setIsSaving(true)
    try { await save(values, false) } finally { setIsSaving(false) }
  })

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="animate-spin text-red-500" size={32} />
    </div>
  )

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-zinc-100 text-xl font-semibold">Footer Editor</h1>
        {isDraft && <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded">Draft</span>}
      </div>

      <div className="bg-[#111] border border-zinc-800 rounded p-5 space-y-4">
        <div>
          <label className={labelClass}>Copyright Text *</label>
          <input {...register('copyrightText')} className={inputClass} placeholder="© 2024 Band Name. All rights reserved." />
          {errors.copyrightText && <p className="text-red-500 text-xs mt-1">{errors.copyrightText.message}</p>}
        </div>
        <div>
          <label className={labelClass}>Contact Email</label>
          <input {...register('contactEmail')} type="email" className={inputClass} placeholder="contact@example.com" />
          {errors.contactEmail && <p className="text-red-500 text-xs mt-1">{errors.contactEmail.message}</p>}
        </div>
      </div>

      <div className="bg-[#111] border border-zinc-800 rounded p-5 space-y-3">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-zinc-300 text-sm font-medium">Additional Links</h2>
          <button type="button" onClick={() => appendAdditional({ label: '', url: '' })} className="text-xs bg-zinc-700 hover:bg-zinc-600 text-zinc-200 px-2 py-1 rounded flex items-center gap-1">
            <Plus size={12} /> Add
          </button>
        </div>
        {additionalFields.map((field, index) => (
          <div key={field.id} className="flex gap-2 items-start">
            <div className="flex-1">
              <input {...register(`additionalLinks.${index}.label`)} className={inputClass} placeholder="Label" />
            </div>
            <div className="flex-1">
              <input {...register(`additionalLinks.${index}.url`)} className={inputClass} placeholder="URL" />
            </div>
            <button type="button" onClick={() => removeAdditional(index)} className="text-red-500 hover:text-red-400 p-2 mt-0.5"><Trash2 size={15} /></button>
          </div>
        ))}
      </div>

      <div className="bg-[#111] border border-zinc-800 rounded p-5 space-y-3">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-zinc-300 text-sm font-medium">Legal Links</h2>
          <button type="button" onClick={() => appendLegal({ label: '', url: '' })} className="text-xs bg-zinc-700 hover:bg-zinc-600 text-zinc-200 px-2 py-1 rounded flex items-center gap-1">
            <Plus size={12} /> Add
          </button>
        </div>
        {legalFields.map((field, index) => (
          <div key={field.id} className="flex gap-2 items-start">
            <div className="flex-1">
              <input {...register(`legalLinks.${index}.label`)} className={inputClass} placeholder="Label" />
            </div>
            <div className="flex-1">
              <input {...register(`legalLinks.${index}.url`)} className={inputClass} placeholder="URL" />
            </div>
            <button type="button" onClick={() => removeLegal(index)} className="text-red-500 hover:text-red-400 p-2 mt-0.5"><Trash2 size={15} /></button>
          </div>
        ))}
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
