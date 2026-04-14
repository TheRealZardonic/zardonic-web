import { Suspense, useEffect } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ErrorBoundary, type FallbackProps } from 'react-error-boundary'
import { Toaster } from 'sonner'
import { useCmsAuth } from './hooks/useCmsAuth'
import { AdminShell } from './AdminShell'
import { CmsEditProvider } from './CmsEditContext'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

function CmsLoadingFallback() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
      <div className="space-y-3 w-64 animate-pulse">
        <div className="bg-zinc-800 rounded h-8 w-48 mx-auto" />
        <div className="bg-zinc-800 rounded h-4 w-full" />
        <div className="bg-zinc-800 rounded h-4 w-3/4" />
      </div>
    </div>
  )
}

function CmsErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-8">
      <div className="max-w-md w-full border border-red-500/30 rounded bg-[#111] p-6 space-y-4">
        <h2 className="text-red-400 font-mono text-sm uppercase tracking-widest">
          Error
        </h2>
        <pre className="text-zinc-400 text-xs font-mono overflow-auto max-h-40 bg-zinc-900 p-3 rounded border border-zinc-800">
          {error instanceof Error ? error.message : String(error)}
        </pre>
        <button
          type="button"
          onClick={resetErrorBoundary}
          className="w-full py-2 px-4 bg-red-600 hover:bg-red-700 text-white text-sm font-mono rounded transition-colors"
        >
          Reload
        </button>
      </div>
    </div>
  )
}

function RedirectToMain() {
  useEffect(() => {
    window.location.hash = ''
  }, [])
  return null
}

function CmsAuthGuard() {
  const { isAuthenticated, isLoading, logout } = useCmsAuth()

  if (isLoading) {
    return <CmsLoadingFallback />
  }

  if (!isAuthenticated) {
    return <RedirectToMain />
  }

  return (
    <CmsEditProvider>
      <AdminShell logout={logout} />
    </CmsEditProvider>
  )
}

export default function CmsApp() {
  return (
    <div data-admin-ui="true">
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary FallbackComponent={CmsErrorFallback}>
        <Suspense fallback={<CmsLoadingFallback />}>
          <CmsAuthGuard />
        </Suspense>
      </ErrorBoundary>
      <Toaster
        position="bottom-right"
        theme="dark"
        toastOptions={{
          classNames: {
            toast: 'bg-[#111] border border-zinc-800 text-zinc-100 font-mono text-xs',
            error: 'border-red-500/30',
            success: 'border-green-700/40',
          },
        }}
      />
    </QueryClientProvider>
    </div>
  )
}
