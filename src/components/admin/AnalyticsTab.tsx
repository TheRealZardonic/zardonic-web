import { ChartLine, Envelope } from '@phosphor-icons/react'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import type { AdminSettings } from '@/lib/types'

interface AnalyticsTabProps {
  onOpenStats?: () => void
  onOpenContactInbox?: () => void
  onClose: () => void
  adminSettings?: AdminSettings | null
  setAdminSettings?: (s: AdminSettings) => void
}

export default function AnalyticsTab({
  onOpenStats,
  onOpenContactInbox,
  onClose,
  adminSettings,
  setAdminSettings,
}: AnalyticsTabProps) {
  const analytics = adminSettings?.analytics ?? {}

  const updateAnalytics = (patch: Partial<NonNullable<AdminSettings['analytics']>>) => {
    setAdminSettings?.({
      ...(adminSettings ?? {}),
      analytics: { ...analytics, ...patch },
    })
  }

  const items = [
    {
      icon: <ChartLine size={20} weight="bold" className="text-primary" />,
      title: 'Statistics Dashboard',
      desc: 'View site traffic, visitor analytics, and performance metrics',
      action: onOpenStats,
    },
    {
      icon: <Envelope size={20} weight="bold" className="text-blue-500" />,
      title: 'Contact Inbox',
      desc: 'Read and manage messages sent through the contact form',
      action: onOpenContactInbox,
    },
  ]

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4 mt-0">
      <h3 className="font-mono text-xs font-bold text-primary uppercase tracking-wider">
        Analytics &amp; Inbox
      </h3>

      {/* Analytics tracking controls */}
      <section className="space-y-3 p-3 bg-muted/30 rounded border border-border">
        <h4 className="font-mono text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Tracking Settings
        </h4>
        <div className="flex items-center justify-between">
          <div>
            <Label className="font-mono text-xs">Enable Analytics</Label>
            <p className="font-mono text-[10px] text-muted-foreground/70">
              Disable to stop all tracking and save bandwidth.
            </p>
          </div>
          <Switch
            checked={analytics.enabled !== false}
            onCheckedChange={(v) => updateAnalytics({ enabled: v })}
            disabled={!setAdminSettings}
          />
        </div>
        {analytics.enabled !== false && (
          <>
            <div className="flex items-center justify-between">
              <div>
                <Label className="font-mono text-xs">Track Page Views</Label>
                <p className="font-mono text-[10px] text-muted-foreground/70">
                  Record each page navigation.
                </p>
              </div>
              <Switch
                checked={analytics.trackPageViews !== false}
                onCheckedChange={(v) => updateAnalytics({ trackPageViews: v })}
                disabled={!setAdminSettings}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label className="font-mono text-xs">Track Events</Label>
                <p className="font-mono text-[10px] text-muted-foreground/70">
                  Record clicks, form submissions, and interactions.
                </p>
              </div>
              <Switch
                checked={analytics.trackEvents !== false}
                onCheckedChange={(v) => updateAnalytics({ trackEvents: v })}
                disabled={!setAdminSettings}
              />
            </div>
          </>
        )}
      </section>

      <Separator />

      {/* Links to analytics dashboards */}
      <div className="space-y-3">
        {items.map(({ icon, title, desc, action }) =>
          action ? (
            <button
              key={title}
              onClick={() => {
                onClose()
                action()
              }}
              className="w-full flex items-center gap-4 p-4 bg-background border border-border rounded-md hover:border-primary text-left transition-colors group"
            >
              <div className="shrink-0">{icon}</div>
              <div>
                <div className="font-mono text-sm font-bold group-hover:text-primary transition-colors">
                  {title}
                </div>
                <div className="font-mono text-xs text-muted-foreground">{desc}</div>
              </div>
            </button>
          ) : null,
        )}
      </div>
    </div>
  )
}
