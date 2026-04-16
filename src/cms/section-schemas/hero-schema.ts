/**
 * Hero Section Schema
 *
 * Defines the admin-editable fields for AppHeroSection:
 * the full-bleed top-of-page section with artist name, background image, and CTA links.
 */

import { registerAdminSection } from '@/lib/admin-schema-registry'
import type { AdminSectionSchema } from '@/lib/admin-section-schema'

interface HeroSectionData {
  artistName: string
  heroImage: string
  heroImages: string[]
  heroImageOpacity: number
  heroImageBlur: number
  minHeight: string
  paddingTop: string
}

const heroSectionSchema: AdminSectionSchema<HeroSectionData> = {
  sectionId: 'hero',
  group: 'content',
  label: 'Hero',
  icon: 'House',
  description: 'The full-bleed top section of the page with artist name, background image, and call-to-action links.',
  supportsPreview: true,
  fields: [
    {
      key: 'artistName',
      type: 'text',
      label: 'Artist Name',
      tooltip: 'The artist or band name displayed in large text in the hero section.',
      placeholder: 'ZARDONIC',
      required: true,
      group: 'Identity',
      validation: { minLength: 1, maxLength: 100 },
    },
    {
      key: 'heroImage',
      type: 'image',
      label: 'Background Image',
      tooltip: 'Full-bleed background image for the hero section. Minimum 1920×1080 recommended.',
      placeholder: 'https://...',
      group: 'Visuals',
    },
    {
      key: 'heroImages',
      type: 'array',
      label: 'Additional Background Images',
      tooltip: 'Up to 4 extra images that rotate in a crossfade slideshow with the main background image.',
      group: 'Visuals',
      disclosure: 'advanced',
      arrayItemSchema: [
        {
          key: 'url',
          type: 'image',
          label: 'Image URL',
          placeholder: 'https://...',
        },
      ],
    },
    {
      key: 'heroImageOpacity',
      type: 'number',
      label: 'Image Opacity',
      tooltip: 'Opacity of the hero background image. 0 = transparent, 1 = fully visible.',
      group: 'Visuals',
      defaultValue: 0.5,
      validation: { min: 0, max: 1 },
    },
    {
      key: 'heroImageBlur',
      type: 'number',
      label: 'Image Blur (px)',
      tooltip: 'Blur amount applied to the background image. 0 = sharp, higher = more blurred.',
      group: 'Visuals',
      disclosure: 'advanced',
      defaultValue: 0,
      validation: { min: 0, max: 20 },
    },
    {
      key: 'minHeight',
      type: 'select',
      label: 'Minimum Height',
      tooltip: 'Minimum height of the hero section relative to the viewport.',
      group: 'Layout',
      disclosure: 'advanced',
      defaultValue: 'min-h-screen',
      options: [
        { label: 'Full screen (100vh)', value: 'min-h-screen' },
        { label: '80% viewport', value: 'min-h-[80vh]' },
        { label: '60% viewport', value: 'min-h-[60vh]' },
        { label: '50% viewport', value: 'min-h-[50vh]' },
      ],
    },
    {
      key: 'paddingTop',
      type: 'select',
      label: 'Top Padding',
      tooltip: 'Vertical space between the top of the page and the hero content.',
      group: 'Layout',
      disclosure: 'advanced',
      defaultValue: 'pt-20',
      options: [
        { label: 'None', value: 'pt-0' },
        { label: 'Small (20px)', value: 'pt-5' },
        { label: 'Medium (40px)', value: 'pt-10' },
        { label: 'Large (80px)', value: 'pt-20' },
        { label: 'XL (120px)', value: 'pt-32' },
      ],
    },
  ],
  fieldGroups: [
    { id: 'Identity', label: 'Identity', defaultExpanded: true },
    { id: 'Visuals', label: 'Visuals', defaultExpanded: true },
    { id: 'Layout', label: 'Layout', defaultExpanded: false },
  ],
  getDefaultData: () => ({
    artistName: '',
    heroImage: '',
    heroImages: [],
    heroImageOpacity: 0.5,
    heroImageBlur: 0,
    minHeight: 'min-h-screen',
    paddingTop: 'pt-20',
  }),
}

registerAdminSection(heroSectionSchema)

export { heroSectionSchema }
