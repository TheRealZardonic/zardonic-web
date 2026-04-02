import { useQuery } from '@tanstack/react-query'
import { useCmsRoute } from '../hooks/useCmsRoute'
import { Loader2, FileText, Users, Music, Newspaper, Share2, Anchor, Palette, Settings, Image, Layout, Eye } from 'lucide-react'

interface HealthResponse {
  status: string
  uptime?: number
  version?: string
}

async function fetchHealth(): Promise<HealthResponse> {
  const res = await fetch('/api/health', { credentials: 'include' })
  if (!res.ok) throw new Error(`Health check failed: ${res.status}`)
  return res.json() as Promise<HealthResponse>
}

interface QuickAction {
  label: string
  route: string
  icon: React.ReactNode
  description: string
}

const ACTIONS: QuickAction[] = [
  { label: 'Hero', route: 'cms/hero', icon: <Layout size={20} />, description: 'Edit hero section' },
  { label: 'Biography', route: 'cms/biography', icon: <FileText size={20} />, description: 'Edit band biography' },
  { label: 'Members', route: 'cms/members', icon: <Users size={20} />, description: 'Manage band members' },
  { label: 'Releases', route: 'cms/releases', icon: <Music size={20} />, description: 'Manage releases' },
  { label: 'News', route: 'cms/news', icon: <Newspaper size={20} />, description: 'Manage news articles' },
  { label: 'Social Links', route: 'cms/social-links', icon: <Share2 size={20} />, description: 'Edit social links' },
  { label: 'Navigation', route: 'cms/navigation', icon: <Anchor size={20} />, description: 'Edit navigation' },
  { label: 'Theme', route: 'cms/theme', icon: <Palette size={20} />, description: 'Customize theme' },
  { label: 'Site Config', route: 'cms/site-config', icon: <Settings size={20} />, description: 'Site settings' },
  { label: 'Media Library', route: 'cms/media', icon: <Image size={20} />, description: 'Manage media files' },
  { label: 'Sections', route: 'cms/sections', icon: <Layout size={20} />, description: 'Manage page sections' },
  { label: 'Preview', route: 'cms/preview', icon: <Eye size={20} />, description: 'Preview site' },
]

export default function CmsDashboard() {
  const [, navigate] = useCmsRoute()
  const { data: health, isLoading: healthLoading } = useQuery({
    queryKey: ['cms-health'],
    queryFn: fetchHealth,
    staleTime: 60_000,
    retry: 1,
  })

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-zinc-100 text-2xl font-bold">CMS Dashboard</h1>
        <p className="text-zinc-400 text-sm mt-1">Manage your site content</p>
      </div>

      <div className="bg-[#111] border border-zinc-800 rounded p-4 flex items-center gap-3">
        <div className="text-zinc-500 text-sm font-medium">System Status</div>
        {healthLoading ? (
          <Loader2 size={14} className="animate-spin text-zinc-500" />
        ) : health?.status === 'ok' || health?.status === 'healthy' ? (
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500" />
            <span className="text-green-400 text-sm">Operational</span>
            {health.version && <span className="text-zinc-600 text-xs">v{health.version}</span>}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500" />
            <span className="text-red-400 text-sm">Unavailable</span>
          </div>
        )}
      </div>

      <div>
        <h2 className="text-zinc-300 text-sm font-medium mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {ACTIONS.map(action => (
            <button
              key={action.route}
              type="button"
              onClick={() => navigate(action.route)}
              className="bg-[#111] border border-zinc-800 hover:border-zinc-600 rounded p-4 text-left transition-colors group"
            >
              <div className="text-red-500 group-hover:text-red-400 mb-2">{action.icon}</div>
              <p className="text-zinc-100 text-sm font-medium">{action.label}</p>
              <p className="text-zinc-500 text-xs mt-0.5">{action.description}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
