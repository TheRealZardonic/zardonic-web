import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Mock } from 'vitest'
import type { AdminActionContext } from '@/lib/admin-action-registry'
import {
  ADMIN_ACTION_REGISTRY,
  dispatchAdminAction,
  getAccessibleActions,
} from '@/lib/admin-action-registry'
import type { AdminSettings } from '@/lib/types'
import type { SiteData } from '@/lib/app-types'
import { DEFAULT_SITE_DATA } from '@/lib/app-types'

// ─── Test helpers ─────────────────────────────────────────────────────────────

function makeCtx(overrides: Partial<AdminActionContext> = {}): AdminActionContext {
  const setAdminSettings = vi.fn<(s: AdminSettings) => void>()
  const setSiteData = vi.fn<(updater: SiteData | ((s: SiteData) => SiteData)) => void>()
  return {
    adminSettings: {} as AdminSettings,
    siteData: { ...DEFAULT_SITE_DATA, artistName: 'ZARDONIC' },
    setAdminSettings,
    setSiteData,
    ...overrides,
  }
}

// ─── Registry shape ───────────────────────────────────────────────────────────

describe('ADMIN_ACTION_REGISTRY', () => {
  it('has all required action ids', () => {
    const ids = Object.keys(ADMIN_ACTION_REGISTRY)
    expect(ids).toContain('update_admin_value')
    expect(ids).toContain('update_label')
    expect(ids).toContain('set_section_visibility')
    expect(ids).toContain('set_section_order')
    expect(ids).toContain('update_style_override')
    expect(ids).toContain('reset_section_styles')
    expect(ids).toContain('update_site_data_field')
  })

  it('every action has id, label, schema, minDisclosure, execute', () => {
    for (const [key, action] of Object.entries(ADMIN_ACTION_REGISTRY)) {
      expect(action.id).toBe(key)
      expect(typeof action.label).toBe('string')
      expect(action.schema).toBeDefined()
      expect(['basic', 'advanced', 'expert']).toContain(action.minDisclosure)
      expect(typeof action.execute).toBe('function')
    }
  })
})

// ─── dispatchAdminAction ──────────────────────────────────────────────────────

describe('dispatchAdminAction', () => {
  let setAdminSettings: Mock<(s: AdminSettings) => void>
  let ctx: AdminActionContext

  beforeEach(() => {
    setAdminSettings = vi.fn<(s: AdminSettings) => void>()
    ctx = makeCtx({ setAdminSettings })
  })

  it('returns error for unknown action', () => {
    const result = dispatchAdminAction('nonexistent_action', {}, ctx)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toMatch(/Unknown action/)
  })

  it('returns error when disclosure level is insufficient', () => {
    // reset_section_styles requires 'expert'
    const result = dispatchAdminAction(
      'reset_section_styles',
      { sectionId: 'bio' },
      ctx,
      'basic',
    )
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toMatch(/requires disclosure level/)
  })

  it('returns error when input fails validation', () => {
    const result = dispatchAdminAction('update_label', { key: '', value: 'X' }, ctx)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toMatch(/Invalid input/)
  })

  // ── update_admin_value ──

  it('update_admin_value calls setAdminSettings with new value', () => {
    const result = dispatchAdminAction(
      'update_admin_value',
      { path: 'labels.biography', value: 'ABOUT ME' },
      ctx,
    )
    expect(result.ok).toBe(true)
    expect(setAdminSettings).toHaveBeenCalledOnce()
    const updated: AdminSettings = setAdminSettings.mock.calls[0][0]
    expect(updated.labels?.biography).toBe('ABOUT ME')
  })

  // ── update_label ──

  it('update_label writes to labels.{key}', () => {
    const result = dispatchAdminAction(
      'update_label',
      { key: 'releases', value: 'MUSIC' },
      ctx,
    )
    expect(result.ok).toBe(true)
    const updated: AdminSettings = setAdminSettings.mock.calls[0][0]
    expect(updated.labels?.releases).toBe('MUSIC')
  })

  // ── set_section_visibility ──

  it('set_section_visibility hides a section', () => {
    const result = dispatchAdminAction(
      'set_section_visibility',
      { sectionId: 'bio', visible: false },
      ctx,
    )
    expect(result.ok).toBe(true)
    const updated: AdminSettings = setAdminSettings.mock.calls[0][0]
    expect(updated.sections?.visibility?.bio).toBe(false)
  })

  it('set_section_visibility shows a section', () => {
    ctx = makeCtx({
      setAdminSettings,
      adminSettings: {
        sections: { visibility: { bio: false } },
      } as AdminSettings,
    })
    const result = dispatchAdminAction(
      'set_section_visibility',
      { sectionId: 'bio', visible: true },
      ctx,
    )
    expect(result.ok).toBe(true)
    const updated: AdminSettings = setAdminSettings.mock.calls[0][0]
    expect(updated.sections?.visibility?.bio).toBe(true)
  })

  // ── set_section_order ──

  it('set_section_order requires at least advanced disclosure', () => {
    const result = dispatchAdminAction(
      'set_section_order',
      { order: ['bio', 'releases'] },
      ctx,
      'basic',
    )
    expect(result.ok).toBe(false)
  })

  it('set_section_order sets sections.order at advanced level', () => {
    const result = dispatchAdminAction(
      'set_section_order',
      { order: ['releases', 'bio', 'gigs'] },
      ctx,
      'advanced',
    )
    expect(result.ok).toBe(true)
    const updated: AdminSettings = setAdminSettings.mock.calls[0][0]
    expect(updated.sections?.order).toEqual(['releases', 'bio', 'gigs'])
  })

  // ── update_style_override ──

  it('update_style_override requires advanced disclosure', () => {
    const result = dispatchAdminAction(
      'update_style_override',
      { sectionId: 'bio', key: 'bodyFontSize', value: 'text-xl' },
      ctx,
      'basic',
    )
    expect(result.ok).toBe(false)
  })

  it('update_style_override sets style override at advanced level', () => {
    const result = dispatchAdminAction(
      'update_style_override',
      { sectionId: 'bio', key: 'bodyFontSize', value: 'text-xl' },
      ctx,
      'advanced',
    )
    expect(result.ok).toBe(true)
    const updated: AdminSettings = setAdminSettings.mock.calls[0][0]
    expect(updated.sections?.styleOverrides?.bio?.bodyFontSize).toBe('text-xl')
  })

  // ── reset_section_styles ──

  it('reset_section_styles requires expert disclosure', () => {
    const result = dispatchAdminAction(
      'reset_section_styles',
      { sectionId: 'bio' },
      ctx,
      'advanced',
    )
    expect(result.ok).toBe(false)
  })

  it('reset_section_styles removes style overrides at expert level', () => {
    ctx = makeCtx({
      setAdminSettings,
      adminSettings: {
        sections: { styleOverrides: { bio: { bodyFontSize: 'text-xl' } } },
      } as AdminSettings,
    })
    const result = dispatchAdminAction(
      'reset_section_styles',
      { sectionId: 'bio' },
      ctx,
      'expert',
    )
    expect(result.ok).toBe(true)
    const updated: AdminSettings = setAdminSettings.mock.calls[0][0]
    expect(updated.sections?.styleOverrides?.bio).toBeUndefined()
  })

  // ── update_site_data_field ──

  it('update_site_data_field updates artistName', () => {
    const setSiteData = vi.fn<(updater: SiteData | ((s: SiteData) => SiteData)) => void>()
    ctx = makeCtx({ setSiteData })
    const result = dispatchAdminAction(
      'update_site_data_field',
      { field: 'artistName', value: 'NEW NAME' },
      ctx,
    )
    expect(result.ok).toBe(true)
    expect(setSiteData).toHaveBeenCalledOnce()
    const updated = setSiteData.mock.calls[0][0] as SiteData
    expect(updated.artistName).toBe('NEW NAME')
  })

  it('update_site_data_field rejects invalid field names', () => {
    const result = dispatchAdminAction(
      'update_site_data_field',
      { field: 'tracks', value: 'bad' },
      ctx,
    )
    expect(result.ok).toBe(false)
  })
})

// ─── getAccessibleActions ─────────────────────────────────────────────────────

describe('getAccessibleActions', () => {
  it('basic level returns only basic actions', () => {
    const actions = getAccessibleActions('basic')
    expect(actions.every(a => a.minDisclosure === 'basic')).toBe(true)
  })

  it('advanced level includes basic + advanced', () => {
    const actions = getAccessibleActions('advanced')
    const minLevels = actions.map(a => a.minDisclosure)
    expect(minLevels).toContain('basic')
    expect(minLevels).toContain('advanced')
  })

  it('expert level includes all actions', () => {
    const allCount = Object.keys(ADMIN_ACTION_REGISTRY).length
    const actions = getAccessibleActions('expert')
    expect(actions.length).toBe(allCount)
  })

  it('basic level has fewer actions than expert', () => {
    const basic = getAccessibleActions('basic')
    const expert = getAccessibleActions('expert')
    expect(expert.length).toBeGreaterThanOrEqual(basic.length)
  })
})
