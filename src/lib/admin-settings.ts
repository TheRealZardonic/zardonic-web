import { DEFAULT_SECTION_ORDER } from '@/lib/config'
import type { AdminSettings, DisclosureLevel, SectionStyleOverride } from '@/lib/types'

/**
 * Returns whether a section is visible (default: true).
 * Uses adminSettings.sections.visibility record.
 */
export function isSectionVisible(
  settings: AdminSettings | undefined | null,
  id: string,
): boolean {
  const vis = settings?.sections?.visibility
  if (!vis) return true
  const val = vis[id]
  return val !== false
}

/**
 * Returns the section display order.
 * Falls back to DEFAULT_SECTION_ORDER if not configured.
 */
export function getSectionOrder(settings: AdminSettings | undefined | null): string[] {
  return settings?.sections?.order ?? [...DEFAULT_SECTION_ORDER]
}

/**
 * Returns the current disclosure level (default: 'basic').
 */
export function getDisclosureLevel(settings: AdminSettings | undefined | null): DisclosureLevel {
  return settings?.ui?.disclosureLevel ?? 'basic'
}

/**
 * Returns the style override for a specific section, merged with empty defaults.
 */
export function getSectionStyle(
  settings: AdminSettings | undefined | null,
  id: string,
): SectionStyleOverride {
  const overrides = settings?.sections?.styleOverrides
  return overrides?.[id] ?? {}
}

/**
 * Returns the effective body font-size Tailwind class for the Biography section.
 * Checks `bodyFontSize` first (canonical field used by the registry and LayoutTab),
 * then falls back to the legacy `textSize` field for backward compatibility.
 */
export function getBioBodyFontSize(
  settings: AdminSettings | undefined | null,
): string {
  const bio = settings?.sections?.styleOverrides?.bio
  return bio?.bodyFontSize ?? bio?.textSize ?? 'text-lg'
}

/**
 * Checks whether a field at `fieldLevel` should be shown given `currentLevel`.
 * - basic  → always visible
 * - advanced → visible at 'advanced' or 'expert'
 * - expert → visible only at 'expert'
 */
export function isFieldVisible(
  fieldLevel: DisclosureLevel,
  currentLevel: DisclosureLevel,
): boolean {
  const order: DisclosureLevel[] = ['basic', 'advanced', 'expert']
  return order.indexOf(fieldLevel) <= order.indexOf(currentLevel)
}

/**
 * Typed helper to get a nested value from AdminSettings using a dot-notation path.
 * Returns undefined when the path does not resolve.
 */
export function getAdminValue(
  settings: AdminSettings | undefined | null,
  path: string,
): unknown {
  if (!settings) return undefined
  const parts = path.split('.')
  let current: Record<string, unknown> = settings as Record<string, unknown>
  for (const part of parts) {
    if (current === undefined || current === null) return undefined
    current = current[part] as Record<string, unknown>
  }
  return current
}

/**
 * Returns a new AdminSettings with the value at `path` set to `value`.
 * Creates intermediate objects as needed.
 */
export function setAdminValue(
  settings: AdminSettings | undefined | null,
  path: string,
  value: unknown,
): AdminSettings {
  const base: AdminSettings = settings ? { ...settings } : {}
  const parts = path.split('.')
  if (parts.length === 1) {
    return { ...base, [parts[0]]: value } as AdminSettings
  }
  // Deep set using reduce to build a new object
  const result: Record<string, unknown> = { ...base }
  let current: Record<string, unknown> = result
  for (let i = 0; i < parts.length - 1; i++) {
    const key = parts[i]
    current[key] = current[key] ? { ...(current[key] as Record<string, unknown>) } : {}
    current = current[key] as Record<string, unknown>
  }
  current[parts[parts.length - 1]] = value
  return result as AdminSettings
}
