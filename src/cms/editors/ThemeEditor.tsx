import { useState, useEffect } from 'react'
import { useForm, useFormState } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { themeConfigSchema, type ThemeConfig } from '../schemas'
import { useCmsContent } from '../hooks/useCmsContent'
import { useAutoSave } from '../hooks/useAutoSave'
import { useUnsavedChanges } from '../hooks/useUnsavedChanges'
import { Loader2, Check } from 'lucide-react'

const inputClass = 'bg-[#1a1a1a] border border-zinc-700 text-zinc-100 rounded px-3 py-2 w-full focus:outline-none focus:border-red-500'
const labelClass = 'text-zinc-400 text-sm block mb-1'

export default function ThemeEditor() {
  const { data, isLoading, isDraft, save } = useCmsContent<ThemeConfig>('zd-cms:theme')
  const [isSaving, setIsSaving] = useState(false)

  const { register, handleSubmit, control, watch, reset, formState: { errors } } = useForm<ThemeConfig>({
    resolver: zodResolver(themeConfigSchema),
    defaultValues: {
      primaryColor: '#e11d48',
      secondaryColor: '#18181b',
      accentColor: '#dc2626',
      fontFamily: '',
      overlaySettings: { enabled: false, color: '#000000', opacity: 0.5 },
    },
  })
  const { isDirty } = useFormState({ control })

  useEffect(() => {
    if (data) reset(data)
  }, [data, reset])

  const formValues = watch()
  useAutoSave('zd-cms:theme', formValues, isDirty)
  useUnsavedChanges(isDirty)

  const overlayEnabled = watch('overlaySettings.enabled')
  const overlayOpacity = watch('overlaySettings.opacity') ?? 0.5

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
        <h1 className="text-zinc-100 text-xl font-semibold">Theme Editor</h1>
        {isDraft && <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded">Draft</span>}
      </div>

      <div className="bg-[#111] border border-zinc-800 rounded p-5 space-y-4">
        <h2 className="text-zinc-300 text-sm font-medium">Colors</h2>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className={labelClass}>Primary Color</label>
            <div className="flex items-center gap-2">
              <input type="color" {...register('primaryColor')} className="w-10 h-9 rounded border border-zinc-700 bg-transparent cursor-pointer" />
              <input {...register('primaryColor')} className={inputClass} placeholder="#e11d48" />
            </div>
            {errors.primaryColor && <p className="text-red-500 text-xs mt-1">{errors.primaryColor.message}</p>}
          </div>
          <div>
            <label className={labelClass}>Secondary Color</label>
            <div className="flex items-center gap-2">
              <input type="color" {...register('secondaryColor')} className="w-10 h-9 rounded border border-zinc-700 bg-transparent cursor-pointer" />
              <input {...register('secondaryColor')} className={inputClass} placeholder="#18181b" />
            </div>
            {errors.secondaryColor && <p className="text-red-500 text-xs mt-1">{errors.secondaryColor.message}</p>}
          </div>
          <div>
            <label className={labelClass}>Accent Color</label>
            <div className="flex items-center gap-2">
              <input type="color" {...register('accentColor')} className="w-10 h-9 rounded border border-zinc-700 bg-transparent cursor-pointer" />
              <input {...register('accentColor')} className={inputClass} placeholder="#dc2626" />
            </div>
            {errors.accentColor && <p className="text-red-500 text-xs mt-1">{errors.accentColor.message}</p>}
          </div>
        </div>

        <div>
          <label className={labelClass}>Font Family</label>
          <input {...register('fontFamily')} className={inputClass} placeholder="Inter, sans-serif" />
        </div>
      </div>

      <div className="bg-[#111] border border-zinc-800 rounded p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-zinc-300 text-sm font-medium">Overlay Settings</h2>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" {...register('overlaySettings.enabled')} className="accent-red-500" />
            <span className="text-zinc-400 text-sm">Enabled</span>
          </label>
        </div>
        {overlayEnabled && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Overlay Color</label>
              <div className="flex items-center gap-2">
                <input type="color" {...register('overlaySettings.color')} className="w-10 h-9 rounded border border-zinc-700 bg-transparent cursor-pointer" />
                <input {...register('overlaySettings.color')} className={inputClass} placeholder="#000000" />
              </div>
            </div>
            <div>
              <label className={labelClass}>Opacity: {overlayOpacity}</label>
              <input type="range" min={0} max={1} step={0.05} {...register('overlaySettings.opacity', { valueAsNumber: true })} className="w-full accent-red-500 mt-2" />
            </div>
          </div>
        )}
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
