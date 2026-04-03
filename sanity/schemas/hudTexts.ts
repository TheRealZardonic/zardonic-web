/**
 * Sanity Schema: HUD Texts (Singleton)
 *
 * Terminal-style HUD overlay text for the cyberpunk UI.
 */
import { defineType, defineField } from 'sanity'

export default defineType({
  name: 'hudTexts',
  title: 'HUD Texts',
  type: 'document',
  icon: () => '📡',
  fields: [
    defineField({ name: 'topLeft1', title: 'Top Left Line 1', type: 'string' }),
    defineField({ name: 'topLeft2', title: 'Top Left Line 2', type: 'string' }),
    defineField({ name: 'topLeftStatus', title: 'Top Left Status', type: 'string' }),
    defineField({ name: 'topRight', title: 'Top Right', type: 'string' }),
    defineField({ name: 'topRight1', title: 'Top Right Line 1', type: 'string' }),
    defineField({ name: 'topRight2', title: 'Top Right Line 2', type: 'string' }),
    defineField({ name: 'bottomLeft', title: 'Bottom Left', type: 'string' }),
    defineField({ name: 'bottomLeft1', title: 'Bottom Left Line 1', type: 'string' }),
    defineField({ name: 'bottomLeft2', title: 'Bottom Left Line 2', type: 'string' }),
    defineField({ name: 'bottomRight', title: 'Bottom Right', type: 'string' }),
    defineField({ name: 'bottomRight1', title: 'Bottom Right Line 1', type: 'string' }),
    defineField({ name: 'bottomRight2', title: 'Bottom Right Line 2', type: 'string' }),
  ],
  preview: {
    prepare() {
      return { title: 'HUD Texts' }
    },
  },
})
