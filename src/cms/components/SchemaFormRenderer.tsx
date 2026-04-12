/**
 * SchemaFormRenderer
 *
 * A reusable, schema-driven form renderer for the CMS editor.
 * Consumes `FieldMeta` entries from `FIELD_REGISTRY` (src/cms/schemas.ts) and
 * renders the appropriate input widget for each field.
 *
 * Features:
 *   - Progressive disclosure: advanced fields hidden behind a toggle
 *   - Field grouping: fields with the same `meta.group` are visually grouped
 *   - Tooltip labels via `FieldLabel` component
 *   - Fully controlled: values / onChange are passed via props (IoC)
 *
 * Usage:
 *   const fields = getFieldsForSchema('hero')
 *   <SchemaFormRenderer
 *     fields={fields}
 *     values={values}
 *     onChange={(path, value) => setValues(v => ({ ...v, [path]: value }))}
 *   />
 */

import { useState } from 'react'
import { SlidersHorizontal } from 'lucide-react'
import { FieldLabel } from './FieldLabel'
import type { FieldMeta, FieldWidgetType } from '../schemas'

// ─── Props ────────────────────────────────────────────────────────────────────

export interface SchemaFormRendererField {
  path: string
  meta: FieldMeta
}

export interface SchemaFormRendererProps {
  /** Fields to render, typically from `getFieldsForSchema(schemaName)` */
  fields: SchemaFormRendererField[]
  /** Current values keyed by field path */
  values: Record<string, string | number | boolean>
  /** Called when any field value changes */
  onChange: (path: string, value: string | number | boolean) => void
  /** When true, the advanced-toggle button is hidden and advanced fields are always shown */
  alwaysShowAdvanced?: boolean
  /** Optional CSS class applied to the root container */
  className?: string
}

// ─── Widget renderer ──────────────────────────────────────────────────────────

const BASE_INPUT =
  'w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1.5 text-xs font-mono text-zinc-200 focus:outline-none focus:border-red-500/60'

interface FieldInputProps {
  fieldPath: string
  meta: FieldMeta
  value: string | number | boolean
  onChange: (path: string, value: string | number | boolean) => void
}

/** Renders the correct input widget for a single field based on its `FieldMeta`. */
function FieldInput({ fieldPath, meta, value, onChange }: FieldInputProps) {
  const widget: FieldWidgetType = meta.widget

  if (widget === 'checkbox') {
    return (
      <input
        id={`field-${fieldPath}`}
        type="checkbox"
        checked={Boolean(value)}
        onChange={e => onChange(fieldPath, e.target.checked)}
        className="accent-red-600 w-4 h-4"
        aria-label={meta.label}
      />
    )
  }

  if (widget === 'color') {
    return (
      <div className="flex items-center gap-2">
        <input
          id={`field-${fieldPath}`}
          type="color"
          value={String(value || '#000000')}
          onChange={e => onChange(fieldPath, e.target.value)}
          className="w-8 h-8 rounded border border-zinc-700 bg-transparent cursor-pointer"
          aria-label={meta.label}
        />
        <input
          type="text"
          value={String(value || '')}
          onChange={e => onChange(fieldPath, e.target.value)}
          placeholder="#000000"
          className={`${BASE_INPUT} flex-1`}
          aria-label={`${meta.label} hex value`}
        />
      </div>
    )
  }

  if (widget === 'textarea') {
    return (
      <textarea
        id={`field-${fieldPath}`}
        value={String(value || '')}
        onChange={e => onChange(fieldPath, e.target.value)}
        placeholder={meta.placeholder}
        rows={3}
        className={`${BASE_INPUT} resize-y`}
        aria-label={meta.label}
      />
    )
  }

  if (widget === 'select' && meta.options) {
    return (
      <select
        id={`field-${fieldPath}`}
        value={String(value || '')}
        onChange={e => onChange(fieldPath, e.target.value)}
        className={BASE_INPUT}
        aria-label={meta.label}
      >
        <option value="">— Select —</option>
        {meta.options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    )
  }

  if (widget === 'range') {
    return (
      <div className="flex items-center gap-2">
        <input
          id={`field-${fieldPath}`}
          type="range"
          min={meta.min ?? 0}
          max={meta.max ?? 1}
          step={meta.step ?? 0.1}
          value={Number(value ?? meta.min ?? 0)}
          onChange={e => onChange(fieldPath, parseFloat(e.target.value))}
          className="flex-1 accent-red-600"
          aria-label={meta.label}
        />
        <span className="text-zinc-400 text-xs font-mono w-10 text-right tabular-nums">
          {Number(value ?? 0).toFixed(2)}
        </span>
      </div>
    )
  }

  // Default: text / url / email / date / number / image-url
  const inputType =
    widget === 'email' ? 'email'
    : widget === 'date' ? 'date'
    : widget === 'number' ? 'number'
    : 'text'

  return (
    <input
      id={`field-${fieldPath}`}
      type={inputType}
      value={String(value || '')}
      onChange={e => onChange(fieldPath, e.target.value)}
      placeholder={meta.placeholder}
      className={BASE_INPUT}
      aria-label={meta.label}
    />
  )
}

// ─── Group renderer ───────────────────────────────────────────────────────────

function FieldGroup({
  groupName,
  fields,
  values,
  onChange,
}: {
  groupName: string
  fields: SchemaFormRendererField[]
  values: Record<string, string | number | boolean>
  onChange: (path: string, value: string | number | boolean) => void
}) {
  if (fields.length === 0) return null
  return (
    <div className="mb-3">
      <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-600 mb-2 px-1">
        {groupName}
      </div>
      <div className="space-y-2">
        {fields.map(({ path, meta }) => (
          <div key={path} className="px-1">
            {meta.tooltip ? (
              <FieldLabel label={meta.label} tooltip={meta.tooltip} htmlFor={`field-${path}`} />
            ) : (
              <label htmlFor={`field-${path}`} className="block text-xs text-zinc-400 mb-1">
                {meta.label}
              </label>
            )}
            <FieldInput
              fieldPath={path}
              meta={meta}
              value={values[path] ?? ''}
              onChange={onChange}
            />
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

/**
 * Renders a schema-driven form from an array of `FieldMeta` entries.
 *
 * Fields are grouped by `meta.group` and split into core / advanced sets.
 * Advanced fields are hidden behind a toggle button (progressive disclosure).
 */
export function SchemaFormRenderer({
  fields,
  values,
  onChange,
  alwaysShowAdvanced = false,
  className,
}: SchemaFormRendererProps) {
  const [showAdvanced, setShowAdvanced] = useState(false)

  const coreFields = fields.filter(f => !f.meta.advanced)
  const advancedFields = fields.filter(f => f.meta.advanced)

  const groups = Array.from(new Set(fields.map(f => f.meta.group ?? 'General')))

  const renderGroups = (subset: SchemaFormRendererField[]) =>
    groups.map(groupName => {
      const groupFields = subset.filter(f => (f.meta.group ?? 'General') === groupName)
      return (
        <FieldGroup
          key={groupName}
          groupName={groupName}
          fields={groupFields}
          values={values}
          onChange={onChange}
        />
      )
    })

  const displayAdvanced = alwaysShowAdvanced || showAdvanced

  return (
    <div className={className}>
      {/* Advanced toggle */}
      {!alwaysShowAdvanced && advancedFields.length > 0 && (
        <div className="flex justify-end mb-2 px-1">
          <button
            type="button"
            onClick={() => setShowAdvanced(v => !v)}
            className="flex items-center gap-1 text-[10px] font-mono text-zinc-600 hover:text-zinc-400 transition-colors"
            aria-expanded={showAdvanced}
            aria-controls="schema-form-advanced"
            aria-label={showAdvanced ? 'Hide advanced settings' : 'Show advanced settings'}
          >
            <SlidersHorizontal size={10} />
            {showAdvanced ? 'Less' : 'Advanced'}
          </button>
        </div>
      )}

      {/* Core fields */}
      {renderGroups(coreFields)}

      {/* Advanced fields (progressive disclosure) */}
      {displayAdvanced && advancedFields.length > 0 && (
        <div id="schema-form-advanced" className="mt-2 pt-2 border-t border-zinc-800/50">
          <div className="text-[10px] font-mono text-zinc-700 mb-2 px-1 uppercase tracking-widest">
            Advanced Settings
          </div>
          {renderGroups(advancedFields)}
        </div>
      )}
    </div>
  )
}

export default SchemaFormRenderer
