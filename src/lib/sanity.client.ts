/**
 * Sanity Client Configuration
 *
 * Creates a configured Sanity client for fetching data from the
 * Sanity Content Lake. Used by both the frontend and API routes.
 *
 * Environment variables:
 *   VITE_SANITY_PROJECT_ID  — Sanity project ID (public, embedded in client)
 *   VITE_SANITY_DATASET     — Sanity dataset name (public)
 *   SANITY_API_TOKEN         — Server-side write token (never exposed to client)
 */
import { createClient } from '@sanity/client'
import imageUrlBuilder from '@sanity/image-url'
import type { SanityImageSource } from '@sanity/image-url/lib/types/types'

// Public config — safe to embed in client bundle
const projectId = import.meta.env.VITE_SANITY_PROJECT_ID || 'unz85dqo'
const dataset = import.meta.env.VITE_SANITY_DATASET || 'production'
const apiVersion = '2024-01-01'

/**
 * Read-only Sanity client for the frontend.
 * Uses the CDN for fast, cached reads. No auth token.
 */
export const sanityClient = createClient({
  projectId,
  dataset,
  apiVersion,
  useCdn: true,
})

/**
 * Image URL builder for Sanity image assets.
 * Generates optimized image URLs with transformations.
 */
const builder = imageUrlBuilder(sanityClient)

/**
 * Build an image URL from a Sanity image reference.
 *
 * @example
 * ```ts
 * const url = urlFor(release.artwork).width(600).height(600).url()
 * ```
 */
export function urlFor(source: SanityImageSource) {
  return builder.image(source)
}

/**
 * Resolve an image to a URL string.
 * Handles both Sanity image references and plain URL strings (external).
 * Returns empty string for null/undefined input.
 */
export function resolveImageUrl(
  sanityImage: SanityImageSource | null | undefined,
  fallbackUrl?: string | null,
  width = 800
): string {
  if (sanityImage && typeof sanityImage === 'object' && 'asset' in sanityImage) {
    return urlFor(sanityImage).width(width).auto('format').url()
  }
  if (fallbackUrl) return fallbackUrl
  if (typeof sanityImage === 'string') return sanityImage
  return ''
}
