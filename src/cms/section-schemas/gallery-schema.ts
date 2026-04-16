/**
 * Gallery Section Schema
 *
 * Defines the admin-editable fields for the photo gallery section.
 */

import { registerAdminSection } from '@/lib/admin-schema-registry'
import type { AdminSectionSchema } from '@/lib/admin-section-schema'

interface GallerySectionData {
  images: string[]
}

const gallerySectionSchema: AdminSectionSchema<GallerySectionData> = {
  sectionId: 'gallery',
  group: 'media',
  label: 'Gallery',
  icon: 'Images',
  description: 'Photo gallery section. Manage the image grid displayed on the page.',
  supportsPreview: false,
  fields: [
    {
      key: 'images',
      type: 'array',
      label: 'Gallery Images',
      tooltip: 'Images displayed in the photo gallery. Add, remove, or reorder images here.',
      required: true,
      group: 'Images',
      arrayItemSchema: [
        {
          key: 'url',
          type: 'image',
          label: 'Image URL',
          placeholder: 'https://...',
          required: true,
          tooltip: 'Direct URL to the image. Use square or landscape images for best results.',
        },
      ],
    },
  ],
  fieldGroups: [
    { id: 'Images', label: 'Gallery Images', defaultExpanded: true },
  ],
  getDefaultData: () => ({
    images: [],
  }),
}

registerAdminSection(gallerySectionSchema)

export { gallerySectionSchema }
