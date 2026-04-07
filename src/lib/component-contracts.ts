/**
 * Component Contracts
 *
 * Typed base interfaces that every UI component category MUST extend.
 * These act as machine-enforceable guardrails — preventing AI agents and
 * developers from shipping components with incomplete or inconsistent APIs.
 *
 * How to use:
 *   interface MyDialogProps extends DialogProps { … }
 *   interface MySectionProps extends SectionProps { … }
 *   interface MyEditDialogProps extends EditDialogProps<MyData> { … }
 *
 * Enforcement layers:
 *   1. TypeScript  — compile-time errors if a Props type omits required members
 *   2. ESLint rule — `band-land/require-dialog-props` catches Dialog files that
 *                    forget to declare `open` / `onClose`
 *   3. Vitest      — src/test/architecture.test.ts verifies all registered themes
 *                    and spot-checks component shapes at runtime
 */

import type { SectionLabels } from './types'

// ─── Dialog Contracts ──────────────────────────────────────────────────────────

/**
 * Every modal / overlay dialog must extend this interface.
 * Guarantees a consistent open/close API across all dialogs.
 */
export interface DialogProps {
  /** Whether the dialog is currently visible. */
  open: boolean
  /** Must be called when the user dismisses the dialog (X button, backdrop click, Escape key). */
  onClose: () => void
}

/**
 * Dialogs that edit a value and confirm the edit must extend this.
 * @template T  The type of the value being edited.
 */
export interface EditDialogProps<T> extends DialogProps {
  /** The current value to pre-populate the form. */
  value: T
  /** Called with the validated, updated value when the user confirms. */
  onSave: (value: T) => void
}

// ─── Section Contracts ─────────────────────────────────────────────────────────

/**
 * All page sections must extend this interface.
 * Guarantees that every section supports edit mode and label customisation.
 */
export interface SectionProps {
  /** True when the site owner is in admin/edit mode. */
  editMode?: boolean
  /** User-configurable display labels for this section. */
  sectionLabels?: SectionLabels
  /** Called when the user renames a label inside the section editor. */
  onLabelChange?: (key: keyof SectionLabels, value: string) => void
}

/**
 * Sections that own mutable content must extend this.
 * @template T  The data type owned by the section (e.g. Gig[], Release[]).
 */
export interface EditableSectionProps<T> extends SectionProps {
  /** Called with the full updated dataset when the user saves. */
  onUpdate?: (data: T) => void
}

// ─── Admin Panel Contracts ─────────────────────────────────────────────────────

/**
 * Admin hub sub-forms (ContentForms, SystemSettings, etc.) must extend this.
 * @template T  The slice of SiteConfig this panel is responsible for.
 */
export interface AdminPanelProps<T> {
  /** The current configuration data for this panel. */
  data: T
  /** Called when the user changes a field. `key` must be a property of T. */
  onUpdate: (key: keyof T, value: unknown) => void
}

// ─── Theme Slot Contracts ──────────────────────────────────────────────────────

/**
 * The slot names a theme should override to be meaningfully different from
 * the default theme. Not providing any of these means the theme will render
 * identically to the built-in defaults, which is almost certainly not intended.
 *
 * Validated at runtime by `validateThemePackage()` in theme-validator.ts.
 */
export const RECOMMENDED_THEME_SLOTS = [
  'Hero',
  'Navigation',
  'BackgroundEffects',
] as const

export type RecommendedThemeSlot = typeof RECOMMENDED_THEME_SLOTS[number]
