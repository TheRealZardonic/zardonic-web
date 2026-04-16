/**
 * Partners & Friends Section Schema
 *
 * Defines the admin-editable fields for the partners/collaborators section.
 * Maps to the section ID used in SECTION_REGISTRY for partner listings.
 */

import { registerAdminSection } from '@/lib/admin-schema-registry'
import type { AdminSectionSchema } from '@/lib/admin-section-schema'

interface PartnersSectionData {
  friends: Array<{
    id: string
    name: string
    photo: string
    description: string
    url: string
  }>
  sectionLabel: string
}

const partnersSectionSchema: AdminSectionSchema<PartnersSectionData> = {
  sectionId: 'collabs',
  group: 'configuration',
  label: 'Partners & Friends',
  icon: 'UsersThree',
  description: 'The partners, collaborators, and friends section. Manage partner profiles and links.',
  supportsPreview: false,
  fields: [
    {
      key: 'sectionLabel',
      type: 'text',
      label: 'Section Heading',
      tooltip: 'Override the default section heading label.',
      placeholder: 'Partners & Friends',
      group: 'Display',
      disclosure: 'advanced',
      validation: { maxLength: 100 },
    },
    {
      key: 'friends',
      type: 'array',
      label: 'Partner Profiles',
      tooltip: 'The list of partner and friend profiles displayed in this section.',
      group: 'Profiles',
      arrayItemSchema: [
        {
          key: 'name',
          type: 'text',
          label: 'Name',
          placeholder: 'Noisia',
          required: true,
          validation: { minLength: 1, maxLength: 100 },
        },
        {
          key: 'photo',
          type: 'image',
          label: 'Photo URL',
          placeholder: 'https://...',
          tooltip: 'Profile photo or logo for this partner.',
        },
        {
          key: 'description',
          type: 'textarea',
          label: 'Description',
          placeholder: 'Short bio or description...',
          validation: { maxLength: 500 },
        },
        {
          key: 'url',
          type: 'url',
          label: 'Profile URL',
          placeholder: 'https://...',
          tooltip: 'Link to their website, social profile, or label page.',
        },
      ],
    },
  ],
  fieldGroups: [
    { id: 'Profiles', label: 'Partner Profiles', defaultExpanded: true },
    { id: 'Display', label: 'Display Options', defaultExpanded: false },
  ],
  getDefaultData: () => ({
    friends: [],
    sectionLabel: 'Partners & Friends',
  }),
}

registerAdminSection(partnersSectionSchema)

export { partnersSectionSchema }
