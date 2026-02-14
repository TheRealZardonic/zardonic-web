const DEFAULTS = {
  // Glitch Effects
  LOGO_GLITCH_PROBABILITY: 0.75,
  LOGO_GLITCH_DURATION_MS: 300,
  LOGO_GLITCH_INTERVAL_MS: 3000,
  SECTION_GLITCH_PROBABILITY: 0.8,
  SECTION_GLITCH_DURATION_MS: 300,
  SECTION_GLITCH_INTERVAL_MS: 4000,

  // Loader
  LOADER_PROGRESS_INTERVAL_MS: 150,
  LOADER_COMPLETE_DELAY_MS: 2000,

  // Chromatic Aberration
  CHROMATIC_OFFSET_PX: 3,
  CHROMATIC_ANIMATION_DURATION_S: 0.15,

  // Data Sync
  CACHE_TTL_MS: 86400000, // 24 hours
  INITIAL_SYNC_DELAY_MS: 30000,
  SYNC_INTERVAL_MS: 300000,

  // Animation Durations
  FADE_IN_DURATION_S: 0.8,
  SECTION_REVEAL_DURATION_S: 1.0,
  OVERLAY_TRANSITION_DURATION_S: 0.3,

  // Overlay Loading Sequence
  OVERLAY_LOADING_TEXT_INTERVAL_MS: 600,
  OVERLAY_GLITCH_PHASE_DELAY_MS: 1800,
  OVERLAY_REVEAL_PHASE_DELAY_MS: 2200,
} as const

export type ConfigKey = keyof typeof DEFAULTS

export const CONFIG_META: Record<
  ConfigKey,
  { label: string; description: string; group: string; type: 'number' }
> = {
  LOGO_GLITCH_PROBABILITY: {
    label: 'Logo Glitch Probability',
    description: 'Chance (0–1) a glitch fires on the logo each interval',
    group: 'Glitch Effects',
    type: 'number',
  },
  LOGO_GLITCH_DURATION_MS: {
    label: 'Logo Glitch Duration (ms)',
    description: 'How long the logo glitch effect lasts',
    group: 'Glitch Effects',
    type: 'number',
  },
  LOGO_GLITCH_INTERVAL_MS: {
    label: 'Logo Glitch Interval (ms)',
    description: 'Time between logo glitch checks',
    group: 'Glitch Effects',
    type: 'number',
  },
  SECTION_GLITCH_PROBABILITY: {
    label: 'Section Glitch Probability',
    description: 'Chance (0–1) a glitch fires on section headers each interval',
    group: 'Glitch Effects',
    type: 'number',
  },
  SECTION_GLITCH_DURATION_MS: {
    label: 'Section Glitch Duration (ms)',
    description: 'How long the section header glitch effect lasts',
    group: 'Glitch Effects',
    type: 'number',
  },
  SECTION_GLITCH_INTERVAL_MS: {
    label: 'Section Glitch Interval (ms)',
    description: 'Time between section header glitch checks',
    group: 'Glitch Effects',
    type: 'number',
  },
  LOADER_PROGRESS_INTERVAL_MS: {
    label: 'Loader Progress Interval (ms)',
    description: 'Interval between loader progress increments',
    group: 'Loader',
    type: 'number',
  },
  LOADER_COMPLETE_DELAY_MS: {
    label: 'Loader Complete Delay (ms)',
    description: 'Delay after progress reaches 100% before hiding the loader',
    group: 'Loader',
    type: 'number',
  },
  CHROMATIC_OFFSET_PX: {
    label: 'Chromatic Offset (px)',
    description: 'Pixel offset for the chromatic aberration effect',
    group: 'Chromatic Aberration',
    type: 'number',
  },
  CHROMATIC_ANIMATION_DURATION_S: {
    label: 'Chromatic Animation Duration (s)',
    description: 'Duration of the chromatic aberration animation',
    group: 'Chromatic Aberration',
    type: 'number',
  },
  CACHE_TTL_MS: {
    label: 'Cache TTL (ms)',
    description: 'Time-to-live for cached data before re-fetching',
    group: 'Data Sync',
    type: 'number',
  },
  INITIAL_SYNC_DELAY_MS: {
    label: 'Initial Sync Delay (ms)',
    description: 'Delay before the first background data sync',
    group: 'Data Sync',
    type: 'number',
  },
  SYNC_INTERVAL_MS: {
    label: 'Sync Interval (ms)',
    description: 'Interval between background data syncs',
    group: 'Data Sync',
    type: 'number',
  },
  FADE_IN_DURATION_S: {
    label: 'Fade-In Duration (s)',
    description: 'Duration of the initial fade-in animation',
    group: 'Animation Durations',
    type: 'number',
  },
  SECTION_REVEAL_DURATION_S: {
    label: 'Section Reveal Duration (s)',
    description: 'Duration of the section reveal animation on scroll',
    group: 'Animation Durations',
    type: 'number',
  },
  OVERLAY_TRANSITION_DURATION_S: {
    label: 'Overlay Transition Duration (s)',
    description: 'Duration of overlay open/close transitions',
    group: 'Animation Durations',
    type: 'number',
  },
  OVERLAY_LOADING_TEXT_INTERVAL_MS: {
    label: 'Overlay Loading Text Interval (ms)',
    description: 'Interval between loading text changes in overlay sequence',
    group: 'Overlay Loading Sequence',
    type: 'number',
  },
  OVERLAY_GLITCH_PHASE_DELAY_MS: {
    label: 'Overlay Glitch Phase Delay (ms)',
    description: 'Delay before entering glitch phase in overlay sequence',
    group: 'Overlay Loading Sequence',
    type: 'number',
  },
  OVERLAY_REVEAL_PHASE_DELAY_MS: {
    label: 'Overlay Reveal Phase Delay (ms)',
    description: 'Delay before entering reveal phase in overlay sequence',
    group: 'Overlay Loading Sequence',
    type: 'number',
  },
}

const overrides: Partial<Record<ConfigKey, number>> = {}

export function applyConfigOverrides(
  newOverrides: Record<string, unknown>
): void {
  for (const [key, value] of Object.entries(newOverrides)) {
    if (key in DEFAULTS && typeof value === 'number') {
      overrides[key as ConfigKey] = value
    }
  }
}

export function getConfigValues(): Record<ConfigKey, number> {
  return { ...DEFAULTS, ...overrides }
}

// Named exports for backward compatibility.
// These are compile-time default values. To read a runtime-overridden value
// use getConfigValues() which merges defaults with any admin-applied overrides.
export const LOGO_GLITCH_PROBABILITY = DEFAULTS.LOGO_GLITCH_PROBABILITY
export const LOGO_GLITCH_DURATION_MS = DEFAULTS.LOGO_GLITCH_DURATION_MS
export const LOGO_GLITCH_INTERVAL_MS = DEFAULTS.LOGO_GLITCH_INTERVAL_MS
export const SECTION_GLITCH_PROBABILITY = DEFAULTS.SECTION_GLITCH_PROBABILITY
export const SECTION_GLITCH_DURATION_MS = DEFAULTS.SECTION_GLITCH_DURATION_MS
export const SECTION_GLITCH_INTERVAL_MS = DEFAULTS.SECTION_GLITCH_INTERVAL_MS
export const LOADER_PROGRESS_INTERVAL_MS = DEFAULTS.LOADER_PROGRESS_INTERVAL_MS
export const LOADER_COMPLETE_DELAY_MS = DEFAULTS.LOADER_COMPLETE_DELAY_MS
export const CHROMATIC_OFFSET_PX = DEFAULTS.CHROMATIC_OFFSET_PX
export const CHROMATIC_ANIMATION_DURATION_S = DEFAULTS.CHROMATIC_ANIMATION_DURATION_S
export const CACHE_TTL_MS = DEFAULTS.CACHE_TTL_MS
export const INITIAL_SYNC_DELAY_MS = DEFAULTS.INITIAL_SYNC_DELAY_MS
export const SYNC_INTERVAL_MS = DEFAULTS.SYNC_INTERVAL_MS
export const FADE_IN_DURATION_S = DEFAULTS.FADE_IN_DURATION_S
export const SECTION_REVEAL_DURATION_S = DEFAULTS.SECTION_REVEAL_DURATION_S
export const OVERLAY_TRANSITION_DURATION_S = DEFAULTS.OVERLAY_TRANSITION_DURATION_S
export const OVERLAY_LOADING_TEXT_INTERVAL_MS = DEFAULTS.OVERLAY_LOADING_TEXT_INTERVAL_MS
export const OVERLAY_GLITCH_PHASE_DELAY_MS = DEFAULTS.OVERLAY_GLITCH_PHASE_DELAY_MS
export const OVERLAY_REVEAL_PHASE_DELAY_MS = DEFAULTS.OVERLAY_REVEAL_PHASE_DELAY_MS
