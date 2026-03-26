import { AnimatePresence, motion } from 'framer-motion'
import { ShieldCheck, ShieldWarning, Lock, Bug, Robot, Fingerprint, ChartLine, ProhibitInset, Package, BellRinging, X } from '@phosphor-icons/react'
import { Dialog, DialogClose, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { useState, useEffect, useMemo } from 'react'
import { toast } from 'sonner'

interface SecuritySettings {
  honeytokensEnabled: boolean
  rateLimitEnabled: boolean
  robotsTrapEnabled: boolean
  entropyInjectionEnabled: boolean
  suspiciousUaBlockingEnabled: boolean
  sessionBindingEnabled: boolean
  maxAlertsStored: number
  tarpitMinMs: number
  tarpitMaxMs: number
  sessionTtlSeconds: number
  threatScoringEnabled: boolean
  zipBombEnabled: boolean
  alertingEnabled: boolean
  hardBlockEnabled: boolean
  autoBlockThreshold: number
  warnThreshold: number
  tarpitThreshold: number
  pointsRobotsViolation: number
  pointsHoneytokenAccess: number
  pointsSuspiciousUa: number
  pointsMissingHeaders: number
  pointsGenericAccept: number
  pointsRateLimitExceeded: number
  discordWebhookUrl: string
  alertEmail: string
}

export const DEFAULT_SETTINGS: SecuritySettings = {
  honeytokensEnabled: true,
  rateLimitEnabled: true,
  robotsTrapEnabled: true,
  entropyInjectionEnabled: true,
  suspiciousUaBlockingEnabled: true,
  sessionBindingEnabled: true,
  maxAlertsStored: 500,
  tarpitMinMs: 3000,
  tarpitMaxMs: 8000,
  sessionTtlSeconds: 14400,
  threatScoringEnabled: true,
  zipBombEnabled: false,
  alertingEnabled: false,
  hardBlockEnabled: true,
  autoBlockThreshold: 12,
  warnThreshold: 3,
  tarpitThreshold: 7,
  pointsRobotsViolation: 3,
  pointsHoneytokenAccess: 5,
  pointsSuspiciousUa: 4,
  pointsMissingHeaders: 2,
  pointsGenericAccept: 1,
  pointsRateLimitExceeded: 2,
  discordWebhookUrl: '',
  alertEmail: '',
}

interface SecuritySettingsDialogProps {
  open: boolean
  onClose: () => void
}

interface ToggleRowProps {
  label: string
  description: string
  checked: boolean
  onChange: (v: boolean) => void
  icon?: React.ComponentType<{ size: number; className?: string }>
  badge?: string
}

function ToggleRow({ label, description, checked, onChange, icon: Icon, badge }: ToggleRowProps) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 border-b border-primary/5">
      <div className="flex items-start gap-3">
        {Icon && (
          <div className={`mt-0.5 ${checked ? 'text-primary/70' : 'text-primary/20'}`}>
            <Icon size={18} />
          </div>
        )}
        <div>
          <div className="flex items-center gap-2">
            <p className="font-mono text-[12px] text-foreground/85 uppercase tracking-wider">{label}</p>
            {badge && (
              <span className="px-1.5 py-0.5 text-xs font-mono font-bold tracking-wider bg-red-500/20 text-red-400 border border-red-500/30 rounded">
                {badge}
              </span>
            )}
          </div>
          <p className="text-[11px] text-primary/50 mt-1 leading-relaxed">{description}</p>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className={`font-mono text-xs tracking-wider ${checked ? 'text-green-400/70' : 'text-red-400/50'}`}>
          {checked ? 'ACTIVE' : 'DISABLED'}
        </span>
        <button
          onClick={() => onChange(!checked)}
          className={`relative w-11 h-6 rounded-full transition-colors ${
            checked ? 'bg-primary/60' : 'bg-primary/15'
          }`}
        >
          <div
            className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
              checked ? 'translate-x-[22px]' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>
    </div>
  )
}

interface SliderRowProps {
  label: string
  description: string
  value: number
  onChange: (v: number) => void
  min: number
  max: number
  step?: number
  unit?: string
}

function SliderRow({ label, description, value, onChange, min, max, step = 1, unit }: SliderRowProps) {
  return (
    <div className="py-3 border-b border-primary/5 space-y-2">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="font-mono text-[12px] text-foreground/85 uppercase tracking-wider">{label}</p>
          <p className="text-[11px] text-primary/50 mt-1 leading-relaxed">{description}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <input
            type="number"
            value={value}
            onChange={(e) => {
              const n = Number(e.target.value)
              if (!isNaN(n) && n >= min && n <= max) onChange(n)
            }}
            min={min}
            max={max}
            step={step}
            className="w-24 bg-black/50 border border-primary/20 px-2 py-1 font-mono text-[12px] text-foreground/80 text-right focus:border-primary/50 focus:outline-none"
          />
          {unit && <span className="text-xs font-mono text-primary/40 min-w-[2rem]">{unit}</span>}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className="font-mono text-xs text-primary/30 w-12 text-right">{min}{unit}</span>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="flex-1 h-1.5 accent-primary cursor-pointer"
        />
        <span className="font-mono text-xs text-primary/30 w-12">{max}{unit}</span>
      </div>
    </div>
  )
}

export default function SecuritySettingsDialog({ open, onClose }: SecuritySettingsDialogProps) {
  const [settings, setSettings] = useState<SecuritySettings>(DEFAULT_SETTINGS)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setLoading(true)
    setError(null)
    fetch('/api/security-settings', { credentials: 'same-origin' })
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
      .then(data => setSettings({ ...DEFAULT_SETTINGS, ...data.settings }))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [open])

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/security-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify(settings),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `HTTP ${res.status}`)
      }
      toast.success('Security settings saved')
    } catch (err) {
      toast.error(`Failed to save: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setSaving(false)
    }
  }

  const handleReset = () => {
    setSettings(DEFAULT_SETTINGS)
  }

  const update = <K extends keyof SecuritySettings>(key: K, value: SecuritySettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  const TOTAL_MODULES = 10
  const SECURITY_LEVEL_HIGH_THRESHOLD = 7
  const SECURITY_LEVEL_MEDIUM_THRESHOLD = 5

  const activeModules = useMemo(() => {
    const bools: (keyof SecuritySettings)[] = [
      'honeytokensEnabled', 'rateLimitEnabled', 'robotsTrapEnabled',
      'entropyInjectionEnabled', 'suspiciousUaBlockingEnabled', 'sessionBindingEnabled',
      'threatScoringEnabled', 'hardBlockEnabled', 'zipBombEnabled', 'alertingEnabled'
    ]
    return bools.filter(k => settings[k]).length
  }, [settings])

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="w-full max-w-2xl bg-card border border-primary/30 p-0 overflow-hidden flex flex-col max-h-[90dvh] [&>button:last-child]:hidden">
        <DialogTitle className="sr-only">Security Settings</DialogTitle>

        {/* HUD corners */}
        <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-primary/50 pointer-events-none" />
        <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-primary/50 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-primary/50 pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-primary/50 pointer-events-none" />

        {/* Header */}
        <div className="h-10 bg-primary/10 border-b border-primary/30 flex items-center justify-between px-4 flex-shrink-0">
          <div className="flex items-center gap-3">
            <ShieldCheck size={16} className="text-primary/70" />
            <span className="font-mono text-[11px] text-primary/70 tracking-wider uppercase">
              SECURITY SETTINGS // SERVER-SIDE CONFIG
            </span>
          </div>
          <DialogClose className="text-primary/60 hover:text-primary transition-colors font-mono text-xs tracking-wider uppercase flex items-center gap-1">
            <X size={12} /> CLOSE
          </DialogClose>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="w-4 h-4 border-2 border-primary/40 border-t-primary rounded-full animate-spin" />
              <span className="ml-3 font-mono text-[11px] text-primary/50">LOADING SETTINGS...</span>
            </div>
          )}

          {error && (
            <div className="border border-red-500/30 bg-red-500/10 p-4 text-center">
              <p className="font-mono text-[12px] text-red-400">FAILED TO LOAD: {error}</p>
            </div>
          )}

          {!loading && !error && (
            <>
              {/* Security status overview */}
              <div className="border border-primary/20 bg-primary/5 p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${activeModules >= SECURITY_LEVEL_HIGH_THRESHOLD ? 'bg-green-500' : activeModules >= SECURITY_LEVEL_MEDIUM_THRESHOLD ? 'bg-yellow-500' : 'bg-red-500'} animate-pulse`} />
                  <div>
                    <p className="font-mono text-[12px] text-foreground/85 uppercase">
                      SECURITY LEVEL: {activeModules >= SECURITY_LEVEL_HIGH_THRESHOLD ? 'HIGH' : activeModules >= SECURITY_LEVEL_MEDIUM_THRESHOLD ? 'MEDIUM' : 'LOW'}
                    </p>
                    <p className="font-mono text-xs text-primary/50 mt-0.5">
                      {activeModules}/{TOTAL_MODULES} defense modules active
                    </p>
                  </div>
                </div>
                <div className="flex gap-1">
                  {[...Array(TOTAL_MODULES)].map((_, i) => (
                    <div
                      key={i}
                      className={`w-1.5 h-4 ${i < activeModules ? 'bg-primary/60' : 'bg-primary/10'}`}
                    />
                  ))}
                </div>
              </div>

              {/* Info banner */}
              <div className="border border-primary/15 bg-primary/5 p-3">
                <p className="font-mono text-xs text-primary/50 leading-relaxed">
                  These settings are persisted server-side in encrypted storage. Changes take effect immediately
                  and are not included in the public band-data JSON export.
                </p>
              </div>

              {/* Toggle settings */}
              <div className="space-y-0">
                <h3 className="text-[11px] font-mono text-primary/50 tracking-wider mb-3 flex items-center gap-2">
                  <ShieldWarning size={14} />
                  DEFENSE MODULES
                </h3>
                <ToggleRow
                  icon={Bug}
                  label="Honeytoken Detection"
                  description="Decoy database records that trigger silent alarms on unauthorized access"
                  checked={settings.honeytokensEnabled}
                  onChange={(v) => update('honeytokensEnabled', v)}
                />
                <ToggleRow
                  icon={ShieldCheck}
                  label="Rate Limiting"
                  description="Sliding window rate limit (5 req/10s) with GDPR-compliant IP hashing"
                  checked={settings.rateLimitEnabled}
                  onChange={(v) => update('rateLimitEnabled', v)}
                />
                <ToggleRow
                  icon={Robot}
                  label="Robots.txt Access Control"
                  description="Defensive tarpit for bots that ignore Disallow directives"
                  checked={settings.robotsTrapEnabled}
                  onChange={(v) => update('robotsTrapEnabled', v)}
                />
                <ToggleRow
                  icon={ChartLine}
                  label="Threat Score System"
                  description="Behavioral IDS: assigns threat scores to suspicious request patterns"
                  checked={settings.threatScoringEnabled}
                  onChange={(v) => update('threatScoringEnabled', v)}
                />
                <ToggleRow
                  icon={ProhibitInset}
                  label="Hard Block (Blocklist)"
                  description="Permanently block flagged IPs until manually removed or TTL expires"
                  checked={settings.hardBlockEnabled}
                  onChange={(v) => update('hardBlockEnabled', v)}
                />
                <ToggleRow
                  icon={Lock}
                  label="Entropy Injection"
                  description="Inject noise headers into responses for flagged attacker IPs"
                  checked={settings.entropyInjectionEnabled}
                  onChange={(v) => update('entropyInjectionEnabled', v)}
                />
                <ToggleRow
                  icon={Package}
                  label="Zip Bomb"
                  description="Serve compressed junk data to confirmed bots (wastes bot memory/CPU)"
                  checked={settings.zipBombEnabled}
                  onChange={(v) => update('zipBombEnabled', v)}
                  badge="⚠ AGGRESSIVE"
                />
                <ToggleRow
                  icon={BellRinging}
                  label="Real-time Alerting"
                  description="Send Discord/email alerts on critical security events"
                  checked={settings.alertingEnabled}
                  onChange={(v) => update('alertingEnabled', v)}
                />
                <ToggleRow
                  icon={ShieldWarning}
                  label="Suspicious UA Blocking"
                  description="Block known hacking tools (wfuzz, nikto, sqlmap, etc.) with tarpit delay"
                  checked={settings.suspiciousUaBlockingEnabled}
                  onChange={(v) => update('suspiciousUaBlockingEnabled', v)}
                />
                <ToggleRow
                  icon={Fingerprint}
                  label="Session Binding"
                  description="Bind admin sessions to User-Agent + IP subnet to detect hijacking"
                  checked={settings.sessionBindingEnabled}
                  onChange={(v) => update('sessionBindingEnabled', v)}
                />
              </div>

              {/* Numeric settings with sliders */}
              <div className="space-y-0">
                <h3 className="text-[11px] font-mono text-primary/50 tracking-wider mb-3 flex items-center gap-2">
                  <Lock size={14} />
                  PARAMETERS
                </h3>
                <SliderRow
                  label="Auto-Block Threshold"
                  description="Threat score at which IPs are automatically hard-blocked"
                  value={settings.autoBlockThreshold}
                  onChange={(v) => update('autoBlockThreshold', v)}
                  min={3}
                  max={50}
                  step={1}
                  unit="pts"
                />
                <SliderRow
                  label="Max Alerts Stored"
                  description="Maximum number of security incidents kept in the alert log"
                  value={settings.maxAlertsStored}
                  onChange={(v) => update('maxAlertsStored', v)}
                  min={10}
                  max={10000}
                  step={10}
                />
                <SliderRow
                  label="Tarpit Min Delay"
                  description="Minimum delay applied to flagged requests"
                  value={settings.tarpitMinMs}
                  onChange={(v) => update('tarpitMinMs', v)}
                  min={0}
                  max={30000}
                  step={500}
                  unit="ms"
                />
                <SliderRow
                  label="Tarpit Max Delay"
                  description="Maximum delay applied to flagged requests"
                  value={settings.tarpitMaxMs}
                  onChange={(v) => update('tarpitMaxMs', v)}
                  min={0}
                  max={60000}
                  step={500}
                  unit="ms"
                />
                <SliderRow
                  label="Session TTL"
                  description="Admin session lifetime before re-authentication is required"
                  value={settings.sessionTtlSeconds}
                  onChange={(v) => update('sessionTtlSeconds', v)}
                  min={300}
                  max={86400}
                  step={300}
                  unit="s"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 bg-primary/80 hover:bg-primary text-white font-mono text-[11px] uppercase tracking-wider py-2 px-4 transition-colors disabled:opacity-50"
                >
                  {saving ? 'SAVING...' : 'SAVE SETTINGS'}
                </button>
                <button
                  onClick={handleReset}
                  className="bg-primary/10 hover:bg-primary/20 text-primary/70 font-mono text-[11px] uppercase tracking-wider py-2 px-4 transition-colors"
                >
                  RESET DEFAULTS
                </button>
              </div>
            </>
          )}

          {/* Footer */}
          <div className="flex items-center gap-2 text-xs text-primary/40 pt-2 border-t border-primary/10">
            <ShieldCheck size={10} className="text-primary/40" />
            <span>Settings stored in server-side encrypted storage (not in public JSON)</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
