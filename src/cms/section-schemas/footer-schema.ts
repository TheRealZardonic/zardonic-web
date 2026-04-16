/**
 * Footer Section Schema
 *
 * Defines the admin-editable fields for AppFooter:
 * the page footer with copyright text, contact email, and additional links.
 */

import { registerAdminSection } from '@/lib/admin-schema-registry'
import type { AdminSectionSchema } from '@/lib/admin-section-schema'

interface FooterSectionData {
  copyrightText: string
  contactEmail: string
  additionalLinks: Array<{ label: string; url: string }>
  legalLinks: Array<{ label: string; url: string }>
}

const footerSectionSchema: AdminSectionSchema<FooterSectionData> = {
  sectionId: 'footer',
  group: 'legal',
  label: 'Footer',
  icon: 'Rows',
  description: 'The page footer. Configure copyright text, contact email, and footer links.',
  supportsPreview: false,
  fields: [
    {
      key: 'copyrightText',
      type: 'text',
      label: 'Copyright Text',
      tooltip: 'Copyright line displayed in the page footer (e.g. "© 2025 ZARDONIC").',
      placeholder: '© 2025 ZARDONIC',
      group: 'Content',
      validation: { maxLength: 500 },
    },
    {
      key: 'contactEmail',
      type: 'text',
      label: 'Contact Email',
      tooltip: 'Public contact email shown in the footer and used as reply-to for contact form emails.',
      placeholder: 'info@zardonic.com',
      group: 'Content',
      validation: {
        maxLength: 200,
        pattern: '^([^@\\s]+@[^@\\s]+\\.[^@\\s]+|$)',
        patternMessage: 'Must be a valid email address or empty.',
      },
    },
    {
      key: 'additionalLinks',
      type: 'array',
      label: 'Additional Links',
      tooltip: 'Extra navigation links displayed in the footer.',
      group: 'Links',
      disclosure: 'advanced',
      arrayItemSchema: [
        {
          key: 'label',
          type: 'text',
          label: 'Label',
          placeholder: 'Press Kit',
          required: true,
          validation: { maxLength: 100 },
        },
        {
          key: 'url',
          type: 'url',
          label: 'URL',
          placeholder: 'https://...',
          required: true,
        },
      ],
    },
    {
      key: 'legalLinks',
      type: 'array',
      label: 'Legal Links',
      tooltip: 'Legal page links shown in the footer (Privacy Policy, Impressum, etc.).',
      group: 'Links',
      disclosure: 'advanced',
      arrayItemSchema: [
        {
          key: 'label',
          type: 'text',
          label: 'Label',
          placeholder: 'Privacy Policy',
          required: true,
          validation: { maxLength: 100 },
        },
        {
          key: 'url',
          type: 'url',
          label: 'URL',
          placeholder: '#privacy',
          required: true,
        },
      ],
    },
  ],
  fieldGroups: [
    { id: 'Content', label: 'Content', defaultExpanded: true },
    { id: 'Links', label: 'Links', defaultExpanded: false },
  ],
  getDefaultData: () => ({
    copyrightText: '',
    contactEmail: '',
    additionalLinks: [],
    legalLinks: [],
  }),
}

registerAdminSection(footerSectionSchema)

export { footerSectionSchema }
