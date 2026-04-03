/**
 * Sanity Server Client
 *
 * Server-side Sanity client with write token for API routes.
 * NEVER import this file from frontend code — it contains the write token.
 */
import { createClient } from '@sanity/client'

const projectId = process.env.SANITY_PROJECT_ID || process.env.VITE_SANITY_PROJECT_ID || 'unz85dqo'
const dataset = process.env.SANITY_DATASET || process.env.VITE_SANITY_DATASET || 'production'
const apiVersion = '2024-01-01'

/**
 * Server-side Sanity client with write capabilities.
 * Uses the API token for mutations (creating/updating documents).
 */
export const sanityServerClient = createClient({
  projectId,
  dataset,
  apiVersion,
  useCdn: false, // No CDN for writes — always fresh
  token: process.env.SANITY_API_TOKEN,
})

/**
 * Read-only server client (no token, no CDN for freshness).
 * Used in API routes that only need to read data.
 */
export const sanityReadClient = createClient({
  projectId,
  dataset,
  apiVersion,
  useCdn: false,
})
