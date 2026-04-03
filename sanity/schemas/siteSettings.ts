/**
 * Sanity Schema: Site Settings (Singleton)
 *
 * Master document for global artist/site configuration:
 * artistName, heroImage, bio, social links, sound settings.
 */
import { defineType, defineField } from 'sanity'

export default defineType({
  name: 'siteSettings',
  title: 'Site Settings',
  type: 'document',
  icon: () => '⚙️',
  fields: [
    defineField({
      name: 'artistName',
      title: 'Artist Name',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'heroImage',
      title: 'Hero Image',
      type: 'image',
      options: { hotspot: true },
    }),
    defineField({
      name: 'bio',
      title: 'Biography',
      type: 'text',
      rows: 6,
    }),
    defineField({
      name: 'founded',
      title: 'Founded Year',
      type: 'string',
    }),
    defineField({
      name: 'achievements',
      title: 'Achievements',
      type: 'array',
      of: [{ type: 'string' }],
    }),
    defineField({
      name: 'collabs',
      title: 'Collaborations',
      type: 'array',
      of: [{ type: 'string' }],
    }),
    defineField({
      name: 'social',
      title: 'Social Links',
      type: 'object',
      fields: [
        defineField({ name: 'instagram', title: 'Instagram', type: 'url' }),
        defineField({ name: 'facebook', title: 'Facebook', type: 'url' }),
        defineField({ name: 'spotify', title: 'Spotify', type: 'url' }),
        defineField({ name: 'youtube', title: 'YouTube', type: 'url' }),
        defineField({ name: 'soundcloud', title: 'SoundCloud', type: 'url' }),
        defineField({ name: 'bandcamp', title: 'Bandcamp', type: 'url' }),
        defineField({ name: 'tiktok', title: 'TikTok', type: 'url' }),
        defineField({ name: 'appleMusic', title: 'Apple Music', type: 'url' }),
        defineField({ name: 'twitter', title: 'Twitter / X', type: 'url' }),
        defineField({ name: 'twitch', title: 'Twitch', type: 'url' }),
        defineField({ name: 'beatport', title: 'Beatport', type: 'url' }),
        defineField({ name: 'linktree', title: 'Linktree', type: 'url' }),
      ],
    }),
    defineField({
      name: 'soundSettings',
      title: 'Sound Settings',
      type: 'object',
      fields: [
        defineField({ name: 'defaultMuted', title: 'Default Muted', type: 'boolean', initialValue: true }),
        defineField({ name: 'backgroundMusic', title: 'Background Music URL', type: 'url' }),
        defineField({ name: 'backgroundMusicVolume', title: 'Background Music Volume', type: 'number', validation: (rule) => rule.min(0).max(1) }),
        defineField({ name: 'terminalSound', title: 'Terminal Sound URL', type: 'url' }),
        defineField({ name: 'typingSound', title: 'Typing Sound URL', type: 'url' }),
        defineField({ name: 'buttonSound', title: 'Button Sound URL', type: 'url' }),
        defineField({ name: 'loadingFinishedSound', title: 'Loading Finished Sound URL', type: 'url' }),
      ],
    }),
    defineField({
      name: 'faviconUrl',
      title: 'Favicon URL',
      type: 'url',
    }),
  ],
  preview: {
    select: { title: 'artistName' },
  },
})
