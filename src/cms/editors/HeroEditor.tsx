import { useState, useEffect } from 'react'
import { useForm, useFormState } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { heroSchema, type HeroConfig } from '../schemas'
import { useCmsContent } from '../hooks/useCmsContent'
import { useAutoSave } from '../hooks/useAutoSave'
import { useUnsavedChanges } from '../hooks/useUnsavedChanges'
import { Loader2 } from 'lucide-react'

const inputClass = 'bg-[#1a1a1a] border border-zinc-700 text-zinc-100 rounded px-3 py-2 w-full focus:outline-none focus:border-red-500'
const labelClass = 'text-zinc-400 text-sm'

export default function HeroEditor() {
  const { data, isLoading, isDraft, save } = useCmsContent<HeroConfig>('zd-cms:hero')
  const [isSaving, setIsSaving] = useState(false)

  const { register, handleSubmit, control, watch, reset, formState: { errors } } = useForm<HeroConfig>({
    resolver: zodResolver(heroSchema),
    defaultValues: { headline: '', overlayOpacity: 0.5 },
  })
  const { isDirty } = useFormState({ control })

  useEffect(() => {
    if (data) reset(data)
  }, [data, reset])

  const formValues = watch()
  useAutoSave('zd-cms:hero', formValues, isDirty)
  useUnsavedChanges(isDirty)

  const overlayOpacity = watch('overlayOpacity') ?? 0.5
  const backgroundImageUrl = watch('backgroundImageUrl')
  const headline = watch('headline')
  const subheadline = watch('subheadline')
  const ctaText = watch('ctaText')

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
        <h1 className="text-zinc-100 text-xl font-semibold">Hero Editor</h1>
        {isDraft && <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded">Draft</span>}
      </div>

      <div className="bg-[#111] border border-zinc-800 rounded p-5 space-y-4">
        <div>
          <label className={labelClass}>Background Image URL</label>
          <input {...register('backgroundImageUrl')} className={inputClass} placeholder="https://…" />
          {errors.backgroundImageUrl && <p className="text-red-500 text-xs mt-1">{errors.backgroundImageUrl.message}</p>}
        </div>
        <div>
          <label className={labelClass}>Headline *</label>
          <input {...register('headline')} className={inputClass} placeholder="Headline" />
          {errors.headline && <p className="text-red-500 text-xs mt-1">{errors.headline.message}</p>}
        </div>
        <div>
          <label className={labelClass}>Subheadline</label>
          <input {...register('subheadline')} className={inputClass} placeholder="Subheadline" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>CTA Text</label>
            <input {...register('ctaText')} className={inputClass} placeholder="Get in touch" />
          </div>
          <div>
            <label className={labelClass}>CTA Link</label>
            <input {...register('ctaLink')} className={inputClass} placeholder="#contact" />
          </div>
        </div>
        <div>
          <label className={labelClass}>Overlay Opacity: {overlayOpacity}</label>
          <input type="range" min={0} max={1} step={0.05} {...register('overlayOpacity', { valueAsNumber: true })} className="w-full accent-red-500 mt-1" />
        </div>
      </div>

      <div className="bg-[#111] border border-zinc-800 rounded p-3">
        <p className="text-zinc-500 text-xs mb-2">Preview</p>
        <div
          className="relative h-32 rounded overflow-hidden flex items-center justify-center"
          style={{ backgroundImage: backgroundImageUrl ? `url(${backgroundImageUrl})` : undefined, backgroundColor: '#1a1a1a' }}
        >
          <div className="absolute inset-0 bg-black" style={{ opacity: overlayOpacity }} />
          <div className="relative text-center z-10 px-4">
            <p className="text-white font-bold text-lg">{headline || 'Headline'}</p>
            {subheadline && <p className="text-zinc-300 text-sm">{subheadline}</p>}
            {ctaText && <span className="mt-1 inline-block text-xs bg-red-600 text-white px-3 py-1 rounded">{ctaText}</span>}
          </div>
        </div>
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
