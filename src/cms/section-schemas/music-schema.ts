/**
 * Music Section Schema
 *
 * Defines the admin-editable fields for AppMusicSection:
 * the audio player section with track list and streaming links.
 */

import { registerAdminSection } from '@/lib/admin-schema-registry'
import type { AdminSectionSchema } from '@/lib/admin-section-schema'

interface MusicSectionData {
  tracks: Array<{
    id: string
    title: string
    artist: string
    url: string
    artwork: string
  }>
  streamLabel: string
  statusLabel: string
}

const musicSectionSchema: AdminSectionSchema<MusicSectionData> = {
  sectionId: 'music',
  group: 'content',
  label: 'Music Player',
  icon: 'MusicNote',
  description: 'The audio player section. Manage the track list and player display labels.',
  supportsPreview: false,
  fields: [
    {
      key: 'tracks',
      type: 'array',
      label: 'Tracks',
      tooltip: 'Audio tracks displayed and playable in the music player section.',
      required: true,
      group: 'Tracks',
      arrayItemSchema: [
        {
          key: 'title',
          type: 'text',
          label: 'Track Title',
          placeholder: 'My Track',
          required: true,
          validation: { minLength: 1, maxLength: 200 },
        },
        {
          key: 'artist',
          type: 'text',
          label: 'Artist',
          placeholder: 'ZARDONIC',
          required: true,
          validation: { maxLength: 200 },
        },
        {
          key: 'url',
          type: 'url',
          label: 'Audio URL',
          placeholder: 'https://...',
          required: true,
          tooltip: 'Direct URL to the audio file (MP3, OGG, etc.) or a streaming embed URL.',
        },
        {
          key: 'artwork',
          type: 'image',
          label: 'Artwork URL',
          placeholder: 'https://...',
          tooltip: 'Square album art displayed in the player (recommended: 500×500).',
        },
      ],
    },
    {
      key: 'streamLabel',
      type: 'text',
      label: 'Stream Label',
      tooltip: 'Decorative label shown near the player (e.g. "// AUDIO.STREAM").',
      placeholder: '// AUDIO.STREAM',
      group: 'Display',
      disclosure: 'advanced',
      validation: { maxLength: 50 },
    },
    {
      key: 'statusLabel',
      type: 'text',
      label: 'Status Label',
      tooltip: 'Decorative status text shown in the music section HUD.',
      placeholder: 'PLAYING',
      group: 'Display',
      disclosure: 'advanced',
      validation: { maxLength: 50 },
    },
  ],
  fieldGroups: [
    { id: 'Tracks', label: 'Tracks', defaultExpanded: true },
    { id: 'Display', label: 'Display Labels', defaultExpanded: false },
  ],
  getDefaultData: () => ({
    tracks: [],
    streamLabel: '// AUDIO.STREAM',
    statusLabel: 'PLAYING',
  }),
}

registerAdminSection(musicSectionSchema)

export { musicSectionSchema }
