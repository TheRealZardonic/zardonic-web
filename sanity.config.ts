/**
 * Sanity Studio Configuration
 *
 * Project: unz85dqo / Dataset: production
 * This file configures the embedded Sanity Studio.
 */
import { defineConfig } from 'sanity'
import { structureTool } from 'sanity/structure'
import { schemaTypes } from './sanity/schemas'

/**
 * Custom desk structure: Singletons as direct links, collections as lists.
 */
const singletonTypes = new Set(['siteSettings', 'adminSettings', 'legalContent', 'hudTexts', 'syncLog'])

const singletonActions = new Set(['publish', 'discardChanges', 'restore'])

export default defineConfig({
  name: 'zardonic-industrial',
  title: 'Zardonic Industrial CMS',
  projectId: 'unz85dqo',
  dataset: 'production',
  plugins: [
    structureTool({
      structure: (S) =>
        S.list()
          .title('Content')
          .items([
            // Singletons
            S.listItem()
              .title('Site Settings')
              .id('siteSettings')
              .child(
                S.document()
                  .schemaType('siteSettings')
                  .documentId('siteSettings')
              ),
            S.listItem()
              .title('Admin Settings')
              .id('adminSettings')
              .child(
                S.document()
                  .schemaType('adminSettings')
                  .documentId('adminSettings')
              ),
            S.listItem()
              .title('Legal Content')
              .id('legalContent')
              .child(
                S.document()
                  .schemaType('legalContent')
                  .documentId('legalContent')
              ),
            S.listItem()
              .title('HUD Texts')
              .id('hudTexts')
              .child(
                S.document()
                  .schemaType('hudTexts')
                  .documentId('hudTexts')
              ),
            S.listItem()
              .title('Sync Log')
              .id('syncLog')
              .child(
                S.document()
                  .schemaType('syncLog')
                  .documentId('syncLog')
              ),
            S.divider(),
            // Collections
            ...schemaTypes
              .filter((type) => !singletonTypes.has(type.name))
              .map((type) =>
                S.documentTypeListItem(type.name).title(type.title ?? type.name)
              ),
          ]),
    }),
  ],
  schema: {
    types: schemaTypes,
    // Filter out singleton types from the global "new document" menu
    templates: (templates) =>
      templates.filter(({ schemaType }) => !singletonTypes.has(schemaType)),
  },
  document: {
    // For singletons, only allow publish/discard (no duplicate/delete)
    actions: (input, context) =>
      singletonTypes.has(context.schemaType)
        ? input.filter(({ action }) => action && singletonActions.has(action))
        : input,
  },
})
