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
} from 'lucide-react'

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
  { label: 'Site-Konfiguration', route: 'cms/site-config', icon: <Settings size={16} /> },
  { label: 'Navigation', route: 'cms/navigation', icon: <NavIcon size={16} /> },
  { label: 'Theme', route: 'cms/theme', icon: <Palette size={16} /> },
  { label: 'Medien', route: 'cms/media', icon: <ImageIcon size={16} /> },
  { label: 'Vorschau', route: 'cms/preview', icon: <Eye size={16} /> },
]

const navGroups: NavGroup[] = [
  {
    label: 'Seiten',
    items: [
      { label: 'Startseite', route: 'cms/pages/home', icon: <Layers size={16} /> },
    ],
  },
  {
    label: 'Inhalte',
    items: [
      { label: 'Hero', route: 'cms/content/hero', icon: <Globe size={16} /> },
      { label: 'Biografie', route: 'cms/content/biography', icon: <FileText size={16} /> },
      { label: 'Mitglieder', route: 'cms/content/members', icon: <Users size={16} /> },
      { label: 'Releases', route: 'cms/content/releases', icon: <Music size={16} /> },
      { label: 'News', route: 'cms/content/news', icon: <Newspaper size={16} /> },
      { label: 'Social Links', route: 'cms/content/social', icon: <Share2 size={16} /> },
      { label: 'Footer', route: 'cms/content/footer', icon: <FileText size={16} /> },
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
          aria-label={`Gruppe ${group.label} ${open ? 'schließen' : 'öffnen'}`}
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

      {/* Logout */}
      {onLogout && (
        <div className="p-3 border-t border-zinc-800">
          <button
            type="button"
            onClick={onLogout}
            className="flex items-center gap-2.5 w-full px-3 py-2 rounded text-sm text-zinc-500 hover:text-red-400 hover:bg-red-900/20 transition-colors"
            aria-label="Abmelden"
          >
            <LogOut size={16} />
            <span>Abmelden</span>
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
        aria-label="CMS Seitenleiste"
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
        aria-label="Menü öffnen"
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
              aria-label="Menü schließen"
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
