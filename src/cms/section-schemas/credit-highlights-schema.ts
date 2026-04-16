/**
 * Credit Highlights Section Schema
 *
 * Defines the admin-editable fields for the credit highlights section.
 * Shows a grid of credit logos/images (labels, festival logos, notable credits).
 */

import { registerAdminSection } from '@/lib/admin-schema-registry'
import type { AdminSectionSchema } from '@/lib/admin-section-schema'

interface CreditHighlightsSectionData {
  credits: Array<{
    src: string
    alt: string
    caption: string
    url: string
  }>
  sectionPrefix: string
  headingVisible: boolean
}

const creditHighlightsSectionSchema: AdminSectionSchema<CreditHighlightsSectionData> = {
  sectionId: 'creditHighlights',
  group: 'configuration',
  label: 'Credit Highlights',
  icon: 'Trophy',
  description: 'Notable credits, labels, festivals, and achievements displayed as a logo grid.',
  supportsPreview: false,
  fields: [
    {
      key: 'headingVisible',
      type: 'boolean',
      label: 'Show Section Heading',
      tooltip: 'Toggle visibility of the section heading text.',
      group: 'Display',
      defaultValue: true,
    },
    {
      key: 'sectionPrefix',
      type: 'text',
      label: 'Section Prefix',
      tooltip: 'Small decorative prefix label displayed above the heading (e.g. "// CREDIT.HIGHLIGHTS").',
      placeholder: '// CREDIT.HIGHLIGHTS',
      group: 'Display',
      disclosure: 'advanced',
      validation: { maxLength: 50 },
    },
    {
      key: 'credits',
      type: 'array',
      label: 'Credit Images',
      tooltip: 'Logo or image entries shown in the credit highlights grid.',
      group: 'Credits',
      arrayItemSchema: [
        {
          key: 'src',
          type: 'image',
          label: 'Image URL',
          placeholder: 'https://...',
          required: true,
          tooltip: 'URL of the credit logo or image (transparent PNG or SVG recommended).',
        },
        {
          key: 'alt',
          type: 'text',
          label: 'Alt Text',
          placeholder: 'Label or festival name',
          required: true,
          tooltip: 'Descriptive alt text for the image (accessibility + SEO).',
          validation: { maxLength: 100 },
        },
        {
          key: 'caption',
          type: 'text',
          label: 'Caption',
          placeholder: 'Optional caption below the image',
          validation: { maxLength: 100 },
        },
        {
          key: 'url',
          type: 'url',
          label: 'Link URL',
          placeholder: 'https://...',
          tooltip: 'Optional URL opened when the credit image is clicked.',
        },
      ],
    },
  ],
  fieldGroups: [
    { id: 'Credits', label: 'Credit Images', defaultExpanded: true },
    { id: 'Display', label: 'Display Options', defaultExpanded: false },
  ],
  getDefaultData: () => ({
    credits: [],
    sectionPrefix: '// CREDIT.HIGHLIGHTS',
    headingVisible: true,
  }),
}

registerAdminSection(creditHighlightsSectionSchema)

export { creditHighlightsSectionSchema }
