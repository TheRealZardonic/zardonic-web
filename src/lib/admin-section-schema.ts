/**
 * AdminSectionSchema — Phase 1 Foundation Layer
 *
 * Defines the complete type contract for admin-editable sections.
 * Every section that appears in the admin panel MUST implement
 * `AdminSectionSchema<T>` to guarantee:
 *   - consistent field definitions (labels, tooltips, validation)
 *   - progressive disclosure groups
 *   - live-preview support declaration
 *   - compile-time enforcement via TypeScript
 *
 * This is the single source of truth for the admin UI schema layer.
 * The `SectionEditorFactory` (src/cms/components/SectionEditorFactory.tsx)
 * consumes these schemas to auto-generate edit forms.
 *
 * Rules:
 *   - Never add raw JSX edit forms without a corresponding `AdminSectionSchema`.
 *   - All new sections MUST register a schema in `src/cms/section-schemas/`.
 *   - Validation functions must return `null` on success and an error string on failure.
 */

// ─── Validation ───────────────────────────────────────────────────────────────

/**
 * Per-field validation rules.
 * All constraints are optional; omit what is not applicable.
 */
export interface FieldValidation {
  /** Minimum string length (for text/textarea/url fields). */
  minLength?: number
  /** Maximum string length (for text/textarea/url fields). */
  maxLength?: number
  /** Minimum numeric value (for number fields). */
  min?: number
  /** Maximum numeric value (for number fields). */
  max?: number
  /** Regex pattern the value must match (for text/url/email fields). */
  pattern?: string
  /** Human-readable message shown when `pattern` does not match. */
  patternMessage?: string
  /**
   * Custom synchronous validator.
   * Return a non-empty string to report an error, or null to indicate success.
   */
  custom?: (value: unknown) => string | null
}

// ─── Field Definition ─────────────────────────────────────────────────────────

/** Supported field widget types. Aligned with `FieldWidgetType` in `src/cms/schemas.ts`. */
export type AdminFieldType =
  | 'text'
  | 'textarea'
  | 'richtext'
  | 'number'
  | 'boolean'
  | 'select'
  | 'date'
  | 'color'
  | 'image'
  | 'url'
  | 'array'
  | 'object'

/**
 * Describes a single editable field within an `AdminSectionSchema`.
 * Each field drives one input widget in the generated edit form.
 */
export interface AdminFieldDefinition {
  /**
   * Unique key within the schema.
   * Used as the property name when reading/writing the section's data object.
   */
  key: string

  /** Widget type used to render the field. */
  type: AdminFieldType

  /** Human-readable label shown above the input. */
  label: string

  /**
   * Optional contextual help text.
   * Shown as a hoverable tooltip (ℹ icon) next to the label.
   */
  tooltip?: string

  /** Placeholder shown inside the input when empty. */
  placeholder?: string

  /** Whether the field is required. Validated before save. */
  required?: boolean

  /** Validation constraints applied when the field changes or on submit. */
  validation?: FieldValidation

  /**
   * Field group identifier for progressive disclosure.
   * Fields with the same `group` are rendered in a collapsible section.
   * Fields without a group are placed in the implicit "General" group.
   */
  group?: string

  /**
   * Disclosure level required to see this field.
   * Maps to `DisclosureLevel` in `src/lib/types.ts`.
   * Defaults to `'basic'`.
   */
  disclosure?: 'basic' | 'advanced' | 'expert'

  /** Default / reset value for this field. */
  defaultValue?: unknown

  /**
   * Options for `select` type fields.
   * Required when `type === 'select'`.
   */
  options?: Array<{ label: string; value: string }>

  /**
   * Schema for each item in the array (for `type === 'array'`).
   * Each element in the edited array will be rendered using these sub-fields.
   */
  arrayItemSchema?: AdminFieldDefinition[]

  /**
   * Schema for the nested object (for `type === 'object'`).
   * The sub-fields are rendered inline or in a nested collapse.
   */
  objectSchema?: AdminFieldDefinition[]
}

// ─── Field Group ──────────────────────────────────────────────────────────────

/**
 * A named, optionally collapsible group of fields for progressive disclosure.
 * Groups appear in the order they are declared.
 */
export interface AdminFieldGroup {
  /** Unique identifier. Matches the `group` property on `AdminFieldDefinition`. */
  id: string

  /** Human-readable group heading shown in the editor. */
  label: string

  /** Optional sub-heading or help text displayed below the group heading. */
  description?: string

  /** Whether the group starts expanded. Defaults to `true` for the first group, `false` for others. */
  defaultExpanded?: boolean
}

// ─── Section Group ────────────────────────────────────────────────────────────

/**
 * Logical grouping used in the admin dashboard and sidebar.
 * Sections without a group fall into the implicit "Other" bucket.
 */
export type AdminSectionGroup = 'content' | 'media' | 'configuration' | 'legal'

/**
 * Ordered list of group display configs shared by `AdminDashboard` and `AdminShell`.
 * This is the single source of truth for group order and labels — no hardcoded
 * `sectionIds` required. Groups are derived from `AdminSectionSchema.group`.
 */
export const ADMIN_SECTION_GROUP_CONFIG: Array<{ id: AdminSectionGroup; label: string }> = [
  { id: 'content', label: 'Content' },
  { id: 'media', label: 'Media' },
  { id: 'configuration', label: 'Configuration' },
  { id: 'legal', label: 'Legal' },
]

// ─── Section Schema ───────────────────────────────────────────────────────────

/**
 * Complete contract for an admin-editable section.
 *
 * @template T - The data type managed by this section (e.g. `{ bio: string; photos: string[] }`).
 *               Defaults to `Record<string, unknown>` so untyped schemas still compile.
 *
 * Usage:
 * ```typescript
 * const heroSchema: AdminSectionSchema<{ artistName: string; heroImage: string }> = {
 *   sectionId: 'hero',
 *   label: 'Hero',
 *   icon: 'House',
 *   description: 'The full-bleed top section of the page.',
 *   fields: [ ... ],
 *   supportsPreview: true,
 *   getDefaultData: () => ({ artistName: '', heroImage: '' }),
 * }
 * ```
 */
export interface AdminSectionSchema<T = Record<string, unknown>> {
  /**
   * Unique section identifier.
   * MUST match the corresponding key in `SECTION_REGISTRY` (src/lib/sections-registry.ts)
   * so the admin UI can bridge section rendering with section editing.
   */
  sectionId: string

  /** Human-readable label for the admin sidebar and panel headings. */
  label: string

  /**
   * Icon identifier (from @phosphor-icons/react).
   * Mirrors the `icon` field in `SectionRegistryEntry`.
   */
  icon: string

  /** Short description shown as a subtitle or tooltip in the admin sidebar. */
  description: string

  /**
   * Ordered list of field definitions that drive auto-generated form rendering.
   * The `SectionEditorFactory` iterates these to build the edit UI.
   */
  fields: AdminFieldDefinition[]

  /**
   * Optional progressive-disclosure groups.
   * When provided, fields are placed into collapsible accordion sections
   * based on their `group` property. Fields without a matching group
   * are rendered under an implicit "General" group at the top.
   */
  fieldGroups?: AdminFieldGroup[]

  /**
   * Whether the `SectionEditorFactory` should show a live-preview pane
   * alongside the edit form.
   * All new sections SHOULD set this to `true` once preview is wired up.
   */
  supportsPreview: boolean

  /**
   * Returns a fresh, valid default data object for this section.
   * Used when a section has no saved data or when the user clicks "Reset".
   */
  getDefaultData: () => T

  /**
   * Logical grouping for dashboard and sidebar display.
   * Determines which collapsible group this section appears under.
   * Sections without a group are placed under "Other".
   */
  group?: AdminSectionGroup

  /**
   * Optional cross-field validation function called before save.
   * Return a `Record<fieldKey, errorMessage>` map.
   * Return an empty object `{}` (or omit this function) when validation passes.
   */
  validate?: (data: T) => Record<string, string>
}
