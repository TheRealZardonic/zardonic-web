/**
 * Lazily-loaded Framer Motion feature bundle.
 *
 * Import this via a dynamic import as the `features` prop of `<LazyMotion>`:
 *
 * ```tsx
 * const loadFeatures = () => import('@/lib/motion-features').then(m => m.default)
 * <LazyMotion features={loadFeatures}>…</LazyMotion>
 * ```
 *
 * Vite will create a separate async chunk for this file, deferring the
 * heavier `domAnimation` feature set (gesture recognition, layout animations,
 * etc.) until after the first meaningful paint.
 */
export { domAnimation as default } from 'framer-motion'
