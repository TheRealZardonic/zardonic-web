/**
 * AdminShell
 *
 * The unified admin layout that replaces the old dual-system approach.
 * Provides:
 *   - Schema-driven sidebar auto-generated from `getSections()` (AdminSchemaRegistry)
 *   - Routing for `admin/*` schema-based routes + legacy `cms/*` routes
 *   - Collapsible sidebar with section grouping
 *   - Optional live-preview pane alongside the schema editor
 *   - Dashboard overview at `/admin`
 *
 * Architecture:
 *   AdminShell
 *   ├── AdminShellSidebar     (schema-driven nav + legacy CMS nav)
 *   ├── Main content area
 *   │   ├── AdminDashboard    (route: admin / admin/dashboard)
 *   │   ├── AdminSectionEditor(route: admin/:sectionId)
 *   │   └── CmsRouter         (fallthrough for legacy cms/* routes)
 *   └── LivePreviewPane       (shown when editing a section with supportsPreview)
 *
 * Entry:
 *   Used by `CmsApp.tsx` as the top-level layout after authentication.
 */

import { useState, useCallback, lazy, Suspense } from 'react'
import {
  List,
  X,
  SquaresFour,
  SignOut,
  CaretDown,
  CaretRight,
  Eye,
  EyeSlash,
  Palette,
  Image as ImageIcon,
  Eye as EyeIcon,
  Gear,
  FolderOpen,
  ShieldCheck,
  Bell,
  CalendarBlank,
  Envelope as EnvelopeIcon,
} from '@phosphor-icons/react'
// Ensure all schemas are registered before calling getSections()
import '@/cms/section-schemas'
import { getSections } from '@/lib/admin-schema-registry'
import type { AdminSectionSchema } from '@/lib/admin-section-schema'
import { useCmsRoute } from '@/cms/hooks/useCmsRoute'
import { SchemaIcon } from '@/cms/components/SchemaIcon'
import { AdminDashboard } from '@/cms/components/AdminDashboard'
import { LivePreviewPane } from '@/cms/components/LivePreviewPane'

// Lazy-load the heavy section editor to keep initial bundle small
const AdminSectionEditor = lazy(() =>
  import('@/cms/components/AdminSectionEditor').then(m => ({ default: m.AdminSectionEditor })),
)

// Legacy CMS router for backward-compatible routes
const CmsRouter = lazy(() =>
  import('@/cms/CmsRouter').then(m => ({ default: m.CmsRouter })),
)

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AdminShellProps {
  /** Called when the user logs out. */
  logout: () => Promise<void>
}

// ─── Section grouping ─────────────────────────────────────────────────────────

interface SidebarGroup {
  id: string
  label: string
  sectionIds: string[]
}

const SIDEBAR_GROUPS: SidebarGroup[] = [
  { id: 'content', label: 'Content', sectionIds: ['hero', 'bio', 'music', 'releases', 'gigs', 'social', 'contact'] },
  { id: 'media', label: 'Media', sectionIds: ['gallery', 'media'] },
  { id: 'configuration', label: 'Configuration', sectionIds: ['shell', 'partners', 'sponsoring', 'credit-highlights'] },
  { id: 'legal', label: 'Legal', sectionIds: ['footer', 'impressum'] },
]

// ─── Route helpers ────────────────────────────────────────────────────────────

function isAdminRoute(route: string): boolean {
  return route === 'admin' || route === 'admin/dashboard' || route.startsWith('admin/')
}

function getActiveSectionId(route: string): string | null {
  if (!route.startsWith('admin/') || route === 'admin/dashboard') return null
  const sectionId = route.slice('admin/'.length)
  return sectionId || null
}

// ─── Loading fallback ─────────────────────────────────────────────────────────

function EditorLoadingFallback() {
  return (
    <div className="flex-1 p-6 space-y-4 animate-pulse" aria-busy="true" aria-label="Loading editor">
      <div className="bg-zinc-800 rounded h-10 w-full max-w-lg" />
      <div className="bg-zinc-800 rounded h-6 w-full max-w-md" />
      <div className="bg-zinc-800 rounded h-4 w-full" />
      <div className="bg-zinc-800 rounded h-32 w-full max-w-2xl mt-4" />
    </div>
  )
}

// ─── AdminShell ───────────────────────────────────────────────────────────────

/**
 * Unified admin shell layout. Entry point after CMS authentication.
 */
export function AdminShell({ logout }: AdminShellProps) {
  const [route, navigate] = useCmsRoute()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [previewOpen, setPreviewOpen] = useState(false)

  const sections = getSections()
  const activeSectionId = getActiveSectionId(route)
  const activeSchema = activeSectionId ? sections.find(s => s.sectionId === activeSectionId) : null
  const isDashboard = route === 'admin' || route === 'admin/dashboard' || route === ''

  const handleNavigate = useCallback((newRoute: string) => {
    navigate(newRoute)
    // Close preview when navigating away from a section editor so it
    // doesn't stay open when the user lands on the dashboard or CMS routes.
    if (!isAdminRoute(newRoute) || newRoute === 'admin' || newRoute === 'admin/dashboard') {
      setPreviewOpen(false)
    }
  }, [navigate])

  const handlePreviewDataChange = useCallback((_data: Record<string, unknown>) => {
    // Reserved for future real-time preview support.
    // The iframe-based LivePreviewPane currently shows the live published site.
  }, [])

  // Determine main content
  const showAdminSection = isAdminRoute(route) && activeSectionId !== null
  const showDashboard = isDashboard || route === 'admin'
  const showLegacyCms = !isAdminRoute(route) && !isDashboard

  return (
    <div className="flex h-screen bg-[#0a0a0a] overflow-hidden" data-cms-shell>
      {/* Sidebar */}
      <AdminShellSidebar
        sections={sections}
        route={route}
        open={sidebarOpen}
        onNavigate={handleNavigate}
        onToggle={() => setSidebarOpen(v => !v)}
        onLogout={() => void logout()}
      />

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <AdminShellHeader
          route={route}
          activeSectionId={activeSectionId}
          activeSchema={activeSchema ?? null}
          sidebarOpen={sidebarOpen}
          previewOpen={previewOpen}
          supportsPreview={activeSchema?.supportsPreview ?? false}
          onToggleSidebar={() => setSidebarOpen(v => !v)}
          onTogglePreview={() => setPreviewOpen(v => !v)}
          onNavigate={handleNavigate}
        />

        {/* Editor / dashboard area */}
        <div className="flex flex-1 min-h-0 overflow-hidden">
          <main
            id="admin-main-content"
            className="flex-1 flex flex-col min-w-0 overflow-hidden"
          >
            <Suspense fallback={<EditorLoadingFallback />}>
              {showDashboard && (
                <AdminDashboard
                  onNavigate={(id) => handleNavigate(`admin/${id}`)}
                />
              )}
              {showAdminSection && activeSectionId && (
                <AdminSectionEditor
                  key={activeSectionId}
                  sectionId={activeSectionId}
                  onPreviewDataChange={handlePreviewDataChange}
                />
              )}
              {showLegacyCms && (
                <CmsRouter route={route} />
              )}
            </Suspense>
          </main>

          {/* Live preview pane */}
          {previewOpen && activeSectionId && (
            <LivePreviewPane
              sectionId={activeSectionId}
              supportsPreview={activeSchema?.supportsPreview ?? false}
              className="w-[420px] shrink-0 hidden lg:flex lg:flex-col"
            />
          )}
        </div>
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/60"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}
    </div>
  )
}

// ─── AdminShellHeader ─────────────────────────────────────────────────────────

interface AdminShellHeaderProps {
  route: string
  activeSectionId: string | null
  activeSchema: AdminSectionSchema | null
  sidebarOpen: boolean
  previewOpen: boolean
  supportsPreview: boolean
  onToggleSidebar: () => void
  onTogglePreview: () => void
  onNavigate: (route: string) => void
}

function AdminShellHeader({
  route,
  activeSectionId,
  activeSchema,
  sidebarOpen,
  previewOpen,
  supportsPreview,
  onToggleSidebar,
  onTogglePreview,
  onNavigate,
}: AdminShellHeaderProps) {
  const isLegacyRoute = !isAdminRoute(route) && route !== '' && route !== 'admin'

  return (
    <header className="flex items-center gap-3 px-4 py-2.5 border-b border-zinc-800 bg-[#111] flex-shrink-0">
      {/* Sidebar toggle (mobile) */}
      <button
        type="button"
        onClick={onToggleSidebar}
        className="lg:hidden p-1.5 rounded text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
        aria-label={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
        aria-expanded={sidebarOpen}
      >
        {sidebarOpen ? <X size={18} /> : <List size={18} />}
      </button>

      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 flex-1 min-w-0">
        <button
          type="button"
          onClick={() => onNavigate('admin')}
          className="text-zinc-500 hover:text-zinc-300 font-mono text-xs transition-colors flex-shrink-0"
          aria-label="Go to dashboard"
        >
          Admin
        </button>
        {(activeSectionId || isLegacyRoute) && (
          <>
            <span className="text-zinc-700 text-xs flex-shrink-0" aria-hidden="true">/</span>
            <span className="text-zinc-300 font-mono text-xs truncate" aria-current="page">
              {activeSchema?.label ?? (isLegacyRoute ? route : activeSectionId)}
            </span>
          </>
        )}
      </nav>

      {/* Preview toggle (only for schema sections that support preview) */}
      {activeSectionId && (
        <button
          type="button"
          onClick={onTogglePreview}
          disabled={!supportsPreview}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded border text-xs font-mono transition-colors ${
            previewOpen && supportsPreview
              ? 'border-red-500/40 bg-red-900/10 text-red-400'
              : supportsPreview
              ? 'border-zinc-700 bg-transparent text-zinc-500 hover:text-zinc-200 hover:border-zinc-600'
              : 'border-zinc-800 text-zinc-700 cursor-not-allowed'
          }`}
          aria-label={previewOpen ? 'Hide preview' : 'Show preview'}
          aria-pressed={previewOpen}
          title={!supportsPreview ? 'Preview not available for this section' : undefined}
        >
          {previewOpen ? <EyeSlash size={14} /> : <Eye size={14} />}
          <span className="hidden sm:inline">Preview</span>
        </button>
      )}
    </header>
  )
}

// ─── AdminShellSidebar ────────────────────────────────────────────────────────

interface AdminShellSidebarProps {
  sections: AdminSectionSchema[]
  route: string
  open: boolean
  onNavigate: (route: string) => void
  onToggle: () => void
  onLogout: () => void
}

function AdminShellSidebar({
  sections,
  route,
  open,
  onNavigate,
  onToggle,
  onLogout,
}: AdminShellSidebarProps) {
  const sectionMap = new Map(sections.map(s => [s.sectionId, s]))
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    content: true,
    media: true,
    configuration: false,
    legacy: false,
    legal: false,
  })

  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => ({ ...prev, [groupId]: !prev[groupId] }))
  }

  const activeSectionId = getActiveSectionId(route)
  const isDashboard = route === 'admin' || route === 'admin/dashboard' || route === ''

  return (
    <aside
      className={`
        flex flex-col bg-[#0a0a0a] border-r border-zinc-800 h-screen
        transition-[width] duration-200 ease-out flex-shrink-0 will-change-[width]
        ${open ? 'w-56' : 'w-0 overflow-hidden'}
        lg:relative absolute left-0 top-0 z-50 lg:z-auto
      `}
      aria-label="Admin navigation"
      aria-hidden={!open}
    >
      {/* Logo / header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-zinc-800 flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-7 h-7 bg-red-600 rounded text-white font-mono font-bold text-sm select-none flex-shrink-0">
            Z
          </div>
          <div>
            <div className="text-zinc-100 font-mono text-xs font-semibold leading-tight">CMS Admin</div>
            <div className="text-zinc-600 font-mono text-[9px] uppercase tracking-widest">Content Manager</div>
          </div>
        </div>
        <button
          type="button"
          onClick={onToggle}
          className="p-1 rounded text-zinc-600 hover:text-zinc-400 transition-colors lg:hidden"
          aria-label="Close sidebar"
        >
          <X size={14} />
        </button>
      </div>

      {/* Navigation */}
      <nav
        className="flex-1 overflow-y-auto py-3 px-2 space-y-1"
        aria-label="Admin sections"
      >
        {/* Dashboard link */}
        <SidebarNavItem
          label="Dashboard"
          icon={<SquaresFour size={15} />}
          isActive={isDashboard}
          onClick={() => onNavigate('admin')}
        />

        {/* Schema-driven section groups */}
        {SIDEBAR_GROUPS.map(group => {
          const groupSections = group.sectionIds
            .map(id => sectionMap.get(id))
            .filter((s): s is AdminSectionSchema => s !== undefined)

          if (groupSections.length === 0) return null

          const isExpanded = expandedGroups[group.id] ?? true
          const hasActive = groupSections.some(s => s.sectionId === activeSectionId)

          return (
            <SidebarGroup
              key={group.id}
              label={group.label}
              isExpanded={isExpanded}
              hasActiveChild={hasActive}
              onToggle={() => toggleGroup(group.id)}
            >
              {groupSections.map(section => (
                <SidebarNavItem
                  key={section.sectionId}
                  label={section.label}
                  icon={
                    <SchemaIcon
                      iconName={section.icon}
                      size={14}
                      className="flex-shrink-0"
                    />
                  }
                  isActive={activeSectionId === section.sectionId}
                  onClick={() => onNavigate(`admin/${section.sectionId}`)}
                  indent
                  tooltip={section.description}
                />
              ))}
            </SidebarGroup>
          )
        })}

        {/* Ungrouped sections (future-proof) */}
        {(() => {
          const allGroupedIds = new Set(SIDEBAR_GROUPS.flatMap(g => g.sectionIds))
          const ungrouped = sections.filter(s => !allGroupedIds.has(s.sectionId))
          if (ungrouped.length === 0) return null
          return (
            <SidebarGroup
              label="Other"
              isExpanded={expandedGroups['other'] ?? false}
              hasActiveChild={ungrouped.some(s => s.sectionId === activeSectionId)}
              onToggle={() => toggleGroup('other')}
            >
              {ungrouped.map(section => (
                <SidebarNavItem
                  key={section.sectionId}
                  label={section.label}
                  icon={<SchemaIcon iconName={section.icon} size={14} />}
                  isActive={activeSectionId === section.sectionId}
                  onClick={() => onNavigate(`admin/${section.sectionId}`)}
                  indent
                  tooltip={section.description}
                />
              ))}
            </SidebarGroup>
          )
        })()}

        {/* Legacy CMS routes */}
        <SidebarGroup
          label="CMS Tools"
          isExpanded={expandedGroups['legacy'] ?? false}
          hasActiveChild={!isAdminRoute(route) && route !== ''}
          onToggle={() => toggleGroup('legacy')}
        >
          {LEGACY_NAV_ITEMS.map(item => (
            <SidebarNavItem
              key={item.route}
              label={item.label}
              icon={item.icon}
              isActive={route === item.route}
              onClick={() => onNavigate(item.route)}
              indent
            />
          ))}
        </SidebarGroup>
      </nav>

      {/* Logout */}
      <div className="p-3 border-t border-zinc-800 flex-shrink-0">
        <button
          type="button"
          onClick={onLogout}
          className="flex items-center gap-2 w-full px-3 py-2 rounded text-sm text-zinc-500 hover:text-red-400 hover:bg-red-900/20 transition-colors font-mono"
          aria-label="Log out"
        >
          <SignOut size={14} />
          <span className="text-xs">Log out</span>
        </button>
      </div>
    </aside>
  )
}

// ─── Sidebar building blocks ──────────────────────────────────────────────────

interface SidebarGroupProps {
  label: string
  isExpanded: boolean
  hasActiveChild: boolean
  onToggle: () => void
  children: React.ReactNode
}

function SidebarGroup({ label, isExpanded, hasActiveChild, onToggle, children }: SidebarGroupProps) {
  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        className="flex items-center justify-between w-full px-3 py-1.5 text-[10px] font-mono uppercase tracking-widest text-zinc-600 hover:text-zinc-400 transition-colors rounded"
        aria-expanded={isExpanded}
        aria-label={`Toggle ${label} group`}
      >
        <span className={hasActiveChild ? 'text-zinc-400' : ''}>{label}</span>
        {isExpanded ? <CaretDown size={10} /> : <CaretRight size={10} />}
      </button>
      {isExpanded && <div className="space-y-0.5 pb-1">{children}</div>}
    </div>
  )
}

interface SidebarNavItemProps {
  label: string
  icon: React.ReactNode
  isActive: boolean
  onClick: () => void
  indent?: boolean
  tooltip?: string
}

function SidebarNavItem({ label, icon, isActive, onClick, indent = false, tooltip }: SidebarNavItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={tooltip}
      className={`flex items-center gap-2 w-full rounded text-xs font-mono transition-colors text-left ${
        indent ? 'px-3 py-1.5 ml-1' : 'px-3 py-2'
      } ${
        isActive
          ? 'bg-red-600/20 text-red-400 border border-red-500/30'
          : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60'
      }`}
      aria-current={isActive ? 'page' : undefined}
    >
      <span className={isActive ? 'text-red-500' : 'text-zinc-500'}>{icon}</span>
      <span className="truncate">{label}</span>
    </button>
  )
}

// ─── Legacy CMS nav items ─────────────────────────────────────────────────────
// These map to the existing CmsRouter routes for backward compatibility.

interface LegacyNavItem {
  label: string
  route: string
  icon: React.ReactNode
}

const LEGACY_NAV_ITEMS: LegacyNavItem[] = [
  { label: 'Theme', route: 'cms/theme', icon: <Palette size={14} /> },
  { label: 'Media Library', route: 'cms/media', icon: <ImageIcon size={14} /> },
  { label: 'Preview', route: 'cms/preview', icon: <EyeIcon size={14} /> },
  { label: 'Site Config', route: 'cms/site-config', icon: <Gear size={14} /> },
  { label: 'Storage', route: 'cms/api/storage', icon: <FolderOpen size={14} /> },
  { label: 'Security', route: 'cms/api/security', icon: <ShieldCheck size={14} /> },
  { label: 'Newsletter', route: 'cms/api/newsletter', icon: <Bell size={14} /> },
  { label: 'Tour Sync', route: 'cms/api/tour', icon: <CalendarBlank size={14} /> },
  { label: 'Inbox', route: 'cms/api/inbox', icon: <EnvelopeIcon size={14} /> },
]
