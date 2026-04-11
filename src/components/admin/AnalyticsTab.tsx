import { ChartLine, Envelope } from '@phosphor-icons/react'


interface AnalyticsTabProps {
  onOpenStats?: () => void
  onOpenContactInbox?: () => void
  onClose: () => void
}

export default function AnalyticsTab({ onOpenStats, onOpenContactInbox, onClose }: AnalyticsTabProps) {
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
    <div className="flex-1 overflow-y-auto p-4 space-y-3 mt-0">
      <h3 className="font-mono text-xs font-bold text-primary uppercase tracking-wider mb-4">
        Analytics &amp; Inbox
      </h3>
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
  )
}
