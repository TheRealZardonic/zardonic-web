import { useState } from 'react'
import { Shield } from 'lucide-react'
import BlocklistManagerDialog from '@/components/BlocklistManagerDialog'
import SecuritySettingsDialog from '@/components/SecuritySettingsDialog'

export default function SecurityDashboard() {
  const [blocklistOpen, setBlocklistOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-zinc-100 text-xl font-semibold flex items-center gap-2">
          <Shield size={20} className="text-red-500" />
          Security
        </h1>
        <p className="text-zinc-500 text-sm mt-1">
          Manage IP blocklists and security settings.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <button
          type="button"
          onClick={() => setBlocklistOpen(true)}
          className="bg-[#111] border border-zinc-800 hover:border-zinc-600 rounded p-5 text-left transition-colors group"
        >
          <div className="text-red-500 group-hover:text-red-400 mb-2">
            <Shield size={20} />
          </div>
          <p className="text-zinc-100 text-sm font-medium">IP Blocklist</p>
          <p className="text-zinc-500 text-xs mt-0.5">
            Manage blocked IP addresses and add new entries.
          </p>
        </button>

        <button
          type="button"
          onClick={() => setSettingsOpen(true)}
          className="bg-[#111] border border-zinc-800 hover:border-zinc-600 rounded p-5 text-left transition-colors group"
        >
          <div className="text-red-500 group-hover:text-red-400 mb-2">
            <Shield size={20} />
          </div>
          <p className="text-zinc-100 text-sm font-medium">Security Settings</p>
          <p className="text-zinc-500 text-xs mt-0.5">
            Configure rate limiting, bot detection, and other protections.
          </p>
        </button>
      </div>

      <BlocklistManagerDialog open={blocklistOpen} onClose={() => setBlocklistOpen(false)} />
      <SecuritySettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  )
}
