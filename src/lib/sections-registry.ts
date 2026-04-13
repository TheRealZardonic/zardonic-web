import type { DisclosureLevel, SectionLabels } from '@/lib/types'

export type { DisclosureLevel }

export interface SelectOption {
  label: string
  value: string
}

export interface SectionConfigField {
  /** Dot-notation path within AdminSettings or SiteData, e.g. 'labels.biography' or 'siteData.bio' */
  path: string
  label: string
  type: 'text' | 'textarea' | 'toggle' | 'url' | 'number' | 'color' | 'select' | 'slider' | 'image'
  placeholder?: string
  /** Which disclosure level is needed to see this field. Default: 'basic' */
  disclosure?: DisclosureLevel
  /** When true, writes to SiteData instead of AdminSettings */
  targetSiteData?: boolean
  /** Options for 'select' type */
  options?: SelectOption[]
  /** Min value for 'slider' and 'number' types */
  min?: number
  /** Max value for 'slider' and 'number' types */
  max?: number
  /** Step value for 'slider' type */
  step?: number
  /** Optional help text shown below the label */
  description?: string
  /** Default value — when current value differs, a Reset button is shown */
  defaultValue?: unknown
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

const FONT_SIZE_OPTIONS: SelectOption[] = [
  { label: 'Small (14px)', value: 'text-sm' },
  { label: 'Normal (16px)', value: 'text-base' },
  { label: 'Large (18px)', value: 'text-lg' },
  { label: 'XL (20px)', value: 'text-xl' },
  { label: '2XL (24px)', value: 'text-2xl' },
]

export const SECTION_REGISTRY: SectionRegistryEntry[] = [
  {
    id: 'hero',
    label: 'Hero',
    labelKey: 'hero',
    icon: 'House',
    showInNav: false,
    configFields: [
      {
        path: 'siteData.artistName',
        label: 'Artist Name',
        type: 'text',
        placeholder: 'ZARDONIC',
        description: 'The artist or band name displayed in the hero section.',
        disclosure: 'basic',
        targetSiteData: true,
      },
      {
        path: 'siteData.heroImage',
        label: 'Background Image',
        type: 'image',
        placeholder: 'https://...',
        description: 'Full-bleed background image for the hero section (min. 1920×1080 recommended).',
        disclosure: 'basic',
        targetSiteData: true,
      },
      {
        path: 'sections.styleOverrides.hero.heroImageOpacity',
        label: 'Image Opacity',
        type: 'slider',
        min: 0,
        max: 1,
        step: 0.05,
        defaultValue: 0.5,
        description: 'Opacity of the hero background image (0 = transparent, 1 = fully visible).',
        disclosure: 'basic',
      },
      {
        path: 'sections.styleOverrides.hero.minHeight',
        label: 'Minimum Height',
        type: 'select',
        options: [
          { label: 'Full screen (100vh)', value: 'min-h-screen' },
          { label: '80% viewport', value: 'min-h-[80vh]' },
          { label: '60% viewport', value: 'min-h-[60vh]' },
          { label: '50% viewport', value: 'min-h-[50vh]' },
        ],
        defaultValue: 'min-h-screen',
        description: 'Minimum height of the hero section.',
        disclosure: 'advanced',
      },
      {
        path: 'sections.styleOverrides.hero.heroImageBlur',
        label: 'Image Blur',
        type: 'slider',
        min: 0,
        max: 20,
        step: 1,
        defaultValue: 0,
        description: 'Blur radius applied to the hero background image (px).',
        disclosure: 'advanced',
      },
      {
        path: 'sections.styleOverrides.hero.paddingTop',
        label: 'Padding Top',
        type: 'text',
        placeholder: '5rem',
        description: 'CSS padding-top applied to the hero content area.',
        disclosure: 'expert',
      },
    ],
  },
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
      {
        path: 'sections.styleOverrides.bio.bodyFontSize',
        label: 'Body Font Size',
        type: 'select',
        options: FONT_SIZE_OPTIONS,
        defaultValue: 'text-lg',
        description: 'Font size for the biography body text.',
        disclosure: 'advanced',
      },
      {
        path: 'sections.styleOverrides.bio.backgroundOpacity',
        label: 'Background Opacity',
        type: 'slider',
        min: 0,
        max: 1,
        step: 0.05,
        defaultValue: 0,
        description: 'Opacity of the section background (0 = transparent — default for bio, 1 = fully opaque card).',
        disclosure: 'advanced',
      },
      {
        path: 'sections.styleOverrides.bio.readMoreMaxHeight',
        label: 'Read More Max Height',
        type: 'text',
        placeholder: '17.5rem',
        description: 'CSS height at which the bio is clipped with a "Read More" button.',
        disclosure: 'expert',
      },
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
      {
        path: 'shell.photo',
        label: 'Profile Photo URL',
        type: 'image',
        placeholder: 'https://...',
        description: "URL of the member's profile photo.",
        disclosure: 'basic',
      },
      {
        path: 'shell.social.instagram',
        label: 'Instagram',
        type: 'url',
        placeholder: 'https://instagram.com/...',
        disclosure: 'advanced',
      },
      {
        path: 'shell.social.twitter',
        label: 'Twitter / X',
        type: 'url',
        placeholder: 'https://twitter.com/...',
        disclosure: 'advanced',
      },
      {
        path: 'shell.social.youtube',
        label: 'YouTube',
        type: 'url',
        disclosure: 'advanced',
      },
      {
        path: 'shell.social.website',
        label: 'Personal Website',
        type: 'url',
        disclosure: 'advanced',
      },
      {
        path: 'sections.styleOverrides.shell.textAlign',
        label: 'Layout Alignment',
        type: 'select',
        options: [
          { label: 'Left', value: 'left' },
          { label: 'Center', value: 'center' },
          { label: 'Right', value: 'right' },
        ],
        description: 'Alignment of the member card content.',
        disclosure: 'expert',
      },
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
      {
        path: 'sections.styleOverrides.creditHighlights.logoBrightness',
        label: 'Logo Brightness',
        type: 'slider',
        min: 0,
        max: 3,
        step: 0.05,
        defaultValue: 1,
        description: 'Brightness of the logos (0 = black, 1 = white/default, >1 = brighter).',
        disclosure: 'basic',
      },
      { path: 'labels.creditHighlightsPrefix', label: 'Heading Prefix', type: 'text', placeholder: '//', disclosure: 'advanced' },
      { path: 'labels.creditHighlightsHeadingVisible', label: 'Show Heading', type: 'toggle', disclosure: 'advanced' },
      { path: 'labels.collabs', label: '"Collabs" Label', type: 'text', placeholder: 'Collabs', disclosure: 'advanced' },
      { path: 'labels.partnersAndFriends', label: '"Partners & Friends" Label', type: 'text', placeholder: 'Partners & Friends', disclosure: 'advanced' },
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
      {
        path: 'sound.defaultMuted',
        label: 'Start Muted',
        type: 'toggle',
        defaultValue: false,
        description: 'Whether the music player starts muted.',
        disclosure: 'advanced',
      },
      {
        path: 'sound.backgroundMusicVolume',
        label: 'Background Music Volume',
        type: 'slider',
        min: 0,
        max: 1,
        step: 0.05,
        defaultValue: 0.5,
        description: 'Default playback volume (0 = silent, 1 = full).',
        disclosure: 'advanced',
      },
      {
        path: 'sound.backgroundMusic',
        label: 'Background Music URL',
        type: 'url',
        description: 'URL of an audio file to use as background music.',
        disclosure: 'expert',
      },
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
      {
        path: 'sections.styleOverrides.gigs.backgroundOpacity',
        label: 'Background Opacity',
        type: 'slider',
        min: 0,
        max: 1,
        step: 0.05,
        defaultValue: 0,
        description: 'Opacity of the section background (0 = transparent — default for gigs, 1 = fully opaque card).',
        disclosure: 'advanced',
      },
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
      { path: 'labels.releasesShowAllText', label: '"Show All" Button Text', type: 'text', disclosure: 'advanced' },
      { path: 'labels.releasesShowLessText', label: '"Show Less" Button Text', type: 'text', disclosure: 'advanced' },
      { path: 'labels.releasesLoadingLabel', label: 'Loading Label', type: 'text', disclosure: 'advanced' },
      { path: 'labels.releaseStreamLabel', label: 'Stream Label', type: 'text', disclosure: 'advanced' },
      { path: 'labels.releaseInfoLabel', label: 'Info Label', type: 'text', disclosure: 'advanced' },
      { path: 'labels.releaseTracksLabel', label: 'Tracklist Label', type: 'text', disclosure: 'advanced' },
      { path: 'labels.releaseStatusLabel', label: 'Status Label', type: 'text', disclosure: 'advanced' },
      { path: 'labels.releasesEmptyText', label: 'Empty State Text', type: 'text', disclosure: 'advanced' },
      { path: 'labels.releasesFetchingText', label: 'Fetching Text', type: 'text', disclosure: 'expert' },
      { path: 'labels.releasesSyncingText', label: 'Syncing Text', type: 'text', disclosure: 'expert' },
      {
        path: 'sections.styleOverrides.releases.releaseLayout',
        label: 'Card Layout',
        type: 'select',
        options: [
          { label: 'Grid', value: 'grid' },
          { label: 'Swipe Gallery', value: 'swipe' },
          { label: '3D Carousel', value: 'carousel-3d' },
        ],
        defaultValue: 'grid',
        description: 'How release cards are arranged.',
        disclosure: 'advanced',
      },
      {
        path: 'sections.styleOverrides.releases.releaseColumns',
        label: 'Grid Columns',
        type: 'select',
        options: [
          { label: '2 Columns', value: '2' },
          { label: '3 Columns', value: '3' },
          { label: '4 Columns', value: '4' },
        ],
        defaultValue: '4',
        description: 'Number of columns in grid layout (ignored in swipe/carousel mode).',
        disclosure: 'advanced',
      },
      {
        path: 'sections.styleOverrides.releases.releaseCardVariant',
        label: 'Card Variant',
        type: 'select',
        options: [
          { label: 'Default (poster)', value: 'default' },
          { label: 'Square – Cover Only (no text)', value: 'square-cover' },
          { label: 'Square – Minimal (artwork only)', value: 'square-minimal' },
          { label: 'Square – Titled (overlay)', value: 'square-titled' },
          { label: 'Compact (horizontal)', value: 'compact' },
        ],
        defaultValue: 'default',
        description: 'Visual style of each release card.',
        disclosure: 'advanced',
      },
      {
        path: 'sections.styleOverrides.releases.releaseHoverEffect',
        label: 'Hover Effect',
        type: 'select',
        options: [
          { label: 'Default (noise)', value: 'default' },
          { label: 'Zoom', value: 'zoom' },
          { label: 'Glow', value: 'glow' },
          { label: 'Lift', value: 'lift' },
          { label: 'Scan Line', value: 'scan' },
          { label: 'Chromatic', value: 'chromatic' },
          { label: 'Flip (show details)', value: 'flip' },
        ],
        defaultValue: 'default',
        description: 'Hover interaction style for release cards.',
        disclosure: 'advanced',
      },
      {
        path: 'sections.styleOverrides.releases.backgroundOpacity',
        label: 'Background Opacity',
        type: 'slider',
        min: 0,
        max: 1,
        step: 0.05,
        defaultValue: 0.5,
        description: 'Opacity of the section background (0 = transparent, 1 = fully opaque).',
        disclosure: 'advanced',
      },
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
      {
        path: 'sections.styleOverrides.gallery.columns',
        label: 'Columns',
        type: 'select',
        options: [
          { label: '2 Columns', value: '2' },
          { label: '3 Columns', value: '3' },
          { label: '4 Columns', value: '4' },
        ],
        defaultValue: '3',
        description: 'Number of columns in the image grid.',
        disclosure: 'advanced',
      },
      {
        path: 'sections.styleOverrides.gallery.aspectRatio',
        label: 'Image Aspect Ratio',
        type: 'select',
        options: [
          { label: 'Square (1:1)', value: 'square' },
          { label: 'Widescreen (16:9)', value: '16/9' },
          { label: 'Auto (original)', value: 'auto' },
        ],
        defaultValue: 'square',
        description: 'Aspect ratio applied to each gallery image.',
        disclosure: 'advanced',
      },
      {
        path: 'sections.styleOverrides.gallery.lightbox',
        label: 'Enable Lightbox',
        type: 'toggle',
        defaultValue: true,
        description: 'Open images in a fullscreen lightbox on click.',
        disclosure: 'advanced',
      },
      {
        path: 'sections.styleOverrides.gallery.maxVisible',
        label: 'Max Visible Images',
        type: 'number',
        min: 1,
        max: 100,
        placeholder: '12',
        description: 'Number of images shown before a "Show more" button appears.',
        disclosure: 'advanced',
      },
      {
        path: 'sections.styleOverrides.gallery.gap',
        label: 'Gap Between Images',
        type: 'text',
        placeholder: '0.5rem',
        description: 'CSS gap between grid cells (e.g. 0.5rem, 8px).',
        disclosure: 'expert',
      },
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
      {
        path: 'sections.styleOverrides.media.layout',
        label: 'Video Layout',
        type: 'select',
        options: [
          { label: 'Grid', value: 'grid' },
          { label: 'List', value: 'list' },
        ],
        defaultValue: 'grid',
        description: 'How video items are arranged.',
        disclosure: 'advanced',
      },
      {
        path: 'sections.styleOverrides.media.maxVisible',
        label: 'Max Visible Items',
        type: 'number',
        min: 1,
        max: 100,
        placeholder: '6',
        description: 'Number of videos shown before a "Show more" button appears.',
        disclosure: 'advanced',
      },
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
      { path: 'siteData.website', label: 'Website / Homepage URL', type: 'url', placeholder: 'https://...', disclosure: 'basic', targetSiteData: true },
      { path: 'siteData.social.tiktok', label: 'TikTok', type: 'url', disclosure: 'advanced', targetSiteData: true },
      { path: 'siteData.social.appleMusic', label: 'Apple Music', type: 'url', disclosure: 'advanced', targetSiteData: true },
      { path: 'siteData.social.twitter', label: 'Twitter / X', type: 'url', disclosure: 'advanced', targetSiteData: true },
      { path: 'siteData.social.twitch', label: 'Twitch', type: 'url', disclosure: 'advanced', targetSiteData: true },
      { path: 'siteData.social.beatport', label: 'Beatport', type: 'url', disclosure: 'advanced', targetSiteData: true },
      { path: 'siteData.social.linktree', label: 'Linktree', type: 'url', disclosure: 'advanced', targetSiteData: true },
      { path: 'labels.sessionStatusText', label: 'Session Status Text', type: 'text', disclosure: 'expert' },
      { path: 'labels.profileStatusText', label: 'Profile Status Text', type: 'text', disclosure: 'expert' },
      { path: 'labels.closeButtonText', label: 'Close Button Text', type: 'text', placeholder: 'Close', disclosure: 'expert' },
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
      { path: 'contact.enabled', label: 'Enable Contact Section', type: 'toggle', defaultValue: true, disclosure: 'basic' },
      { path: 'contact.formTitle', label: 'Form Title', type: 'text', placeholder: 'GET IN TOUCH', disclosure: 'basic' },
      { path: 'contact.formButtonText', label: 'Submit Button Text', type: 'text', disclosure: 'basic' },
      { path: 'contact.successMessage', label: 'Success Message', type: 'text', disclosure: 'basic' },
      { path: 'contact.emailForwardTo', label: 'Forward Emails To', type: 'text', disclosure: 'basic' },
      { path: 'contact.managementName', label: 'Management Name', type: 'text', disclosure: 'advanced' },
      { path: 'contact.managementEmail', label: 'Management Email', type: 'url', disclosure: 'advanced' },
      { path: 'contact.bookingEmail', label: 'Booking Email', type: 'url', disclosure: 'advanced' },
      { path: 'contact.pressEmail', label: 'Press Email', type: 'url', disclosure: 'advanced' },
      { path: 'contact.formNameLabel', label: 'Name Field Label', type: 'text', placeholder: 'Your Name', disclosure: 'advanced' },
      { path: 'contact.formNamePlaceholder', label: 'Name Field Placeholder', type: 'text', placeholder: 'Enter your name', disclosure: 'advanced' },
      { path: 'contact.formEmailLabel', label: 'Email Field Label', type: 'text', placeholder: 'Your Email', disclosure: 'advanced' },
      { path: 'contact.formEmailPlaceholder', label: 'Email Field Placeholder', type: 'text', placeholder: 'your@email.com', disclosure: 'advanced' },
      { path: 'contact.formSubjectLabel', label: 'Subject Field Label', type: 'text', placeholder: 'Subject', disclosure: 'advanced' },
      { path: 'contact.formSubjectPlaceholder', label: 'Subject Field Placeholder', type: 'text', placeholder: 'What is this about?', disclosure: 'advanced' },
      { path: 'contact.formMessageLabel', label: 'Message Field Label', type: 'text', placeholder: 'Message', disclosure: 'advanced' },
      { path: 'contact.formMessagePlaceholder', label: 'Message Field Placeholder', type: 'text', placeholder: 'Your message...', disclosure: 'advanced' },
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
      {
        path: 'sections.styleOverrides.sponsoring.logoBrightness',
        label: 'Logo Brightness',
        type: 'slider',
        min: 0,
        max: 3,
        step: 0.05,
        defaultValue: 1,
        description: 'Brightness of the logos (0 = black, 1 = white/default, >1 = brighter).',
        disclosure: 'basic',
      },
      { path: 'labels.sponsoringPrefix', label: 'Heading Prefix', type: 'text', disclosure: 'advanced' },
      { path: 'labels.sponsoringHeadingVisible', label: 'Show Heading', type: 'toggle', disclosure: 'advanced' },
    ],
  },
]

/**
 * Registry entry for a global design/layout setting group (not a page section).
 * Used by DesignPanel to render schema-driven form groups in the Layout tab.
 */
export interface DesignRegistryEntry {
  /** Unique identifier used to look up this group, e.g. 'layout', 'navigation', 'footer' */
  id: string
  /** Human-readable group heading shown in the admin panel */
  label: string
  /** Icon name from @phosphor-icons/react */
  icon: string
  /** Config fields for this design group */
  configFields: SectionConfigField[]
}

/**
 * Single source of truth for global design/layout settings that are NOT tied to a specific
 * page section. All fields use dot-notation paths inside AdminSettings (e.g. 'design.layout.*').
 * DesignPanel iterates this registry to render the Layout tab without manual JSX.
 */
export const DESIGN_REGISTRY: DesignRegistryEntry[] = [
  {
    id: 'layout',
    label: 'Layout & Spacing',
    icon: 'Ruler',
    configFields: [
      {
        path: 'design.layout.sectionPaddingY',
        label: 'Section Padding Y',
        type: 'text',
        placeholder: '6rem',
        description: 'Vertical padding applied to every page section (CSS value, e.g. 6rem).',
        disclosure: 'basic',
      },
      {
        path: 'design.layout.sectionPaddingX',
        label: 'Section Padding X',
        type: 'text',
        placeholder: '1rem',
        description: 'Horizontal padding applied to every page section.',
        disclosure: 'advanced',
      },
      {
        path: 'design.layout.containerMaxWidth',
        label: 'Container Max Width',
        type: 'text',
        placeholder: '56rem',
        description: 'Maximum width of the standard content container.',
        disclosure: 'advanced',
      },
      {
        path: 'design.layout.containerMaxWidthWide',
        label: 'Container Max Width (Wide)',
        type: 'text',
        placeholder: '72rem',
        description: 'Maximum width of the wide content container.',
        disclosure: 'advanced',
      },
    ],
  },
  {
    id: 'navigation',
    label: 'Navigation Styling',
    icon: 'NavigationArrow',
    configFields: [
      {
        path: 'design.navigation.backgroundOpacity',
        label: 'Background Opacity',
        type: 'slider',
        min: 0,
        max: 100,
        step: 1,
        defaultValue: 98,
        description: 'Opacity of the navigation bar background (0 = transparent, 100 = fully opaque).',
        disclosure: 'basic',
      },
      {
        path: 'design.navigation.backdropBlur',
        label: 'Backdrop Blur',
        type: 'toggle',
        defaultValue: true,
        description: 'Enable CSS backdrop-filter blur on the navigation bar.',
        disclosure: 'basic',
      },
      {
        path: 'design.navigation.logoHeight',
        label: 'Logo Height',
        type: 'text',
        placeholder: '2.5rem',
        description: 'Height of the logo in the navigation bar.',
        disclosure: 'advanced',
      },
      {
        path: 'design.navigation.itemGap',
        label: 'Item Gap',
        type: 'text',
        placeholder: '1.5rem',
        description: 'Gap between navigation items.',
        disclosure: 'advanced',
      },
      {
        path: 'design.navigation.height',
        label: 'Nav Height',
        type: 'text',
        placeholder: '4rem',
        description: 'Height of the navigation bar.',
        disclosure: 'advanced',
      },
    ],
  },
  {
    id: 'footer',
    label: 'Footer Styling',
    icon: 'AlignBottom',
    configFields: [
      {
        path: 'design.footer.paddingY',
        label: 'Padding Y',
        type: 'text',
        placeholder: '3rem',
        description: 'Vertical padding of the footer.',
        disclosure: 'basic',
      },
      {
        path: 'design.footer.paddingX',
        label: 'Padding X',
        type: 'text',
        placeholder: '1rem',
        description: 'Horizontal padding of the footer.',
        disclosure: 'advanced',
      },
      {
        path: 'design.footer.textColor',
        label: 'Text Color',
        type: 'color',
        placeholder: 'oklch(0.55 0 0)',
        description: 'Default text color for footer content.',
        disclosure: 'advanced',
      },
      {
        path: 'design.footer.linkColor',
        label: 'Link Color',
        type: 'color',
        placeholder: 'oklch(0.50 0.22 25)',
        description: 'Color for links in the footer.',
        disclosure: 'advanced',
      },
    ],
  },
]
