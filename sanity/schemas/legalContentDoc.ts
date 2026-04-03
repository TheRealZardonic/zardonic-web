/**
 * Sanity Schema: Legal Content (Singleton)
 *
 * Impressum and Datenschutz (privacy policy) with bilingual support.
 */
import { defineType, defineField } from 'sanity'

export default defineType({
  name: 'legalContent',
  title: 'Legal Content',
  type: 'document',
  icon: () => '⚖️',
  fields: [
    // Impressum
    defineField({
      name: 'impressum',
      title: 'Impressum',
      type: 'object',
      fields: [
        defineField({ name: 'name', title: 'Name', type: 'string' }),
        defineField({ name: 'careOf', title: 'c/o', type: 'string' }),
        defineField({ name: 'street', title: 'Street', type: 'string' }),
        defineField({ name: 'zipCity', title: 'ZIP + City', type: 'string' }),
        defineField({ name: 'phone', title: 'Phone', type: 'string' }),
        defineField({ name: 'email', title: 'Email', type: 'string' }),
        defineField({ name: 'responsibleName', title: 'Responsible Person', type: 'string' }),
        defineField({ name: 'responsibleAddress', title: 'Responsible Address', type: 'string' }),
        // English translations
        defineField({ name: 'nameEn', title: 'Name (EN)', type: 'string' }),
        defineField({ name: 'careOfEn', title: 'c/o (EN)', type: 'string' }),
        defineField({ name: 'streetEn', title: 'Street (EN)', type: 'string' }),
        defineField({ name: 'zipCityEn', title: 'ZIP + City (EN)', type: 'string' }),
        defineField({ name: 'responsibleNameEn', title: 'Responsible Person (EN)', type: 'string' }),
        defineField({ name: 'responsibleAddressEn', title: 'Responsible Address (EN)', type: 'string' }),
      ],
    }),
    // Datenschutz
    defineField({
      name: 'datenschutz',
      title: 'Datenschutz (Privacy)',
      type: 'object',
      fields: [
        defineField({ name: 'customText', title: 'Custom Text (DE)', type: 'text', rows: 15 }),
        defineField({ name: 'customTextEn', title: 'Custom Text (EN)', type: 'text', rows: 15 }),
      ],
    }),
  ],
  preview: {
    prepare() {
      return { title: 'Legal Content' }
    },
  },
})
