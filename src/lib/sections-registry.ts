import type { DisclosureLevel, SectionLabels } from '@/lib/types'

export type { DisclosureLevel }

export interface SectionConfigField {
  /** Dot-notation path within AdminSettings or SiteData, e.g. 'labels.biography' or 'siteData.bio' */
  path: string
  label: string
  type: 'text' | 'textarea' | 'toggle' | 'url' | 'number' | 'color'
  placeholder?: string
  /** Which disclosure level is needed to see this field. Default: 'basic' */
  disclosure?: DisclosureLevel
  /** When true, writes to SiteData instead of AdminSettings */
  targetSiteData?: boolean
}

export interface SectionRegistryEntry {
  id: string
  label: string
  /** Key in AdminSettings.labels for the section heading */
  labelKey: keyof SectionLabels
  /** Icon name from @phosphor-icons/react */
  icon: string
  /** Show this section in the navigation bar */
  showInNav: boolean
  /** Config fields shown in the admin panel for this section */
  configFields: SectionConfigField[]
}

export const SECTION_REGISTRY: SectionRegistryEntry[] = [
  {
    id: 'bio',
    label: 'Biography',
    labelKey: 'biography',
    icon: 'FileText',
    showInNav: true,
    configFields: [
      { path: 'labels.biography', label: 'Section Heading', type: 'text', placeholder: 'BIOGRAPHY', disclosure: 'basic' },
      { path: 'siteData.bio', label: 'Bio Text', type: 'textarea', disclosure: 'basic', targetSiteData: true },
      { path: 'labels.headingPrefix', label: 'Heading Prefix', type: 'text', placeholder: '//', disclosure: 'advanced' },
      { path: 'labels.bioReadMoreText', label: 'Read More Button Text', type: 'text', placeholder: 'Read More', disclosure: 'advanced' },
      { path: 'labels.bioShowLessText', label: 'Show Less Button Text', type: 'text', placeholder: 'Show Less', disclosure: 'advanced' },
      { path: 'sections.styleOverrides.bio.bodyFontSize', label: 'Body Font Size', type: 'text', placeholder: 'text-lg', disclosure: 'expert' },
      { path: 'sections.styleOverrides.bio.readMoreMaxHeight', label: 'Read More Max Height', type: 'text', placeholder: '17.5rem', disclosure: 'expert' },
    ],
  },
  {
    id: 'shell',
    label: 'Shell (Member)',
    labelKey: 'shell',
    icon: 'User',
    showInNav: false,
    configFields: [
      { path: 'labels.shell', label: 'Section Heading', type: 'text', placeholder: 'SHELL', disclosure: 'basic' },
      { path: 'shell.name', label: 'Member Name', type: 'text', disclosure: 'basic' },
      { path: 'shell.role', label: 'Member Role', type: 'text', disclosure: 'basic' },
      { path: 'shell.bio', label: 'Member Bio', type: 'textarea', disclosure: 'basic' },
    ],
  },
  {
    id: 'creditHighlights',
    label: 'Credit Highlights',
    labelKey: 'creditHighlights',
    icon: 'Star',
    showInNav: false,
    configFields: [
      { path: 'labels.creditHighlights', label: 'Section Heading', type: 'text', placeholder: 'CREDITS', disclosure: 'basic' },
      { path: 'labels.creditHighlightsPrefix', label: 'Heading Prefix', type: 'text', placeholder: '//', disclosure: 'advanced' },
      { path: 'labels.creditHighlightsHeadingVisible', label: 'Show Heading', type: 'toggle', disclosure: 'advanced' },
    ],
  },
  {
    id: 'music',
    label: 'Music Player',
    labelKey: 'musicPlayer',
    icon: 'MusicNote',
    showInNav: true,
    configFields: [
      { path: 'labels.musicPlayer', label: 'Section Heading', type: 'text', placeholder: 'MUSIC', disclosure: 'basic' },
      { path: 'labels.musicStreamLabel', label: 'Stream Label', type: 'text', disclosure: 'advanced' },
      { path: 'labels.musicStatusLabel', label: 'Status Label', type: 'text', disclosure: 'advanced' },
    ],
  },
  {
    id: 'gigs',
    label: 'Upcoming Gigs',
    labelKey: 'upcomingGigs',
    icon: 'CalendarBlank',
    showInNav: true,
    configFields: [
      { path: 'labels.upcomingGigs', label: 'Section Heading', type: 'text', placeholder: 'UPCOMING GIGS', disclosure: 'basic' },
      { path: 'labels.gigsNoShowsText', label: 'No Shows Text', type: 'text', disclosure: 'advanced' },
      { path: 'labels.gigsLoadingLabel', label: 'Loading Label', type: 'text', disclosure: 'advanced' },
      { path: 'labels.gigsFetchingText', label: 'Fetching Text', type: 'text', disclosure: 'expert' },
      { path: 'labels.gigsSyncingText', label: 'Syncing Text', type: 'text', disclosure: 'expert' },
    ],
  },
  {
    id: 'releases',
    label: 'Releases',
    labelKey: 'releases',
    icon: 'Vinyl',
    showInNav: true,
    configFields: [
      { path: 'labels.releases', label: 'Section Heading', type: 'text', placeholder: 'RELEASES', disclosure: 'basic' },
      { path: 'labels.releaseShowType', label: 'Show Release Type Badge', type: 'toggle', disclosure: 'basic' },
      { path: 'labels.releaseShowYear', label: 'Show Release Year', type: 'toggle', disclosure: 'basic' },
      { path: 'labels.releaseShowDescription', label: 'Show Description', type: 'toggle', disclosure: 'basic' },
      { path: 'labels.releaseShowTracks', label: 'Show Tracklist', type: 'toggle', disclosure: 'basic' },
      { path: 'labels.releaseStreamLabel', label: 'Stream Label', type: 'text', disclosure: 'advanced' },
      { path: 'labels.releaseInfoLabel', label: 'Info Label', type: 'text', disclosure: 'advanced' },
      { path: 'labels.releaseTracksLabel', label: 'Tracklist Label', type: 'text', disclosure: 'advanced' },
      { path: 'labels.releaseStatusLabel', label: 'Status Label', type: 'text', disclosure: 'advanced' },
      { path: 'labels.releasesEmptyText', label: 'Empty State Text', type: 'text', disclosure: 'advanced' },
      { path: 'labels.releasesFetchingText', label: 'Fetching Text', type: 'text', disclosure: 'expert' },
      { path: 'labels.releasesSyncingText', label: 'Syncing Text', type: 'text', disclosure: 'expert' },
    ],
  },
  {
    id: 'gallery',
    label: 'Gallery',
    labelKey: 'gallery',
    icon: 'Images',
    showInNav: true,
    configFields: [
      { path: 'labels.gallery', label: 'Section Heading', type: 'text', placeholder: 'GALLERY', disclosure: 'basic' },
    ],
  },
  {
    id: 'media',
    label: 'Media',
    labelKey: 'media',
    icon: 'FilmSlate',
    showInNav: false,
    configFields: [
      { path: 'labels.media', label: 'Section Heading', type: 'text', placeholder: 'MEDIA', disclosure: 'basic' },
    ],
  },
  {
    id: 'connect',
    label: 'Connect / Social',
    labelKey: 'connect',
    icon: 'Share',
    showInNav: true,
    configFields: [
      { path: 'labels.connect', label: 'Section Heading', type: 'text', placeholder: 'CONNECT', disclosure: 'basic' },
      { path: 'siteData.social.instagram', label: 'Instagram', type: 'url', placeholder: 'https://instagram.com/...', disclosure: 'basic', targetSiteData: true },
      { path: 'siteData.social.facebook', label: 'Facebook', type: 'url', placeholder: 'https://facebook.com/...', disclosure: 'basic', targetSiteData: true },
      { path: 'siteData.social.spotify', label: 'Spotify', type: 'url', placeholder: 'https://open.spotify.com/...', disclosure: 'basic', targetSiteData: true },
      { path: 'siteData.social.youtube', label: 'YouTube', type: 'url', placeholder: 'https://youtube.com/...', disclosure: 'basic', targetSiteData: true },
      { path: 'siteData.social.soundcloud', label: 'SoundCloud', type: 'url', disclosure: 'basic', targetSiteData: true },
      { path: 'siteData.social.bandcamp', label: 'Bandcamp', type: 'url', disclosure: 'basic', targetSiteData: true },
      { path: 'siteData.social.tiktok', label: 'TikTok', type: 'url', disclosure: 'advanced', targetSiteData: true },
      { path: 'siteData.social.appleMusic', label: 'Apple Music', type: 'url', disclosure: 'advanced', targetSiteData: true },
      { path: 'siteData.social.twitter', label: 'Twitter / X', type: 'url', disclosure: 'advanced', targetSiteData: true },
      { path: 'siteData.social.twitch', label: 'Twitch', type: 'url', disclosure: 'advanced', targetSiteData: true },
      { path: 'siteData.social.beatport', label: 'Beatport', type: 'url', disclosure: 'advanced', targetSiteData: true },
      { path: 'siteData.social.linktree', label: 'Linktree', type: 'url', disclosure: 'advanced', targetSiteData: true },
    ],
  },
  {
    id: 'contact',
    label: 'Contact Form',
    labelKey: 'contact',
    icon: 'Envelope',
    showInNav: false,
    configFields: [
      { path: 'labels.contact', label: 'Section Heading', type: 'text', placeholder: 'CONTACT', disclosure: 'basic' },
      { path: 'contact.formTitle', label: 'Form Title', type: 'text', placeholder: 'GET IN TOUCH', disclosure: 'basic' },
      { path: 'contact.formButtonText', label: 'Submit Button Text', type: 'text', disclosure: 'basic' },
      { path: 'contact.successMessage', label: 'Success Message', type: 'text', disclosure: 'basic' },
      { path: 'contact.emailForwardTo', label: 'Forward Emails To', type: 'text', disclosure: 'basic' },
      { path: 'contact.managementName', label: 'Management Name', type: 'text', disclosure: 'advanced' },
      { path: 'contact.managementEmail', label: 'Management Email', type: 'url', disclosure: 'advanced' },
      { path: 'contact.bookingEmail', label: 'Booking Email', type: 'url', disclosure: 'advanced' },
      { path: 'contact.pressEmail', label: 'Press Email', type: 'url', disclosure: 'advanced' },
    ],
  },
  {
    id: 'sponsoring',
    label: 'Sponsoring',
    labelKey: 'sponsoring',
    icon: 'Handshake',
    showInNav: false,
    configFields: [
      { path: 'labels.sponsoring', label: 'Section Heading', type: 'text', placeholder: 'SPONSORING', disclosure: 'basic' },
      { path: 'labels.sponsoringPrefix', label: 'Heading Prefix', type: 'text', disclosure: 'advanced' },
      { path: 'labels.sponsoringHeadingVisible', label: 'Show Heading', type: 'toggle', disclosure: 'advanced' },
    ],
  },
]
