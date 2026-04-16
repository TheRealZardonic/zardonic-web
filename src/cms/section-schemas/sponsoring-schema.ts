/**
 * Sponsoring Section Schema
 *
 * Defines the admin-editable fields for the sponsoring/endorsements section.
 * Sponsors are displayed as a grid of logos with optional links.
 */

import { registerAdminSection } from '@/lib/admin-schema-registry'
import type { AdminSectionSchema } from '@/lib/admin-section-schema'

interface SponsoringSectionData {
  sponsors: Array<{
    src: string
    alt: string
    caption: string
    url: string
  }>
  sectionLabel: string
  sectionPrefix: string
  headingVisible: boolean
}

const sponsoringSectionSchema: AdminSectionSchema<SponsoringSectionData> = {
  sectionId: 'sponsoring',
  group: 'configuration',
  label: 'Sponsoring',
  icon: 'Star',
  description: 'The sponsoring and endorsements section. Manage sponsor logos and links.',
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
      key: 'sectionLabel',
      type: 'text',
      label: 'Section Heading',
      tooltip: 'Heading displayed at the top of the sponsoring section.',
      placeholder: 'Sponsoring',
      group: 'Display',
      disclosure: 'advanced',
      validation: { maxLength: 100 },
    },
    {
      key: 'sectionPrefix',
      type: 'text',
      label: 'Section Prefix',
      tooltip: 'Small decorative prefix label shown above the heading (e.g. "// SPONSORS").',
      placeholder: '// SPONSORS',
      group: 'Display',
      disclosure: 'advanced',
      validation: { maxLength: 50 },
    },
    {
      key: 'sponsors',
      type: 'array',
      label: 'Sponsors',
      tooltip: 'Sponsor logos displayed in the section.',
      group: 'Sponsors',
      arrayItemSchema: [
        {
          key: 'src',
          type: 'image',
          label: 'Logo URL',
          placeholder: 'https://...',
          required: true,
          tooltip: 'URL of the sponsor logo image (transparent PNG or SVG recommended).',
        },
        {
          key: 'alt',
          type: 'text',
          label: 'Alt Text',
          placeholder: 'Sponsor name',
          required: true,
          tooltip: 'Alt text for the logo image (accessibility + SEO).',
          validation: { maxLength: 100 },
        },
        {
          key: 'caption',
          type: 'text',
          label: 'Caption',
          placeholder: 'Optional caption',
          validation: { maxLength: 100 },
        },
        {
          key: 'url',
          type: 'url',
          label: 'Website URL',
          placeholder: 'https://...',
          tooltip: 'Link opened when the sponsor logo is clicked.',
        },
      ],
    },
  ],
  fieldGroups: [
    { id: 'Sponsors', label: 'Sponsors', defaultExpanded: true },
    { id: 'Display', label: 'Display Options', defaultExpanded: false },
  ],
  getDefaultData: () => ({
    sponsors: [],
    sectionLabel: 'Sponsoring',
    sectionPrefix: '// SPONSORS',
    headingVisible: true,
  }),
}

registerAdminSection(sponsoringSectionSchema)

export { sponsoringSectionSchema }
