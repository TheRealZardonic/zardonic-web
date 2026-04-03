/**
 * Sanity Schema: Sync Log (Singleton)
 *
 * Tracks the last sync timestamps for external API integrations
 * (iTunes releases, Bandsintown events).
 */
import { defineType, defineField } from 'sanity'

export default defineType({
  name: 'syncLog',
  title: 'Sync Log',
  type: 'document',
  icon: () => '🔄',
  fields: [
    defineField({
      name: 'lastReleasesSync',
      title: 'Last Releases Sync',
      type: 'datetime',
      readOnly: true,
    }),
    defineField({
      name: 'lastGigsSync',
      title: 'Last Gigs Sync',
      type: 'datetime',
      readOnly: true,
    }),
    defineField({
      name: 'lastItunesSyncStatus',
      title: 'Last iTunes Sync Status',
      type: 'string',
      readOnly: true,
    }),
    defineField({
      name: 'lastBandsintownSyncStatus',
      title: 'Last Bandsintown Sync Status',
      type: 'string',
      readOnly: true,
    }),
  ],
  preview: {
    prepare() {
      return { title: 'Sync Log' }
    },
  },
})
