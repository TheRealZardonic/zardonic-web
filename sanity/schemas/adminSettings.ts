/**
 * Sanity Schema: Admin Settings (Singleton)
 *
 * Theme customization, animation settings, section visibility/order,
 * section labels, contact info, legal content, glitch text settings.
 */
import { defineType, defineField } from 'sanity'

export default defineType({
  name: 'adminSettings',
  title: 'Admin Settings',
  type: 'document',
  icon: () => '🛠️',
  groups: [
    { name: 'sections', title: 'Sections' },
    { name: 'theme', title: 'Theme' },
    { name: 'animations', title: 'Animations' },
    { name: 'labels', title: 'Labels' },
    { name: 'contact', title: 'Contact' },
    { name: 'legal', title: 'Legal' },
    { name: 'advanced', title: 'Advanced' },
  ],
  fields: [
    // Section Visibility
    defineField({
      name: 'sectionVisibility',
      title: 'Section Visibility',
      type: 'object',
      group: 'sections',
      fields: [
        defineField({ name: 'bio', title: 'Bio', type: 'boolean', initialValue: true }),
        defineField({ name: 'music', title: 'Music Player', type: 'boolean', initialValue: true }),
        defineField({ name: 'gigs', title: 'Gigs', type: 'boolean', initialValue: true }),
        defineField({ name: 'releases', title: 'Releases', type: 'boolean', initialValue: true }),
        defineField({ name: 'gallery', title: 'Gallery', type: 'boolean', initialValue: true }),
        defineField({ name: 'connect', title: 'Connect', type: 'boolean', initialValue: true }),
        defineField({ name: 'creditHighlights', title: 'Credit Highlights', type: 'boolean', initialValue: true }),
        defineField({ name: 'shell', title: 'Shell', type: 'boolean', initialValue: true }),
        defineField({ name: 'contact', title: 'Contact', type: 'boolean', initialValue: true }),
        defineField({ name: 'news', title: 'News', type: 'boolean', initialValue: true }),
        defineField({ name: 'biography', title: 'Biography', type: 'boolean', initialValue: true }),
        defineField({ name: 'media', title: 'Media', type: 'boolean', initialValue: true }),
        defineField({ name: 'social', title: 'Social', type: 'boolean', initialValue: true }),
        defineField({ name: 'partnersAndFriends', title: 'Partners & Friends', type: 'boolean', initialValue: true }),
        defineField({ name: 'hudBackground', title: 'HUD Background', type: 'boolean', initialValue: true }),
        defineField({ name: 'audioVisualizer', title: 'Audio Visualizer', type: 'boolean', initialValue: true }),
        defineField({ name: 'scanline', title: 'Scanline', type: 'boolean', initialValue: true }),
        defineField({ name: 'systemMonitor', title: 'System Monitor', type: 'boolean', initialValue: true }),
      ],
    }),
    // Section Order
    defineField({
      name: 'sectionOrder',
      title: 'Section Order',
      type: 'array',
      group: 'sections',
      of: [{ type: 'string' }],
      description: 'Drag to reorder sections. Values: bio, music, gigs, releases, gallery, connect, creditHighlights, shell, contact, news, biography, media, social, partnersAndFriends',
    }),
    // Theme Customization
    defineField({
      name: 'theme',
      title: 'Theme',
      type: 'object',
      group: 'theme',
      fields: [
        defineField({ name: 'primaryColor', title: 'Primary Color', type: 'string' }),
        defineField({ name: 'accentColor', title: 'Accent Color', type: 'string' }),
        defineField({ name: 'backgroundColor', title: 'Background Color', type: 'string' }),
        defineField({ name: 'foregroundColor', title: 'Foreground Color', type: 'string' }),
        defineField({ name: 'borderColor', title: 'Border Color', type: 'string' }),
        defineField({ name: 'hoverColor', title: 'Hover Color', type: 'string' }),
        defineField({ name: 'cardColor', title: 'Card Color', type: 'string' }),
        defineField({ name: 'cardForegroundColor', title: 'Card Foreground', type: 'string' }),
        defineField({ name: 'popoverColor', title: 'Popover Color', type: 'string' }),
        defineField({ name: 'popoverForegroundColor', title: 'Popover Foreground', type: 'string' }),
        defineField({ name: 'primaryForegroundColor', title: 'Primary Foreground', type: 'string' }),
        defineField({ name: 'secondaryColor', title: 'Secondary Color', type: 'string' }),
        defineField({ name: 'secondaryForegroundColor', title: 'Secondary Foreground', type: 'string' }),
        defineField({ name: 'mutedColor', title: 'Muted Color', type: 'string' }),
        defineField({ name: 'mutedForegroundColor', title: 'Muted Foreground', type: 'string' }),
        defineField({ name: 'accentForegroundColor', title: 'Accent Foreground', type: 'string' }),
        defineField({ name: 'destructiveColor', title: 'Destructive Color', type: 'string' }),
        defineField({ name: 'destructiveForegroundColor', title: 'Destructive Foreground', type: 'string' }),
        defineField({ name: 'inputColor', title: 'Input Color', type: 'string' }),
        defineField({ name: 'ringColor', title: 'Ring Color', type: 'string' }),
        defineField({ name: 'borderRadius', title: 'Border Radius', type: 'string' }),
        defineField({ name: 'fontHeading', title: 'Font Heading', type: 'string' }),
        defineField({ name: 'fontBody', title: 'Font Body', type: 'string' }),
        defineField({ name: 'fontMono', title: 'Font Mono', type: 'string' }),
      ],
    }),
    // Animation Settings
    defineField({
      name: 'animations',
      title: 'Animations',
      type: 'object',
      group: 'animations',
      fields: [
        defineField({ name: 'glitchEnabled', title: 'Glitch', type: 'boolean', initialValue: true }),
        defineField({ name: 'scanlineEnabled', title: 'Scanline', type: 'boolean', initialValue: true }),
        defineField({ name: 'chromaticEnabled', title: 'Chromatic Aberration', type: 'boolean', initialValue: true }),
        defineField({ name: 'crtEnabled', title: 'CRT Effect', type: 'boolean', initialValue: true }),
        defineField({ name: 'noiseEnabled', title: 'Noise', type: 'boolean', initialValue: true }),
        defineField({ name: 'circuitBackgroundEnabled', title: 'Circuit Background', type: 'boolean', initialValue: true }),
        defineField({ name: 'crtOverlayOpacity', title: 'CRT Overlay Opacity', type: 'number', validation: (rule) => rule.min(0).max(1) }),
        defineField({ name: 'crtVignetteOpacity', title: 'CRT Vignette Opacity', type: 'number', validation: (rule) => rule.min(0).max(1) }),
      ],
    }),
    // Progressive Overlay Modes
    defineField({
      name: 'progressiveOverlayModes',
      title: 'Progressive Overlay Modes',
      type: 'object',
      group: 'animations',
      fields: [
        defineField({ name: 'progressiveReveal', title: 'Progressive Reveal', type: 'boolean' }),
        defineField({ name: 'dataStream', title: 'Data Stream', type: 'boolean' }),
        defineField({ name: 'sectorAssembly', title: 'Sector Assembly', type: 'boolean' }),
        defineField({ name: 'holographicMaterialization', title: 'Holographic Materialization', type: 'boolean' }),
      ],
    }),
    // Glitch Text Settings
    defineField({
      name: 'glitchTextSettings',
      title: 'Glitch Text Settings',
      type: 'object',
      group: 'animations',
      fields: [
        defineField({ name: 'enabled', title: 'Enabled', type: 'boolean', initialValue: true }),
        defineField({ name: 'intervalMs', title: 'Interval (ms)', type: 'number' }),
        defineField({ name: 'durationMs', title: 'Duration (ms)', type: 'number' }),
      ],
    }),
    // Section Labels
    defineField({
      name: 'sectionLabels',
      title: 'Section Labels',
      type: 'object',
      group: 'labels',
      fields: [
        defineField({ name: 'biography', title: 'Biography', type: 'string' }),
        defineField({ name: 'musicPlayer', title: 'Music Player', type: 'string' }),
        defineField({ name: 'upcomingGigs', title: 'Upcoming Gigs', type: 'string' }),
        defineField({ name: 'gigs', title: 'Gigs', type: 'string' }),
        defineField({ name: 'news', title: 'News', type: 'string' }),
        defineField({ name: 'releases', title: 'Releases', type: 'string' }),
        defineField({ name: 'gallery', title: 'Gallery', type: 'string' }),
        defineField({ name: 'connect', title: 'Connect', type: 'string' }),
        defineField({ name: 'creditHighlights', title: 'Credit Highlights', type: 'string' }),
        defineField({ name: 'media', title: 'Media', type: 'string' }),
        defineField({ name: 'tourDates', title: 'Tour Dates', type: 'string' }),
        defineField({ name: 'shell', title: 'Shell', type: 'string' }),
        defineField({ name: 'contact', title: 'Contact', type: 'string' }),
        defineField({ name: 'headingPrefix', title: 'Heading Prefix', type: 'string' }),
        defineField({ name: 'collabs', title: 'Collabs', type: 'string' }),
        defineField({ name: 'closeButtonText', title: 'Close Button Text', type: 'string' }),
        defineField({ name: 'partnersAndFriends', title: 'Partners & Friends', type: 'string' }),
        defineField({ name: 'sessionStatusText', title: 'Session Status Text', type: 'string' }),
        defineField({ name: 'profileStatusText', title: 'Profile Status Text', type: 'string' }),
      ],
    }),
    // Contact Info
    defineField({
      name: 'contactInfo',
      title: 'Contact Info',
      type: 'object',
      group: 'contact',
      fields: [
        defineField({ name: 'managementName', title: 'Management Name', type: 'string' }),
        defineField({ name: 'managementEmail', title: 'Management Email', type: 'string' }),
        defineField({ name: 'bookingEmail', title: 'Booking Email', type: 'string' }),
        defineField({ name: 'pressEmail', title: 'Press Email', type: 'string' }),
        defineField({ name: 'formTitle', title: 'Form Title', type: 'string' }),
        defineField({ name: 'formNameLabel', title: 'Name Label', type: 'string' }),
        defineField({ name: 'formNamePlaceholder', title: 'Name Placeholder', type: 'string' }),
        defineField({ name: 'formEmailLabel', title: 'Email Label', type: 'string' }),
        defineField({ name: 'formEmailPlaceholder', title: 'Email Placeholder', type: 'string' }),
        defineField({ name: 'formSubjectLabel', title: 'Subject Label', type: 'string' }),
        defineField({ name: 'formSubjectPlaceholder', title: 'Subject Placeholder', type: 'string' }),
        defineField({ name: 'formMessageLabel', title: 'Message Label', type: 'string' }),
        defineField({ name: 'formMessagePlaceholder', title: 'Message Placeholder', type: 'string' }),
        defineField({ name: 'formButtonText', title: 'Submit Button Text', type: 'string' }),
      ],
    }),
    // Contact Settings
    defineField({
      name: 'contactSettings',
      title: 'Contact Settings',
      type: 'object',
      group: 'contact',
      fields: [
        defineField({ name: 'enabled', title: 'Enabled', type: 'boolean', initialValue: true }),
        defineField({ name: 'title', title: 'Title', type: 'string' }),
        defineField({ name: 'description', title: 'Description', type: 'text' }),
        defineField({ name: 'emailForwardTo', title: 'Forward Emails To', type: 'string' }),
        defineField({ name: 'successMessage', title: 'Success Message', type: 'string' }),
        defineField({ name: 'showSection', title: 'Show Section', type: 'boolean', initialValue: true }),
      ],
    }),
    // Legal Content
    defineField({
      name: 'legalContent',
      title: 'Legal Content',
      type: 'object',
      group: 'legal',
      fields: [
        defineField({ name: 'impressumCustom', title: 'Impressum (Custom HTML)', type: 'text', rows: 10 }),
        defineField({ name: 'privacyCustom', title: 'Privacy Policy (Custom HTML)', type: 'text', rows: 10 }),
      ],
    }),
    // Custom Social Links
    defineField({
      name: 'customSocialLinks',
      title: 'Custom Social Links',
      type: 'array',
      group: 'advanced',
      of: [
        {
          type: 'object',
          fields: [
            defineField({ name: 'label', title: 'Label', type: 'string', validation: (rule) => rule.required() }),
            defineField({ name: 'url', title: 'URL', type: 'url', validation: (rule) => rule.required() }),
            defineField({ name: 'icon', title: 'Icon Name', type: 'string' }),
          ],
          preview: {
            select: { title: 'label', subtitle: 'url' },
          },
        },
      ],
    }),
    // Config Overrides (advanced numeric configs)
    defineField({
      name: 'configOverrides',
      title: 'Config Overrides (JSON)',
      type: 'text',
      group: 'advanced',
      description: 'Advanced numeric config overrides as JSON object (e.g. {"CACHE_TTL_MS": 43200000})',
    }),
  ],
  preview: {
    prepare() {
      return { title: 'Admin Settings' }
    },
  },
})
