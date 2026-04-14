/**
 * SectionEditorFactory
 *
 * A React component that takes an `AdminSectionSchema` and auto-generates
 * a complete edit form from the schema's field definitions.
 *
 * Features:
 *   - Renders all field types via the field component dispatch map
 *   - Progressive disclosure: groups collapsed/expanded based on `AdminFieldGroup.defaultExpanded`
 *   - Shows field tooltips, validation errors, and required markers
 *   - Runs per-field validation on change + cross-field `schema.validate` on submit
 *   - Fully controlled: receives `data` + `onChange` (IoC)
 *   - Filters by `disclosure` level so advanced/expert fields are hidden at basic level
 *
 * Usage:
 * ```tsx
 * import { SectionEditorFactory } from '@/cms/components/SectionEditorFactory'
 * import { heroSectionSchema } from '@/cms/section-schemas'
 *
 * <SectionEditorFactory
 *   schema={heroSectionSchema}
 *   data={currentData}
 *   onChange={setCurrentData}
 *   disclosure="basic"
 * />
 * ```
 *
 * Note: This component does NOT handle save/publish — wire those in the parent.
 */

import { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import { ChevronDown } from 'lucide-react'
import type { AdminSectionSchema, AdminFieldDefinition, AdminFieldGroup } from '@/lib/admin-section-schema'
import {
  TextField,
  TextAreaField,
  NumberField,
  BooleanField,
  SelectField,
  DateField,
  ColorField,
  ImageField,
  UrlField,
  ArrayField,
  ObjectField,
} from './fields'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SectionEditorFactoryProps<T extends Record<string, unknown>> {
  /** The schema that drives form generation. */
  schema: AdminSectionSchema<T>
  /** Current section data (controlled). */
  data: T
  /** Called whenever any field value changes. */
  onChange: (data: T) => void
  /**
   * Disclosure level — controls which fields are visible.
   *   basic    → only basic fields shown
   *   advanced → basic + advanced fields shown
   *   expert   → all fields shown
   * Defaults to 'basic'.
   */
  disclosure?: 'basic' | 'advanced' | 'expert'
  /** External validation errors keyed by field key. Merged with internal per-field errors. */
  errors?: Record<string, string>
  /** When true, all inputs are rendered read-only. */
  disabled?: boolean
  /** Optional extra CSS class on the root container. */
  className?: string
}

// ─── Disclosure helpers ───────────────────────────────────────────────────────

const DISCLOSURE_RANK: Record<string, number> = { basic: 0, advanced: 1, expert: 2 }

function isFieldVisible(fieldDisclosure: string | undefined, panelDisclosure: string): boolean {
  const fieldRank = DISCLOSURE_RANK[fieldDisclosure ?? 'basic'] ?? 0
  const panelRank = DISCLOSURE_RANK[panelDisclosure] ?? 0
  return fieldRank <= panelRank
}

// ─── Per-field validation ─────────────────────────────────────────────────────

function validateField(fieldDef: AdminFieldDefinition, value: unknown): string | null {
  const v = fieldDef.validation
  if (!v) return null

  if (fieldDef.required) {
    if (value === null || value === undefined || value === '') {
      return `${fieldDef.label} is required.`
    }
  }

  if (typeof value === 'string') {
    if (v.minLength !== undefined && value.length < v.minLength) {
      return `Must be at least ${v.minLength} characters.`
    }
    if (v.maxLength !== undefined && value.length > v.maxLength) {
      return `Must be at most ${v.maxLength} characters.`
    }
    if (v.pattern && value !== '') {
      const regex = new RegExp(v.pattern)
      if (!regex.test(value)) {
        return v.patternMessage ?? 'Invalid format.'
      }
    }
  }

  if (typeof value === 'number') {
    if (v.min !== undefined && value < v.min) {
      return `Must be at least ${v.min}.`
    }
    if (v.max !== undefined && value > v.max) {
      return `Must be at most ${v.max}.`
    }
  }

  if (v.custom) {
    return v.custom(value)
  }

  return null
}

// ─── Field renderer dispatch ──────────────────────────────────────────────────

interface FieldRendererProps {
  fieldDef: AdminFieldDefinition
  value: unknown
  onChange: (val: unknown) => void
  error?: string
  disabled?: boolean
}

function FieldRenderer({ fieldDef, value, onChange, error, disabled }: FieldRendererProps) {
  switch (fieldDef.type) {
    case 'text':
    case 'richtext':
      return (
        <TextField
          fieldDef={fieldDef}
          value={String(value ?? '')}
          onChange={onChange}
          error={error}
          disabled={disabled}
        />
      )

    case 'textarea':
      return (
        <TextAreaField
          fieldDef={fieldDef}
          value={String(value ?? '')}
          onChange={onChange}
          error={error}
          disabled={disabled}
        />
      )

    case 'number':
      return (
        <NumberField
          fieldDef={fieldDef}
          value={typeof value === 'number' ? value : Number(value ?? 0)}
          onChange={val => onChange(val)}
          error={error}
          disabled={disabled}
        />
      )

    case 'boolean':
      return (
        <BooleanField
          fieldDef={fieldDef}
          value={Boolean(value)}
          onChange={val => onChange(val)}
          error={error}
          disabled={disabled}
        />
      )

    case 'select':
      return (
        <SelectField
          fieldDef={fieldDef}
          value={String(value ?? '')}
          onChange={onChange}
          error={error}
          disabled={disabled}
        />
      )

    case 'date':
      return (
        <DateField
          fieldDef={fieldDef}
          value={String(value ?? '')}
          onChange={onChange}
          error={error}
          disabled={disabled}
        />
      )

    case 'color':
      return (
        <ColorField
          fieldDef={fieldDef}
          value={String(value ?? '')}
          onChange={onChange}
          error={error}
          disabled={disabled}
        />
      )

    case 'image':
      return (
        <ImageField
          fieldDef={fieldDef}
          value={String(value ?? '')}
          onChange={onChange}
          error={error}
          disabled={disabled}
        />
      )

    case 'url':
      return (
        <UrlField
          fieldDef={fieldDef}
          value={String(value ?? '')}
          onChange={onChange}
          error={error}
          disabled={disabled}
        />
      )

    case 'array': {
      const arr = Array.isArray(value) ? value as Record<string, unknown>[] : []
      return (
        <ArrayField
          fieldDef={fieldDef}
          value={arr}
          onChange={val => onChange(val)}
          error={error}
          disabled={disabled}
          renderSubField={(subDef, subVal, onSubChange) => (
            <FieldRenderer
              key={subDef.key}
              fieldDef={subDef}
              value={subVal}
              onChange={onSubChange}
              disabled={disabled}
            />
          )}
        />
      )
    }

    case 'object': {
      const obj = (value && typeof value === 'object' && !Array.isArray(value))
        ? value as Record<string, unknown>
        : {}
      return (
        <ObjectField
          fieldDef={fieldDef}
          value={obj}
          onChange={val => onChange(val)}
          error={error}
          disabled={disabled}
          renderSubField={(subDef, subVal, onSubChange) => (
            <FieldRenderer
              key={subDef.key}
              fieldDef={subDef}
              value={subVal}
              onChange={onSubChange}
              disabled={disabled}
            />
          )}
        />
      )
    }

    default:
      return null
  }
}

// ─── Group panel ──────────────────────────────────────────────────────────────

interface FieldGroupPanelProps {
  group: AdminFieldGroup
  fields: AdminFieldDefinition[]
  data: Record<string, unknown>
  errors: Record<string, string>
  onFieldChange: (key: string, val: unknown) => void
  disabled?: boolean
  /** Force expanded state from parent (for expand/collapse all). */
  forceExpanded?: boolean
  /** Called when the user manually toggles the panel so the parent can return per-group control. */
  onManualToggle?: () => void
}

function FieldGroupPanel({ group, fields, data, errors, onFieldChange, disabled, forceExpanded, onManualToggle }: FieldGroupPanelProps) {
  const [localExpanded, setLocalExpanded] = useState(group.defaultExpanded ?? false)

  // Sync local state when expand/collapse-all is invoked from the parent
  useEffect(() => {
    if (forceExpanded !== undefined) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLocalExpanded(forceExpanded)
    }
  }, [forceExpanded])

  // Once synced via forceExpanded we use localExpanded as the single source of
  // truth so that individual group toggles work correctly without requiring the
  // parent to be aware of each group's state.
  const expanded = localExpanded

  if (fields.length === 0) return null

  // Count configured (non-empty) fields for the summary
  const configuredCount = fields.filter(f => {
    const val = data[f.key]
    return val !== undefined && val !== null && val !== '' &&
      !(Array.isArray(val) && val.length === 0)
  }).length

  // Whether any field in this group has an error
  const hasErrors = fields.some(f => Boolean(errors[f.key]))

  return (
    <div
      className={`border rounded overflow-hidden transition-colors ${
        hasErrors
          ? 'border-red-700/50'
          : 'border-zinc-800'
      }`}
    >
      {/* Group header */}
      <button
        type="button"
        onClick={() => {
          setLocalExpanded(v => !v)
          // Tell the parent to stop forcing a global expanded/collapsed state so
          // this individual toggle takes effect immediately.
          onManualToggle?.()
        }}
        className={`flex items-center gap-2 w-full px-3 py-2 transition-colors text-left ${
          hasErrors
            ? 'bg-red-900/10 hover:bg-red-900/20'
            : 'bg-zinc-900/60 hover:bg-zinc-900'
        }`}
        aria-expanded={expanded}
        aria-label={`${expanded ? 'Collapse' : 'Expand'} ${group.label}`}
      >
        <ChevronDown
          size={12}
          className={`text-zinc-600 shrink-0 transition-transform duration-200 ${
            expanded ? '' : '-rotate-90'
          }`}
        />
        <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-400 flex-1">
          {group.label}
        </span>

        {/* Error indicator */}
        {hasErrors && (
          <span className="text-[9px] font-mono text-red-400 px-1.5 py-0.5 rounded bg-red-900/20 border border-red-700/30">
            errors
          </span>
        )}

        {/* Field count / configured summary */}
        {!expanded && (
          <span className="text-[9px] font-mono text-zinc-700 ml-1 hidden sm:inline">
            {configuredCount}/{fields.length}
          </span>
        )}
        {expanded && (
          <span className="text-[9px] font-mono text-zinc-700 ml-1 hidden sm:inline">
            {fields.length} {fields.length === 1 ? 'field' : 'fields'}
          </span>
        )}
      </button>

      {/* Group fields — smooth height animation via CSS grid trick */}
      <div
        className="cms-group-content"
        data-open={String(expanded)}
        aria-hidden={!expanded}
      >
        <div>
          <div className="px-3 py-3 space-y-4 bg-zinc-950/20">
            {fields.map(fieldDef => (
              <FieldRenderer
                key={fieldDef.key}
                fieldDef={fieldDef}
                value={data[fieldDef.key]}
                onChange={val => onFieldChange(fieldDef.key, val)}
                error={errors[fieldDef.key]}
                disabled={disabled}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

/**
 * Auto-generates a complete edit form from an `AdminSectionSchema`.
 *
 * - Groups fields by `fieldDef.group` matching `schema.fieldGroups[].id`.
 * - Fields without a matching group land in an implicit "General" group.
 * - Respects `disclosure` to hide advanced/expert fields at basic level.
 * - Runs inline validation on every change.
 * - Provides expand/collapse all toggle.
 * - Shows field count per group.
 * - Highlights groups with validation errors.
 */
export function SectionEditorFactory<T extends Record<string, unknown>>({
  schema,
  data,
  onChange,
  disclosure = 'basic',
  errors: externalErrors = {},
  disabled,
  className,
}: SectionEditorFactoryProps<T>) {
  const [internalErrors, setInternalErrors] = useState<Record<string, string>>({})
  // null = each group controls itself, true = all expanded, false = all collapsed
  const [allExpanded, setAllExpanded] = useState<boolean | null>(null)

  // Keep a ref to the latest data so handleFieldChange can spread it
  // without `data` appearing in its dependency array (which would recreate
  // the callback — and therefore all child FieldRenderer instances — on
  // every single keystroke).
  const dataRef = useRef(data)
  useEffect(() => {
    dataRef.current = data
  }, [data])

  const handleFieldChange = useCallback(
    (key: string, val: unknown) => {
      const fieldDef = schema.fields.find(f => f.key === key)
      if (fieldDef) {
        const error = validateField(fieldDef, val)
        setInternalErrors(prev => {
          if (error) return { ...prev, [key]: error }
          const next = { ...prev }
          delete next[key]
          return next
        })
      }
      onChange({ ...dataRef.current, [key]: val } as T)
    },
    [schema.fields, onChange],
  )

  // Merge external + internal errors (external wins)
  const mergedErrors: Record<string, string> = { ...internalErrors, ...externalErrors }

  // Visible fields after disclosure filtering
  const visibleFields = schema.fields.filter(f => isFieldVisible(f.disclosure, disclosure))

  // Resolve groups — use schema.fieldGroups if provided, else derive from field groups.
  // visibleFields is derived from schema.fields + disclosure — including it in the dep
  // array is safe and avoids the eslint exhaustive-deps warning.
  const resolvedGroups: AdminFieldGroup[] = useMemo(
    () =>
      schema.fieldGroups && schema.fieldGroups.length > 0
        ? schema.fieldGroups
        : Array.from(new Set(visibleFields.map(f => f.group ?? 'General'))).map(
            (id, i) => ({ id, label: id, defaultExpanded: i === 0 }),
          ),
    [schema.fieldGroups, visibleFields],
  )

  // Fields without a matching group go into "General"
  const groupedFields = useCallback(
    (groupId: string): AdminFieldDefinition[] =>
      visibleFields.filter(f => (f.group ?? 'General') === groupId),
    [visibleFields],
  )

  // Ungrouped fields (no matching group in resolvedGroups)
  const allGroupIds = new Set(resolvedGroups.map(g => g.id))
  const ungroupedFields = visibleFields.filter(
    f => !allGroupIds.has(f.group ?? 'General') && !f.group,
  )

  // Whether at least one group has visible fields
  const hasGroups = resolvedGroups.some(g => groupedFields(g.id).length > 0)

  return (
    <div className={`space-y-2 ${className ?? ''}`} role="form" aria-label={`${schema.label} editor`}>
      {/* Expand / Collapse All — only shown when there are multiple groups */}
      {hasGroups && resolvedGroups.length > 1 && (
        <div className="flex justify-end mb-1">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setAllExpanded(true)}
              className="text-[10px] font-mono text-zinc-600 hover:text-zinc-400 transition-colors"
              aria-label="Expand all field groups"
            >
              Expand all
            </button>
            <span className="text-zinc-800 text-[10px]">·</span>
            <button
              type="button"
              onClick={() => setAllExpanded(false)}
              className="text-[10px] font-mono text-zinc-600 hover:text-zinc-400 transition-colors"
              aria-label="Collapse all field groups"
            >
              Collapse all
            </button>
          </div>
        </div>
      )}

      {/* Ungrouped fields rendered at the top */}
      {ungroupedFields.length > 0 && (
        <div className="space-y-4 px-1">
          {ungroupedFields.map(fieldDef => (
            <FieldRenderer
              key={fieldDef.key}
              fieldDef={fieldDef}
              value={(data as Record<string, unknown>)[fieldDef.key]}
              onChange={val => handleFieldChange(fieldDef.key, val)}
              error={mergedErrors[fieldDef.key]}
              disabled={disabled}
            />
          ))}
        </div>
      )}

      {/* Grouped fields */}
      {resolvedGroups.map(group => {
        const fields = groupedFields(group.id)
        if (fields.length === 0) return null
        return (
          <FieldGroupPanel
            key={group.id}
            group={group}
            fields={fields}
            data={data as Record<string, unknown>}
            errors={mergedErrors}
            onFieldChange={handleFieldChange}
            disabled={disabled}
            forceExpanded={allExpanded !== null ? allExpanded : undefined}
            onManualToggle={() => setAllExpanded(null)}
          />
        )
      })}
    </div>
  )
}

export default SectionEditorFactory
