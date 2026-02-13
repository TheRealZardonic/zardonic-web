/**
 * Cyberpunk 2077-style overlay opening animations.
 * A random variant is selected each time an overlay opens.
 */

import type { Variants, Transition } from 'framer-motion'

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
  // 1. Classic Cyberpunk — 3D perspective flip in from below
  {
    name: 'perspectiveFlip',
    loaderClass: 'overlay-loader-ring',
    loaderLabel: 'ESTABLISHING LINK',
    backdrop: {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit: { opacity: 0 },
      transition: { duration: 0.25 },
    },
    modal: {
      initial: { opacity: 0, y: 80, rotateX: -25, scale: 0.85 },
      animate: { opacity: 1, y: 0, rotateX: 0, scale: 1 },
      exit: { opacity: 0, y: -40, rotateX: 15, scale: 0.9 },
      transition: { type: 'spring', damping: 22, stiffness: 280, opacity: { duration: 0.2 } },
    },
  },

  // 2. Glitch Scan — horizontal scan line reveal with jitter
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
      initial: { opacity: 0, scaleY: 0.01, scaleX: 1.1, filter: 'brightness(3) hue-rotate(90deg)' },
      animate: { opacity: 1, scaleY: 1, scaleX: 1, filter: 'brightness(1) hue-rotate(0deg)' },
      exit: { opacity: 0, scaleY: 0.01, scaleX: 1.1, filter: 'brightness(3) hue-rotate(-90deg)' },
      transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] },
    },
  },

  // 3. Data Stream — slide in from the right with digital dissolve
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
      initial: { opacity: 0, x: 300, skewY: -3, filter: 'blur(8px)' },
      animate: { opacity: 1, x: 0, skewY: 0, filter: 'blur(0px)' },
      exit: { opacity: 0, x: -200, skewY: 2, filter: 'blur(6px)' },
      transition: { type: 'spring', damping: 28, stiffness: 260, opacity: { duration: 0.15 } },
    },
  },

  // 4. Neural Jack-In — scale from center point with chromatic flash
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
      initial: { opacity: 0, scale: 0.3, filter: 'brightness(4) saturate(3)' },
      animate: { opacity: 1, scale: 1, filter: 'brightness(1) saturate(1)' },
      exit: { opacity: 0, scale: 0.5, filter: 'brightness(2) saturate(2)' },
      transition: { type: 'spring', damping: 18, stiffness: 350, filter: { duration: 0.4 } },
    },
  },

  // 5. Hologram Materialize — fade in from transparent with vertical stretch
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
      initial: { opacity: 0, scaleY: 0.6, scaleX: 0.95, y: 30, filter: 'blur(4px) brightness(2)' },
      animate: { opacity: 1, scaleY: 1, scaleX: 1, y: 0, filter: 'blur(0px) brightness(1)' },
      exit: { opacity: 0, scaleY: 0.7, scaleX: 1.05, y: -20, filter: 'blur(3px) brightness(1.5)' },
      transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] },
    },
  },

  // 6. Circuit Break — clip-path reveal from center line outward
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
      transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] },
    },
  },

  // 7. Matrix Drop — fall from above with bounce and digital noise
  {
    name: 'matrixDrop',
    loaderClass: 'overlay-loader-matrix',
    loaderLabel: 'DECODING MATRIX',
    backdrop: {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit: { opacity: 0 },
      transition: { duration: 0.2 },
    },
    modal: {
      initial: { opacity: 0, y: -200, rotateZ: -2, filter: 'brightness(3)' },
      animate: { opacity: 1, y: 0, rotateZ: 0, filter: 'brightness(1)' },
      exit: { opacity: 0, y: 100, rotateZ: 1, filter: 'brightness(2)' },
      transition: { type: 'spring', damping: 20, stiffness: 300, opacity: { duration: 0.15 } },
    },
  },

  // 8. System Boot — scan lines build from top to bottom
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
      initial: { opacity: 0, clipPath: 'polygon(0 0, 100% 0, 100% 0%, 0 0%)', filter: 'hue-rotate(180deg) brightness(1.5)' },
      animate: { opacity: 1, clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 100%)', filter: 'hue-rotate(0deg) brightness(1)' },
      exit: { opacity: 0, clipPath: 'polygon(0 100%, 100% 100%, 100% 100%, 0 100%)', filter: 'hue-rotate(-180deg) brightness(1.5)' },
      transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] },
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
