/**
 * Tests for the Phase 1 Admin Schema Foundation Layer:
 *   - AdminSectionSchema type system (src/lib/admin-section-schema.ts)
 *   - AdminSchemaRegistry (src/lib/admin-schema-registry.ts)
 *   - All section schema definitions (src/cms/section-schemas/)
 *   - Bridge: adminSchemaId in SECTION_REGISTRY (src/lib/sections-registry.ts)
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  registerAdminSection,
  getSections,
  getSection,
  hasSection,
  _clearRegistryForTesting,
} from '@/lib/admin-schema-registry'
import type { AdminSectionSchema, AdminFieldDefinition } from '@/lib/admin-section-schema'
import { SECTION_REGISTRY } from '@/lib/sections-registry'

// ─── Registry API ─────────────────────────────────────────────────────────────

describe('AdminSchemaRegistry', () => {
  beforeEach(() => {
    _clearRegistryForTesting()
  })

  it('starts empty after clearing', () => {
    expect(getSections()).toHaveLength(0)
  })

  it('registers a schema and retrieves it by id', () => {
    const schema: AdminSectionSchema = {
      sectionId: 'test-section',
      label: 'Test Section',
      icon: 'Star',
      description: 'A test section.',
      fields: [],
      supportsPreview: false,
      getDefaultData: () => ({}),
    }
    registerAdminSection(schema)
    expect(hasSection('test-section')).toBe(true)
    expect(getSection('test-section')).toBe(schema)
  })

  it('getSections() returns sections in registration order', () => {
    const a: AdminSectionSchema = { sectionId: 'a', label: 'A', icon: 'A', description: '', fields: [], supportsPreview: false, getDefaultData: () => ({}) }
    const b: AdminSectionSchema = { sectionId: 'b', label: 'B', icon: 'B', description: '', fields: [], supportsPreview: false, getDefaultData: () => ({}) }
    const c: AdminSectionSchema = { sectionId: 'c', label: 'C', icon: 'C', description: '', fields: [], supportsPreview: false, getDefaultData: () => ({}) }
    registerAdminSection(a)
    registerAdminSection(b)
    registerAdminSection(c)
    const ids = getSections().map(s => s.sectionId)
    expect(ids).toEqual(['a', 'b', 'c'])
  })

  it('getSection() returns undefined for unknown id', () => {
    expect(getSection('nonexistent')).toBeUndefined()
  })

  it('hasSection() returns false for unknown id', () => {
    expect(hasSection('nonexistent')).toBe(false)
  })

  it('duplicate registration is silently skipped in test environment', () => {
    const schema: AdminSectionSchema = {
      sectionId: 'dup',
      label: 'Dup',
      icon: 'X',
      description: '',
      fields: [],
      supportsPreview: false,
      getDefaultData: () => ({}),
    }
    // Should not throw in test environment
    expect(() => {
      registerAdminSection(schema)
      registerAdminSection(schema)
    }).not.toThrow()
    // Only one entry registered
    expect(getSections().filter(s => s.sectionId === 'dup')).toHaveLength(1)
  })
})

// ─── Section Schema barrel (section-schemas/index.ts) ────────────────────────

describe('Section Schemas barrel', () => {
  beforeEach(() => {
    _clearRegistryForTesting()
    // Re-import the barrel to trigger registrations into the now-cleared registry.
    // Since the modules cache their own exports after first import, we re-register
    // by directly calling the individual registerAdminSection calls via the schemas.
  })

  it('all 15 schemas can be imported from the barrel without errors', async () => {
    // This import triggers all registerAdminSection() side-effects.
    const barrel = await import('@/cms/section-schemas')
    const exportedKeys = Object.keys(barrel)
    expect(exportedKeys.length).toBeGreaterThanOrEqual(15)
  })
})

// ─── Individual schema shape ──────────────────────────────────────────────────

async function loadAllSchemas() {
  const {
    heroSectionSchema,
    bioSectionSchema,
    musicSectionSchema,
    releasesSectionSchema,
    gigsSectionSchema,
    mediaSectionSchema,
    socialSectionSchema,
    contactSectionSchema,
    gallerySectionSchema,
    partnersSectionSchema,
    sponsoringSectionSchema,
    creditHighlightsSectionSchema,
    shellSectionSchema,
    footerSectionSchema,
    impressumSectionSchema,
  } = await import('@/cms/section-schemas')

  return [
    heroSectionSchema,
    bioSectionSchema,
    musicSectionSchema,
    releasesSectionSchema,
    gigsSectionSchema,
    mediaSectionSchema,
    socialSectionSchema,
    contactSectionSchema,
    gallerySectionSchema,
    partnersSectionSchema,
    sponsoringSectionSchema,
    creditHighlightsSectionSchema,
    shellSectionSchema,
    footerSectionSchema,
    impressumSectionSchema,
  ]
}

const VALID_FIELD_TYPES = [
  'text', 'textarea', 'richtext', 'number', 'boolean', 'select',
  'date', 'color', 'image', 'url', 'array', 'object',
] as const

const VALID_DISCLOSURES = ['basic', 'advanced', 'expert', undefined] as const

function validateField(fieldDef: AdminFieldDefinition, sectionId: string): void {
  expect(typeof fieldDef.key, `${sectionId}: field.key must be string`).toBe('string')
  expect(fieldDef.key.length, `${sectionId}: field.key must be non-empty`).toBeGreaterThan(0)
  expect(typeof fieldDef.label, `${sectionId}: field.label must be string`).toBe('string')
  expect(fieldDef.label.length, `${sectionId}: field.label must be non-empty`).toBeGreaterThan(0)
  expect(VALID_FIELD_TYPES, `${sectionId}: field.type "${fieldDef.type}" must be a valid AdminFieldType`).toContain(fieldDef.type)
  expect(VALID_DISCLOSURES, `${sectionId}: field.disclosure must be valid`).toContain(fieldDef.disclosure)

  if (fieldDef.type === 'select') {
    expect(Array.isArray(fieldDef.options), `${sectionId}: select field "${fieldDef.key}" must have options`).toBe(true)
    expect((fieldDef.options ?? []).length, `${sectionId}: select field "${fieldDef.key}" must have at least one option`).toBeGreaterThan(0)
  }

  if (fieldDef.type === 'array') {
    expect(Array.isArray(fieldDef.arrayItemSchema), `${sectionId}: array field "${fieldDef.key}" must have arrayItemSchema`).toBe(true)
  }

  if (fieldDef.type === 'object') {
    expect(Array.isArray(fieldDef.objectSchema), `${sectionId}: object field "${fieldDef.key}" must have objectSchema`).toBe(true)
  }
}

describe('Section schema shape invariants', () => {
  it('all schemas have required top-level fields', async () => {
    const schemas = await loadAllSchemas()
    for (const schema of schemas) {
      expect(typeof schema.sectionId, `${schema.sectionId}: sectionId must be string`).toBe('string')
      expect(schema.sectionId.length, `sectionId must be non-empty`).toBeGreaterThan(0)
      expect(typeof schema.label, `${schema.sectionId}: label must be string`).toBe('string')
      expect(schema.label.length, `${schema.sectionId}: label must be non-empty`).toBeGreaterThan(0)
      expect(typeof schema.icon, `${schema.sectionId}: icon must be string`).toBe('string')
      expect(typeof schema.description, `${schema.sectionId}: description must be string`).toBe('string')
      expect(Array.isArray(schema.fields), `${schema.sectionId}: fields must be array`).toBe(true)
      expect(typeof schema.supportsPreview, `${schema.sectionId}: supportsPreview must be boolean`).toBe('boolean')
      expect(typeof schema.getDefaultData, `${schema.sectionId}: getDefaultData must be function`).toBe('function')
    }
  })

  it('all schemas have 15 unique sectionIds', async () => {
    const schemas = await loadAllSchemas()
    const ids = schemas.map(s => s.sectionId)
    const unique = new Set(ids)
    expect(unique.size).toBe(ids.length)
    expect(ids).toHaveLength(15)
  })

  it('getDefaultData() returns an object (non-null)', async () => {
    const schemas = await loadAllSchemas()
    for (const schema of schemas) {
      const defaults = schema.getDefaultData()
      expect(defaults, `${schema.sectionId}: getDefaultData must return object`).not.toBeNull()
      expect(typeof defaults, `${schema.sectionId}: getDefaultData must return object`).toBe('object')
    }
  })

  it('all field definitions have valid type and label', async () => {
    const schemas = await loadAllSchemas()
    for (const schema of schemas) {
      for (const field of schema.fields) {
        validateField(field, schema.sectionId)
      }
    }
  })

  it('all fieldGroups have id and label', async () => {
    const schemas = await loadAllSchemas()
    for (const schema of schemas) {
      if (!schema.fieldGroups) continue
      for (const group of schema.fieldGroups) {
        expect(typeof group.id, `${schema.sectionId}: group.id must be string`).toBe('string')
        expect(group.id.length, `${schema.sectionId}: group.id must be non-empty`).toBeGreaterThan(0)
        expect(typeof group.label, `${schema.sectionId}: group.label must be string`).toBe('string')
        expect(group.label.length, `${schema.sectionId}: group.label must be non-empty`).toBeGreaterThan(0)
      }
    }
  })

  it('select field options have label and value', async () => {
    const schemas = await loadAllSchemas()
    for (const schema of schemas) {
      for (const field of schema.fields) {
        if (field.type === 'select') {
          for (const opt of field.options ?? []) {
            expect(typeof opt.label, `${schema.sectionId}: option.label must be string`).toBe('string')
            expect(typeof opt.value, `${schema.sectionId}: option.value must be string`).toBe('string')
          }
        }
      }
    }
  })

  it('validate() returns object (not throws) for default data', async () => {
    const schemas = await loadAllSchemas()
    for (const schema of schemas) {
      if (!schema.validate) continue
      const defaults = schema.getDefaultData()
      const errors = schema.validate(defaults as never)
      expect(typeof errors, `${schema.sectionId}: validate() must return object`).toBe('object')
    }
  })
})

// ─── sections-registry.ts bridge ─────────────────────────────────────────────

describe('SECTION_REGISTRY adminSchemaId bridge', () => {
  it('all sections have an adminSchemaId property (string or undefined)', () => {
    for (const entry of SECTION_REGISTRY) {
      expect(
        entry.adminSchemaId === undefined || typeof entry.adminSchemaId === 'string',
        `SECTION_REGISTRY entry "${entry.id}" adminSchemaId must be string or undefined`,
      ).toBe(true)
    }
  })

  it('known sections have adminSchemaId set', () => {
    const EXPECTED_SCHEMA_IDS: Record<string, string> = {
      hero: 'hero',
      bio: 'bio',
      music: 'music',
      releases: 'releases',
      gigs: 'gigs',
      media: 'media',
      connect: 'connect',
      contact: 'contact',
      gallery: 'gallery',
      sponsoring: 'sponsoring',
      creditHighlights: 'creditHighlights',
      shell: 'shell',
    }

    for (const [sectionId, expectedSchemaId] of Object.entries(EXPECTED_SCHEMA_IDS)) {
      const entry = SECTION_REGISTRY.find(e => e.id === sectionId)
      expect(entry, `Section "${sectionId}" should exist in SECTION_REGISTRY`).toBeDefined()
      expect(entry?.adminSchemaId, `Section "${sectionId}" should have adminSchemaId "${expectedSchemaId}"`).toBe(expectedSchemaId)
    }
  })
})

// ─── AdminSectionSchema validation helper ─────────────────────────────────────

describe('AdminSectionSchema validate function (impressum)', () => {
  it('returns error when name is empty', async () => {
    const { impressumSectionSchema } = await import('@/cms/section-schemas')
    expect(impressumSectionSchema.validate).toBeDefined()
    const errors = impressumSectionSchema.validate!({
      name: '',
      careOf: '', street: '', zipCity: '', phone: '', email: '',
      responsibleName: '', responsibleAddress: '',
      nameEn: '', careOfEn: '', streetEn: '', zipCityEn: '',
      responsibleNameEn: '', responsibleAddressEn: '',
    })
    expect(errors['name']).toBeTruthy()
  })

  it('returns no errors when name is provided', async () => {
    const { impressumSectionSchema } = await import('@/cms/section-schemas')
    const errors = impressumSectionSchema.validate!({
      name: 'Max Mustermann',
      careOf: '', street: '', zipCity: '', phone: '', email: '',
      responsibleName: '', responsibleAddress: '',
      nameEn: '', careOfEn: '', streetEn: '', zipCityEn: '',
      responsibleNameEn: '', responsibleAddressEn: '',
    })
    expect(Object.keys(errors)).toHaveLength(0)
  })
})

// ─── AdminSectionSchema group field ──────────────────────────────────────────

describe('AdminSectionSchema group field', () => {
  it('all registered sections have a valid group or undefined group', async () => {
    // Import the barrel to register all schemas
    await import('@/cms/section-schemas')
    const { getSections } = await import('@/lib/admin-schema-registry')
    const validGroups = ['content', 'media', 'configuration', 'legal', undefined]
    for (const section of getSections()) {
      expect(
        validGroups.includes(section.group),
        `Section "${section.sectionId}" has invalid group "${String(section.group)}"`,
      ).toBe(true)
    }
  })

  it('all 15 schemas have a group set', async () => {
    const schemas = await loadAllSchemas()
    for (const schema of schemas) {
      expect(
        schema.group,
        `Section "${schema.sectionId}" is missing the group field`,
      ).toBeDefined()
    }
  })
})
