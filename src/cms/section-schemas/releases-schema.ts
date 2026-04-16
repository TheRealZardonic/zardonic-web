/**
 * Releases Section Schema
 *
 * Defines the admin-editable fields for AppReleasesSection:
 * the discography section with release cards, streaming links, and display options.
 */

import { registerAdminSection } from '@/lib/admin-schema-registry'
import type { AdminSectionSchema } from '@/lib/admin-section-schema'

interface ReleasesSectionData {
  loadingLabel: string
  syncingText: string
  fetchingText: string
  emptyText: string
  showAllText: string
  showLessText: string
  showType: boolean
  showYear: boolean
  showDescription: boolean
  showTracks: boolean
  streamLabel: string
  statusLabel: string
  infoLabel: string
  tracksLabel: string
}

const releasesSectionSchema: AdminSectionSchema<ReleasesSectionData> = {
  sectionId: 'releases',
  group: 'content',
  label: 'Releases',
  icon: 'Disc',
  description: 'The discography section. Shows release cards with artwork, streaming links, and track lists.',
  supportsPreview: false,
  fields: [
    {
      key: 'showType',
      type: 'boolean',
      label: 'Show Release Type Badge',
      tooltip: 'Display the release type badge (Album / EP / Single) on each card.',
      group: 'Card Options',
      defaultValue: true,
    },
    {
      key: 'showYear',
      type: 'boolean',
      label: 'Show Release Year',
      tooltip: 'Display the release year on each card.',
      group: 'Card Options',
      defaultValue: true,
    },
    {
      key: 'showDescription',
      type: 'boolean',
      label: 'Show Description',
      tooltip: 'Display the release description in the detail overlay.',
      group: 'Card Options',
      defaultValue: true,
    },
    {
      key: 'showTracks',
      type: 'boolean',
      label: 'Show Track List',
      tooltip: 'Display the track listing in the release detail overlay.',
      group: 'Card Options',
      defaultValue: true,
    },
    {
      key: 'loadingLabel',
      type: 'text',
      label: 'Loading Label',
      tooltip: 'Text shown while releases are loading.',
      placeholder: 'Loading releases...',
      group: 'Labels',
      disclosure: 'advanced',
      validation: { maxLength: 100 },
    },
    {
      key: 'syncingText',
      type: 'text',
      label: 'Syncing Text',
      tooltip: 'Text shown while syncing releases from external sources.',
      placeholder: 'Syncing...',
      group: 'Labels',
      disclosure: 'advanced',
      validation: { maxLength: 100 },
    },
    {
      key: 'fetchingText',
      type: 'text',
      label: 'Fetching Text',
      tooltip: 'Text shown while fetching release data.',
      placeholder: 'Fetching...',
      group: 'Labels',
      disclosure: 'advanced',
      validation: { maxLength: 100 },
    },
    {
      key: 'emptyText',
      type: 'text',
      label: 'Empty State Text',
      tooltip: 'Text shown when there are no releases to display.',
      placeholder: 'No releases yet.',
      group: 'Labels',
      disclosure: 'advanced',
      validation: { maxLength: 200 },
    },
    {
      key: 'showAllText',
      type: 'text',
      label: '"Show All" Button Text',
      tooltip: 'Label for the button that expands the full release list.',
      placeholder: 'Show All',
      group: 'Labels',
      disclosure: 'advanced',
      validation: { maxLength: 50 },
    },
    {
      key: 'showLessText',
      type: 'text',
      label: '"Show Less" Button Text',
      tooltip: 'Label for the button that collapses the release list.',
      placeholder: 'Show Less',
      group: 'Labels',
      disclosure: 'advanced',
      validation: { maxLength: 50 },
    },
    {
      key: 'streamLabel',
      type: 'text',
      label: 'Stream Label',
      tooltip: 'Decorative label shown in the release overlay (e.g. "// STREAM").',
      placeholder: '// STREAM',
      group: 'Overlay Labels',
      disclosure: 'advanced',
      validation: { maxLength: 50 },
    },
    {
      key: 'statusLabel',
      type: 'text',
      label: 'Status Label',
      tooltip: 'Decorative status text shown in the release overlay.',
      placeholder: 'RELEASED',
      group: 'Overlay Labels',
      disclosure: 'advanced',
      validation: { maxLength: 50 },
    },
    {
      key: 'infoLabel',
      type: 'text',
      label: 'Info Label',
      tooltip: 'Decorative info label shown in the release detail overlay.',
      placeholder: '// INFO',
      group: 'Overlay Labels',
      disclosure: 'advanced',
      validation: { maxLength: 50 },
    },
    {
      key: 'tracksLabel',
      type: 'text',
      label: 'Tracks Label',
      tooltip: 'Heading label for the track list in the release detail overlay.',
      placeholder: '// TRACKS',
      group: 'Overlay Labels',
      disclosure: 'advanced',
      validation: { maxLength: 50 },
    },
  ],
  fieldGroups: [
    { id: 'Card Options', label: 'Card Options', defaultExpanded: true },
    { id: 'Labels', label: 'Section Labels', defaultExpanded: false },
    { id: 'Overlay Labels', label: 'Overlay Labels', defaultExpanded: false },
  ],
  getDefaultData: () => ({
    loadingLabel: 'Loading releases...',
    syncingText: 'Syncing...',
    fetchingText: 'Fetching...',
    emptyText: 'No releases yet.',
    showAllText: 'Show All',
    showLessText: 'Show Less',
    showType: true,
    showYear: true,
    showDescription: true,
    showTracks: true,
    streamLabel: '// STREAM',
    statusLabel: 'RELEASED',
    infoLabel: '// INFO',
    tracksLabel: '// TRACKS',
  }),
}

registerAdminSection(releasesSectionSchema)

export { releasesSectionSchema }
