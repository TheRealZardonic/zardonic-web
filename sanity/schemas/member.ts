/**
 * Sanity Schema: Member
 *
 * Band member or shell member with photo, bio, role, and social links.
 */
import { defineType, defineField } from 'sanity'

export default defineType({
  name: 'member',
  title: 'Member',
  type: 'document',
  icon: () => '👤',
  fields: [
    defineField({
      name: 'name',
      title: 'Name',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: { source: 'name', maxLength: 96 },
    }),
    defineField({
      name: 'photo',
      title: 'Photo',
      type: 'image',
      options: { hotspot: true },
    }),
    defineField({
      name: 'role',
      title: 'Role',
      type: 'string',
    }),
    defineField({
      name: 'bio',
      title: 'Biography',
      type: 'text',
      rows: 4,
    }),
    defineField({
      name: 'subjectLabel',
      title: 'Subject Label',
      type: 'string',
      description: 'Custom label for the profile overlay (e.g. "SUBJECT")',
    }),
    defineField({
      name: 'statusLabel',
      title: 'Status Label',
      type: 'string',
      description: 'Custom status label (e.g. "STATUS")',
    }),
    defineField({
      name: 'statusValue',
      title: 'Status Value',
      type: 'string',
      description: 'Custom status value (e.g. "ACTIVE")',
    }),
    defineField({
      name: 'social',
      title: 'Social Links',
      type: 'object',
      fields: [
        defineField({ name: 'instagram', title: 'Instagram', type: 'url' }),
        defineField({ name: 'facebook', title: 'Facebook', type: 'url' }),
        defineField({ name: 'spotify', title: 'Spotify', type: 'url' }),
        defineField({ name: 'soundcloud', title: 'SoundCloud', type: 'url' }),
        defineField({ name: 'youtube', title: 'YouTube', type: 'url' }),
        defineField({ name: 'website', title: 'Website', type: 'url' }),
        defineField({ name: 'bandcamp', title: 'Bandcamp', type: 'url' }),
        defineField({ name: 'tiktok', title: 'TikTok', type: 'url' }),
        defineField({ name: 'appleMusic', title: 'Apple Music', type: 'url' }),
      ],
    }),
    defineField({
      name: 'isShellMember',
      title: 'Shell Section Member',
      type: 'boolean',
      description: 'Show in the Shell section (member slots)',
      initialValue: false,
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
      subtitle: 'role',
      media: 'photo',
    },
  },
})
