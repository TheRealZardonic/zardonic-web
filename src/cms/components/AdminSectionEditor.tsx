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
  ArrowClockwise,
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
import { LoadingState, ErrorState, EmptyState } from '@/cms/components/states'
import { useCmsContent } from '@/cms/hooks/useCmsContent'
import { useAutoSave } from '@/cms/hooks/useAutoSave'
import { useUnsavedChanges } from '@/cms/hooks/useUnsavedChanges'
import { useUndoRedo } from '@/cms/hooks/useUndoRedo'
import { useAdminKeyboardShortcuts } from '@/cms/hooks/useAdminKeyboardShortcuts'
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
  } = useCmsContent<Record<string, unknown>>(`zd-cms:${sectionId}`)

  // ── Local draft state ──────────────────────────────────────────────────────
  const defaultData = useMemo(
    () => schema.getDefaultData() as Record<string, unknown>,
    [schema],
  )

  const [draftData, setDraftData] = useState<Record<string, unknown> | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})
  const [disclosure, setDisclosure] = useState<DisclosureLevel>('basic')
  const [showDisclosureMenu, setShowDisclosureMenu] = useState(false)
  const [retryKey, setRetryKey] = useState(0)

  // Use draftData if the user has made changes; otherwise fall back to savedData/defaultData
  const effectiveData: Record<string, unknown> = draftData ?? savedData ?? defaultData

  const isDirty = draftData !== null

  // ── Undo / Redo ────────────────────────────────────────────────────────────
  const { push: pushHistory, undo, redo, reset: resetHistory, canUndo, canRedo, historyIndex, historySize } =
    useUndoRedo<Record<string, unknown>>(effectiveData)

  // ── Hooks ──────────────────────────────────────────────────────────────────
  useAutoSave(`zd-cms:${sectionId}`, effectiveData, isDirty)
  useUnsavedChanges(isDirty)

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleChange = useCallback(
    (data: Record<string, unknown>) => {
      setDraftData(data)
      setValidationErrors({})
      onPreviewDataChange?.(data)
      pushHistory(data)
    },
    [onPreviewDataChange, pushHistory],
  )

  const handleSave = useCallback(async () => {
    // Run cross-field validation
    const errors = schema.validate ? schema.validate(effectiveData) : {}
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors)
      toast.error('Please fix validation errors before saving.')
      return
    }
    setIsSaving(true)
    try {
      await save(effectiveData, false) // save as published
      setDraftData(null)
      setValidationErrors({})
      resetHistory(effectiveData) // clear undo history so Ctrl+Z cannot regress past the save point
    } finally {
      setIsSaving(false)
    }
  }, [effectiveData, schema, save, resetHistory])

  const handleDiscard = useCallback(() => {
    setDraftData(null)
    setValidationErrors({})
    onPreviewDataChange?.(savedData ?? defaultData)
  }, [savedData, defaultData, onPreviewDataChange])

  const handleReset = useCallback(async () => {
    const fresh = schema.getDefaultData() as Record<string, unknown>
    setIsSaving(true)
    try {
      await save(fresh, false)
      setDraftData(null)
      setValidationErrors({})
      onPreviewDataChange?.(fresh)
      resetHistory(fresh) // clear undo history after reset
    } finally {
      setIsSaving(false)
    }
  }, [schema, save, onPreviewDataChange, resetHistory])

  const handleUndoAction = useCallback(() => {
    const prev = undo()
    if (prev) {
      setDraftData(prev)
      onPreviewDataChange?.(prev)
    }
  }, [undo, onPreviewDataChange])

  const handleRedoAction = useCallback(() => {
    const next = redo()
    if (next) {
      setDraftData(next)
      onPreviewDataChange?.(next)
    }
  }, [redo, onPreviewDataChange])

  // ── Keyboard shortcuts ─────────────────────────────────────────────────────
  useAdminKeyboardShortcuts({
    onSave: useCallback(() => { void handleSave() }, [handleSave]),
    onUndo: handleUndoAction,
    onRedo: handleRedoAction,
    onEscape: useCallback(() => setShowDisclosureMenu(false), []),
    // Disable shortcuts while loading to prevent firing save/undo on uninitialised data
    enabled: !isLoading,
  })

  // ── Loading state ──────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <SectionEditorHeader
          schema={schema}
          isDirty={false}
          isDraft={false}
          isSaving={isSaving}
          canUndo={false}
          canRedo={false}
          historyIndex={0}
          historySize={0}
          disclosure={disclosure}
          showDisclosureMenu={showDisclosureMenu}
          onDisclosureToggle={() => setShowDisclosureMenu(v => !v)}
          onDisclosureSelect={(d) => { setDisclosure(d); setShowDisclosureMenu(false) }}
          onSave={() => void handleSave()}
          onDiscard={handleDiscard}
          onReset={() => void handleReset()}
          onUndo={handleUndoAction}
          onRedo={handleRedoAction}
        />
        <LoadingState label={schema.label} icon={schema.icon} />
      </div>
    )
  }

  // ── Error state ────────────────────────────────────────────────────────────
  if (error) {
    return (
      <ErrorState
        message="Failed to load section data. Check your connection and try again."
        variant="network"
        detail={error.message}
        onRetry={() => setRetryKey(k => k + 1)}
      />
    )
  }

  // Empty: data loaded but no saved content and user hasn't started editing
  const isEmpty = !isLoading && savedData === null && draftData === null

  return (
    <div className="flex flex-col h-full min-h-0 admin-content-fade" key={`${sectionId}-${retryKey}`}>
      {/* Editor header with action buttons */}
      <SectionEditorHeader
        schema={schema}
        isDirty={isDirty}
        isDraft={isDraft}
        isSaving={isSaving}
        canUndo={canUndo}
        canRedo={canRedo}
        historyIndex={historyIndex}
        historySize={historySize}
        disclosure={disclosure}
        showDisclosureMenu={showDisclosureMenu}
        onDisclosureToggle={() => setShowDisclosureMenu(v => !v)}
        onDisclosureSelect={(d) => { setDisclosure(d); setShowDisclosureMenu(false) }}
        onSave={() => void handleSave()}
        onDiscard={handleDiscard}
        onReset={() => void handleReset()}
        onUndo={handleUndoAction}
        onRedo={handleRedoAction}
      />

      {/* Unsaved changes banner */}
      {isDirty && (
        <div className="flex items-center gap-2 px-4 py-2 bg-amber-900/20 border-b border-amber-700/30 flex-shrink-0">
          <Warning size={14} className="text-amber-400 flex-shrink-0" />
          <span className="text-amber-400 text-xs font-mono">
            You have unsaved changes.
          </span>
          <span className="text-amber-600 text-[10px] font-mono ml-auto hidden sm:inline">
            Ctrl+S to save · Ctrl+Z to undo
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
        <div className="flex flex-col gap-1 px-4 py-3 bg-red-900/10 border-b border-red-700/20 flex-shrink-0 admin-error-in">
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

      {/* Empty state — no data yet */}
      {isEmpty ? (
        <EmptyState
          label={schema.label}
          description={schema.description}
          icon={schema.icon}
          fieldCount={schema.fields.length}
          onStartEditing={() => {
            // Prime the draft so the form appears
            setDraftData(defaultData)
            pushHistory(defaultData)
          }}
        />
      ) : (
        /* Schema-driven form */
        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          <SectionEditorFactory
            schema={schema}
            data={effectiveData}
            onChange={handleChange}
            disclosure={disclosure}
            errors={validationErrors}
          />
        </div>
      )}
    </div>
  )
}

// ─── SectionEditorHeader ──────────────────────────────────────────────────────

interface SectionEditorHeaderProps {
  schema: ReturnType<typeof getSection> & object
  isDirty: boolean
  isDraft: boolean
  isSaving: boolean
  canUndo: boolean
  canRedo: boolean
  historyIndex: number
  historySize: number
  disclosure: DisclosureLevel
  showDisclosureMenu: boolean
  onDisclosureToggle: () => void
  onDisclosureSelect: (d: DisclosureLevel) => void
  onSave: () => void
  onDiscard: () => void
  onReset: () => void
  onUndo: () => void
  onRedo: () => void
}

function SectionEditorHeader({
  schema,
  isDirty,
  isSaving,
  canUndo,
  canRedo,
  historyIndex,
  historySize,
  disclosure,
  showDisclosureMenu,
  onDisclosureToggle,
  onDisclosureSelect,
  onSave,
  onDiscard,
  onReset,
  onUndo,
  onRedo,
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
      <div className="flex items-center gap-1.5 flex-shrink-0">
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

        {/* Undo */}
        <button
          type="button"
          onClick={onUndo}
          disabled={!canUndo}
          className="flex items-center gap-1 p-1.5 rounded border border-zinc-800 text-zinc-600 hover:text-zinc-300 hover:border-zinc-600 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          aria-label="Undo (Ctrl+Z)"
          title={canUndo ? `Undo — step ${historyIndex}/${historySize}` : 'Nothing to undo'}
        >
          <ArrowCounterClockwise size={12} />
        </button>

        {/* Redo */}
        <button
          type="button"
          onClick={onRedo}
          disabled={!canRedo}
          className="flex items-center gap-1 p-1.5 rounded border border-zinc-800 text-zinc-600 hover:text-zinc-300 hover:border-zinc-600 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          aria-label="Redo (Ctrl+Shift+Z)"
          title={canRedo ? 'Redo' : 'Nothing to redo'}
        >
          <ArrowClockwise size={12} />
        </button>

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
          aria-label="Save changes (Ctrl+S)"
          title="Save changes (Ctrl+S)"
        >
          <FloppyDisk size={13} />
          <span>{isSaving ? 'Saving…' : 'Save'}</span>
        </button>
      </div>
    </header>
  )
}
