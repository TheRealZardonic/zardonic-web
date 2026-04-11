import { type ChangeEvent } from 'react'
import { Export, ArrowSquareIn, ArrowCounterClockwise } from '@phosphor-icons/react'

import type { AdminSettings } from '@/lib/types'
import { getTranslations, LOCALES } from '@/lib/i18n'
import { toast } from 'sonner'

interface TranslationsTabProps {
  adminSettings: AdminSettings | null | undefined
  setAdminSettings?: (settings: AdminSettings) => void
  translationImportRef: React.RefObject<HTMLInputElement | null>
}

export default function TranslationsTab({ adminSettings, setAdminSettings, translationImportRef }: TranslationsTabProps) {
  const handleExportTranslations = () => {
    const base = getTranslations()
    const merged = adminSettings?.customTranslations
      ? (() => {
          const out = { ...base }
          for (const [key, langs] of Object.entries(adminSettings.customTranslations)) {
            out[key] = { ...(out[key] ?? {}), ...langs }
          }
          return out
        })()
      : base
    const blob = new Blob([JSON.stringify(merged, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'translations.json'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleImportChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const result = ev.target?.result
        if (typeof result !== 'string') return
        let data: unknown
        try {
          data = JSON.parse(result)
        } catch (parseError) {
          toast.error(`JSON parse error: ${parseError instanceof Error ? parseError.message : 'invalid JSON'}`)
          return
        }
        if (typeof data !== 'object' || data === null || Array.isArray(data)) {
          toast.error('Invalid format: expected a JSON object with translation keys as properties.')
          return
        }
        const existing = adminSettings?.customTranslations ?? {}
        setAdminSettings?.({ ...(adminSettings ?? {}), customTranslations: { ...existing, ...(data as Record<string, Record<string, string>>) } })
        toast.success('Translations imported successfully!')
      } catch {
        toast.error('Failed to read the file. Please try again.')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4 mt-0">
      <div className="space-y-1">
        <h3 className="font-mono text-xs font-bold text-primary uppercase tracking-wider">Translation Manager</h3>
        <p className="font-mono text-xs text-muted-foreground">
          {Object.keys(getTranslations()).length} keys · {LOCALES.length} languages
        </p>
      </div>

      {/* Export */}
      <div className="bg-background border border-border rounded-md p-4 space-y-2">
        <h4 className="font-mono text-xs font-bold text-foreground uppercase tracking-wider">Export Translations</h4>
        <p className="font-mono text-xs text-muted-foreground">Download all translation keys as a JSON file for editing.</p>
        <button
          onClick={handleExportTranslations}
          className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 border border-primary/30 rounded font-mono text-xs text-primary hover:bg-primary/20 transition-colors"
        >
          <Export size={13} />
          Export JSON
        </button>
      </div>

      {/* Import */}
      <div className="bg-background border border-border rounded-md p-4 space-y-2">
        <h4 className="font-mono text-xs font-bold text-foreground uppercase tracking-wider">Import Translations</h4>
        <p className="font-mono text-xs text-muted-foreground">Upload a translation JSON file to add or override translations.</p>
        <button
          onClick={() => translationImportRef.current?.click()}
          className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 border border-primary/30 rounded font-mono text-xs text-primary hover:bg-primary/20 transition-colors"
        >
          <ArrowSquareIn size={13} />
          Import JSON
        </button>
      </div>

      {/* Reset */}
      {adminSettings?.customTranslations && Object.keys(adminSettings.customTranslations).length > 0 && (
        <div className="bg-background border border-border rounded-md p-4 space-y-2">
          <h4 className="font-mono text-xs font-bold text-foreground uppercase tracking-wider">Custom Translations Active</h4>
          <p className="font-mono text-xs text-muted-foreground">
            {Object.keys(adminSettings.customTranslations).length} custom key overrides loaded.
          </p>
          <button
            onClick={() => {
              const updated = { ...(adminSettings ?? {}) }
              delete updated.customTranslations
              setAdminSettings?.(updated)
            }}
            className="flex items-center gap-2 px-3 py-1.5 bg-destructive/10 border border-destructive/30 rounded font-mono text-xs text-destructive hover:bg-destructive/20 transition-colors"
          >
            <ArrowCounterClockwise size={13} />
            Reset to Defaults
          </button>
        </div>
      )}

      {/* Hidden file input for translation import */}
      <input
        ref={translationImportRef}
        type="file"
        accept=".json,application/json"
        className="hidden"
        onChange={handleImportChange}
        aria-hidden="true"
      />
    </div>
  )
}
