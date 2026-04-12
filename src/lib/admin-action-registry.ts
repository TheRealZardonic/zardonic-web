/**
 * AdminActionRegistry – strict tool-calling system for admin mutations.
 *
 * Every operation that modifies AdminSettings or SiteData MUST be registered
 * here. This provides:
 *   1. A typed, validated entry-point for every admin mutation
 *   2. Disclosure-level access control (basic / advanced / expert)
 *   3. Zod-validated input schemas – no raw `any` in mutation handlers
 *   4. A single testable registry that can be audited for security
 *
 * Usage:
 *   const result = dispatchAdminAction('update_label', { key: 'biography', value: 'BIO' }, ctx)
 *   if (!result.ok) console.error(result.error)
 */

import { z } from 'zod'
import { setAdminValue } from './admin-settings'
import type { AdminSettings, DisclosureLevel } from './types'
import type { SiteData } from '@/lib/app-types'

// ─── Result type ──────────────────────────────────────────────────────────────

export type AdminActionResult =
  | { ok: true }
  | { ok: false; error: string }

// ─── Context ──────────────────────────────────────────────────────────────────

export interface AdminActionContext {
  adminSettings: AdminSettings
  siteData: SiteData
  setAdminSettings: (s: AdminSettings) => void
  setSiteData: (updater: SiteData | ((s: SiteData) => SiteData)) => void
}

// ─── Action descriptor ────────────────────────────────────────────────────────

/**
 * User-facing typed action definition.
 * @template TSchema  The Zod schema for this action's input payload.
 */
export interface AdminAction<TSchema extends z.ZodTypeAny> {
  /** Machine-readable identifier (snake_case) */
  id: string
  /** Human-readable label shown in the UI */
  label: string
  /** Zod schema used to validate and type the input payload */
  schema: TSchema
  /** Minimum disclosure level required to execute this action */
  minDisclosure: DisclosureLevel
  /** Type-safe handler; input has already been validated by `dispatchAdminAction` */
  execute: (input: z.infer<TSchema>, ctx: AdminActionContext) => AdminActionResult
}

/**
 * Internal registered action.
 * `execute` accepts `unknown` because the dispatcher always validates via `schema.safeParse`
 * before invoking it.  The `register()` factory provides a single, safe cast at the boundary.
 */
export interface RegisteredAdminAction {
  id: string
  label: string
  schema: z.ZodTypeAny
  minDisclosure: DisclosureLevel
  /** @internal Called by `dispatchAdminAction` with a pre-validated input. */
  execute: (validatedInput: unknown, ctx: AdminActionContext) => AdminActionResult
}

export type AdminActionMap = Record<string, RegisteredAdminAction>

// ─── Factory ──────────────────────────────────────────────────────────────────

/**
 * Convert a strongly-typed `AdminAction<TSchema>` into a `RegisteredAdminAction`.
 *
 * The single `as z.infer<TSchema>` cast here is safe: `dispatchAdminAction` always
 * validates the raw input via `schema.safeParse` before calling `execute`, so the
 * value passed to the inner handler is structurally guaranteed to match `TSchema`.
 */
function register<TSchema extends z.ZodTypeAny>(
  def: AdminAction<TSchema>,
): RegisteredAdminAction {
  return {
    id: def.id,
    label: def.label,
    schema: def.schema,
    minDisclosure: def.minDisclosure,
    execute: (validatedInput, ctx) =>
      // Safe cast: dispatchAdminAction always calls schema.safeParse before invoking this
      def.execute(validatedInput as z.infer<TSchema>, ctx),
  }
}

// ─── Input schemas ────────────────────────────────────────────────────────────

const updateAdminValueSchema = z.object({
  /** Dot-notation path within AdminSettings, e.g. 'labels.biography' */
  path: z.string().min(1).max(200),
  value: z.unknown(),
})

const updateLabelSchema = z.object({
  key: z.string().min(1).max(100),
  value: z.string().max(200),
})

const setSectionVisibilitySchema = z.object({
  sectionId: z.string().min(1).max(50),
  visible: z.boolean(),
})

const setSectionOrderSchema = z.object({
  order: z.array(z.string().min(1).max(50)).min(1).max(30),
})

const updateStyleOverrideSchema = z.object({
  /** Section ID (e.g. 'bio', 'releases') */
  sectionId: z.string().min(1).max(50),
  /** Sub-key within SectionStyleOverride, e.g. 'bodyFontSize' */
  key: z.string().min(1).max(100),
  value: z.unknown(),
})

const resetSectionStylesSchema = z.object({
  sectionId: z.string().min(1).max(50),
})

const updateSiteDataFieldSchema = z.object({
  /** Top-level key of SiteData, e.g. 'artistName' or 'bio' */
  field: z.enum(['artistName', 'heroImage', 'bio', 'website']),
  value: z.string().max(10000),
})

// ─── Registry ─────────────────────────────────────────────────────────────────

export const ADMIN_ACTION_REGISTRY: AdminActionMap = {
  /**
   * Set any admin settings value by dot-notation path.
   * The most general action – use specific actions when available.
   */
  update_admin_value: register({
    id: 'update_admin_value',
    label: 'Update Admin Setting',
    schema: updateAdminValueSchema,
    minDisclosure: 'basic',
    execute({ path, value }, { adminSettings, setAdminSettings }) {
      setAdminSettings(setAdminValue(adminSettings, path, value))
      return { ok: true }
    },
  }),

  /**
   * Update a section heading label (e.g. rename "Biography" to "About Me").
   */
  update_label: register({
    id: 'update_label',
    label: 'Update Section Label',
    schema: updateLabelSchema,
    minDisclosure: 'basic',
    execute({ key, value }, { adminSettings, setAdminSettings }) {
      setAdminSettings(setAdminValue(adminSettings, `labels.${key}`, value))
      return { ok: true }
    },
  }),

  /**
   * Toggle the visibility of a section (e.g. hide the releases section).
   */
  set_section_visibility: register({
    id: 'set_section_visibility',
    label: 'Set Section Visibility',
    schema: setSectionVisibilitySchema,
    minDisclosure: 'basic',
    execute({ sectionId, visible }, { adminSettings, setAdminSettings }) {
      const visibility: Record<string, boolean> = {
        ...(adminSettings.sections?.visibility ?? {}),
        [sectionId]: visible,
      }
      setAdminSettings({
        ...adminSettings,
        sections: { ...adminSettings.sections, visibility },
      })
      return { ok: true }
    },
  }),

  /**
   * Reorder the sections on the page.
   */
  set_section_order: register({
    id: 'set_section_order',
    label: 'Set Section Order',
    schema: setSectionOrderSchema,
    minDisclosure: 'advanced',
    execute({ order }, { adminSettings, setAdminSettings }) {
      setAdminSettings({
        ...adminSettings,
        sections: { ...adminSettings.sections, order },
      })
      return { ok: true }
    },
  }),

  /**
   * Update a single style override key for a section.
   */
  update_style_override: register({
    id: 'update_style_override',
    label: 'Update Section Style Override',
    schema: updateStyleOverrideSchema,
    minDisclosure: 'advanced',
    execute({ sectionId, key, value }, { adminSettings, setAdminSettings }) {
      const path = `sections.styleOverrides.${sectionId}.${key}`
      setAdminSettings(setAdminValue(adminSettings, path, value))
      return { ok: true }
    },
  }),

  /**
   * Reset all style overrides for a section back to defaults.
   * Requires expert disclosure to avoid accidental data loss.
   */
  reset_section_styles: register({
    id: 'reset_section_styles',
    label: 'Reset Section Styles to Default',
    schema: resetSectionStylesSchema,
    minDisclosure: 'expert',
    execute({ sectionId }, { adminSettings, setAdminSettings }) {
      const overrides = { ...(adminSettings.sections?.styleOverrides ?? {}) }
      delete overrides[sectionId]
      setAdminSettings({
        ...adminSettings,
        sections: { ...adminSettings.sections, styleOverrides: overrides },
      })
      return { ok: true }
    },
  }),

  /**
   * Update a simple string field in SiteData (artistName, bio, heroImage, website).
   */
  update_site_data_field: register({
    id: 'update_site_data_field',
    label: 'Update Site Data Field',
    schema: updateSiteDataFieldSchema,
    minDisclosure: 'basic',
    execute({ field, value }, { siteData, setSiteData }) {
      setSiteData({ ...siteData, [field]: value })
      return { ok: true }
    },
  }),
}

// ─── Dispatcher ───────────────────────────────────────────────────────────────

const DISCLOSURE_ORDER: DisclosureLevel[] = ['basic', 'advanced', 'expert']

/**
 * Execute a registered admin action by id.
 *
 * Returns `{ ok: false, error }` when:
 *   - The action is not found in the registry
 *   - The caller's disclosure level is insufficient
 *   - The input fails Zod schema validation
 *
 * Returns `{ ok: true }` on success.
 */
export function dispatchAdminAction(
  actionId: string,
  rawInput: unknown,
  ctx: AdminActionContext,
  callerDisclosure: DisclosureLevel = 'basic',
): AdminActionResult {
  const action = ADMIN_ACTION_REGISTRY[actionId]
  if (!action) {
    return { ok: false, error: `Unknown action: "${actionId}"` }
  }

  // Disclosure-level guard
  const callerIdx = DISCLOSURE_ORDER.indexOf(callerDisclosure)
  const requiredIdx = DISCLOSURE_ORDER.indexOf(action.minDisclosure)
  if (callerIdx < requiredIdx) {
    return {
      ok: false,
      error: `Action "${actionId}" requires disclosure level "${action.minDisclosure}" (current: "${callerDisclosure}").`,
    }
  }

  // Input validation
  const parsed = action.schema.safeParse(rawInput)
  if (!parsed.success) {
    return { ok: false, error: `Invalid input for "${actionId}": ${parsed.error.message}` }
  }

  return action.execute(parsed.data, ctx)
}

/**
 * Returns all actions accessible at the given disclosure level.
 */
export function getAccessibleActions(level: DisclosureLevel): RegisteredAdminAction[] {
  const callerIdx = DISCLOSURE_ORDER.indexOf(level)
  return Object.values(ADMIN_ACTION_REGISTRY).filter(
    (a) => DISCLOSURE_ORDER.indexOf(a.minDisclosure) <= callerIdx,
  )
}
