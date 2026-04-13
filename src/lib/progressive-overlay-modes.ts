/**
 * Progressive overlay content loading modes to fix flickering issue.
 * These modes provide cyberpunk-style content reveal animations during loading.
 * 
 * The system works as follows:
 * 1. Existing overlay animations handle the opening transition
 * 2. Progressive modes handle the content loading phase
 * 3. No separate loading screen = no flickering
 */

import type { Transition, TargetAndTransition } from 'framer-motion'
import type { ProgressiveOverlayModes } from './types'

export interface ProgressiveMode {
  name: string
  /** Label to display during loading phase */
  getLabel: (overlayType?: string) => string
  /** CSS class for the progressive loading effect */
  className: string
  /** Framer Motion variants for the content container */
  containerVariants: {
    loading: TargetAndTransition
    loaded: TargetAndTransition
  }
  /** Transition configuration */
  transition: Transition
  /** Whether this mode requires special CSS animations (binary rain, etc.) */
  requiresCustomCSS: boolean
}

/**
 * Mode 1: Progressive Content Reveal
 * Phase 1: Container and frame appear (scanlines, HUD markers)
 * Phase 2: Placeholder skeletons for text/images
 * Phase 3: Content fills from top to bottom
 * Phase 4: Final glitch effects fade out
 */
const progressiveReveal: ProgressiveMode = {
  name: 'progressiveReveal',
  getLabel: (overlayType) => {
    switch (overlayType) {
      case 'terminal':
        return 'BOOTING TERMINAL SYSTEM...'
      case 'profile':
      case 'member':
        return 'LOADING PROFILE DATA...'
      case 'gallery':
        return 'STREAMING IMAGE DATA...'
      default:
        return 'INITIALIZING INTERFACE...'
    }
  },
  className: 'progressive-reveal',
  containerVariants: {
    loading: {
      opacity: 0,
      clipPath: 'inset(0 0 100% 0)',
      filter: 'brightness(1.3)',
    },
    loaded: {
      opacity: 1,
      clipPath: 'inset(0 0 0% 0)',
      filter: 'brightness(1)',
    },
  },
  transition: {
    duration: 0.8,
    ease: [0.16, 1, 0.3, 1],
  },
  requiresCustomCSS: true,
}

/**
 * Mode 2: Data Stream Loading
 * Binary code rain as placeholder (Matrix-style)
 * Individual lines "compile" to real content
 * Counter shows bytes/progress
 */
const dataStream: ProgressiveMode = {
  name: 'dataStream',
  getLabel: (overlayType) => {
    switch (overlayType) {
      case 'terminal':
        return 'DECRYPTING TERMINAL STREAM...'
      case 'profile':
      case 'member':
        return 'DECRYPTING PROFILE STREAM...'
      case 'gallery':
        return 'DECRYPTING IMAGE STREAM...'
      default:
        return 'DECRYPTING DATA STREAM...'
    }
  },
  className: 'data-stream',
  containerVariants: {
    loading: {
      opacity: 0,
      y: 20,
      filter: 'blur(4px)',
    },
    loaded: {
      opacity: 1,
      y: 0,
      filter: 'blur(0px)',
    },
  },
  transition: {
    duration: 1.2,
    ease: [0.25, 0.46, 0.45, 0.94],
  },
  requiresCustomCSS: true,
}

/**
 * Mode 3: Sector-by-Sector Assembly
 * Content divided into blocks/sectors
 * Each block loads individually with own progress bar
 * Blocks appear in random order
 */
const sectorAssembly: ProgressiveMode = {
  name: 'sectorAssembly',
  getLabel: () => 'ASSEMBLING SECTORS...',
  className: 'sector-assembly',
  containerVariants: {
    loading: {
      opacity: 0,
      scale: 0.95,
      filter: 'brightness(1.5)',
    },
    loaded: {
      opacity: 1,
      scale: 1,
      filter: 'brightness(1)',
    },
  },
  transition: {
    duration: 1.5,
    ease: [0.16, 1, 0.3, 1],
    staggerChildren: 0.15,
  },
  requiresCustomCSS: true,
}

/**
 * Mode 4: Holographic Materialization
 * Content appears as flickering hologram
 * RGB split effect at start
 * Stabilizes progressively (glitch → sharp)
 * Scan lines disappear gradually
 */
const holographicMaterialization: ProgressiveMode = {
  name: 'holographicMaterialization',
  getLabel: () => 'MATERIALIZING HOLOGRAM...',
  className: 'holographic-materialize',
  containerVariants: {
    loading: {
      opacity: 0,
      filter: 'brightness(2) saturate(1.5) hue-rotate(10deg)',
      textShadow: '2px 0 #ff0000, -2px 0 #00ffff',
    },
    loaded: {
      opacity: 1,
      filter: 'brightness(1) saturate(1) hue-rotate(0deg)',
      textShadow: '0 0 #ff0000, 0 0 #00ffff',
    },
  },
  transition: {
    duration: 1.8,
    ease: [0.25, 0.46, 0.45, 0.94],
  },
  requiresCustomCSS: true,
}

const allProgressiveModes: ProgressiveMode[] = [
  progressiveReveal,
  dataStream,
  sectorAssembly,
  holographicMaterialization,
]

/**
 * Get a random progressive mode based on admin settings.
 * Only selects from enabled modes.
 * Falls back to progressiveReveal if no modes are enabled.
 */
export function getRandomProgressiveMode(
  settings?: ProgressiveOverlayModes
): ProgressiveMode {
  // Default: all modes enabled
  const defaultSettings: ProgressiveOverlayModes = {
    progressiveReveal: true,
    dataStream: true,
    sectorAssembly: true,
    holographicMaterialization: true,
  }

  const activeSettings = settings || defaultSettings
  const enabledModes: ProgressiveMode[] = []

  if (activeSettings.progressiveReveal !== false) {
    enabledModes.push(progressiveReveal)
  }
  if (activeSettings.dataStream !== false) {
    enabledModes.push(dataStream)
  }
  if (activeSettings.sectorAssembly !== false) {
    enabledModes.push(sectorAssembly)
  }
  if (activeSettings.holographicMaterialization !== false) {
    enabledModes.push(holographicMaterialization)
  }

  // Fallback to progressiveReveal if no modes enabled
  if (enabledModes.length === 0) {
    return progressiveReveal
  }

  return enabledModes[Math.floor(Math.random() * enabledModes.length)]
}

/**
 * Get all available progressive modes (for testing/preview)
 */
export function getAllProgressiveModes(): ProgressiveMode[] {
  return allProgressiveModes
}

/**
 * Analyze content to determine number of sectors for sector-assembly mode
 */
export function analyzeContent(element?: HTMLElement): {
  imageCount: number
  textBlocks: number
  videoCount: number
  totalSectors: number
} {
  if (!element) {
    return { imageCount: 0, textBlocks: 0, videoCount: 0, totalSectors: 1 }
  }

  const images = element.querySelectorAll('img').length
  const videos = element.querySelectorAll('video').length
  const textBlocks = element.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li').length

  // Calculate total sectors (min 1, max 8)
  const total = Math.min(Math.max(1, Math.ceil((images + videos + textBlocks / 3) / 2)), 8)

  return {
    imageCount: images,
    textBlocks,
    videoCount: videos,
    totalSectors: total,
  }
}
