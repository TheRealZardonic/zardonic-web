/**
 * Media Section Schema
 *
 * Defines the admin-editable fields for AppMediaSection:
 * the media/downloads section with audio files, YouTube embeds, and downloadable assets.
 */

import { registerAdminSection } from '@/lib/admin-schema-registry'
import type { AdminSectionSchema } from '@/lib/admin-section-schema'

interface MediaSectionData {
  files: Array<{
    id: string
    name: string
    type: 'audio' | 'youtube' | 'download'
    url: string
    size: string
  }>
}

const mediaSectionSchema: AdminSectionSchema<MediaSectionData> = {
  sectionId: 'media',
  group: 'media',
  label: 'Media',
  icon: 'Video',
  description: 'The media section. Manage audio files, YouTube embeds, and downloadable assets.',
  supportsPreview: false,
  fields: [
    {
      key: 'files',
      type: 'array',
      label: 'Media Files',
      tooltip: 'The list of media items displayed in this section.',
      group: 'Files',
      arrayItemSchema: [
        {
          key: 'name',
          type: 'text',
          label: 'Name',
          placeholder: 'Track or file name',
          required: true,
          validation: { minLength: 1, maxLength: 200 },
        },
        {
          key: 'type',
          type: 'select',
          label: 'Type',
          required: true,
          options: [
            { label: 'Audio File', value: 'audio' },
            { label: 'YouTube Video', value: 'youtube' },
            { label: 'Download', value: 'download' },
          ],
          tooltip: 'Determines how this media item is rendered: streamed inline, embedded, or offered as a download.',
        },
        {
          key: 'url',
          type: 'url',
          label: 'URL',
          placeholder: 'https://...',
          required: true,
          tooltip: 'Direct URL for audio/downloads or YouTube video URL.',
        },
        {
          key: 'size',
          type: 'text',
          label: 'Size / Duration',
          placeholder: '4:32 or 12 MB',
          tooltip: 'Human-readable size or duration shown next to the file name.',
          validation: { maxLength: 30 },
        },
      ],
    },
  ],
  fieldGroups: [
    { id: 'Files', label: 'Media Files', defaultExpanded: true },
  ],
  getDefaultData: () => ({
    files: [],
  }),
}

registerAdminSection(mediaSectionSchema)

export { mediaSectionSchema }
