/**
 * Sanity Schema: Gig
 *
 * Tour date / event with venue details, ticket link,
 * lineup info, status, and event links.
 */
import { defineType, defineField } from 'sanity'

export default defineType({
  name: 'gig',
  title: 'Gig',
  type: 'document',
  icon: () => '🎤',
  fields: [
    defineField({
      name: 'title',
      title: 'Event Title',
      type: 'string',
    }),
    defineField({
      name: 'venue',
      title: 'Venue',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'location',
      title: 'Location (City, Country)',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'date',
      title: 'Date',
      type: 'date',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'startsAt',
      title: 'Starts At',
      type: 'datetime',
    }),
    defineField({
      name: 'allDay',
      title: 'All Day Event',
      type: 'boolean',
      initialValue: false,
    }),
    defineField({
      name: 'gigType',
      title: 'Gig Type',
      type: 'string',
      options: {
        list: [
          { title: 'Concert', value: 'concert' },
          { title: 'DJ Set', value: 'dj' },
        ],
      },
    }),
    defineField({
      name: 'status',
      title: 'Status',
      type: 'string',
      options: {
        list: [
          { title: 'Confirmed', value: 'confirmed' },
          { title: 'Announced', value: 'announced' },
          { title: 'Cancelled', value: 'cancelled' },
          { title: 'Sold Out', value: 'soldout' },
        ],
      },
      initialValue: 'confirmed',
    }),
    defineField({
      name: 'soldOut',
      title: 'Sold Out',
      type: 'boolean',
      initialValue: false,
    }),
    defineField({
      name: 'ticketUrl',
      title: 'Ticket URL',
      type: 'url',
    }),
    defineField({
      name: 'description',
      title: 'Description',
      type: 'text',
    }),
    defineField({
      name: 'photo',
      title: 'Event Photo',
      type: 'image',
      options: { hotspot: true },
    }),
    defineField({
      name: 'lineup',
      title: 'Lineup',
      type: 'array',
      of: [{ type: 'string' }],
    }),
    defineField({
      name: 'support',
      title: 'Support Acts',
      type: 'string',
    }),
    defineField({
      name: 'supportingArtists',
      title: 'Supporting Artists',
      type: 'array',
      of: [{ type: 'string' }],
    }),
    defineField({
      name: 'streetAddress',
      title: 'Street Address',
      type: 'string',
    }),
    defineField({
      name: 'postalCode',
      title: 'Postal Code',
      type: 'string',
    }),
    defineField({
      name: 'eventLinks',
      title: 'Event Links',
      type: 'object',
      fields: [
        defineField({ name: 'facebook', title: 'Facebook Event', type: 'url' }),
        defineField({ name: 'instagram', title: 'Instagram', type: 'url' }),
        defineField({ name: 'residentAdvisor', title: 'Resident Advisor', type: 'url' }),
        defineField({ name: 'other', title: 'Other Link', type: 'url' }),
      ],
    }),
    defineField({
      name: 'bandsintownId',
      title: 'Bandsintown Event ID',
      type: 'string',
      description: 'Auto-populated by Bandsintown sync. Used to prevent duplicate imports.',
      readOnly: true,
    }),
    defineField({
      name: 'source',
      title: 'Source',
      type: 'string',
      options: {
        list: [
          { title: 'Manual', value: 'manual' },
          { title: 'Bandsintown Sync', value: 'bandsintown' },
        ],
      },
      initialValue: 'manual',
      readOnly: true,
    }),
  ],
  orderings: [
    {
      title: 'Date (Upcoming First)',
      name: 'dateAsc',
      by: [{ field: 'date', direction: 'asc' }],
    },
    {
      title: 'Date (Most Recent)',
      name: 'dateDesc',
      by: [{ field: 'date', direction: 'desc' }],
    },
  ],
  preview: {
    select: {
      title: 'venue',
      subtitle: 'date',
      description: 'location',
    },
    prepare({ title, subtitle, description }) {
      return {
        title: title ?? 'Unknown Venue',
        subtitle: `${subtitle ?? ''} — ${description ?? ''}`,
      }
    },
  },
})
