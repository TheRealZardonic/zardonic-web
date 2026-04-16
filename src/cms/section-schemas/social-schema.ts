/**
 * Social / Connect Section Schema
 *
 * Defines the admin-editable fields for the social links / connect section.
 * Maps to the `connect` sectionId in SECTION_REGISTRY.
 */

import { registerAdminSection } from '@/lib/admin-schema-registry'
import type { AdminSectionSchema } from '@/lib/admin-section-schema'

interface SocialSectionData {
  instagram: string
  facebook: string
  spotify: string
  youtube: string
  soundcloud: string
  bandcamp: string
  tiktok: string
  appleMusic: string
  twitter: string
  twitch: string
  beatport: string
  linktree: string
  merch: string
}

const socialSectionSchema: AdminSectionSchema<SocialSectionData> = {
  sectionId: 'connect',
  group: 'content',
  label: 'Social / Connect',
  icon: 'ShareNetwork',
  description: 'Social media links and platform profiles displayed in the Connect section.',
  supportsPreview: false,
  fields: [
    {
      key: 'spotify',
      type: 'url',
      label: 'Spotify',
      tooltip: 'Your Spotify artist profile URL.',
      placeholder: 'https://open.spotify.com/artist/...',
      group: 'Streaming',
      validation: {
        pattern: '^(https?://|$)',
        patternMessage: 'Must be a valid URL starting with https://',
      },
    },
    {
      key: 'appleMusic',
      type: 'url',
      label: 'Apple Music',
      tooltip: 'Your Apple Music artist page URL.',
      placeholder: 'https://music.apple.com/...',
      group: 'Streaming',
      validation: {
        pattern: '^(https?://|$)',
        patternMessage: 'Must be a valid URL starting with https://',
      },
    },
    {
      key: 'soundcloud',
      type: 'url',
      label: 'SoundCloud',
      tooltip: 'Your SoundCloud profile URL.',
      placeholder: 'https://soundcloud.com/...',
      group: 'Streaming',
      validation: {
        pattern: '^(https?://|$)',
        patternMessage: 'Must be a valid URL starting with https://',
      },
    },
    {
      key: 'bandcamp',
      type: 'url',
      label: 'Bandcamp',
      tooltip: 'Your Bandcamp artist page URL.',
      placeholder: 'https://yourlabel.bandcamp.com',
      group: 'Streaming',
      validation: {
        pattern: '^(https?://|$)',
        patternMessage: 'Must be a valid URL starting with https://',
      },
    },
    {
      key: 'beatport',
      type: 'url',
      label: 'Beatport',
      tooltip: 'Your Beatport artist page URL.',
      placeholder: 'https://www.beatport.com/artist/...',
      group: 'Streaming',
      validation: {
        pattern: '^(https?://|$)',
        patternMessage: 'Must be a valid URL starting with https://',
      },
    },
    {
      key: 'instagram',
      type: 'url',
      label: 'Instagram',
      tooltip: 'Your Instagram profile URL.',
      placeholder: 'https://www.instagram.com/...',
      group: 'Social Media',
      validation: {
        pattern: '^(https?://|$)',
        patternMessage: 'Must be a valid URL starting with https://',
      },
    },
    {
      key: 'facebook',
      type: 'url',
      label: 'Facebook',
      tooltip: 'Your Facebook artist page URL.',
      placeholder: 'https://www.facebook.com/...',
      group: 'Social Media',
      validation: {
        pattern: '^(https?://|$)',
        patternMessage: 'Must be a valid URL starting with https://',
      },
    },
    {
      key: 'twitter',
      type: 'url',
      label: 'Twitter / X',
      tooltip: 'Your Twitter / X profile URL.',
      placeholder: 'https://twitter.com/...',
      group: 'Social Media',
      validation: {
        pattern: '^(https?://|$)',
        patternMessage: 'Must be a valid URL starting with https://',
      },
    },
    {
      key: 'youtube',
      type: 'url',
      label: 'YouTube',
      tooltip: 'Your YouTube channel URL.',
      placeholder: 'https://www.youtube.com/...',
      group: 'Social Media',
      validation: {
        pattern: '^(https?://|$)',
        patternMessage: 'Must be a valid URL starting with https://',
      },
    },
    {
      key: 'tiktok',
      type: 'url',
      label: 'TikTok',
      tooltip: 'Your TikTok profile URL.',
      placeholder: 'https://www.tiktok.com/@...',
      group: 'Social Media',
      validation: {
        pattern: '^(https?://|$)',
        patternMessage: 'Must be a valid URL starting with https://',
      },
    },
    {
      key: 'twitch',
      type: 'url',
      label: 'Twitch',
      tooltip: 'Your Twitch channel URL.',
      placeholder: 'https://www.twitch.tv/...',
      group: 'Social Media',
      validation: {
        pattern: '^(https?://|$)',
        patternMessage: 'Must be a valid URL starting with https://',
      },
    },
    {
      key: 'linktree',
      type: 'url',
      label: 'Linktree',
      tooltip: 'Your Linktree URL, aggregating all your social links.',
      placeholder: 'https://linktr.ee/...',
      group: 'Other',
      validation: {
        pattern: '^(https?://|$)',
        patternMessage: 'Must be a valid URL starting with https://',
      },
    },
    {
      key: 'merch',
      type: 'url',
      label: 'Merch Store',
      tooltip: 'URL to your online merchandise store.',
      placeholder: 'https://...',
      group: 'Other',
      validation: {
        pattern: '^(https?://|$)',
        patternMessage: 'Must be a valid URL starting with https://',
      },
    },
  ],
  fieldGroups: [
    { id: 'Streaming', label: 'Streaming Platforms', defaultExpanded: true },
    { id: 'Social Media', label: 'Social Media', defaultExpanded: true },
    { id: 'Other', label: 'Other Links', defaultExpanded: false },
  ],
  getDefaultData: () => ({
    instagram: '',
    facebook: '',
    spotify: '',
    youtube: '',
    soundcloud: '',
    bandcamp: '',
    tiktok: '',
    appleMusic: '',
    twitter: '',
    twitch: '',
    beatport: '',
    linktree: '',
    merch: '',
  }),
}

registerAdminSection(socialSectionSchema)

export { socialSectionSchema }
