import { useState } from 'react'
import * as Collapsible from '@radix-ui/react-collapsible'
import {
  LayoutDashboard,
  FileText,
  Layers,
  Image as ImageIcon,
  Globe,
  Navigation as NavIcon,
  Palette,
  Eye,
  Settings,
  Music,
  Users,
  Newspaper,
  Share2,
  ChevronDown,
  ChevronRight,
  Menu,
  X,
  LogOut,
  Pencil,
  Inbox,
  Mail,
  Calendar,
  HardDrive,
  Shield,
  Loader2,
  Check,
} from 'lucide-react'
import { useCmsEdit } from './CmsEditContext'
import { getFieldsForSchema, SCHEMA_ROUTE_MAP } from './schemas'
import { SchemaFormRenderer } from './components/SchemaFormRenderer'
import { useCmsContent } from './hooks/useCmsContent'

// ─── Schema-driven inline editor panel ───────────────────────────────────────

/** Schema-driven inline editor panel shown below the nav when a schema is active. */
function InlineEditorPanel({ schemaName }: { schemaName: string }) {
  const { data, save } = useCmsContent<Record<string, string | number | boolean>>(`zd-cms:${schemaName}`)
  const [values, setValues] = useState<Record<string, string | number | boolean>>({})
  const [isSaving, setIsSaving] = useState(false)

  // Seed local state once remote data arrives (first load only)
  const [seeded, setSeeded] = useState(false)
  if (!seeded && data !== null) {
    setValues(data)
    setSeeded(true)
  }

  const allFields = getFieldsForSchema(schemaName)

  if (allFields.length === 0) return null

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await save(values, false)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="border-t border-zinc-800 bg-[#0d0d0d]">
      <div className="px-3 py-2 flex items-center justify-between border-b border-zinc-800/50">
        <span className="text-xs font-mono uppercase tracking-widest text-zinc-500 flex items-center gap-1.5">
          <Pencil size={11} />
          {schemaName}
        </span>
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={isSaving}
          className="flex items-center gap-1 text-[10px] font-mono text-zinc-500 hover:text-zinc-200 disabled:opacity-50 transition-colors"
          aria-label="Save inline editor changes"
        >
          {isSaving ? <Loader2 size={10} className="animate-spin" /> : <Check size={10} />}
          Save
        </button>
      </div>

      <div className="px-2 py-3 max-h-80 overflow-y-auto">
        <SchemaFormRenderer
          fields={allFields}
          values={values}
          onChange={(path, val) => setValues(prev => ({ ...prev, [path]: val }))}
        />
      </div>
    </div>
  )
}


interface NavItem {
  label: string
  route: string
  icon: React.ReactNode
}

interface NavGroup {
  label: string
  items: NavItem[]
}

const topItems: NavItem[] = [
  { label: 'Dashboard', route: 'cms/dashboard', icon: <LayoutDashboard size={16} /> },
  { label: 'Site Config', route: 'cms/site-config', icon: <Settings size={16} /> },
  { label: 'Navigation', route: 'cms/navigation', icon: <NavIcon size={16} /> },
  { label: 'Theme', route: 'cms/theme', icon: <Palette size={16} /> },
  { label: 'Media', route: 'cms/media', icon: <ImageIcon size={16} /> },
  { label: 'Preview', route: 'cms/preview', icon: <Eye size={16} /> },
]

const navGroups: NavGroup[] = [
  {
    label: 'Pages',
    items: [
      { label: 'Home', route: 'cms/pages/home', icon: <Layers size={16} /> },
    ],
  },
  {
    label: 'Content',
    items: [
      { label: 'Hero', route: 'cms/content/hero', icon: <Globe size={16} /> },
      { label: 'Biography', route: 'cms/content/biography', icon: <FileText size={16} /> },
      { label: 'Members', route: 'cms/content/members', icon: <Users size={16} /> },
      { label: 'Releases', route: 'cms/content/releases', icon: <Music size={16} /> },
      { label: 'News', route: 'cms/content/news', icon: <Newspaper size={16} /> },
      { label: 'Social Links', route: 'cms/content/social', icon: <Share2 size={16} /> },
      { label: 'Footer', route: 'cms/content/footer', icon: <FileText size={16} /> },
    ],
  },
  {
    label: 'API & Services',
    items: [
      { label: 'Inbox', route: 'cms/api/inbox', icon: <Inbox size={16} /> },
      { label: 'Newsletter', route: 'cms/api/newsletter', icon: <Mail size={16} /> },
      { label: 'Tour & Live', route: 'cms/api/tour', icon: <Calendar size={16} /> },
      { label: 'Cloud Storage', route: 'cms/api/storage', icon: <HardDrive size={16} /> },
      { label: 'Security', route: 'cms/api/security', icon: <Shield size={16} /> },
    ],
  },
]

interface CmsSidebarProps {
  currentRoute: string
  onNavigate: (route: string) => void
  onLogout?: () => void
}

function NavLink({
  item,
  isActive,
  onClick,
}: {
  item: NavItem
  isActive: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'flex items-center gap-2.5 w-full px-3 py-2 rounded text-sm transition-colors text-left',
        isActive
          ? 'bg-red-600/20 text-red-400 border border-red-500/30'
          : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60',
      ].join(' ')}
      aria-current={isActive ? 'page' : undefined}
    >
      <span className={isActive ? 'text-red-500' : 'text-zinc-500'}>{item.icon}</span>
      <span>{item.label}</span>
    </button>
  )
}

function CollapsibleGroup({
  group,
  currentRoute,
  onNavigate,
}: {
  group: NavGroup
  currentRoute: string
  onNavigate: (route: string) => void
}) {
  const hasActive = group.items.some((i) => i.route === currentRoute)
  const [open, setOpen] = useState(true)

  return (
    <Collapsible.Root open={open} onOpenChange={setOpen}>
      <Collapsible.Trigger asChild>
        <button
          type="button"
          className="flex items-center justify-between w-full px-3 py-1.5 text-xs font-mono uppercase tracking-widest text-zinc-600 hover:text-zinc-400 transition-colors"
          aria-label={`Toggle group ${group.label}`}
        >
          <span className={hasActive ? 'text-zinc-400' : ''}>{group.label}</span>
          {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        </button>
      </Collapsible.Trigger>
      <Collapsible.Content className="overflow-hidden data-[state=closed]:animate-none">
        <div className="space-y-0.5 pb-2">
          {group.items.map((item) => (
            <NavLink
              key={item.route}
              item={item}
              isActive={currentRoute === item.route}
              onClick={() => onNavigate(item.route)}
            />
          ))}
        </div>
      </Collapsible.Content>
    </Collapsible.Root>
  )
}

function SidebarContent({
  currentRoute,
  onNavigate,
  onLogout,
}: CmsSidebarProps) {
  // Try to resolve the active schema for the current route for the inline editor
  const activeSchemaEntry = Object.entries(SCHEMA_ROUTE_MAP).find(([, route]) => route === currentRoute)
  const activeSchemaName = activeSchemaEntry?.[0] ?? null

  // CmsEditContext — returns default no-op context when used outside provider
  const editCtx = useCmsEdit()

  return (
    <div className="flex flex-col h-full">
      {/* Header / Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-zinc-800">
        <div className="flex items-center justify-center w-8 h-8 bg-red-600 rounded text-white font-mono font-bold text-sm select-none">
          Z
        </div>
        <div>
          <div className="text-zinc-100 font-mono text-sm font-semibold leading-tight">
            Zardonic CMS
          </div>
          <div className="text-zinc-600 font-mono text-[10px] uppercase tracking-widest">
            Admin Panel
          </div>
        </div>
      </div>

      {/* Currently-editing indicator (from CmsEditContext / PreviewFrame click) */}
      {editCtx?.editorOpen && editCtx.selectedPath && (
        <div className="flex items-center justify-between px-3 py-2 bg-red-900/10 border-b border-red-500/20">
          <span className="text-[10px] font-mono text-red-400 flex items-center gap-1.5 truncate">
            <Pencil size={10} />
            {editCtx.selectedPath}
          </span>
          <button
            type="button"
            onClick={() => editCtx.closeEditor()}
            className="text-zinc-600 hover:text-zinc-400 ml-2 flex-shrink-0"
            aria-label="Close inline editor"
          >
            <X size={12} />
          </button>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1" aria-label="CMS Navigation">
        {topItems.map((item) => (
          <NavLink
            key={item.route}
            item={item}
            isActive={
              currentRoute === item.route ||
              (item.route === 'cms/dashboard' &&
                (currentRoute === 'cms' || currentRoute === ''))
            }
            onClick={() => onNavigate(item.route)}
          />
        ))}

        <div className="pt-3 space-y-3">
          {navGroups.map((group) => (
            <CollapsibleGroup
              key={group.label}
              group={group}
              currentRoute={currentRoute}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      </nav>

      {/* Schema-driven inline editor for the currently active section */}
      {activeSchemaName && (
        <InlineEditorPanel schemaName={activeSchemaName} />
      )}

      {/* Logout */}
      {onLogout && (
        <div className="p-3 border-t border-zinc-800">
          <button
            type="button"
            onClick={onLogout}
            className="flex items-center gap-2.5 w-full px-3 py-2 rounded text-sm text-zinc-500 hover:text-red-400 hover:bg-red-900/20 transition-colors"
            aria-label="Log out"
          >
            <LogOut size={16} />
            <span>Log out</span>
          </button>
        </div>
      )}
    </div>
  )
}

export function CmsSidebar({ currentRoute, onNavigate, onLogout }: CmsSidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className="hidden md:flex flex-col w-56 shrink-0 bg-[#0a0a0a] border-r border-zinc-800 h-screen sticky top-0"
        aria-label="CMS Sidebar"
      >
        <SidebarContent
          currentRoute={currentRoute}
          onNavigate={onNavigate}
          onLogout={onLogout}
        />
      </aside>

      {/* Mobile: hamburger button */}
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        className="md:hidden fixed top-4 left-4 z-50 p-2 bg-[#111] border border-zinc-800 rounded text-zinc-400 hover:text-zinc-100"
        aria-label="Open menu"
      >
        <Menu size={20} />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-50 flex"
          role="dialog"
          aria-modal="true"
          aria-label="CMS Navigation"
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />

          {/* Slide-in panel */}
          <aside className="relative z-10 w-64 bg-[#0a0a0a] border-r border-zinc-800 h-full flex flex-col">
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="absolute top-4 right-4 p-1 text-zinc-500 hover:text-zinc-100"
              aria-label="Close menu"
            >
              <X size={18} />
            </button>
            <SidebarContent
              currentRoute={currentRoute}
              onNavigate={(route) => {
                onNavigate(route)
                setMobileOpen(false)
              }}
              onLogout={onLogout}
            />
          </aside>
        </div>
      )}
    </>
  )
}
