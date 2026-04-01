import { createRoot } from 'react-dom/client'
import { ErrorBoundary } from "react-error-boundary";
import { lazy, Suspense } from 'react'

import App from './App.tsx'
import { ErrorFallback } from './ErrorFallback.tsx'
import { LocaleProvider } from './contexts/LocaleContext.tsx'

import "./main.css"
import "./styles/theme.css"
import "./index.css"

const CmsApp = lazy(() => import('./cms/CmsApp'))

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
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <LocaleProvider>
        <App />
      </LocaleProvider>
    </ErrorBoundary>
  )
}

createRoot(document.getElementById('root')!).render(<Root />)
