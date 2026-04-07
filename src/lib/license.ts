/**
 * License tier utilities for Band Land.
 *
 * Tiers (ascending capability):
 *   free     — Base feature set; no premium themes or widgets
 *   premium  — All themes, widgets, and analytics
 *   agency   — Multi-site management
 */

import type { LicenseTier } from './activation'

export type { LicenseTier }

/**
 * Ordered list of tiers from lowest to highest capability.
 */
export const TIER_ORDER: LicenseTier[] = ['free', 'premium', 'agency']

/**
 * Human-readable display names for each tier.
 */
export const TIER_LABELS: Record<LicenseTier, string> = {
  free:    'Free',
  premium: 'Premium',
  agency:  'Agency',
}

/**
 * Features unlocked by each tier (cumulative — higher tiers include lower-tier features).
 */
export const TIER_FEATURES: Record<LicenseTier, string[]> = {
  free:    [],
  premium: ['premium-themes', 'premium-widgets', 'analytics'],
  agency:  ['premium-themes', 'premium-widgets', 'analytics', 'multi-site'],
}

/**
 * Returns true if `tier` meets or exceeds `required`.
 */
export function tierAtLeast(tier: LicenseTier, required: LicenseTier): boolean {
  return TIER_ORDER.indexOf(tier) >= TIER_ORDER.indexOf(required)
}

/**
 * Returns true if the given feature string is available for `tier`.
 */
export function hasFeature(tier: LicenseTier, feature: string): boolean {
  return TIER_FEATURES[tier]?.includes(feature) ?? false
}
