/**
 * Cyberpunk 2077-style overlay opening animations.
 * A random variant is selected each time an overlay opens.
 */

import type { Transition } from 'framer-motion'

export interface OverlayAnimation {
  name: string
  backdrop: {
    initial: Record<string, unknown>
    animate: Record<string, unknown>
    exit: Record<string, unknown>
    transition?: Transition
  }
  modal: {
    initial: Record<string, unknown>
    animate: Record<string, unknown>
    exit: Record<string, unknown>
    transition?: Transition
  }
  /** CSS class name for the unique overlay loading indicator */
  loaderClass: string
  /** Label shown next to the loading indicator */
  loaderLabel: string
}

const overlayAnimations: OverlayAnimation[] = [
  // 1. Circuit Break — clip-path reveal from center line outward
  {
    name: 'circuitBreak',
    loaderClass: 'overlay-loader-circuit',
    loaderLabel: 'CIRCUIT LINK',
    backdrop: {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit: { opacity: 0 },
      transition: { duration: 0.2 },
    },
    modal: {
      initial: { opacity: 0, clipPath: 'polygon(50% 0%, 50% 0%, 50% 100%, 50% 100%)', filter: 'brightness(2)' },
      animate: { opacity: 1, clipPath: 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)', filter: 'brightness(1)' },
      exit: { opacity: 0, clipPath: 'polygon(50% 0%, 50% 0%, 50% 100%, 50% 100%)', filter: 'brightness(2)' },
      transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] },
    },
  },

  // 2. System Boot — clip-path scan from top to bottom
  {
    name: 'systemBoot',
    loaderClass: 'overlay-loader-boot',
    loaderLabel: 'BOOTING SYSTEM',
    backdrop: {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit: { opacity: 0 },
      transition: { duration: 0.15 },
    },
    modal: {
      initial: { opacity: 0, clipPath: 'inset(0 0 100% 0)', filter: 'brightness(1.5)' },
      animate: { opacity: 1, clipPath: 'inset(0 0 0% 0)', filter: 'brightness(1)' },
      exit: { opacity: 0, clipPath: 'inset(100% 0 0 0)', filter: 'brightness(1.5)' },
      transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] },
    },
  },

  // 3. Glitch Scan — horizontal clip-path with hue flash (no movement)
  {
    name: 'glitchScan',
    loaderClass: 'overlay-loader-scan',
    loaderLabel: 'SCANNING SECTORS',
    backdrop: {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit: { opacity: 0 },
      transition: { duration: 0.15 },
    },
    modal: {
      initial: { opacity: 0, clipPath: 'inset(0 100% 0 0)', filter: 'brightness(2) hue-rotate(90deg)' },
      animate: { opacity: 1, clipPath: 'inset(0 0% 0 0)', filter: 'brightness(1) hue-rotate(0deg)' },
      exit: { opacity: 0, clipPath: 'inset(0 0 0 100%)', filter: 'brightness(2) hue-rotate(-90deg)' },
      transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] },
    },
  },

  // 4. Data Stream — clip-path reveal from bottom with brightness flash
  {
    name: 'dataStream',
    loaderClass: 'overlay-loader-blocks',
    loaderLabel: 'BUFFERING STREAM',
    backdrop: {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit: { opacity: 0 },
      transition: { duration: 0.2 },
    },
    modal: {
      initial: { opacity: 0, clipPath: 'inset(100% 0 0 0)', filter: 'brightness(2)' },
      animate: { opacity: 1, clipPath: 'inset(0 0 0 0)', filter: 'brightness(1)' },
      exit: { opacity: 0, clipPath: 'inset(0 0 100% 0)', filter: 'brightness(2)' },
      transition: { duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] },
    },
  },

  // 5. Neural Jack-In — opacity flash with chromatic filter
  {
    name: 'neuralJackIn',
    loaderClass: 'overlay-loader-pulse',
    loaderLabel: 'NEURAL JACK-IN',
    backdrop: {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit: { opacity: 0 },
      transition: { duration: 0.15 },
    },
    modal: {
      initial: { opacity: 0, filter: 'brightness(3) saturate(2) hue-rotate(45deg)' },
      animate: { opacity: 1, filter: 'brightness(1) saturate(1) hue-rotate(0deg)' },
      exit: { opacity: 0, filter: 'brightness(2) saturate(1.5) hue-rotate(-45deg)' },
      transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] },
    },
  },

  // 6. Hologram Materialize — diagonal clip-path reveal
  {
    name: 'hologramMaterialize',
    loaderClass: 'overlay-loader-holo',
    loaderLabel: 'MATERIALIZING',
    backdrop: {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit: { opacity: 0 },
      transition: { duration: 0.2 },
    },
    modal: {
      initial: { opacity: 0, clipPath: 'polygon(0 0, 0 0, 0 0, 0 0)', filter: 'brightness(2)' },
      animate: { opacity: 1, clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 100%)', filter: 'brightness(1)' },
      exit: { opacity: 0, clipPath: 'polygon(100% 100%, 100% 100%, 100% 100%, 100% 100%)', filter: 'brightness(2)' },
      transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] },
    },
  },

  // 7. Matrix Decode — center-out clip-path with hue-rotate
  {
    name: 'matrixDecode',
    loaderClass: 'overlay-loader-matrix',
    loaderLabel: 'DECODING MATRIX',
    backdrop: {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit: { opacity: 0 },
      transition: { duration: 0.2 },
    },
    modal: {
      initial: { opacity: 0, clipPath: 'inset(50% 50% 50% 50%)', filter: 'brightness(2) hue-rotate(180deg)' },
      animate: { opacity: 1, clipPath: 'inset(0% 0% 0% 0%)', filter: 'brightness(1) hue-rotate(0deg)' },
      exit: { opacity: 0, clipPath: 'inset(50% 50% 50% 50%)', filter: 'brightness(2) hue-rotate(-180deg)' },
      transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] },
    },
  },

  // 8. Ring Link — horizontal split reveal from center
  {
    name: 'ringLink',
    loaderClass: 'overlay-loader-ring',
    loaderLabel: 'ESTABLISHING LINK',
    backdrop: {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit: { opacity: 0 },
      transition: { duration: 0.2 },
    },
    modal: {
      initial: { opacity: 0, clipPath: 'inset(50% 0 50% 0)', filter: 'brightness(1.8)' },
      animate: { opacity: 1, clipPath: 'inset(0% 0 0% 0)', filter: 'brightness(1)' },
      exit: { opacity: 0, clipPath: 'inset(50% 0 50% 0)', filter: 'brightness(1.8)' },
      transition: { duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] },
    },
  },
]

/** Pick a random overlay animation variant */
export function getRandomOverlayAnimation(): OverlayAnimation {
  return overlayAnimations[Math.floor(Math.random() * overlayAnimations.length)]
}

/** Get all available animations (for testing/preview) */
export function getAllOverlayAnimations(): OverlayAnimation[] {
  return overlayAnimations
}
