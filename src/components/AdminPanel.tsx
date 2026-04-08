import {
  X,
  Key,
  Export,
  ArrowSquareIn,
  Eye,
  Palette,
  GearSix,
  ChartLine,
  ShieldWarning,
  ShieldCheck,
  ProhibitInset,
  Envelope,
  Users,
  House,
  FileText,
  Shield,
  ChartBar,
  Database,
  PencilSimple,
  CheckCircle,
  Warning,
  ArrowCounterClockwise,
  Monitor,
  SignOut,
} from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { motion, AnimatePresence } from 'framer-motion'
import { useRef, useState, useCallback, useEffect, useMemo, type ChangeEvent } from 'react'
import AdminLoginDialog from '@/components/AdminLoginDialog'
import type {
  AdminSettings,
  SectionVisibility,
  ThemeCustomization,
  AnimationSettings,
  ProgressiveOverlayModes,
  SectionLabels,
  ContactInfo,
} from '@/lib/types'
import type { SiteData } from '@/App'
import { toast } from 'sonner'
import { DEFAULT_SECTION_ORDER } from '@/lib/config'
import AppearanceTab from '@/components/admin/AppearanceTab'
import BackgroundTab from '@/components/admin/BackgroundTab'
import ContentTab from '@/components/admin/ContentTab'
import SectionsTab from '@/components/admin/SectionsTab'

interface AdminPanelProps {
  open: boolean
  onClose: () => void
  siteData?: SiteData
  adminSettings?: AdminSettings | null
  setAdminSettings?: (settings: AdminSettings) => void
  onImportData?: (data: SiteData) => void
  onUpdateSiteData?: (updater: SiteData | ((current: SiteData) => SiteData)) => void
  onOpenConfigEditor?: () => void
  onOpenStats?: () => void
  onOpenSecurityIncidents?: () => void
  onOpenSecuritySettings?: () => void
  onOpenBlocklist?: () => void
  onOpenContactInbox?: () => void
  onOpenSubscriberList?: () => void
  editMode: boolean
  onToggleEdit: () => void
  hasPassword: boolean
  onChangePassword: (password: string) => Promise<void>
  onSetPassword: (password: string) => Promise<void>
  onLogout?: () => Promise<void>
}


export default function AdminPanel({
  open,
  onClose,
  siteData,
  adminSettings,
  setAdminSettings,
  onImportData,
  onUpdateSiteData,
  onOpenConfigEditor,
  onOpenStats,
  onOpenSecurityIncidents,
  onOpenSecuritySettings,
  onOpenBlocklist,
  onOpenContactInbox,
  onOpenSubscriberList,
  editMode,
  onToggleEdit,
  hasPassword,
  onChangePassword,
  onSetPassword,
  onLogout,
}: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState('overview')
  const [showPasswordDialog, setShowPasswordDialog] = useState(false)
  const importInputRef = useRef<HTMLInputElement>(null)

  // Local content state for optimistic edits
  const [localArtistName, setLocalArtistName] = useState(siteData?.artistName ?? '')
  const [localBio, setLocalBio] = useState(siteData?.bio ?? '')
  const [localHeroImage, setLocalHeroImage] = useState(siteData?.heroImage ?? '')
  const [localSocial, setLocalSocial] = useState<SiteData['social']>(siteData?.social ?? {})
  const [localSectionLabels, setLocalSectionLabels] = useState<SectionLabels>(adminSettings?.sectionLabels ?? {})
  const [localContactInfo, setLocalContactInfo] = useState<ContactInfo>(adminSettings?.contactInfo ?? {})

  const [newPresetName, setNewPresetName] = useState('')
  const [apiHealth, setApiHealth] = useState<{ status: string; services: Record<string, unknown> } | null>(null)

  useEffect(() => {
    if (open) {
      setLocalArtistName(siteData?.artistName ?? '')
      setLocalBio(siteData?.bio ?? '')
      setLocalHeroImage(siteData?.heroImage ?? '')
      setLocalSocial(siteData?.social ?? {})
      setLocalSectionLabels(adminSettings?.sectionLabels ?? {})
      setLocalContactInfo(adminSettings?.contactInfo ?? {})
    }
  }, [open, siteData, adminSettings])

  // Section order helpers
  const currentOrder: string[] = useMemo(
    () => adminSettings?.sectionOrder ?? [...DEFAULT_SECTION_ORDER],
    [adminSettings?.sectionOrder],
  )

  const sectionDisplayNames: Record<string, string> = {
    bio: 'Biography',
    shell: 'Shell (Member)',
    creditHighlights: 'Credit Highlights',
    music: 'Music Player',
    gigs: 'Upcoming Gigs',
    releases: 'Releases',
    gallery: 'Gallery',
    media: 'Media',
    connect: 'Connect / Social',
    contact: 'Contact Form',
  }

  const moveSectionUp = useCallback(
    (index: number) => {
      if (index <= 0 || !setAdminSettings) return
      const newOrder = [...currentOrder]
      ;[newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]]
      setAdminSettings({ ...adminSettings, sectionOrder: newOrder })
    },
    [currentOrder, adminSettings, setAdminSettings],
  )

  const moveSectionDown = useCallback(
    (index: number) => {
      if (index >= currentOrder.length - 1 || !setAdminSettings) return
      const newOrder = [...currentOrder]
      ;[newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]]
      setAdminSettings({ ...adminSettings, sectionOrder: newOrder })
    },
    [currentOrder, adminSettings, setAdminSettings],
  )

  const updateVisibility = useCallback(
    (key: keyof SectionVisibility, value: boolean) => {
      if (!setAdminSettings) return
      setAdminSettings({
        ...adminSettings,
        sectionVisibility: { ...adminSettings?.sectionVisibility, [key]: value },
      })
    },
    [adminSettings, setAdminSettings],
  )

  const updateTheme = useCallback(
    (key: keyof ThemeCustomization, value: string) => {
      if (!setAdminSettings) return
      setAdminSettings({
        ...adminSettings,
        theme: { ...adminSettings?.theme, [key]: value },
      })
    },
    [adminSettings, setAdminSettings],
  )

  const updateAnimation = useCallback(
    (key: keyof AnimationSettings, value: boolean) => {
      if (!setAdminSettings) return
      setAdminSettings({
        ...adminSettings,
        animations: { ...adminSettings?.animations, [key]: value },
      })
    },
    [adminSettings, setAdminSettings],
  )

  const updateAnimationNumber = useCallback(
    (key: keyof AnimationSettings, value: number) => {
      if (!setAdminSettings) return
      setAdminSettings({
        ...adminSettings,
        animations: { ...adminSettings?.animations, [key]: value },
      })
    },
    [adminSettings, setAdminSettings],
  )

  const updateProgressiveMode = useCallback(
    (key: keyof ProgressiveOverlayModes, value: boolean) => {
      if (!setAdminSettings) return
      setAdminSettings({
        ...adminSettings,
        progressiveOverlayModes: { ...adminSettings?.progressiveOverlayModes, [key]: value },
      })
    },
    [adminSettings, setAdminSettings],
  )

  const fetchApiHealth = useCallback(async () => {
    try {
      const res = await fetch('/api/health')
      if (res.ok) {
        const data = await res.json() as { status: string; services: Record<string, unknown> }
        setApiHealth(data)
      }
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => {
    if (!open) return
    void fetchApiHealth()
  }, [open, fetchApiHealth])

  const handleExport = () => {
    if (!siteData) return
    const exportData = { ...siteData, _adminSettings: adminSettings || {} }
    const json = JSON.stringify(exportData, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `zardonic-data-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    toast.success('Data exported (including settings)')
  }

  const handleImportFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !onImportData) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result as string) as Record<string, unknown>
        if (!parsed.artistName) {
          toast.error('Invalid site data file')
          return
        }
        const { _adminSettings, ...siteDataOnly } = parsed
        onImportData(siteDataOnly as unknown as SiteData)
        if (_adminSettings && setAdminSettings) {
          setAdminSettings(_adminSettings as AdminSettings)
          toast.success('Data & settings imported successfully')
        } else {
          toast.success('Data imported successfully')
        }
      } catch {
        toast.error('Failed to parse JSON file')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }


  const vis = adminSettings?.sectionVisibility ?? {}
  const theme = adminSettings?.theme ?? {}
  const anim = adminSettings?.animations ?? {}
  const progModes = adminSettings?.progressiveOverlayModes ?? {}





  const isDesktop = typeof window !== 'undefined' && window.matchMedia('(min-width: 768px)').matches

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop — only on mobile; on desktop the panel slides in without darkening the page */}
          <motion.div
            className="fixed inset-0 z-[9997] bg-black/70 backdrop-blur-sm md:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Panel — slides from bottom on mobile, from right on desktop */}
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Admin Panel"
            className="fixed z-[9998] bg-card border-border flex flex-col
              bottom-0 left-0 right-0 h-[92dvh] border-t
              md:top-0 md:bottom-0 md:left-auto md:right-0 md:w-[600px] md:h-full md:border-t-0 md:border-l"
            initial={isDesktop ? { x: '100%' } : { y: '100%' }}
            animate={isDesktop ? { x: 0 } : { y: 0 }}
            exit={isDesktop ? { x: '100%' } : { y: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 35 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
              <div className="flex items-center gap-3">
                <GearSix size={20} weight="bold" className="text-primary" />
                <span className="font-mono font-bold text-sm tracking-widest text-foreground uppercase">
                  Admin Panel
                </span>
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                    editMode
                      ? 'bg-primary/20 border-primary text-primary'
                      : 'bg-muted border-border text-muted-foreground'
                  }`}
                >
                  {editMode ? 'EDIT MODE' : 'VIEW MODE'}
                </span>
              </div>
              <div className="flex items-center gap-1">
                {onLogout && (
                  <button
                    onClick={async () => { await onLogout(); onClose() }}
                    className="text-muted-foreground hover:text-destructive transition-colors p-1"
                    aria-label="Logout"
                    title="Logout"
                  >
                    <SignOut size={18} />
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="text-muted-foreground hover:text-foreground transition-colors p-1"
                  aria-label="Close admin panel"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Tabs */}
            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="flex flex-col flex-1 min-h-0"
            >
              <TabsList className="shrink-0 w-full justify-start gap-0 overflow-x-auto rounded-none border-b border-border bg-transparent h-auto px-2 py-1">
                {[
                  { value: 'overview', label: 'Overview', icon: <House size={13} /> },
                  { value: 'content', label: 'Content', icon: <FileText size={13} /> },
                  { value: 'appearance', label: 'Appearance', icon: <Palette size={13} /> },
                  { value: 'background', label: 'Background', icon: <Monitor size={13} /> },
                  { value: 'sections', label: 'Sections', icon: <Eye size={13} /> },
                  { value: 'security', label: 'Security', icon: <Shield size={13} /> },
                  { value: 'analytics', label: 'Analytics', icon: <ChartBar size={13} /> },
                  { value: 'data', label: 'Data', icon: <Database size={13} /> },
                ].map(({ value, label, icon }) => (
                  <TabsTrigger
                    key={value}
                    value={value}
                    className="shrink-0 flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wide px-3 py-1.5 rounded-sm data-[state=active]:bg-primary/20 data-[state=active]:text-primary"
                  >
                    {icon}
                    <span className="hidden sm:inline">{label}</span>
                  </TabsTrigger>
                ))}
              </TabsList>

              {/* ─── OVERVIEW TAB ─────────────────────────────── */}
              <TabsContent value="overview" className="flex-1 overflow-y-auto p-4 space-y-4 mt-0">
                {/* Status bar */}
                <div className="bg-background border border-border rounded-md p-3 space-y-2">
                  <h3 className="font-mono text-xs font-bold text-primary uppercase tracking-wider">
                    System Status
                  </h3>
                  <div className="flex items-center gap-2">
                    {editMode ? (
                      <CheckCircle size={14} className="text-green-500" weight="fill" />
                    ) : (
                      <Warning size={14} className="text-yellow-500" weight="fill" />
                    )}
                    <span className="font-mono text-xs">
                      Edit Mode: {editMode ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle size={14} className="text-green-500" weight="fill" />
                    <span className="font-mono text-xs">Admin: Authenticated</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {hasPassword ? (
                      <CheckCircle size={14} className="text-green-500" weight="fill" />
                    ) : (
                      <Warning size={14} className="text-yellow-500" weight="fill" />
                    )}
                    <span className="font-mono text-xs">
                      Password: {hasPassword ? 'Set' : 'Not configured'}
                    </span>
                  </div>
                </div>

                {/* Quick actions */}
                <div className="space-y-2">
                  <h3 className="font-mono text-xs font-bold text-primary uppercase tracking-wider">
                    Quick Actions
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      className="justify-start gap-2 font-mono text-xs h-9"
                      onClick={onToggleEdit}
                    >
                      <PencilSimple size={14} />
                      {editMode ? 'Exit Edit Mode' : 'Enter Edit Mode'}
                    </Button>
                    <Button
                      variant="outline"
                      className="justify-start gap-2 font-mono text-xs h-9"
                      onClick={() => setShowPasswordDialog(true)}
                    >
                      <Key size={14} />
                      {hasPassword ? 'Change Password' : 'Set Password'}
                    </Button>
                    <Button
                      variant="outline"
                      className="justify-start gap-2 font-mono text-xs h-9"
                      onClick={handleExport}
                      disabled={!siteData}
                    >
                      <Export size={14} />
                      Export Data
                    </Button>
                    <Button
                      variant="outline"
                      className="justify-start gap-2 font-mono text-xs h-9"
                      onClick={() => importInputRef.current?.click()}
                      disabled={!onImportData}
                    >
                      <ArrowSquareIn size={14} />
                      Import Data
                    </Button>
                  </div>
                </div>

                <Separator />

                {/* Navigation shortcuts */}
                <div className="space-y-2">
                  <h3 className="font-mono text-xs font-bold text-primary uppercase tracking-wider">
                    Navigate
                  </h3>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { tab: 'content', label: 'Content', icon: <FileText size={16} /> },
                      { tab: 'appearance', label: 'Appearance', icon: <Palette size={16} /> },
                      { tab: 'background', label: 'Background', icon: <Monitor size={16} /> },
                      { tab: 'sections', label: 'Sections', icon: <Eye size={16} /> },
                      { tab: 'security', label: 'Security', icon: <Shield size={16} /> },
                      { tab: 'analytics', label: 'Analytics', icon: <ChartBar size={16} /> },
                      { tab: 'data', label: 'Data', icon: <Database size={16} /> },
                    ].map(({ tab, label, icon }) => (
                      <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className="flex flex-col items-center gap-1.5 p-3 bg-background border border-border rounded-md hover:border-primary hover:text-primary transition-colors"
                      >
                        {icon}
                        <span className="font-mono text-[10px] uppercase tracking-wide">{label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* API Health */}
                <section className="space-y-3">
                  <h3 className="font-mono text-xs font-bold text-primary uppercase tracking-wider">
                    API Health
                  </h3>
                  {apiHealth ? (
                    <div className="space-y-2">
                      {Object.entries(apiHealth.services).map(([service, status]) => (
                        <div key={service} className="flex items-center justify-between">
                          <span className="font-mono text-xs uppercase">{service}</span>
                          <span className={`font-mono text-[10px] px-2 py-0.5 rounded border ${
                            status === 'ok' || status === 'configured'
                              ? 'border-green-500/40 text-green-400 bg-green-500/10'
                              : status === 'unconfigured'
                              ? 'border-yellow-500/40 text-yellow-400 bg-yellow-500/10'
                              : 'border-destructive/40 text-destructive bg-destructive/10'
                          }`}>
                            {String(status).toUpperCase()}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="font-mono text-xs text-muted-foreground">Loading health status...</p>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="font-mono text-xs w-full"
                    onClick={() => { fetchApiHealth().catch(() => {}) }}
                  >
                    <ArrowCounterClockwise size={13} className="mr-1" /> Refresh
                  </Button>
                </section>
              </TabsContent>

              {/* ─── CONTENT TAB ──────────────────────────────── */}
              <ContentTab
                adminSettings={adminSettings}
                setAdminSettings={setAdminSettings}
                onUpdateSiteData={onUpdateSiteData}
                localArtistName={localArtistName}
                setLocalArtistName={setLocalArtistName}
                localBio={localBio}
                setLocalBio={setLocalBio}
                localHeroImage={localHeroImage}
                setLocalHeroImage={setLocalHeroImage}
                localSocial={localSocial}
                setLocalSocial={setLocalSocial}
                localSectionLabels={localSectionLabels}
                setLocalSectionLabels={setLocalSectionLabels}
                localContactInfo={localContactInfo}
                setLocalContactInfo={setLocalContactInfo}
              />

              {/* ─── APPEARANCE TAB ───────────────────────────── */}
              <AppearanceTab
                adminSettings={adminSettings}
                setAdminSettings={setAdminSettings}
                theme={theme}
                updateTheme={updateTheme}
                anim={anim}
                updateAnimation={updateAnimation}
                updateAnimationNumber={updateAnimationNumber}
                progModes={progModes}
                updateProgressiveMode={updateProgressiveMode}
                onClose={onClose}
                onOpenConfigEditor={onOpenConfigEditor}
                newPresetName={newPresetName}
                setNewPresetName={setNewPresetName}
              />

              {/* ─── BACKGROUND TAB ───────────────────────────── */}
              <BackgroundTab
                adminSettings={adminSettings}
                setAdminSettings={setAdminSettings}
                anim={anim}
                updateAnimationNumber={updateAnimationNumber}
              />

              {/* ─── SECTIONS TAB ─────────────────────────────── */}
              <SectionsTab
                adminSettings={adminSettings}
                setAdminSettings={setAdminSettings}
                vis={vis}
                updateVisibility={updateVisibility}
                currentOrder={currentOrder}
                sectionDisplayNames={sectionDisplayNames}
                moveSectionUp={moveSectionUp}
                moveSectionDown={moveSectionDown}
              />

              {/* ─── SECURITY TAB ─────────────────────────────── */}
              <TabsContent value="security" className="flex-1 overflow-y-auto p-4 space-y-3 mt-0">
                <h3 className="font-mono text-xs font-bold text-primary uppercase tracking-wider mb-4">
                  Security Management
                </h3>
                {[
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
                    desc: hasPassword
                      ? 'Update your admin panel password'
                      : 'Set an admin panel password',
                    action: () => setShowPasswordDialog(true),
                  },
                ].map(({ icon, title, desc, action }) =>
                  action ? (
                    <button
                      key={title}
                      onClick={() => {
                        onClose()
                        if (title === 'Change Password' || title === 'Set Password') {
                          setShowPasswordDialog(true)
                        } else {
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

              {/* ─── ANALYTICS TAB ────────────────────────────── */}
              <TabsContent value="analytics" className="flex-1 overflow-y-auto p-4 space-y-3 mt-0">
                <h3 className="font-mono text-xs font-bold text-primary uppercase tracking-wider mb-4">
                  Analytics & Inbox
                </h3>
                {[
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
                ].map(({ icon, title, desc, action }) =>
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
              </TabsContent>

              {/* ─── DATA TAB ─────────────────────────────────── */}
              <TabsContent value="data" className="flex-1 overflow-y-auto p-4 space-y-4 mt-0">
                <h3 className="font-mono text-xs font-bold text-primary uppercase tracking-wider">
                  Data Management
                </h3>
                <p className="font-mono text-xs text-muted-foreground">
                  Export all site data and settings as a JSON file, or import a previously exported
                  backup.
                </p>

                <div className="space-y-3">
                  <button
                    onClick={handleExport}
                    disabled={!siteData}
                    className="w-full flex items-center gap-4 p-4 bg-background border border-border rounded-md hover:border-primary text-left transition-colors group disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Export size={20} weight="bold" className="text-green-500 shrink-0" />
                    <div>
                      <div className="font-mono text-sm font-bold group-hover:text-primary transition-colors">
                        Export JSON
                      </div>
                      <div className="font-mono text-xs text-muted-foreground">
                        Download all site data and admin settings as a JSON backup
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => importInputRef.current?.click()}
                    disabled={!onImportData}
                    className="w-full flex items-center gap-4 p-4 bg-background border border-border rounded-md hover:border-primary text-left transition-colors group disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ArrowSquareIn size={20} weight="bold" className="text-blue-500 shrink-0" />
                    <div>
                      <div className="font-mono text-sm font-bold group-hover:text-primary transition-colors">
                        Import JSON
                      </div>
                      <div className="font-mono text-xs text-muted-foreground">
                        Restore site data and settings from a previously exported JSON file
                      </div>
                    </div>
                  </button>
                </div>
              </TabsContent>
            </Tabs>
          </motion.div>

          {/* Hidden file input for import */}
          <input
            ref={importInputRef}
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={handleImportFile}
            aria-hidden="true"
          />
        </>
      )}

      {showPasswordDialog && (
        <AdminLoginDialog
          open={showPasswordDialog}
          onOpenChange={setShowPasswordDialog}
          mode="setup"
          onSetPassword={hasPassword ? onChangePassword : onSetPassword}
        />
      )}
    </AnimatePresence>
  )
}
