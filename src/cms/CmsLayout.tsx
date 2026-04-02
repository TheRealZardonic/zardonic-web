import { CheckCircle, Clock, AlertCircle } from 'lucide-react'

type PublishStatus = 'draft' | 'published' | 'autosaved' | 'unknown'

interface CmsLayoutProps {
  children: React.ReactNode
  currentRoute: string
  onNavigate: (route: string) => void
  publishStatus?: PublishStatus
  isTransitioning?: boolean
}

const ROUTE_LABELS: Record<string, string> = {
  'cms': 'Dashboard',
  'cms/dashboard': 'Dashboard',
  'cms/site-config': 'Site-Konfiguration',
  'cms/pages/home': 'Seiten › Startseite',
  'cms/content/hero': 'Inhalte › Hero',
  'cms/content/biography': 'Inhalte › Biografie',
  'cms/content/members': 'Inhalte › Mitglieder',
  'cms/content/releases': 'Inhalte › Releases',
  'cms/content/news': 'Inhalte › News',
  'cms/content/social': 'Inhalte › Social Links',
  'cms/content/footer': 'Inhalte › Footer',
  'cms/navigation': 'Navigation',
  'cms/theme': 'Theme',
  'cms/media': 'Medienbibliothek',
  'cms/preview': 'Vorschau',
}

function getBreadcrumb(route: string): string {
  return ROUTE_LABELS[route] ?? route
}

function PublishStatusBadge({ status }: { status: PublishStatus }) {
  if (status === 'published') {
    return (
      <span className="flex items-center gap-1.5 text-xs font-mono px-2.5 py-1 rounded-full border border-green-700/40 bg-green-900/20 text-green-400">
        <CheckCircle size={11} aria-hidden="true" />
        Veröffentlicht
      </span>
    )
  }
  if (status === 'draft') {
    return (
      <span className="flex items-center gap-1.5 text-xs font-mono px-2.5 py-1 rounded-full border border-zinc-700/40 bg-zinc-900/40 text-zinc-400">
        <AlertCircle size={11} aria-hidden="true" />
        Entwurf
      </span>
    )
  }
  if (status === 'autosaved') {
    return (
      <span className="flex items-center gap-1.5 text-xs font-mono px-2.5 py-1 rounded-full border border-blue-700/40 bg-blue-900/20 text-blue-400">
        <Clock size={11} aria-hidden="true" />
        Auto-gespeichert
      </span>
    )
  }
  return null
}

function LoadingSkeleton() {
  return (
    <div className="p-6 space-y-4 animate-pulse" aria-hidden="true">
      <div className="bg-zinc-800 rounded h-8 w-48" />
      <div className="bg-zinc-800 rounded h-4 w-full max-w-lg" />
      <div className="bg-zinc-800 rounded h-4 w-3/4 max-w-md" />
      <div className="bg-zinc-800 rounded h-32 w-full max-w-2xl mt-6" />
    </div>
  )
}

export function CmsLayout({
  children,
  currentRoute,
  onNavigate,
  publishStatus = 'unknown',
  isTransitioning = false,
}: CmsLayoutProps) {
  const breadcrumb = getBreadcrumb(currentRoute)

  return (
    <div className="flex flex-col h-full min-h-0 flex-1 bg-[#0a0a0a]">
      {/* Top bar */}
      <header className="flex items-center justify-between px-6 py-3 border-b border-zinc-800 bg-[#111] shrink-0">
        <nav aria-label="Breadcrumb">
          <ol className="flex items-center gap-2 text-sm">
            <li>
              <button
                type="button"
                onClick={() => onNavigate('cms/dashboard')}
                className="text-zinc-500 hover:text-zinc-300 font-mono text-xs transition-colors"
                aria-label="Zum Dashboard"
              >
                CMS
              </button>
            </li>
            {currentRoute !== 'cms' && currentRoute !== 'cms/dashboard' && (
              <>
                <li aria-hidden="true" className="text-zinc-700 text-xs">/</li>
                <li>
                  <span className="text-zinc-300 font-mono text-xs" aria-current="page">
                    {breadcrumb}
                  </span>
                </li>
              </>
            )}
          </ol>
        </nav>

        <div className="flex items-center gap-3">
          <PublishStatusBadge status={publishStatus} />
        </div>
      </header>

      {/* Main content area */}
      <main className="flex-1 overflow-auto" id="cms-main-content">
        {isTransitioning ? <LoadingSkeleton /> : children}
      </main>
    </div>
  )
}
