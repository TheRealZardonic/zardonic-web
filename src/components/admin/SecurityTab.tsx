import {
  Key,
  ShieldWarning,
  ShieldCheck,
  ProhibitInset,
  Users,
} from '@phosphor-icons/react'
import { TabsContent } from '@/components/ui/tabs'

interface SecurityTabProps {
  hasPassword: boolean
  onOpenSecurityIncidents?: () => void
  onOpenSecuritySettings?: () => void
  onOpenBlocklist?: () => void
  onOpenSubscriberList?: () => void
  onClose: () => void
  onOpenPasswordDialog: () => void
}

export default function SecurityTab({
  hasPassword,
  onOpenSecurityIncidents,
  onOpenSecuritySettings,
  onOpenBlocklist,
  onOpenSubscriberList,
  onClose,
  onOpenPasswordDialog,
}: SecurityTabProps) {
  const items = [
    {
      icon: <ShieldWarning size={20} weight="bold" className="text-yellow-500" />,
      title: 'Security Incidents',
      desc: 'View and manage security events and alerts',
      action: onOpenSecurityIncidents,
    },
    {
      icon: <ShieldCheck size={20} weight="bold" className="text-green-500" />,
      title: 'Security Settings',
      desc: 'Configure rate limiting, IP blocking rules',
      action: onOpenSecuritySettings,
    },
    {
      icon: <ProhibitInset size={20} weight="bold" className="text-red-500" />,
      title: 'Blocklist',
      desc: 'Manage blocked IP addresses and patterns',
      action: onOpenBlocklist,
    },
    {
      icon: <Users size={20} weight="bold" className="text-blue-500" />,
      title: 'Subscribers',
      desc: 'View and manage newsletter subscribers',
      action: onOpenSubscriberList,
    },
    {
      icon: <Key size={20} weight="bold" className="text-primary" />,
      title: hasPassword ? 'Change Password' : 'Set Password',
      desc: hasPassword ? 'Update your admin panel password' : 'Set an admin panel password',
      action: onOpenPasswordDialog,
    },
  ]

  return (
    <TabsContent value="security" className="flex-1 overflow-y-auto p-4 space-y-3 mt-0">
      <h3 className="font-mono text-xs font-bold text-primary uppercase tracking-wider mb-4">
        Security Management
      </h3>
      {items.map(({ icon, title, desc, action }) =>
        action ? (
          <button
            key={title}
            onClick={() => {
              if (title === 'Change Password' || title === 'Set Password') {
                onOpenPasswordDialog()
              } else {
                onClose()
                action()
              }
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
    </TabsContent>
  )
}
