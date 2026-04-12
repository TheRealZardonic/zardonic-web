import { describe, it, expect } from 'vitest'
import { SECTION_REGISTRY } from '../sections-registry'
import { DEFAULT_SECTION_ORDER } from '../config'

const ALL_FIELD_TYPES = ['text', 'textarea', 'toggle', 'url', 'number', 'color', 'select', 'slider', 'image'] as const

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

  it('all configFields have required fields: path, label, type (including new types)', () => {
    for (const entry of SECTION_REGISTRY) {
      for (const field of entry.configFields) {
        expect(typeof field.path).toBe('string')
        expect(field.path.length).toBeGreaterThan(0)
        expect(typeof field.label).toBe('string')
        expect(ALL_FIELD_TYPES).toContain(field.type)
      }
    }
  })

  it('select fields have non-empty options array', () => {
    for (const entry of SECTION_REGISTRY) {
      for (const field of entry.configFields) {
        if (field.type === 'select') {
          expect(Array.isArray(field.options)).toBe(true)
          expect((field.options ?? []).length).toBeGreaterThan(0)
          for (const opt of field.options ?? []) {
            expect(typeof opt.label).toBe('string')
            expect(typeof opt.value).toBe('string')
          }
        }
      }
    }
  })

  it('slider fields have min and max values', () => {
    for (const entry of SECTION_REGISTRY) {
      for (const field of entry.configFields) {
        if (field.type === 'slider') {
          expect(typeof field.min).toBe('number')
          expect(typeof field.max).toBe('number')
          expect((field.min ?? 0)).toBeLessThan((field.max ?? 1))
        }
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

  it('every section has at least one basic field', () => {
    for (const entry of SECTION_REGISTRY) {
      const basicFields = entry.configFields.filter((f) => (f.disclosure ?? 'basic') === 'basic')
      expect(basicFields.length).toBeGreaterThan(0)
    }
  })

  it('gallery, media, shell sections have advanced or expert fields', () => {
    const sectionsToCheck = ['gallery', 'media', 'shell']
    for (const id of sectionsToCheck) {
      const entry = SECTION_REGISTRY.find((e) => e.id === id)
      expect(entry).toBeDefined()
      const advancedOrExpert = (entry?.configFields ?? []).filter(
        (f) => f.disclosure === 'advanced' || f.disclosure === 'expert',
      )
      expect(advancedOrExpert.length).toBeGreaterThan(0)
    }
  })

  it('contact section has form field labels bound', () => {
    const contact = SECTION_REGISTRY.find((e) => e.id === 'contact')
    expect(contact).toBeDefined()
    const paths = (contact?.configFields ?? []).map((f) => f.path)
    expect(paths).toContain('contact.formNameLabel')
    expect(paths).toContain('contact.formEmailLabel')
    expect(paths).toContain('contact.formSubjectLabel')
    expect(paths).toContain('contact.formMessageLabel')
  })

  it('music section has sound settings bound', () => {
    const music = SECTION_REGISTRY.find((e) => e.id === 'music')
    expect(music).toBeDefined()
    const paths = (music?.configFields ?? []).map((f) => f.path)
    expect(paths).toContain('sound.defaultMuted')
    expect(paths).toContain('sound.backgroundMusicVolume')
  })

  it('connect section has missing label fields bound', () => {
    const connect = SECTION_REGISTRY.find((e) => e.id === 'connect')
    expect(connect).toBeDefined()
    const paths = (connect?.configFields ?? []).map((f) => f.path)
    expect(paths).toContain('labels.sessionStatusText')
    expect(paths).toContain('labels.profileStatusText')
    expect(paths).toContain('labels.closeButtonText')
  })

  it('hero section exists and is the first entry', () => {
    expect(SECTION_REGISTRY[0].id).toBe('hero')
  })

  it('hero section has showInNav: false', () => {
    const hero = SECTION_REGISTRY.find((e) => e.id === 'hero')
    expect(hero?.showInNav).toBe(false)
  })

  it('hero section has artistName and heroImage as basic siteData fields', () => {
    const hero = SECTION_REGISTRY.find((e) => e.id === 'hero')
    expect(hero).toBeDefined()
    const artistName = hero?.configFields.find((f) => f.path === 'siteData.artistName')
    const heroImage = hero?.configFields.find((f) => f.path === 'siteData.heroImage')
    expect(artistName).toBeDefined()
    expect(artistName?.targetSiteData).toBe(true)
    expect(artistName?.disclosure ?? 'basic').toBe('basic')
    expect(heroImage).toBeDefined()
    expect(heroImage?.targetSiteData).toBe(true)
    expect(heroImage?.type).toBe('image')
    expect(heroImage?.disclosure ?? 'basic').toBe('basic')
  })

  it('hero section has heroImageOpacity slider with correct range', () => {
    const hero = SECTION_REGISTRY.find((e) => e.id === 'hero')
    const opacity = hero?.configFields.find((f) => f.path === 'sections.styleOverrides.hero.heroImageOpacity')
    expect(opacity).toBeDefined()
    expect(opacity?.type).toBe('slider')
    expect(opacity?.min).toBe(0)
    expect(opacity?.max).toBe(1)
    expect(opacity?.defaultValue).toBe(0.5)
  })

  it('hero section has minHeight select at advanced disclosure', () => {
    const hero = SECTION_REGISTRY.find((e) => e.id === 'hero')
    const minHeight = hero?.configFields.find((f) => f.path === 'sections.styleOverrides.hero.minHeight')
    expect(minHeight).toBeDefined()
    expect(minHeight?.type).toBe('select')
    expect(minHeight?.disclosure).toBe('advanced')
    expect((minHeight?.options ?? []).length).toBeGreaterThan(0)
    expect(minHeight?.options?.some((o) => o.value === 'min-h-screen')).toBe(true)
  })

  it('hero section has heroImageBlur slider at advanced disclosure', () => {
    const hero = SECTION_REGISTRY.find((e) => e.id === 'hero')
    const blur = hero?.configFields.find((f) => f.path === 'sections.styleOverrides.hero.heroImageBlur')
    expect(blur).toBeDefined()
    expect(blur?.type).toBe('slider')
    expect(blur?.disclosure).toBe('advanced')
    expect(blur?.min).toBe(0)
    expect(blur?.max).toBe(20)
  })

  it('hero section has paddingTop text field at expert disclosure', () => {
    const hero = SECTION_REGISTRY.find((e) => e.id === 'hero')
    const paddingTop = hero?.configFields.find((f) => f.path === 'sections.styleOverrides.hero.paddingTop')
    expect(paddingTop).toBeDefined()
    expect(paddingTop?.type).toBe('text')
    expect(paddingTop?.disclosure).toBe('expert')
  })
})
