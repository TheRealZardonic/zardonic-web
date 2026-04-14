import { useState, useEffect } from 'react'
import { useForm, useFormState, useController } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { themeConfigSchema, type ThemeConfig } from '../schemas'
import { useCmsContent } from '../hooks/useCmsContent'
import { useAutoSave } from '../hooks/useAutoSave'
import { useUnsavedChanges } from '../hooks/useUnsavedChanges'
import { FieldLabel } from '../components/FieldLabel'
import * as Collapsible from '@radix-ui/react-collapsible'
import { Loader2, Check, ChevronDown } from 'lucide-react'

const inputClass = 'bg-[#1a1a1a] border border-zinc-700 text-zinc-100 rounded px-3 py-2 w-full focus:outline-none focus:border-red-500'

export default function ThemeEditor() {
  const { data, isLoading, isDraft, save } = useCmsContent<ThemeConfig>('zd-cms:theme')
  const [isSaving, setIsSaving] = useState(false)
  const [advancedOpen, setAdvancedOpen] = useState(false)

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

  // Each color field is wired via useController so the color picker and the hex
  // text input share one RHF registration — calling register() twice for the same
  // field name causes conflicts and breaks the sync between the two inputs.
  const primaryColorCtrl = useController({ name: 'primaryColor', control })
  const secondaryColorCtrl = useController({ name: 'secondaryColor', control })
  const accentColorCtrl = useController({ name: 'accentColor', control })
  const overlayColorCtrl = useController({ name: 'overlaySettings.color', control })

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

      {/* ── Essential: brand colors ──────────────────────────────── */}
      <div className="bg-[#111] border border-zinc-800 rounded p-5 space-y-4">
        <h2 className="text-zinc-300 text-sm font-medium">Brand Colors</h2>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <FieldLabel
              label="Primary Color"
              tooltip="The main brand color used for buttons, active links, and highlights throughout the site."
              htmlFor="primaryColor"
            />
            <div className="flex items-center gap-2">
              <input id="primaryColor" type="color"
                value={primaryColorCtrl.field.value ?? '#e11d48'}
                onChange={e => primaryColorCtrl.field.onChange(e.target.value)}
                onBlur={primaryColorCtrl.field.onBlur}
                className="w-10 h-9 rounded border border-zinc-700 bg-transparent cursor-pointer" />
              <input
                value={primaryColorCtrl.field.value ?? ''}
                onChange={e => primaryColorCtrl.field.onChange(e.target.value)}
                onBlur={primaryColorCtrl.field.onBlur}
                className={inputClass} placeholder="#e11d48" />
            </div>
            {errors.primaryColor && <p className="text-red-500 text-xs mt-1">{errors.primaryColor.message}</p>}
          </div>
          <div>
            <FieldLabel
              label="Secondary Color"
              tooltip="Used for card backgrounds, hover states, and secondary UI elements."
              htmlFor="secondaryColor"
            />
            <div className="flex items-center gap-2">
              <input id="secondaryColor" type="color"
                value={secondaryColorCtrl.field.value ?? '#18181b'}
                onChange={e => secondaryColorCtrl.field.onChange(e.target.value)}
                onBlur={secondaryColorCtrl.field.onBlur}
                className="w-10 h-9 rounded border border-zinc-700 bg-transparent cursor-pointer" />
              <input
                value={secondaryColorCtrl.field.value ?? ''}
                onChange={e => secondaryColorCtrl.field.onChange(e.target.value)}
                onBlur={secondaryColorCtrl.field.onBlur}
                className={inputClass} placeholder="#18181b" />
            </div>
            {errors.secondaryColor && <p className="text-red-500 text-xs mt-1">{errors.secondaryColor.message}</p>}
          </div>
          <div>
            <FieldLabel
              label="Accent Color"
              tooltip="Used for glowing borders, hover effects on gig cards, and interactive accent elements."
              htmlFor="accentColor"
            />
            <div className="flex items-center gap-2">
              <input id="accentColor" type="color"
                value={accentColorCtrl.field.value ?? '#dc2626'}
                onChange={e => accentColorCtrl.field.onChange(e.target.value)}
                onBlur={accentColorCtrl.field.onBlur}
                className="w-10 h-9 rounded border border-zinc-700 bg-transparent cursor-pointer" />
              <input
                value={accentColorCtrl.field.value ?? ''}
                onChange={e => accentColorCtrl.field.onChange(e.target.value)}
                onBlur={accentColorCtrl.field.onBlur}
                className={inputClass} placeholder="#dc2626" />
            </div>
            {errors.accentColor && <p className="text-red-500 text-xs mt-1">{errors.accentColor.message}</p>}
          </div>
        </div>
      </div>

      {/* ── Advanced: typography + overlay (progressive disclosure) ─ */}
      <Collapsible.Root open={advancedOpen} onOpenChange={setAdvancedOpen}>
        <Collapsible.Trigger asChild>
          <button
            type="button"
            className="flex items-center justify-between w-full bg-[#111] border border-zinc-800 rounded px-5 py-3 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
            aria-expanded={advancedOpen}
          >
            <span className="font-medium">Advanced Design Settings</span>
            <ChevronDown
              size={16}
              className={`transition-transform duration-200 ${advancedOpen ? 'rotate-180' : ''}`}
            />
          </button>
        </Collapsible.Trigger>
        <Collapsible.Content className="overflow-hidden data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up">
          <div className="bg-[#111] border border-zinc-800 border-t-0 rounded-b p-5 space-y-4">

            <div>
              <FieldLabel
                label="Font Family"
                tooltip="CSS font-family stack for the entire site. Use Google Fonts names or system font stacks."
                htmlFor="fontFamily"
              />
              <input id="fontFamily" {...register('fontFamily')} className={inputClass} placeholder="Orbitron, monospace" />
            </div>

            <div className="border-t border-zinc-800 pt-4">
              <div className="flex items-center justify-between mb-3">
                <FieldLabel
                  label="Background Overlay"
                  tooltip="A translucent color layer placed over background images for readability."
                />
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" {...register('overlaySettings.enabled')} className="accent-red-500" />
                  <span className="text-zinc-400 text-sm">Enabled</span>
                </label>
              </div>
              {overlayEnabled && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <FieldLabel
                      label="Overlay Color"
                      tooltip="The color of the overlay tint placed over the hero background image."
                      htmlFor="overlayColor"
                    />
                    <div className="flex items-center gap-2">
                      <input id="overlayColor" type="color"
                        value={overlayColorCtrl.field.value ?? '#000000'}
                        onChange={e => overlayColorCtrl.field.onChange(e.target.value)}
                        onBlur={overlayColorCtrl.field.onBlur}
                        className="w-10 h-9 rounded border border-zinc-700 bg-transparent cursor-pointer" />
                      <input
                        value={overlayColorCtrl.field.value ?? ''}
                        onChange={e => overlayColorCtrl.field.onChange(e.target.value)}
                        onBlur={overlayColorCtrl.field.onBlur}
                        className={inputClass} placeholder="#000000" />
                    </div>
                  </div>
                  <div>
                    <FieldLabel
                      label={`Opacity: ${overlayOpacity}`}
                      tooltip="Controls how dark the overlay is. 0 = fully transparent, 1 = fully opaque black."
                      htmlFor="overlayOpacity"
                    />
                    <input id="overlayOpacity" type="range" min={0} max={1} step={0.05} {...register('overlaySettings.opacity', { valueAsNumber: true })} className="w-full accent-red-500 mt-2" />
                  </div>
                </div>
              )}
            </div>
          </div>
        </Collapsible.Content>
      </Collapsible.Root>

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
