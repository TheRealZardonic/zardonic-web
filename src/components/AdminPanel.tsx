import {
  X,
  House,
  FileText,
  Palette,
  Eye,
  GearSix,
  Shield,
  ChartBar,
  Database,
  Monitor,
  SignOut,
  Translate,
} from '@phosphor-icons/react'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { motion, AnimatePresence } from 'framer-motion'
import { useRef, useState, useCallback, useEffect, useMemo, type ChangeEvent } from 'react'
import AdminLoginDialog from '@/components/AdminLoginDialog'
import { AdminSearch } from '@/components/admin/AdminSearch'
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
import SectionConfigTab from '@/components/admin/SectionConfigTab'
import OverviewTab from '@/components/admin/OverviewTab'
import SecurityTab from '@/components/admin/SecurityTab'
import AnalyticsTab from '@/components/admin/AnalyticsTab'
import DataTab from '@/components/admin/DataTab'
import TranslationsTab from '@/components/admin/TranslationsTab'

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
  const translationImportRef = useRef<HTMLInputElement>(null)

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
      setAdminSettings({ ...adminSettings, theme: { ...adminSettings?.theme, [key]: value } })
    },
    [adminSettings, setAdminSettings],
  )

  const applyPreset = useCallback(
    (themeUpdate: Partial<ThemeCustomization>) => {
      if (!setAdminSettings) return
      setAdminSettings({ ...adminSettings, theme: { ...adminSettings?.theme, ...themeUpdate } })
    },
    [adminSettings, setAdminSettings],
  )

  const updateAnimation = useCallback(
    (key: keyof AnimationSettings, value: boolean) => {
      if (!setAdminSettings) return
      setAdminSettings({ ...adminSettings, animations: { ...adminSettings?.animations, [key]: value } })
    },
    [adminSettings, setAdminSettings],
  )

  const updateAnimationNumber = useCallback(
    (key: keyof AnimationSettings, value: number) => {
      if (!setAdminSettings) return
      setAdminSettings({ ...adminSettings, animations: { ...adminSettings?.animations, [key]: value } })
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
    } catch { /* ignore */ }
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
    a.download = `site-data-${new Date().toISOString().split('T')[0]}.json`
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
        if (!parsed.artistName) { toast.error('Invalid site data file'); return }
        const { _adminSettings, ...siteDataOnly } = parsed
        onImportData(siteDataOnly as unknown as SiteData)
        if (_adminSettings && setAdminSettings) {
          setAdminSettings(_adminSettings as AdminSettings)
          toast.success('Data & settings imported successfully')
        } else {
          toast.success('Data imported successfully')
        }
      } catch { toast.error('Failed to parse JSON file') }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const vis = adminSettings?.sectionVisibility ?? {}
  const theme = adminSettings?.theme ?? {}
  const anim = adminSettings?.animations ?? {}
  const progModes = adminSettings?.progressiveOverlayModes ?? {}

  const [isDesktop, setIsDesktop] = useState(
    typeof window !== 'undefined' && window.matchMedia('(min-width: 768px)').matches,
  )
  useEffect(() => {
    if (typeof window === 'undefined') return
    const mql = window.matchMedia('(min-width: 768px)')
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches)
    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }, [])

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop — only on mobile */}
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
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                  editMode
                    ? 'bg-primary/20 border-primary text-primary'
                    : 'bg-muted border-border text-muted-foreground'
                }`}>
                  {editMode ? 'EDIT MODE' : 'VIEW MODE'}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <AdminSearch onNavigate={setActiveTab} />
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
                  { value: 'section-config', label: 'Section Config', icon: <GearSix size={13} /> },
                  { value: 'security', label: 'Security', icon: <Shield size={13} /> },
                  { value: 'analytics', label: 'Analytics', icon: <ChartBar size={13} /> },
                  { value: 'data', label: 'Data', icon: <Database size={13} /> },
                  { value: 'translations', label: 'Translations', icon: <Translate size={13} /> },
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

              <OverviewTab
                siteData={siteData}
                editMode={editMode}
                hasPassword={hasPassword}
                apiHealth={apiHealth}
                setActiveTab={setActiveTab}
                onToggleEdit={onToggleEdit}
                onExport={handleExport}
                onImportClick={() => importInputRef.current?.click()}
                onImportData={onImportData}
                onOpenPasswordDialog={() => setShowPasswordDialog(true)}
                fetchApiHealth={fetchApiHealth}
              />

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

              <AppearanceTab
                adminSettings={adminSettings}
                setAdminSettings={setAdminSettings}
                theme={theme}
                updateTheme={updateTheme}
                applyPreset={applyPreset}
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

              <BackgroundTab
                adminSettings={adminSettings}
                setAdminSettings={setAdminSettings}
                anim={anim}
                updateAnimationNumber={updateAnimationNumber}
              />

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

              <SectionConfigTab
                adminSettings={adminSettings}
                setAdminSettings={setAdminSettings}
                siteData={siteData}
                onUpdateSiteData={onUpdateSiteData}
              />

              <SecurityTab
                hasPassword={hasPassword}
                onOpenSecurityIncidents={onOpenSecurityIncidents}
                onOpenSecuritySettings={onOpenSecuritySettings}
                onOpenBlocklist={onOpenBlocklist}
                onOpenSubscriberList={onOpenSubscriberList}
                onClose={onClose}
                onOpenPasswordDialog={() => setShowPasswordDialog(true)}
              />

              <AnalyticsTab
                onOpenStats={onOpenStats}
                onOpenContactInbox={onOpenContactInbox}
                onClose={onClose}
              />

              <DataTab
                siteData={siteData}
                onImportData={onImportData}
                onExport={handleExport}
                onImportClick={() => importInputRef.current?.click()}
              />

              <TranslationsTab
                adminSettings={adminSettings}
                setAdminSettings={setAdminSettings}
                translationImportRef={translationImportRef}
              />
            </Tabs>

            {/* Hidden file input for data import */}
            <input
              ref={importInputRef}
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={handleImportFile}
              aria-hidden="true"
            />
          </motion.div>
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
