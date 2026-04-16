/**
 * Contact Section Schema
 *
 * Defines the admin-editable fields for the contact form section.
 */

import { registerAdminSection } from '@/lib/admin-schema-registry'
import type { AdminSectionSchema } from '@/lib/admin-section-schema'

interface ContactSectionData {
  enabled: boolean
  title: string
  description: string
  emailForwardTo: string
  successMessage: string
  formNameLabel: string
  formNamePlaceholder: string
  formEmailLabel: string
  formEmailPlaceholder: string
  formSubjectLabel: string
  formSubjectPlaceholder: string
  formMessageLabel: string
  formMessagePlaceholder: string
  formButtonText: string
  contactSubjects: string[]
}

const contactSectionSchema: AdminSectionSchema<ContactSectionData> = {
  sectionId: 'contact',
  group: 'content',
  label: 'Contact',
  icon: 'Envelope',
  description: 'The contact form section. Configure the form fields, labels, and email forwarding.',
  supportsPreview: false,
  fields: [
    {
      key: 'enabled',
      type: 'boolean',
      label: 'Enable Contact Form',
      tooltip: 'Show or hide the contact form on the page.',
      group: 'Settings',
      defaultValue: true,
    },
    {
      key: 'emailForwardTo',
      type: 'text',
      label: 'Forward Messages To',
      tooltip: 'Email address that receives contact form submissions.',
      placeholder: 'you@example.com',
      group: 'Settings',
      validation: { maxLength: 200 },
    },
    {
      key: 'title',
      type: 'text',
      label: 'Form Title',
      tooltip: 'Heading displayed above the contact form.',
      placeholder: 'Get In Touch',
      group: 'Content',
      validation: { maxLength: 200 },
    },
    {
      key: 'description',
      type: 'textarea',
      label: 'Form Description',
      tooltip: 'Short introductory text shown above the form fields.',
      placeholder: 'Send us a message...',
      group: 'Content',
      validation: { maxLength: 1000 },
    },
    {
      key: 'successMessage',
      type: 'text',
      label: 'Success Message',
      tooltip: 'Confirmation message shown after a successful form submission.',
      placeholder: 'Message sent!',
      group: 'Content',
      validation: { maxLength: 200 },
    },
    {
      key: 'contactSubjects',
      type: 'array',
      label: 'Subject Presets',
      tooltip: 'Predefined subject options shown as a dropdown. Leave empty for a free-text subject field.',
      group: 'Content',
      disclosure: 'advanced',
      arrayItemSchema: [
        {
          key: 'subject',
          type: 'text',
          label: 'Subject',
          placeholder: 'Booking Inquiry',
          validation: { maxLength: 100 },
        },
      ],
    },
    {
      key: 'formNameLabel',
      type: 'text',
      label: 'Name Field Label',
      placeholder: 'Name',
      group: 'Form Labels',
      disclosure: 'advanced',
      validation: { maxLength: 50 },
    },
    {
      key: 'formNamePlaceholder',
      type: 'text',
      label: 'Name Field Placeholder',
      placeholder: 'Your name',
      group: 'Form Labels',
      disclosure: 'advanced',
      validation: { maxLength: 100 },
    },
    {
      key: 'formEmailLabel',
      type: 'text',
      label: 'Email Field Label',
      placeholder: 'Email',
      group: 'Form Labels',
      disclosure: 'advanced',
      validation: { maxLength: 50 },
    },
    {
      key: 'formEmailPlaceholder',
      type: 'text',
      label: 'Email Field Placeholder',
      placeholder: 'your@email.com',
      group: 'Form Labels',
      disclosure: 'advanced',
      validation: { maxLength: 100 },
    },
    {
      key: 'formSubjectLabel',
      type: 'text',
      label: 'Subject Field Label',
      placeholder: 'Subject',
      group: 'Form Labels',
      disclosure: 'advanced',
      validation: { maxLength: 50 },
    },
    {
      key: 'formSubjectPlaceholder',
      type: 'text',
      label: 'Subject Field Placeholder',
      placeholder: 'What is this about?',
      group: 'Form Labels',
      disclosure: 'advanced',
      validation: { maxLength: 100 },
    },
    {
      key: 'formMessageLabel',
      type: 'text',
      label: 'Message Field Label',
      placeholder: 'Message',
      group: 'Form Labels',
      disclosure: 'advanced',
      validation: { maxLength: 50 },
    },
    {
      key: 'formMessagePlaceholder',
      type: 'text',
      label: 'Message Field Placeholder',
      placeholder: 'Your message...',
      group: 'Form Labels',
      disclosure: 'advanced',
      validation: { maxLength: 200 },
    },
    {
      key: 'formButtonText',
      type: 'text',
      label: 'Submit Button Text',
      placeholder: 'Send',
      group: 'Form Labels',
      disclosure: 'advanced',
      validation: { maxLength: 50 },
    },
  ],
  fieldGroups: [
    { id: 'Settings', label: 'Settings', defaultExpanded: true },
    { id: 'Content', label: 'Content', defaultExpanded: true },
    { id: 'Form Labels', label: 'Form Labels', defaultExpanded: false },
  ],
  getDefaultData: () => ({
    enabled: true,
    title: 'Get In Touch',
    description: '',
    emailForwardTo: '',
    successMessage: 'Message sent!',
    formNameLabel: 'Name',
    formNamePlaceholder: 'Your name',
    formEmailLabel: 'Email',
    formEmailPlaceholder: 'your@email.com',
    formSubjectLabel: 'Subject',
    formSubjectPlaceholder: 'What is this about?',
    formMessageLabel: 'Message',
    formMessagePlaceholder: 'Your message...',
    formButtonText: 'Send',
    contactSubjects: [],
  }),
}

registerAdminSection(contactSectionSchema)

export { contactSectionSchema }
