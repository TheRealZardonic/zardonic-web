/* eslint-disable react-refresh/only-export-components */
import { createRoot } from 'react-dom/client'
import { ErrorBoundary } from "react-error-boundary";
import { lazy, Suspense } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { LazyMotion } from 'framer-motion'

import App from './App.tsx'
import { ErrorFallback } from './ErrorFallback.tsx'
import { LenisProvider } from './contexts/LenisContext'

import "./main.css"
import "./styles/theme.css"
import "./index.css"

// Suppress non-error console output in production to avoid leaking
// internal structure, variable names, and API endpoint details.
if (import.meta.env.PROD) {
  const noop = () => {}
  console.log = noop
  console.warn = noop
  console.info = noop
  console.debug = noop
}

// Disable text selection on page load; re-enabled in admin edit mode.
document.body.classList.add('no-select')

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 5 * 60_000 },
  },
})

const CmsApp = lazy(() => import('./cms/CmsApp'))

// Async feature bundle: Vite splits this into a separate chunk so the heavier
// domAnimation features load after the first paint, not blocking it.
const loadMotionFeatures = () => import('@/lib/motion-features').then(m => m.default)

function isCmsRoute(): boolean {
  return window.location.hash.startsWith('#cms')
}

function Root() {
  if (isCmsRoute()) {
    return (
      <Suspense fallback={<div style={{ background: '#0a0a0a', minHeight: '100vh' }} />}>
        <CmsApp />
      </Suspense>
    )
  }
  return (
    // LazyMotion defers the domAnimation feature bundle to a separate async
    // chunk, reducing the initial JS parse cost. strict=false allows the few
    // remaining motion.* usages in lazy-loaded components to still work.
    <LazyMotion features={loadMotionFeatures} strict={false}>
      {/* LenisProvider initialises smooth scroll for the main site only.
          The CMS route (#cms) doesn't need Lenis — it has its own scrollable panels. */}
      <LenisProvider>
        <QueryClientProvider client={queryClient}>
          <ErrorBoundary FallbackComponent={ErrorFallback}>
            <App />
          </ErrorBoundary>
        </QueryClientProvider>
      </LenisProvider>
    </LazyMotion>
  )
}

createRoot(document.getElementById('root')!).render(<Root />)

// Mark the root as hydrated so the #root:not(.hydrated) opacity guard is
// lifted. This prevents the single-frame flash between browser HTML parse
// and the first React paint (FOUC fix, see index.html).
document.getElementById('root')?.classList.add('hydrated')
