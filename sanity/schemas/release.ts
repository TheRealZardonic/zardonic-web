/**
 * Sanity Schema: Release
 *
 * Music release (album, single, EP, remix, compilation)
 * with artwork, track listing, and streaming platform links.
 */
import { defineType, defineField } from 'sanity'

export default defineType({
  name: 'release',
  title: 'Release',
  type: 'document',
  icon: () => '💿',
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: { source: 'title', maxLength: 96 },
    }),
    defineField({
      name: 'artwork',
      title: 'Artwork',
      type: 'image',
      options: { hotspot: true },
    }),
    defineField({
      name: 'artworkUrl',
      title: 'Artwork URL (external)',
      type: 'url',
      description: 'External artwork URL (e.g. from iTunes). Used as fallback if no Sanity image is uploaded.',
    }),
    defineField({
      name: 'releaseDate',
      title: 'Release Date',
      type: 'date',
    }),
    defineField({
      name: 'year',
      title: 'Year',
      type: 'string',
    }),
    defineField({
      name: 'featured',
      title: 'Featured',
      type: 'boolean',
      initialValue: false,
    }),
    defineField({
      name: 'releaseType',
      title: 'Release Type',
      type: 'string',
      options: {
        list: [
          { title: 'Album', value: 'album' },
          { title: 'EP', value: 'ep' },
          { title: 'Single', value: 'single' },
          { title: 'Remix', value: 'remix' },
          { title: 'Compilation', value: 'compilation' },
        ],
      },
    }),
    defineField({
      name: 'description',
      title: 'Description',
      type: 'text',
    }),
    defineField({
      name: 'tracks',
      title: 'Tracks',
      type: 'array',
      of: [
        {
          type: 'object',
          fields: [
            defineField({ name: 'title', title: 'Title', type: 'string', validation: (rule) => rule.required() }),
            defineField({ name: 'duration', title: 'Duration', type: 'string' }),
          ],
          preview: {
            select: { title: 'title', subtitle: 'duration' },
          },
        },
      ],
    }),
    defineField({
      name: 'streamingLinks',
      title: 'Streaming Links',
      type: 'object',
      fields: [
        defineField({ name: 'spotify', title: 'Spotify', type: 'url' }),
        defineField({ name: 'soundcloud', title: 'SoundCloud', type: 'url' }),
        defineField({ name: 'bandcamp', title: 'Bandcamp', type: 'url' }),
        defineField({ name: 'youtube', title: 'YouTube', type: 'url' }),
        defineField({ name: 'appleMusic', title: 'Apple Music', type: 'url' }),
        defineField({ name: 'beatport', title: 'Beatport', type: 'url' }),
        defineField({ name: 'deezer', title: 'Deezer', type: 'url' }),
        defineField({ name: 'tidal', title: 'Tidal', type: 'url' }),
        defineField({ name: 'amazonMusic', title: 'Amazon Music', type: 'url' }),
      ],
    }),
    defineField({
      name: 'itunesId',
      title: 'iTunes Collection ID',
      type: 'string',
      description: 'Auto-populated by iTunes sync. Used to prevent duplicate imports.',
      readOnly: true,
    }),
    defineField({
      name: 'source',
      title: 'Source',
      type: 'string',
      options: {
        list: [
          { title: 'Manual', value: 'manual' },
          { title: 'iTunes Sync', value: 'itunes' },
        ],
      },
      initialValue: 'manual',
      readOnly: true,
    }),
  ],
  orderings: [
    {
      title: 'Release Date (Newest)',
      name: 'releaseDateDesc',
      by: [{ field: 'releaseDate', direction: 'desc' }],
    },
  ],
  preview: {
    select: {
      title: 'title',
      subtitle: 'releaseType',
      media: 'artwork',
    },
  },
})
