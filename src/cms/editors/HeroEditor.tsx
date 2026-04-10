import { useState, useEffect } from 'react'
import { useForm, useFormState } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { heroSchema, type HeroConfig } from '../schemas'
import { useCmsContent } from '../hooks/useCmsContent'
import { useAutoSave } from '../hooks/useAutoSave'
import { useUnsavedChanges } from '../hooks/useUnsavedChanges'
import { FieldLabel } from '../components/FieldLabel'
import * as Collapsible from '@radix-ui/react-collapsible'
import { Loader2, ChevronDown } from 'lucide-react'

const inputClass = 'bg-[#1a1a1a] border border-zinc-700 text-zinc-100 rounded px-3 py-2 w-full focus:outline-none focus:border-red-500'

export default function HeroEditor() {
  const { data, isLoading, isDraft, save } = useCmsContent<HeroConfig>('zd-cms:hero')
  const [isSaving, setIsSaving] = useState(false)
  const [advancedOpen, setAdvancedOpen] = useState(false)

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

      {/* ── Essential content fields ──────────────────────────────── */}
      <div className="bg-[#111] border border-zinc-800 rounded p-5 space-y-4">
        <div>
          <FieldLabel label="Headline *" tooltip="The main title displayed in large text in the hero section at the top of your page." htmlFor="headline" />
          <input id="headline" {...register('headline')} className={inputClass} placeholder="Headline" />
          {errors.headline && <p className="text-red-500 text-xs mt-1">{errors.headline.message}</p>}
        </div>
        <div>
          <FieldLabel label="Subheadline" tooltip="A supporting line below the headline. Good for genre, tagline, or tour info." htmlFor="subheadline" />
          <input id="subheadline" {...register('subheadline')} className={inputClass} placeholder="Subheadline" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <FieldLabel label="CTA Text" tooltip="Text on the call-to-action button in the hero section (e.g. 'Listen Now', 'Buy Tickets')." htmlFor="ctaText" />
            <input id="ctaText" {...register('ctaText')} className={inputClass} placeholder="Get in touch" />
          </div>
          <div>
            <FieldLabel label="CTA Link" tooltip="Where the CTA button links to. Can be an anchor (#music) or a full URL." htmlFor="ctaLink" />
            <input id="ctaLink" {...register('ctaLink')} className={inputClass} placeholder="#contact" />
          </div>
        </div>
      </div>

      {/* ── Advanced: background + overlay (progressive disclosure) ─ */}
      <Collapsible.Root open={advancedOpen} onOpenChange={setAdvancedOpen}>
        <Collapsible.Trigger asChild>
          <button
            type="button"
            className="flex items-center justify-between w-full bg-[#111] border border-zinc-800 rounded px-5 py-3 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
            aria-expanded={advancedOpen}
          >
            <span className="font-medium">Background & Overlay</span>
            <ChevronDown
              size={16}
              className={`transition-transform duration-200 ${advancedOpen ? 'rotate-180' : ''}`}
            />
          </button>
        </Collapsible.Trigger>
        <Collapsible.Content className="overflow-hidden data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up">
          <div className="bg-[#111] border border-zinc-800 border-t-0 rounded-b p-5 space-y-4">
            <div>
              <FieldLabel label="Background Image URL" tooltip="Full-bleed background image for the hero section. Use a high-resolution image (min. 1920×1080)." htmlFor="backgroundImageUrl" />
              <input id="backgroundImageUrl" {...register('backgroundImageUrl')} className={inputClass} placeholder="https://…" />
              {errors.backgroundImageUrl && <p className="text-red-500 text-xs mt-1">{errors.backgroundImageUrl.message}</p>}
            </div>
            <div>
              <FieldLabel label={`Overlay Opacity: ${overlayOpacity}`} tooltip="Controls how dark the overlay is over the hero background image. 0 = transparent, 1 = fully opaque." htmlFor="overlayOpacity" />
              <input id="overlayOpacity" type="range" min={0} max={1} step={0.05} {...register('overlayOpacity', { valueAsNumber: true })} className="w-full accent-red-500 mt-1" />
            </div>
          </div>
        </Collapsible.Content>
      </Collapsible.Root>

      {/* Preview */}
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
