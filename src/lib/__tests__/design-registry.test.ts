import { describe, it, expect } from 'vitest'
import { DESIGN_REGISTRY } from '../sections-registry'

const ALL_FIELD_TYPES = ['text', 'textarea', 'toggle', 'url', 'number', 'color', 'select', 'slider', 'image'] as const

describe('DESIGN_REGISTRY', () => {
  it('has exactly 3 entries: layout, navigation, footer', () => {
    const ids = DESIGN_REGISTRY.map((e) => e.id)
    expect(ids).toEqual(['layout', 'navigation', 'footer'])
  })

  it('all entries have required fields: id, label, icon, configFields', () => {
    for (const entry of DESIGN_REGISTRY) {
      expect(typeof entry.id).toBe('string')
      expect(entry.id.length).toBeGreaterThan(0)
      expect(typeof entry.label).toBe('string')
      expect(entry.label.length).toBeGreaterThan(0)
      expect(typeof entry.icon).toBe('string')
      expect(entry.icon.length).toBeGreaterThan(0)
      expect(Array.isArray(entry.configFields)).toBe(true)
      expect(entry.configFields.length).toBeGreaterThan(0)
    }
  })

  it('all configFields have required fields: path, label, type', () => {
    for (const entry of DESIGN_REGISTRY) {
      for (const field of entry.configFields) {
        expect(typeof field.path).toBe('string')
        expect(field.path.length).toBeGreaterThan(0)
        expect(typeof field.label).toBe('string')
        expect(ALL_FIELD_TYPES).toContain(field.type)
      }
    }
  })

  it('all paths start with design.layout, design.navigation, or design.footer', () => {
    for (const entry of DESIGN_REGISTRY) {
      for (const field of entry.configFields) {
        expect(field.path.startsWith('design.')).toBe(true)
      }
    }
  })

  it('no duplicate paths within a group', () => {
    for (const entry of DESIGN_REGISTRY) {
      const paths = entry.configFields.map((f) => f.path)
      const unique = new Set(paths)
      expect(unique.size).toBe(paths.length)
    }
  })

  it('every group has at least one basic field', () => {
    for (const entry of DESIGN_REGISTRY) {
      const basicFields = entry.configFields.filter((f) => (f.disclosure ?? 'basic') === 'basic')
      expect(basicFields.length).toBeGreaterThan(0)
    }
  })

  it('slider fields have min, max, and step values', () => {
    for (const entry of DESIGN_REGISTRY) {
      for (const field of entry.configFields) {
        if (field.type === 'slider') {
          expect(typeof field.min).toBe('number')
          expect(typeof field.max).toBe('number')
          expect(typeof field.step).toBe('number')
          expect((field.min ?? 0)).toBeLessThan((field.max ?? 1))
        }
      }
    }
  })

  it('layout group has sectionPaddingY as basic field', () => {
    const layout = DESIGN_REGISTRY.find((e) => e.id === 'layout')
    expect(layout).toBeDefined()
    const paddingY = layout?.configFields.find((f) => f.path === 'design.layout.sectionPaddingY')
    expect(paddingY).toBeDefined()
    expect(paddingY?.type).toBe('text')
    expect(paddingY?.disclosure ?? 'basic').toBe('basic')
  })

  it('layout group has sectionPaddingX, containerMaxWidth, containerMaxWidthWide as advanced', () => {
    const layout = DESIGN_REGISTRY.find((e) => e.id === 'layout')
    expect(layout).toBeDefined()
    const advancedPaths = [
      'design.layout.sectionPaddingX',
      'design.layout.containerMaxWidth',
      'design.layout.containerMaxWidthWide',
    ]
    for (const p of advancedPaths) {
      const field = layout?.configFields.find((f) => f.path === p)
      expect(field).toBeDefined()
      expect(field?.disclosure).toBe('advanced')
    }
  })

  it('navigation group has backgroundOpacity slider and backdropBlur toggle as basic', () => {
    const nav = DESIGN_REGISTRY.find((e) => e.id === 'navigation')
    expect(nav).toBeDefined()
    const opacity = nav?.configFields.find((f) => f.path === 'design.navigation.backgroundOpacity')
    expect(opacity?.type).toBe('slider')
    expect(opacity?.disclosure ?? 'basic').toBe('basic')
    expect(opacity?.min).toBe(0)
    expect(opacity?.max).toBe(100)
    const blur = nav?.configFields.find((f) => f.path === 'design.navigation.backdropBlur')
    expect(blur?.type).toBe('toggle')
    expect(blur?.disclosure ?? 'basic').toBe('basic')
    expect(blur?.defaultValue).toBe(true)
  })

  it('navigation group has logoHeight, itemGap, height as advanced', () => {
    const nav = DESIGN_REGISTRY.find((e) => e.id === 'navigation')
    const advancedPaths = [
      'design.navigation.logoHeight',
      'design.navigation.itemGap',
      'design.navigation.height',
    ]
    for (const p of advancedPaths) {
      const field = nav?.configFields.find((f) => f.path === p)
      expect(field).toBeDefined()
      expect(field?.disclosure).toBe('advanced')
    }
  })

  it('footer group has paddingY as basic and paddingX, textColor, linkColor as advanced', () => {
    const footer = DESIGN_REGISTRY.find((e) => e.id === 'footer')
    expect(footer).toBeDefined()
    const paddingY = footer?.configFields.find((f) => f.path === 'design.footer.paddingY')
    expect(paddingY?.disclosure ?? 'basic').toBe('basic')
    const advancedPaths = [
      'design.footer.paddingX',
      'design.footer.textColor',
      'design.footer.linkColor',
    ]
    for (const p of advancedPaths) {
      const field = footer?.configFields.find((f) => f.path === p)
      expect(field).toBeDefined()
      expect(field?.disclosure).toBe('advanced')
    }
  })

  it('footer textColor and linkColor are color type fields', () => {
    const footer = DESIGN_REGISTRY.find((e) => e.id === 'footer')
    expect(footer?.configFields.find((f) => f.path === 'design.footer.textColor')?.type).toBe('color')
    expect(footer?.configFields.find((f) => f.path === 'design.footer.linkColor')?.type).toBe('color')
  })
})
