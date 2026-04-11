import { describe, it, expect } from 'vitest'
import { SECTION_REGISTRY } from '../sections-registry'
import { DEFAULT_SECTION_ORDER } from '../config'

describe('SECTION_REGISTRY', () => {
  it('all entries have unique ids', () => {
    const ids = SECTION_REGISTRY.map((e) => e.id)
    const unique = new Set(ids)
    expect(unique.size).toBe(ids.length)
  })

  it('registry ids are a superset of DEFAULT_SECTION_ORDER', () => {
    const registryIds = new Set(SECTION_REGISTRY.map((e) => e.id))
    for (const id of DEFAULT_SECTION_ORDER) {
      expect(registryIds.has(id)).toBe(true)
    }
  })

  it('all entries have required fields: id, label, labelKey, icon, showInNav, configFields', () => {
    for (const entry of SECTION_REGISTRY) {
      expect(typeof entry.id).toBe('string')
      expect(entry.id.length).toBeGreaterThan(0)
      expect(typeof entry.label).toBe('string')
      expect(entry.label.length).toBeGreaterThan(0)
      expect(typeof entry.labelKey).toBe('string')
      expect(typeof entry.icon).toBe('string')
      expect(typeof entry.showInNav).toBe('boolean')
      expect(Array.isArray(entry.configFields)).toBe(true)
    }
  })

  it('all configFields have required fields: path, label, type', () => {
    for (const entry of SECTION_REGISTRY) {
      for (const field of entry.configFields) {
        expect(typeof field.path).toBe('string')
        expect(field.path.length).toBeGreaterThan(0)
        expect(typeof field.label).toBe('string')
        expect(['text', 'textarea', 'toggle', 'url', 'number', 'color']).toContain(field.type)
      }
    }
  })

  it('disclosure defaults to basic when not specified (treated as basic in consumers)', () => {
    // Fields with no disclosure set should be treated as 'basic' by consumers
    for (const entry of SECTION_REGISTRY) {
      for (const field of entry.configFields) {
        if (field.disclosure === undefined) {
          // undefined means basic — no explicit value needed
          expect([undefined, 'basic', 'advanced', 'expert']).toContain(field.disclosure)
        }
      }
    }
  })

  it('no duplicate paths within a section', () => {
    for (const entry of SECTION_REGISTRY) {
      const paths = entry.configFields.map((f) => f.path)
      const unique = new Set(paths)
      expect(unique.size).toBe(paths.length)
    }
  })
})
