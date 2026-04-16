/**
 * Biography Section Schema
 *
 * Defines the admin-editable fields for AppBioSection:
 * the biography/story section with rich text, founded date, members, and photos.
 */

import { registerAdminSection } from '@/lib/admin-schema-registry'
import type { AdminSectionSchema } from '@/lib/admin-section-schema'

interface BioSectionData {
  story: string
  founded: string
  achievements: string[]
  photos: string[]
  textSize: string
  readMoreText: string
  showLessText: string
}

const bioSectionSchema: AdminSectionSchema<BioSectionData> = {
  sectionId: 'bio',
  group: 'content',
  label: 'Biography',
  icon: 'BookOpen',
  description: 'The biography and story section. Includes rich text narrative, founding date, achievements, and photo gallery.',
  supportsPreview: true,
  fields: [
    {
      key: 'story',
      type: 'richtext',
      label: 'Biography Text',
      tooltip: 'The main biography or story text displayed in the biography section. Supports rich formatting.',
      placeholder: 'Tell the story of the artist...',
      required: true,
      group: 'Content',
      validation: { minLength: 1, maxLength: 10000 },
    },
    {
      key: 'founded',
      type: 'text',
      label: 'Founded / Active Since',
      tooltip: 'Year or date the project started. Displayed as metadata below the bio text.',
      placeholder: '2005',
      group: 'Content',
      validation: { maxLength: 50 },
    },
    {
      key: 'achievements',
      type: 'array',
      label: 'Achievements',
      tooltip: 'Notable achievements, milestones, or credits listed in the biography section.',
      group: 'Content',
      disclosure: 'advanced',
      arrayItemSchema: [
        {
          key: 'achievement',
          type: 'text',
          label: 'Achievement',
          placeholder: 'Toured with Nine Inch Nails...',
          validation: { maxLength: 200 },
        },
      ],
    },
    {
      key: 'photos',
      type: 'array',
      label: 'Biography Photos',
      tooltip: 'Photos shown in the biography section alongside the text.',
      group: 'Media',
      disclosure: 'advanced',
      arrayItemSchema: [
        {
          key: 'url',
          type: 'image',
          label: 'Photo URL',
          placeholder: 'https://...',
        },
      ],
    },
    {
      key: 'textSize',
      type: 'select',
      label: 'Text Size',
      tooltip: 'Font size for the biography text.',
      group: 'Display',
      disclosure: 'advanced',
      defaultValue: 'text-base',
      options: [
        { label: 'Small (14px)', value: 'text-sm' },
        { label: 'Normal (16px)', value: 'text-base' },
        { label: 'Large (18px)', value: 'text-lg' },
        { label: 'XL (20px)', value: 'text-xl' },
        { label: '2XL (24px)', value: 'text-2xl' },
      ],
    },
    {
      key: 'readMoreText',
      type: 'text',
      label: '"Read More" Button Text',
      tooltip: 'Label for the expand button shown when the biography is truncated.',
      placeholder: 'Read More',
      group: 'Display',
      disclosure: 'advanced',
      defaultValue: 'Read More',
      validation: { maxLength: 50 },
    },
    {
      key: 'showLessText',
      type: 'text',
      label: '"Show Less" Button Text',
      tooltip: 'Label for the collapse button shown when the biography is expanded.',
      placeholder: 'Show Less',
      group: 'Display',
      disclosure: 'advanced',
      defaultValue: 'Show Less',
      validation: { maxLength: 50 },
    },
  ],
  fieldGroups: [
    { id: 'Content', label: 'Content', defaultExpanded: true },
    { id: 'Media', label: 'Media', defaultExpanded: false },
    { id: 'Display', label: 'Display Options', defaultExpanded: false },
  ],
  getDefaultData: () => ({
    story: '',
    founded: '',
    achievements: [],
    photos: [],
    textSize: 'text-base',
    readMoreText: 'Read More',
    showLessText: 'Show Less',
  }),
}

registerAdminSection(bioSectionSchema)

export { bioSectionSchema }
