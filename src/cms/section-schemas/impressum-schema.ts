/**
 * Impressum / Legal Section Schema
 *
 * Defines the admin-editable fields for the Impressum (legal notice) overlay.
 * Required by German law (TMG) for websites with commercial intent.
 */

import { registerAdminSection } from '@/lib/admin-schema-registry'
import type { AdminSectionSchema } from '@/lib/admin-section-schema'

interface ImpressumSectionData {
  name: string
  careOf: string
  street: string
  zipCity: string
  phone: string
  email: string
  responsibleName: string
  responsibleAddress: string
  nameEn: string
  careOfEn: string
  streetEn: string
  zipCityEn: string
  responsibleNameEn: string
  responsibleAddressEn: string
}

const impressumSectionSchema: AdminSectionSchema<ImpressumSectionData> = {
  sectionId: 'impressum',
  group: 'legal',
  label: 'Impressum / Legal',
  icon: 'Scales',
  description: 'Legal notice (Impressum) shown in the footer overlay. Required by German law (TMG §5).',
  supportsPreview: false,
  fields: [
    {
      key: 'name',
      type: 'text',
      label: 'Legal Name (DE)',
      tooltip: 'Full legal name of the responsible person or organisation (German).',
      placeholder: 'Max Mustermann',
      required: true,
      group: 'German',
      validation: { minLength: 1, maxLength: 200 },
    },
    {
      key: 'careOf',
      type: 'text',
      label: 'c/o (DE)',
      tooltip: 'Optional "care of" name for the address (German).',
      placeholder: 'c/o Organisation GmbH',
      group: 'German',
      validation: { maxLength: 200 },
    },
    {
      key: 'street',
      type: 'text',
      label: 'Street Address (DE)',
      tooltip: 'Street name and house number (German address).',
      placeholder: 'Musterstraße 1',
      group: 'German',
      validation: { maxLength: 200 },
    },
    {
      key: 'zipCity',
      type: 'text',
      label: 'ZIP + City (DE)',
      tooltip: 'Postal code and city name (German address).',
      placeholder: '12345 Berlin',
      group: 'German',
      validation: { maxLength: 100 },
    },
    {
      key: 'phone',
      type: 'text',
      label: 'Phone',
      tooltip: 'Phone number for the legal notice. Shared between DE and EN versions.',
      placeholder: '+49 123 456789',
      group: 'German',
      validation: { maxLength: 50 },
    },
    {
      key: 'email',
      type: 'text',
      label: 'Email',
      tooltip: 'Contact email displayed in the legal notice.',
      placeholder: 'info@zardonic.com',
      group: 'German',
      validation: {
        maxLength: 200,
        pattern: '^([^@\\s]+@[^@\\s]+\\.[^@\\s]+|$)',
        patternMessage: 'Must be a valid email address or empty.',
      },
    },
    {
      key: 'responsibleName',
      type: 'text',
      label: 'Responsible Person Name (DE)',
      tooltip: 'Name of the person responsible for content (§ 55 Abs. 2 RStV), German.',
      placeholder: 'Max Mustermann',
      group: 'German',
      disclosure: 'advanced',
      validation: { maxLength: 200 },
    },
    {
      key: 'responsibleAddress',
      type: 'textarea',
      label: 'Responsible Person Address (DE)',
      tooltip: 'Address of the person responsible for content (German).',
      placeholder: 'Musterstraße 1, 12345 Berlin',
      group: 'German',
      disclosure: 'advanced',
      validation: { maxLength: 500 },
    },
    {
      key: 'nameEn',
      type: 'text',
      label: 'Legal Name (EN)',
      tooltip: 'Full legal name for the English version of the Impressum.',
      placeholder: 'John Doe',
      group: 'English',
      disclosure: 'advanced',
      validation: { maxLength: 200 },
    },
    {
      key: 'careOfEn',
      type: 'text',
      label: 'c/o (EN)',
      tooltip: 'Optional "care of" name for the English address.',
      placeholder: 'c/o Organisation Ltd',
      group: 'English',
      disclosure: 'advanced',
      validation: { maxLength: 200 },
    },
    {
      key: 'streetEn',
      type: 'text',
      label: 'Street Address (EN)',
      tooltip: 'Street name and house number (English address).',
      placeholder: '1 Example Street',
      group: 'English',
      disclosure: 'advanced',
      validation: { maxLength: 200 },
    },
    {
      key: 'zipCityEn',
      type: 'text',
      label: 'ZIP + City (EN)',
      tooltip: 'Postal code and city name (English address).',
      placeholder: '12345 Berlin',
      group: 'English',
      disclosure: 'advanced',
      validation: { maxLength: 100 },
    },
    {
      key: 'responsibleNameEn',
      type: 'text',
      label: 'Responsible Person Name (EN)',
      tooltip: 'Name of the person responsible for content (English version).',
      placeholder: 'John Doe',
      group: 'English',
      disclosure: 'advanced',
      validation: { maxLength: 200 },
    },
    {
      key: 'responsibleAddressEn',
      type: 'textarea',
      label: 'Responsible Person Address (EN)',
      tooltip: 'Address of the person responsible for content (English version).',
      placeholder: '1 Example Street, 12345 Berlin',
      group: 'English',
      disclosure: 'advanced',
      validation: { maxLength: 500 },
    },
  ],
  fieldGroups: [
    { id: 'German', label: 'German (DE)', defaultExpanded: true },
    { id: 'English', label: 'English (EN)', defaultExpanded: false },
  ],
  getDefaultData: () => ({
    name: '',
    careOf: '',
    street: '',
    zipCity: '',
    phone: '',
    email: '',
    responsibleName: '',
    responsibleAddress: '',
    nameEn: '',
    careOfEn: '',
    streetEn: '',
    zipCityEn: '',
    responsibleNameEn: '',
    responsibleAddressEn: '',
  }),
  validate: (data) => {
    const errors: Record<string, string> = {}
    if (!data.name.trim()) {
      errors['name'] = 'Legal name is required for the Impressum.'
    }
    return errors
  },
}

registerAdminSection(impressumSectionSchema)

export { impressumSectionSchema }
