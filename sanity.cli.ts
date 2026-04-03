/**
 * Sanity CLI Configuration
 *
 * Used by the `sanity` CLI for deploying the studio,
 * extracting schemas, and running dataset operations.
 */
import { defineCliConfig } from 'sanity/cli'

export default defineCliConfig({
  api: {
    projectId: 'unz85dqo',
    dataset: 'production',
  },
})
