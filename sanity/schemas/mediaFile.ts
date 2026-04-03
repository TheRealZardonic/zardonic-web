/**
 * Sanity Schema: Media File
 *
 * Media library item (audio, video, download) with metadata.
 */
import { defineType, defineField } from 'sanity'

export default defineType({
  name: 'mediaFile',
  title: 'Media File',
  type: 'document',
  icon: () => '🎵',
  fields: [
    defineField({
      name: 'name',
      title: 'Name',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'file',
      title: 'File',
      type: 'file',
    }),
    defineField({
      name: 'url',
      title: 'External URL',
      type: 'url',
      description: 'External URL (YouTube, Google Drive, etc.). Used if no file is uploaded.',
    }),
    defineField({
      name: 'folder',
      title: 'Folder',
      type: 'string',
      description: 'Organize files into folders',
    }),
    defineField({
      name: 'mediaType',
      title: 'Media Type',
      type: 'string',
      options: {
        list: [
          { title: 'Audio', value: 'audio' },
          { title: 'YouTube', value: 'youtube' },
          { title: 'Download', value: 'download' },
        ],
      },
      initialValue: 'audio',
    }),
    defineField({
      name: 'description',
      title: 'Description',
      type: 'text',
      rows: 2,
    }),
    defineField({
      name: 'sortOrder',
      title: 'Sort Order',
      type: 'number',
      initialValue: 0,
    }),
  ],
  orderings: [
    {
      title: 'Sort Order',
      name: 'sortOrderAsc',
      by: [{ field: 'sortOrder', direction: 'asc' }],
    },
  ],
  preview: {
    select: {
      title: 'name',
      subtitle: 'mediaType',
    },
  },
})
