import { lazy, Suspense } from 'react'

const CmsDashboard = lazy(() => import('./editors/CmsDashboard'))
const SiteConfigEditor = lazy(() => import('./editors/SiteConfigEditor'))
const SectionsManager = lazy(() => import('./editors/SectionsManager'))
const HeroEditor = lazy(() => import('./editors/HeroEditor'))
const BiographyEditor = lazy(() => import('./editors/BiographyEditor'))
const MembersEditor = lazy(() => import('./editors/MembersEditor'))
const ReleasesEditor = lazy(() => import('./editors/ReleasesEditor'))
const NewsEditor = lazy(() => import('./editors/NewsEditor'))
const SocialLinksEditor = lazy(() => import('./editors/SocialLinksEditor'))
const FooterEditor = lazy(() => import('./editors/FooterEditor'))
const NavigationEditor = lazy(() => import('./editors/NavigationEditor'))
const ThemeEditor = lazy(() => import('./editors/ThemeEditor'))
const MediaLibrary = lazy(() => import('./editors/MediaLibrary'))
const PreviewFrame = lazy(() => import('./editors/PreviewFrame'))
const InboxEditor = lazy(() => import('./editors/InboxEditor'))
const NewsletterEditor = lazy(() => import('./editors/NewsletterEditor'))
const TourSyncEditor = lazy(() => import('./editors/TourSyncEditor'))
const StorageEditor = lazy(() => import('./editors/StorageEditor'))
const SecurityDashboard = lazy(() => import('./editors/SecurityDashboard'))

const EditorFallback = (
  <div className="flex items-center justify-center h-64">
    <div className="animate-pulse space-y-3 w-full max-w-md px-8">
      <div className="bg-zinc-800 rounded h-8 w-48" />
      <div className="bg-zinc-800 rounded h-4 w-full" />
      <div className="bg-zinc-800 rounded h-4 w-3/4" />
    </div>
  </div>
)

function renderEditor(route: string) {
  if (route === 'cms' || route === 'cms/dashboard') return <CmsDashboard />
  if (route === 'cms/site-config') return <SiteConfigEditor />
  if (route === 'cms/pages/home') return <SectionsManager />
  if (route === 'cms/content/hero') return <HeroEditor />
  if (route === 'cms/content/biography') return <BiographyEditor />
  if (route === 'cms/content/members') return <MembersEditor />
  if (route === 'cms/content/releases') return <ReleasesEditor />
  if (route === 'cms/content/news') return <NewsEditor />
  if (route === 'cms/content/social') return <SocialLinksEditor />
  if (route === 'cms/content/footer') return <FooterEditor />
  if (route === 'cms/navigation') return <NavigationEditor />
  if (route === 'cms/theme') return <ThemeEditor />
  if (route === 'cms/media') return <MediaLibrary />
  if (route === 'cms/preview') return <PreviewFrame />
  if (route === 'cms/api/inbox') return <InboxEditor />
  if (route === 'cms/api/newsletter') return <NewsletterEditor />
  if (route === 'cms/api/tour') return <TourSyncEditor />
  if (route === 'cms/api/storage') return <StorageEditor />
  if (route === 'cms/api/security') return <SecurityDashboard />

  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[400px] gap-2">
      <span className="text-zinc-500 text-sm font-mono">Route nicht gefunden</span>
      <span className="text-zinc-700 text-xs font-mono">{route}</span>
    </div>
  )
}

interface CmsRouterProps {
  route: string
}

export function CmsRouter({ route }: CmsRouterProps) {
  return (
    <Suspense fallback={EditorFallback}>
      {renderEditor(route)}
    </Suspense>
  )
}
