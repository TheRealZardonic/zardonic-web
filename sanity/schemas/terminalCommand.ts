/**
 * Sanity Schema: Terminal Command
 *
 * Custom terminal command definition for the in-site terminal.
 */
import { defineType, defineField } from 'sanity'

export default defineType({
  name: 'terminalCommand',
  title: 'Terminal Command',
  type: 'document',
  icon: () => '💻',
  fields: [
    defineField({
      name: 'name',
      title: 'Command Name',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'description',
      title: 'Description',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'output',
      title: 'Output Lines',
      type: 'array',
      of: [{ type: 'string' }],
      validation: (rule) => rule.required().min(1),
    }),
    defineField({
      name: 'fileName',
      title: 'File Name',
      type: 'string',
      description: 'Optional file name for download commands',
    }),
    defineField({
      name: 'fileUrl',
      title: 'File URL',
      type: 'url',
      description: 'Optional file URL for download commands',
    }),
  ],
  preview: {
    select: {
      title: 'name',
      subtitle: 'description',
    },
  },
})
