import { useQuery } from '@tanstack/react-query'
import { useCmsRoute } from '../hooks/useCmsRoute'
import { fetchEnvStatus, REQUIRED_ENV_VARS } from '@/lib/env-check'
import { Loader2, FileText, Users, Music, Newspaper, Share2, Anchor, Palette, Settings, Image, Layout, Eye, Inbox, Mail, Calendar, Shield, CheckCircle2, XCircle } from 'lucide-react'

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
  { label: 'Hero', route: 'cms/content/hero', icon: <Layout size={20} />, description: 'Edit hero section' },
  { label: 'Biography', route: 'cms/content/biography', icon: <FileText size={20} />, description: 'Edit band biography' },
  { label: 'Members', route: 'cms/content/members', icon: <Users size={20} />, description: 'Manage band members' },
  { label: 'Releases', route: 'cms/content/releases', icon: <Music size={20} />, description: 'Manage releases' },
  { label: 'News', route: 'cms/content/news', icon: <Newspaper size={20} />, description: 'Manage news articles' },
  { label: 'Social Links', route: 'cms/content/social', icon: <Share2 size={20} />, description: 'Edit social links' },
  { label: 'Navigation', route: 'cms/navigation', icon: <Anchor size={20} />, description: 'Edit navigation' },
  { label: 'Theme', route: 'cms/theme', icon: <Palette size={20} />, description: 'Customize theme' },
  { label: 'Site Config', route: 'cms/site-config', icon: <Settings size={20} />, description: 'Site settings' },
  { label: 'Media Library', route: 'cms/media', icon: <Image size={20} />, description: 'Manage media files' },
  { label: 'Sections', route: 'cms/pages/home', icon: <Layout size={20} />, description: 'Manage page sections' },
  { label: 'Preview', route: 'cms/preview', icon: <Eye size={20} />, description: 'Preview site' },
  { label: 'Inbox', route: 'cms/api/inbox', icon: <Inbox size={20} />, description: 'Contact form inbox' },
  { label: 'Newsletter', route: 'cms/api/newsletter', icon: <Mail size={20} />, description: 'Manage subscribers' },
  { label: 'Tour Sync', route: 'cms/api/tour', icon: <Calendar size={20} />, description: 'Sync tour dates' },
  { label: 'Security', route: 'cms/api/security', icon: <Shield size={20} />, description: 'Security settings' },
]

export default function CmsDashboard() {
  const [, navigate] = useCmsRoute()
  const { data: health, isLoading: healthLoading } = useQuery({
    queryKey: ['cms-health'],
    queryFn: fetchHealth,
    staleTime: 60_000,
    retry: 1,
  })
  const { data: envStatus, isLoading: envLoading } = useQuery({
    queryKey: ['cms-env-status'],
    queryFn: fetchEnvStatus,
    staleTime: 300_000,
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

      <div className="bg-[#111] border border-zinc-800 rounded p-4">
        <div className="text-zinc-500 text-sm font-medium mb-3">Service Configuration</div>
        {envLoading ? (
          <Loader2 size={14} className="animate-spin text-zinc-500" />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {REQUIRED_ENV_VARS.map(v => {
              const isSet = envStatus?.[v.key] ?? false
              return (
                <div key={v.key} className="flex items-start gap-2">
                  {isSet
                    ? <CheckCircle2 size={15} className="text-green-500 mt-0.5 shrink-0" />
                    : <XCircle size={15} className={`mt-0.5 shrink-0 ${v.required ? 'text-red-500' : 'text-zinc-600'}`} />
                  }
                  <div>
                    <p className="text-zinc-300 text-xs font-medium">{v.label}</p>
                    <p className="text-zinc-600 text-xs">{v.description}</p>
                  </div>
                </div>
              )
            })}
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
