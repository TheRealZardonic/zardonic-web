/**
 * AdminSectionEditor
 *
 * Schema-driven editor for a single registered admin section.
 * Looks up the schema from the `AdminSchemaRegistry`, loads current data
 * from the CMS content API, renders `SectionEditorFactory`, and wires
 * Save / Discard / Reset-to-Default actions.
 *
 * Features:
 *   - Dirty-state indicator (unsaved changes banner)
 *   - Cross-field validation before save (uses `schema.validate()`)
 *   - Disclosure-level toggle (basic / advanced / expert)
 *   - Auto-save via `useAutoSave` (30s interval when dirty)
 *   - Beforeunload warning when there are unsaved changes
 *   - "Section not found" error state for unknown sectionIds
 *   - IoC: all data flows through props — no direct context access
 */

import { useState, useCallback, useMemo } from 'react'
import {
  FloppyDisk,
  ArrowCounterClockwise,
  Trash,
  Warning,
  CheckCircle,
  Eye,
  EyeSlash,
} from '@phosphor-icons/react'
import { toast } from 'sonner'
// Side-effect import: ensures all schemas are registered before we look one up
import '@/cms/section-schemas'
import { getSection } from '@/lib/admin-schema-registry'
import { SectionEditorFactory } from '@/cms/components/SectionEditorFactory'
import { useCmsContent } from '@/cms/hooks/useCmsContent'
import { useAutoSave } from '@/cms/hooks/useAutoSave'
import { useUnsavedChanges } from '@/cms/hooks/useUnsavedChanges'
import { SchemaIcon } from './SchemaIcon'

// ─── Types ────────────────────────────────────────────────────────────────────

type DisclosureLevel = 'basic' | 'advanced' | 'expert'

export interface AdminSectionEditorProps {
  /** The `sectionId` from the `AdminSectionSchema` to load and edit. */
  sectionId: string
  /**
   * Optional callback fired with the current draft data on every change.
   * Used by `AdminShell` to pass draft data into `LivePreviewPane`.
   */
  onPreviewDataChange?: (data: Record<string, unknown>) => void
}

// ─── Disclosure badge ─────────────────────────────────────────────────────────

const DISCLOSURE_OPTIONS: { value: DisclosureLevel; label: string }[] = [
  { value: 'basic', label: 'Basic' },
  { value: 'advanced', label: 'Advanced' },
  { value: 'expert', label: 'Expert' },
]

// ─── AdminSectionEditor ───────────────────────────────────────────────────────

/**
 * Schema-driven editor for a registered admin section.
 * Renders inside `AdminShell`'s main content area.
 */
export function AdminSectionEditor({ sectionId, onPreviewDataChange }: AdminSectionEditorProps) {
  const schema = getSection(sectionId)

  // ── Error state ────────────────────────────────────────────────────────────
  if (!schema) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 p-8">
        <Warning size={40} className="text-red-500/60" />
        <div className="text-center space-y-1">
          <p className="text-zinc-400 font-mono text-sm">Section not found</p>
          <p className="text-zinc-600 text-xs font-mono">
            No schema registered for &ldquo;{sectionId}&rdquo;.
          </p>
        </div>
      </div>
    )
  }

  return <EditorInner sectionId={sectionId} onPreviewDataChange={onPreviewDataChange} />
}

// ─── EditorInner ─────────────────────────────────────────────────────────────

/**
 * Inner component rendered only when the schema exists.
 * Separated so hooks aren't called conditionally.
 */
function EditorInner({
  sectionId,
  onPreviewDataChange,
}: {
  sectionId: string
  onPreviewDataChange?: (data: Record<string, unknown>) => void
}) {
  // Schema is guaranteed to exist here (guard is in AdminSectionEditor above)
  const schema = getSection(sectionId)!

  // ── CMS content hook ───────────────────────────────────────────────────────
  const {
    data: savedData,
    isDraft,
    isLoading,
    error,
    save,
    revert: _revert,
  } = useCmsContent<Record<string, unknown>>(sectionId)

  // ── Local draft state ──────────────────────────────────────────────────────
  const defaultData = useMemo(
    () => schema.getDefaultData() as Record<string, unknown>,
    [schema],
  )

  const [draftData, setDraftData] = useState<Record<string, unknown> | null>(null)
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})
  const [disclosure, setDisclosure] = useState<DisclosureLevel>('basic')
  const [showDisclosureMenu, setShowDisclosureMenu] = useState(false)

  // Use draftData if the user has made changes; otherwise fall back to savedData/defaultData
  const effectiveData: Record<string, unknown> = draftData ?? savedData ?? defaultData

  const isDirty = draftData !== null

  // ── Hooks ──────────────────────────────────────────────────────────────────
  useAutoSave(sectionId, effectiveData, isDirty)
  useUnsavedChanges(isDirty)

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleChange = useCallback(
    (data: Record<string, unknown>) => {
      setDraftData(data)
      setValidationErrors({})
      onPreviewDataChange?.(data)
    },
    [onPreviewDataChange],
  )

  const handleSave = useCallback(async () => {
    // Run cross-field validation
    const errors = schema.validate ? schema.validate(effectiveData) : {}
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors)
      toast.error('Please fix validation errors before saving.')
      return
    }
    try {
      await save(effectiveData, false) // save as published
      setDraftData(null)
      setValidationErrors({})
      toast.success(`${schema.label} saved.`)
    } catch {
      // Error toast is handled inside useCmsContent
    }
  }, [effectiveData, schema, save])

  const handleDiscard = useCallback(() => {
    setDraftData(null)
    setValidationErrors({})
    onPreviewDataChange?.(savedData ?? defaultData)
  }, [savedData, defaultData, onPreviewDataChange])

  const handleReset = useCallback(async () => {
    const fresh = schema.getDefaultData() as Record<string, unknown>
    try {
      await save(fresh, false)
      setDraftData(null)
      setValidationErrors({})
      onPreviewDataChange?.(fresh)
      toast.success(`${schema.label} reset to defaults.`)
    } catch {
      // Error toast handled in useCmsContent
    }
  }, [schema, save, onPreviewDataChange])

  // ── Loading state ──────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <SectionEditorHeader
          schema={schema}
          isDirty={false}
          isDraft={false}
          isSaving={false}
          disclosure={disclosure}
          showDisclosureMenu={showDisclosureMenu}
          onDisclosureToggle={() => setShowDisclosureMenu(v => !v)}
          onDisclosureSelect={(d) => { setDisclosure(d); setShowDisclosureMenu(false) }}
          onSave={() => void handleSave()}
          onDiscard={handleDiscard}
          onReset={() => void handleReset()}
        />
        <div className="flex-1 p-6 space-y-4 animate-pulse" aria-busy="true" aria-label="Loading">
          <div className="bg-zinc-800 rounded h-10 w-full max-w-lg" />
          <div className="bg-zinc-800 rounded h-6 w-full max-w-md" />
          <div className="bg-zinc-800 rounded h-32 w-full max-w-2xl mt-6" />
        </div>
      </div>
    )
  }

  // ── Error state ────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 p-8">
        <Warning size={40} className="text-red-500/60" />
        <div className="text-center space-y-1">
          <p className="text-zinc-400 font-mono text-sm">Failed to load section data</p>
          <p className="text-zinc-600 text-xs font-mono">{error.message}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Editor header with action buttons */}
      <SectionEditorHeader
        schema={schema}
        isDirty={isDirty}
        isDraft={isDraft}
        isSaving={false}
        disclosure={disclosure}
        showDisclosureMenu={showDisclosureMenu}
        onDisclosureToggle={() => setShowDisclosureMenu(v => !v)}
        onDisclosureSelect={(d) => { setDisclosure(d); setShowDisclosureMenu(false) }}
        onSave={() => void handleSave()}
        onDiscard={handleDiscard}
        onReset={() => void handleReset()}
      />

      {/* Unsaved changes banner */}
      {isDirty && (
        <div className="flex items-center gap-2 px-4 py-2 bg-amber-900/20 border-b border-amber-700/30 flex-shrink-0">
          <Warning size={14} className="text-amber-400 flex-shrink-0" />
          <span className="text-amber-400 text-xs font-mono">
            You have unsaved changes.
          </span>
        </div>
      )}

      {/* Saved / draft status */}
      {!isDirty && isDraft && (
        <div className="flex items-center gap-2 px-4 py-2 bg-blue-900/10 border-b border-blue-700/20 flex-shrink-0">
          <CheckCircle size={14} className="text-blue-400 flex-shrink-0" />
          <span className="text-blue-400 text-xs font-mono">
            Draft saved — not yet published.
          </span>
        </div>
      )}

      {/* Validation errors summary */}
      {Object.keys(validationErrors).length > 0 && (
        <div className="flex flex-col gap-1 px-4 py-3 bg-red-900/10 border-b border-red-700/20 flex-shrink-0">
          <span className="text-red-400 text-xs font-mono font-semibold">
            Validation errors:
          </span>
          {Object.entries(validationErrors).map(([key, msg]) => (
            <span key={key} className="text-red-400 text-xs font-mono pl-2">
              • {key}: {msg}
            </span>
          ))}
        </div>
      )}

      {/* Schema-driven form */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        <SectionEditorFactory
          schema={schema}
          data={effectiveData}
          onChange={handleChange}
          disclosure={disclosure}
          errors={validationErrors}
        />
      </div>
    </div>
  )
}

// ─── SectionEditorHeader ──────────────────────────────────────────────────────

interface SectionEditorHeaderProps {
  schema: ReturnType<typeof getSection> & object
  isDirty: boolean
  isDraft: boolean
  isSaving: boolean
  disclosure: DisclosureLevel
  showDisclosureMenu: boolean
  onDisclosureToggle: () => void
  onDisclosureSelect: (d: DisclosureLevel) => void
  onSave: () => void
  onDiscard: () => void
  onReset: () => void
}

function SectionEditorHeader({
  schema,
  isDirty,
  isSaving,
  disclosure,
  showDisclosureMenu,
  onDisclosureToggle,
  onDisclosureSelect,
  onSave,
  onDiscard,
  onReset,
}: SectionEditorHeaderProps) {
  return (
    <header className="flex items-center gap-3 px-4 py-3 border-b border-zinc-800 bg-[#111] flex-shrink-0">
      {/* Section icon + title */}
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        <SchemaIcon
          iconName={schema.icon}
          size={18}
          className="text-red-400 flex-shrink-0"
        />
        <div className="min-w-0">
          <h2 className="text-zinc-100 font-mono text-sm font-semibold leading-tight truncate">
            {schema.label}
          </h2>
          <p className="text-zinc-600 text-xs font-mono truncate hidden sm:block">
            {schema.description}
          </p>
        </div>
      </div>

      {/* Disclosure level toggle */}
      <div className="relative">
        <button
          type="button"
          onClick={onDisclosureToggle}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded border border-zinc-700 bg-[#0a0a0a] text-zinc-400 hover:text-zinc-200 hover:border-zinc-600 text-xs font-mono transition-colors"
          aria-label={`Disclosure level: ${disclosure}`}
          aria-expanded={showDisclosureMenu}
        >
          {disclosure === 'basic' ? (
            <Eye size={13} />
          ) : (
            <EyeSlash size={13} />
          )}
          <span className="capitalize hidden sm:inline">{disclosure}</span>
        </button>

        {showDisclosureMenu && (
          <div className="absolute right-0 top-full mt-1 w-36 bg-[#111] border border-zinc-800 rounded shadow-xl z-10">
            {DISCLOSURE_OPTIONS.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => onDisclosureSelect(opt.value)}
                className={`w-full text-left px-3 py-2 text-xs font-mono transition-colors ${
                  disclosure === opt.value
                    ? 'text-red-400 bg-red-900/10'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {/* Reset to defaults */}
        <button
          type="button"
          onClick={onReset}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded border border-zinc-800 text-zinc-500 hover:text-red-400 hover:border-red-500/30 text-xs font-mono transition-colors"
          title="Reset all fields to their default values"
          aria-label="Reset to defaults"
        >
          <Trash size={13} />
          <span className="hidden lg:inline">Reset</span>
        </button>

        {/* Discard changes */}
        {isDirty && (
          <button
            type="button"
            onClick={onDiscard}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded border border-zinc-800 text-zinc-500 hover:text-zinc-200 hover:border-zinc-600 text-xs font-mono transition-colors"
            aria-label="Discard unsaved changes"
          >
            <ArrowCounterClockwise size={13} />
            <span className="hidden lg:inline">Discard</span>
          </button>
        )}

        {/* Save */}
        <button
          type="button"
          onClick={onSave}
          disabled={isSaving}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-mono transition-colors ${
            isDirty
              ? 'bg-red-600 hover:bg-red-700 text-white border border-red-600'
              : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
          aria-label="Save changes"
        >
          <FloppyDisk size={13} />
          <span>{isSaving ? 'Saving…' : 'Save'}</span>
        </button>
      </div>
    </header>
  )
}
