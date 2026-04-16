/**
 * Gigs Section Schema
 *
 * Defines the admin-editable fields for AppGigsSection:
 * the upcoming shows / tour dates section with event list and display labels.
 */

import { registerAdminSection } from '@/lib/admin-schema-registry'
import type { AdminSectionSchema } from '@/lib/admin-section-schema'

interface GigsSectionData {
  loadingLabel: string
  syncingText: string
  fetchingText: string
  noShowsText: string
}

const gigsSectionSchema: AdminSectionSchema<GigsSectionData> = {
  sectionId: 'gigs',
  group: 'content',
  label: 'Gigs / Tour Dates',
  icon: 'CalendarBlank',
  description: 'The upcoming shows and tour dates section. Manage event list and display labels.',
  supportsPreview: false,
  fields: [
    {
      key: 'loadingLabel',
      type: 'text',
      label: 'Loading Label',
      tooltip: 'Text shown while gig data is loading.',
      placeholder: 'Loading shows...',
      group: 'Labels',
      validation: { maxLength: 100 },
    },
    {
      key: 'syncingText',
      type: 'text',
      label: 'Syncing Text',
      tooltip: 'Text shown while syncing tour dates from external sources (e.g. Bandsintown).',
      placeholder: 'Syncing tour dates...',
      group: 'Labels',
      disclosure: 'advanced',
      validation: { maxLength: 100 },
    },
    {
      key: 'fetchingText',
      type: 'text',
      label: 'Fetching Text',
      tooltip: 'Text shown while fetching individual gig records.',
      placeholder: 'Fetching events...',
      group: 'Labels',
      disclosure: 'advanced',
      validation: { maxLength: 100 },
    },
    {
      key: 'noShowsText',
      type: 'text',
      label: 'No Shows Text',
      tooltip: 'Text shown when there are no upcoming gigs.',
      placeholder: 'No upcoming shows.',
      group: 'Labels',
      validation: { maxLength: 200 },
    },
  ],
  fieldGroups: [
    { id: 'Labels', label: 'Section Labels', defaultExpanded: true },
  ],
  getDefaultData: () => ({
    loadingLabel: 'Loading shows...',
    syncingText: 'Syncing tour dates...',
    fetchingText: 'Fetching events...',
    noShowsText: 'No upcoming shows.',
  }),
}

registerAdminSection(gigsSectionSchema)

export { gigsSectionSchema }
