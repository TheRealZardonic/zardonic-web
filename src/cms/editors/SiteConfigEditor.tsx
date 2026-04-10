import { useState, useEffect } from 'react'
import { useForm, useFormState, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { siteConfigSchema, type SiteConfig } from '../schemas'
import { useCmsContent } from '../hooks/useCmsContent'
import { useAutoSave } from '../hooks/useAutoSave'
import { useUnsavedChanges } from '../hooks/useUnsavedChanges'
import { FieldLabel } from '../components/FieldLabel'
import * as Collapsible from '@radix-ui/react-collapsible'
import { Loader2, Plus, Trash2, Check, ChevronDown } from 'lucide-react'

const inputClass = 'bg-[#1a1a1a] border border-zinc-700 text-zinc-100 rounded px-3 py-2 w-full focus:outline-none focus:border-red-500'

export default function SiteConfigEditor() {
  const { data, isLoading, isDraft, save } = useCmsContent<SiteConfig>('zd-cms:site-config')
  const [isSaving, setIsSaving] = useState(false)
  const [advancedOpen, setAdvancedOpen] = useState(false)

  const { register, handleSubmit, control, watch, reset, formState: { errors } } = useForm<SiteConfig>({
    resolver: zodResolver(siteConfigSchema),
    defaultValues: { name: '', description: '', logoUrl: '', faviconUrl: '', ogImageUrl: '', analyticsId: '', customMeta: [] },
  })
  const { isDirty } = useFormState({ control })

  const { fields: metaFields, append: appendMeta, remove: removeMeta } = useFieldArray({ control, name: 'customMeta' })

  useEffect(() => {
    if (data) reset(data)
  }, [data, reset])

  const formValues = watch()
  useAutoSave('zd-cms:site-config', formValues, isDirty)
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
        <h1 className="text-zinc-100 text-xl font-semibold">Site Configuration</h1>
        {isDraft && <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded">Draft</span>}
      </div>

      {/* ── Essential identity fields ──────────────────────────────── */}
      <div className="bg-[#111] border border-zinc-800 rounded p-5 space-y-4">
        <div>
          <FieldLabel label="Site Name *" tooltip="The public name of your site, used in the browser tab title and social share previews." htmlFor="siteName" />
          <input id="siteName" {...register('name')} className={inputClass} placeholder="Zardonic" />
          {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
        </div>
        <div>
          <FieldLabel label="Description" tooltip="A short description of your site used in search engine results and social previews." htmlFor="siteDesc" />
          <textarea id="siteDesc" {...register('description')} className={inputClass + ' min-h-[80px] resize-y'} placeholder="Site description" />
          {errors.description && <p className="text-red-500 text-xs mt-1">{errors.description.message}</p>}
        </div>
      </div>

      {/* ── Advanced: branding URLs + analytics (progressive disclosure) ─ */}
      <Collapsible.Root open={advancedOpen} onOpenChange={setAdvancedOpen}>
        <Collapsible.Trigger asChild>
          <button
            type="button"
            className="flex items-center justify-between w-full bg-[#111] border border-zinc-800 rounded px-5 py-3 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
            aria-expanded={advancedOpen}
          >
            <span className="font-medium">Advanced — Branding & Analytics</span>
            <ChevronDown
              size={16}
              className={`transition-transform duration-200 ${advancedOpen ? 'rotate-180' : ''}`}
            />
          </button>
        </Collapsible.Trigger>
        <Collapsible.Content className="overflow-hidden data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up">
          <div className="bg-[#111] border border-zinc-800 border-t-0 rounded-b p-5 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <FieldLabel label="Logo URL" tooltip="URL of your site logo. Displayed in the header and social previews." htmlFor="logoUrl" />
                <input id="logoUrl" {...register('logoUrl')} className={inputClass} placeholder="https://…" />
                {errors.logoUrl && <p className="text-red-500 text-xs mt-1">{errors.logoUrl.message}</p>}
              </div>
              <div>
                <FieldLabel label="Favicon URL" tooltip="URL of your favicon (16×16 or 32×32 PNG/ICO). Shown in the browser tab." htmlFor="faviconUrl" />
                <input id="faviconUrl" {...register('faviconUrl')} className={inputClass} placeholder="https://…" />
                {errors.faviconUrl && <p className="text-red-500 text-xs mt-1">{errors.faviconUrl.message}</p>}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <FieldLabel label="OG Image URL" tooltip="Open Graph image shown when your site is shared on social media (1200×630 recommended)." htmlFor="ogImageUrl" />
                <input id="ogImageUrl" {...register('ogImageUrl')} className={inputClass} placeholder="https://…" />
                {errors.ogImageUrl && <p className="text-red-500 text-xs mt-1">{errors.ogImageUrl.message}</p>}
              </div>
              <div>
                <FieldLabel label="Analytics ID" tooltip="Your Google Analytics or Plausible tracking ID. Leave empty to disable analytics." htmlFor="analyticsId" />
                <input id="analyticsId" {...register('analyticsId')} className={inputClass} placeholder="G-XXXXXXXXXX" />
              </div>
            </div>
          </div>
        </Collapsible.Content>
      </Collapsible.Root>

      <div className="bg-[#111] border border-zinc-800 rounded p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-zinc-300 text-sm font-medium">Custom Meta Tags</h2>
          <button type="button" onClick={() => appendMeta({ name: '', content: '' })} className="text-xs bg-zinc-700 hover:bg-zinc-600 text-zinc-200 px-2 py-1 rounded flex items-center gap-1">
            <Plus size={12} /> Add
          </button>
        </div>
        {metaFields.map((field, index) => (
          <div key={field.id} className="flex gap-2 items-start">
            <div className="flex-1">
              <input {...register(`customMeta.${index}.name`)} className={inputClass} placeholder="name" />
            </div>
            <div className="flex-1">
              <input {...register(`customMeta.${index}.content`)} className={inputClass} placeholder="content" />
            </div>
            <button type="button" onClick={() => removeMeta(index)} className="text-red-500 hover:text-red-400 p-2 mt-0.5"><Trash2 size={15} /></button>
          </div>
        ))}
        {metaFields.length === 0 && (
          <p className="text-zinc-600 text-xs">No custom meta tags.</p>
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
