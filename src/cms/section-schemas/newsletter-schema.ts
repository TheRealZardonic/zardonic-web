/**
 * Newsletter Section Schema
 *
 * Defines the admin-editable fields for the newsletter subscription section.
 */

import { registerAdminSection } from '@/lib/admin-schema-registry'
import type { AdminSectionSchema } from '@/lib/admin-section-schema'

interface NewsletterSectionData {
  enabled: boolean
  title: string
  description: string
  placeholder: string
  buttonText: string
  successMessage: string
}

const newsletterSectionSchema: AdminSectionSchema<NewsletterSectionData> = {
  sectionId: 'newsletter',
  group: 'content',
  label: 'Newsletter',
  icon: 'EnvelopeSimple',
  description: 'The newsletter subscription section. Configure the form text, button, and success message.',
  supportsPreview: false,
  fields: [
    {
      key: 'enabled',
      type: 'boolean',
      label: 'Enable Newsletter Section',
      group: 'Settings',
      defaultValue: true,
    },
    {
      key: 'title',
      type: 'text',
      label: 'Section Title',
      placeholder: 'STAY CONNECTED',
      group: 'Content',
      validation: { maxLength: 100 },
    },
    {
      key: 'description',
      type: 'textarea',
      label: 'Description',
      placeholder: 'Get the latest news, releases and gig updates.',
      group: 'Content',
      validation: { maxLength: 500 },
    },
    {
      key: 'placeholder',
      type: 'text',
      label: 'Email Placeholder',
      placeholder: 'your@email.com',
      group: 'Form',
      disclosure: 'advanced',
      validation: { maxLength: 100 },
    },
    {
      key: 'buttonText',
      type: 'text',
      label: 'Button Text',
      placeholder: 'SUBSCRIBE',
      group: 'Form',
      disclosure: 'advanced',
      validation: { maxLength: 50 },
    },
    {
      key: 'successMessage',
      type: 'text',
      label: 'Success Message',
      placeholder: 'Thank you for subscribing!',
      group: 'Form',
      disclosure: 'advanced',
      validation: { maxLength: 200 },
    },
  ],
  fieldGroups: [
    { id: 'Settings', label: 'Settings', defaultExpanded: true },
    { id: 'Content', label: 'Content', defaultExpanded: true },
    { id: 'Form', label: 'Form', defaultExpanded: false },
  ],
  getDefaultData: () => ({
    enabled: true,
    title: 'STAY CONNECTED',
    description: 'Get the latest news, releases and gig updates.',
    placeholder: 'your@email.com',
    buttonText: 'SUBSCRIBE',
    successMessage: 'Thank you for subscribing!',
  }),
}

registerAdminSection(newsletterSectionSchema)

export { newsletterSectionSchema }
