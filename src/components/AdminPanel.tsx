import {
  X,
  Key,
  Export,
  ArrowSquareIn,
  Eye,
  EyeSlash,
  Palette,
  GearSix,
  ChartLine,
  ArrowUp,
  ArrowDown,
  ShieldWarning,
  ShieldCheck,
  ProhibitInset,
  Envelope,
  Users,
  Sliders,
  House,
  FileText,
  Shield,
  ChartBar,
  Database,
  PencilSimple,
  CheckCircle,
  Warning,
  ArrowCounterClockwise,
} from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { motion, AnimatePresence } from 'framer-motion'
import { useRef, useState, useCallback, useEffect } from 'react'
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
}

const SOCIAL_FIELDS: { key: keyof SiteData['social']; label: string; placeholder: string }[] = [
  { key: 'instagram', label: 'Instagram', placeholder: 'https://instagram.com/...' },
  { key: 'facebook', label: 'Facebook', placeholder: 'https://facebook.com/...' },
  { key: 'spotify', label: 'Spotify', placeholder: 'https://open.spotify.com/...' },
  { key: 'youtube', label: 'YouTube', placeholder: 'https://youtube.com/...' },
  { key: 'soundcloud', label: 'SoundCloud', placeholder: 'https://soundcloud.com/...' },
  { key: 'bandcamp', label: 'Bandcamp', placeholder: 'https://....bandcamp.com' },
  { key: 'tiktok', label: 'TikTok', placeholder: 'https://tiktok.com/@...' },
  { key: 'appleMusic', label: 'Apple Music', placeholder: 'https://music.apple.com/...' },
  { key: 'twitter', label: 'Twitter / X', placeholder: 'https://x.com/...' },
  { key: 'twitch', label: 'Twitch', placeholder: 'https://twitch.tv/...' },
  { key: 'beatport', label: 'Beatport', placeholder: 'https://www.beatport.com/...' },
  { key: 'linktree', label: 'Linktree', placeholder: 'https://linktr.ee/...' },
]

const SECTION_LABEL_FIELDS: { key: keyof SectionLabels; label: string; placeholder: string }[] = [
  { key: 'biography', label: 'Biography Heading', placeholder: 'BIOGRAPHY' },
  { key: 'musicPlayer', label: 'Music Player Heading', placeholder: 'MUSIC' },
  { key: 'upcomingGigs', label: 'Upcoming Gigs Heading', placeholder: 'UPCOMING GIGS' },
  { key: 'releases', label: 'Releases Heading', placeholder: 'RELEASES' },
  { key: 'gallery', label: 'Gallery Heading', placeholder: 'GALLERY' },
  { key: 'connect', label: 'Connect Heading', placeholder: 'CONNECT' },
  { key: 'creditHighlights', label: 'Credit Highlights Heading', placeholder: 'CREDITS' },
  { key: 'contact', label: 'Contact Heading', placeholder: 'CONTACT' },
  { key: 'headingPrefix', label: 'Heading Prefix', placeholder: '// ' },
]

const CONTACT_INFO_FIELDS: { key: keyof ContactInfo; label: string; placeholder: string }[] = [
  { key: 'managementName', label: 'Management Name', placeholder: 'Management Co.' },
  { key: 'managementEmail', label: 'Management Email', placeholder: 'mgmt@example.com' },
  { key: 'bookingEmail', label: 'Booking Email', placeholder: 'booking@example.com' },
  { key: 'pressEmail', label: 'Press Email', placeholder: 'press@example.com' },
  { key: 'formTitle', label: 'Form Title', placeholder: 'GET IN TOUCH' },
  { key: 'formButtonText', label: 'Submit Button Text', placeholder: 'SEND MESSAGE' },
]

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
  const currentOrder = adminSettings?.sectionOrder ?? DEFAULT_SECTION_ORDER

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

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
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
        onImportData(siteDataOnly as SiteData)
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

  const isHexColor = (v: string) => /^#[0-9a-fA-F]{6}$/i.test(v)

  const vis = adminSettings?.sectionVisibility ?? {}
  const theme = adminSettings?.theme ?? {}
  const anim = adminSettings?.animations ?? {}
  const progModes = adminSettings?.progressiveOverlayModes ?? {}

  const sectionItems: { key: keyof SectionVisibility; label: string }[] = [
    { key: 'bio', label: 'Biography' },
    { key: 'shell', label: 'Shell (Member)' },
    { key: 'music', label: 'Music Player' },
    { key: 'gigs', label: 'Upcoming Gigs' },
    { key: 'releases', label: 'Releases' },
    { key: 'gallery', label: 'Gallery' },
    { key: 'connect', label: 'Connect / Social' },
    { key: 'creditHighlights', label: 'Credit Highlights' },
    { key: 'contact', label: 'Contact Form' },
  ]

  const animItems: { key: keyof AnimationSettings; label: string }[] = [
    { key: 'glitchEnabled', label: 'Glitch Effects' },
    { key: 'scanlineEnabled', label: 'Scanline Overlay' },
    { key: 'chromaticEnabled', label: 'Chromatic Aberration' },
    { key: 'crtEnabled', label: 'CRT Effect' },
    { key: 'noiseEnabled', label: 'Noise / Grain' },
    { key: 'circuitBackgroundEnabled', label: 'Circuit Background' },
  ]

  const progressiveModeItems: { key: keyof ProgressiveOverlayModes; label: string }[] = [
    { key: 'progressiveReveal', label: 'Progressive Content Reveal' },
    { key: 'dataStream', label: 'Data Stream Loading' },
    { key: 'sectorAssembly', label: 'Sector-by-Sector Assembly' },
    { key: 'holographicMaterialization', label: 'Holographic Materialization' },
  ]

  const colorGroups: {
    title: string
    fields: { key: keyof ThemeCustomization; label: string; placeholder: string }[]
  }[] = [
    {
      title: 'Base Colors',
      fields: [
        { key: 'primaryColor', label: 'Primary Color', placeholder: 'oklch(0.55 0.25 25)' },
        { key: 'primaryForegroundColor', label: 'Primary Foreground', placeholder: 'oklch(1 0 0)' },
        { key: 'accentColor', label: 'Accent Color', placeholder: 'oklch(0.6 0.2 200)' },
        { key: 'accentForegroundColor', label: 'Accent Foreground', placeholder: 'oklch(1 0 0)' },
        { key: 'backgroundColor', label: 'Background Color', placeholder: 'oklch(0.1 0 0)' },
        { key: 'foregroundColor', label: 'Foreground Color', placeholder: 'oklch(0.95 0 0)' },
      ],
    },
    {
      title: 'UI Elements',
      fields: [
        { key: 'cardColor', label: 'Card Background', placeholder: 'oklch(0.15 0 0)' },
        { key: 'cardForegroundColor', label: 'Card Foreground', placeholder: 'oklch(0.95 0 0)' },
        { key: 'popoverColor', label: 'Popover Background', placeholder: 'oklch(0.12 0 0)' },
        { key: 'popoverForegroundColor', label: 'Popover Foreground', placeholder: 'oklch(0.95 0 0)' },
        { key: 'borderColor', label: 'Border Color', placeholder: 'oklch(0.25 0 0)' },
        { key: 'inputColor', label: 'Input Color', placeholder: 'oklch(0.25 0 0)' },
        { key: 'ringColor', label: 'Focus Ring Color', placeholder: 'oklch(0.55 0.25 25)' },
        { key: 'hoverColor', label: 'Hover Color', placeholder: 'oklch(0.55 0.25 25)' },
      ],
    },
    {
      title: 'Secondary & Muted',
      fields: [
        { key: 'secondaryColor', label: 'Secondary Color', placeholder: 'oklch(0.2 0 0)' },
        { key: 'secondaryForegroundColor', label: 'Secondary Foreground', placeholder: 'oklch(0.95 0 0)' },
        { key: 'mutedColor', label: 'Muted Color', placeholder: 'oklch(0.25 0 0)' },
        { key: 'mutedForegroundColor', label: 'Muted Foreground', placeholder: 'oklch(0.6 0 0)' },
      ],
    },
    {
      title: 'Destructive',
      fields: [
        { key: 'destructiveColor', label: 'Destructive Color', placeholder: 'oklch(0.45 0.22 25)' },
        { key: 'destructiveForegroundColor', label: 'Destructive Foreground', placeholder: 'oklch(1 0 0)' },
      ],
    },
  ]

  const fontOptions: {
    key: 'fontHeading' | 'fontBody' | 'fontMono'
    label: string
    placeholder: string
    options: string[]
  }[] = [
    {
      key: 'fontHeading',
      label: 'Heading Font',
      placeholder: 'Orbitron, sans-serif',
      options: ['Orbitron', 'Rajdhani', 'Exo 2', 'Audiowide', 'Share Tech', 'Russo One', 'Teko', 'system-ui'],
    },
    {
      key: 'fontBody',
      label: 'Body Font',
      placeholder: 'system-ui, sans-serif',
      options: ['system-ui', 'Inter', 'Roboto', 'Open Sans', 'Lato', 'Poppins', 'Source Sans Pro', 'Share Tech Mono'],
    },
    {
      key: 'fontMono',
      label: 'Mono Font',
      placeholder: 'Share Tech Mono, monospace',
      options: ['Share Tech Mono', 'JetBrains Mono', 'Fira Code', 'Source Code Pro', 'IBM Plex Mono', 'Courier New'],
    },
  ]

  const isDesktop = typeof window !== 'undefined' && window.matchMedia('(min-width: 768px)').matches

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-[9997] bg-black/70 backdrop-blur-sm"
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
              <button
                onClick={onClose}
                className="text-muted-foreground hover:text-foreground transition-colors p-1"
                aria-label="Close admin panel"
              >
                <X size={20} />
              </button>
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
              </TabsContent>

              {/* ─── CONTENT TAB ──────────────────────────────── */}
              <TabsContent value="content" className="flex-1 overflow-y-auto p-4 space-y-6 mt-0">
                {/* Artist Name */}
                <section className="space-y-3">
                  <h3 className="font-mono text-xs font-bold text-primary uppercase tracking-wider">
                    Artist Name
                  </h3>
                  <Input
                    value={localArtistName}
                    onChange={(e) => setLocalArtistName(e.target.value)}
                    placeholder="Artist Name"
                    className="bg-background border-border font-mono text-sm"
                  />
                  <Button
                    size="sm"
                    className="font-mono text-xs"
                    onClick={() => {
                      onUpdateSiteData?.((prev) => ({ ...prev, artistName: localArtistName }))
                      toast.success('Artist name saved')
                    }}
                    disabled={!onUpdateSiteData}
                  >
                    Save Artist Name
                  </Button>
                </section>

                <Separator />

                {/* Biography */}
                <section className="space-y-3">
                  <h3 className="font-mono text-xs font-bold text-primary uppercase tracking-wider">
                    Biography
                  </h3>
                  <textarea
                    value={localBio}
                    onChange={(e) => setLocalBio(e.target.value)}
                    placeholder="Artist biography..."
                    rows={6}
                    className="w-full bg-background border border-border rounded-md px-3 py-2 font-mono text-sm text-foreground placeholder:text-muted-foreground resize-y focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <Button
                    size="sm"
                    className="font-mono text-xs"
                    onClick={() => {
                      onUpdateSiteData?.((prev) => ({ ...prev, bio: localBio }))
                      toast.success('Biography saved')
                    }}
                    disabled={!onUpdateSiteData}
                  >
                    Save Biography
                  </Button>
                </section>

                <Separator />

                {/* Hero Image */}
                <section className="space-y-3">
                  <h3 className="font-mono text-xs font-bold text-primary uppercase tracking-wider">
                    Hero Image URL
                  </h3>
                  <Input
                    value={localHeroImage}
                    onChange={(e) => setLocalHeroImage(e.target.value)}
                    placeholder="https://example.com/hero.jpg"
                    className="bg-background border-border font-mono text-xs"
                  />
                  {localHeroImage && (() => {
                    try {
                      const parsed = new URL(localHeroImage)
                      return parsed.protocol === 'https:' || parsed.protocol === 'http:'
                    } catch { return false }
                  })() && (
                    <img
                      src={localHeroImage}
                      alt="Hero preview"
                      className="w-full h-24 object-cover rounded border border-border"
                      onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')}
                    />
                  )}
                  <Button
                    size="sm"
                    className="font-mono text-xs"
                    onClick={() => {
                      onUpdateSiteData?.((prev) => ({ ...prev, heroImage: localHeroImage }))
                      toast.success('Hero image saved')
                    }}
                    disabled={!onUpdateSiteData}
                  >
                    Save Hero Image
                  </Button>
                </section>

                <Separator />

                {/* Social Links */}
                <section className="space-y-3">
                  <h3 className="font-mono text-xs font-bold text-primary uppercase tracking-wider">
                    Social Links
                  </h3>
                  <div className="space-y-2">
                    {SOCIAL_FIELDS.map(({ key, label, placeholder }) => (
                      <div key={key} className="space-y-1">
                        <Label className="font-mono text-[11px] text-muted-foreground">{label}</Label>
                        <Input
                          value={localSocial[key] ?? ''}
                          onChange={(e) =>
                            setLocalSocial((prev) => ({ ...prev, [key]: e.target.value }))
                          }
                          placeholder={placeholder}
                          className="bg-background border-border font-mono text-xs"
                        />
                      </div>
                    ))}
                  </div>
                  <Button
                    size="sm"
                    className="font-mono text-xs"
                    onClick={() => {
                      onUpdateSiteData?.((prev) => ({ ...prev, social: localSocial }))
                      toast.success('Social links saved')
                    }}
                    disabled={!onUpdateSiteData}
                  >
                    Save Social Links
                  </Button>
                </section>

                <Separator />

                {/* Section Labels */}
                <section className="space-y-3">
                  <h3 className="font-mono text-xs font-bold text-primary uppercase tracking-wider">
                    Section Labels
                  </h3>
                  <div className="space-y-2">
                    {SECTION_LABEL_FIELDS.map(({ key, label, placeholder }) => (
                      <div key={key} className="space-y-1">
                        <Label className="font-mono text-[11px] text-muted-foreground">{label}</Label>
                        <Input
                          value={localSectionLabels[key] ?? ''}
                          onChange={(e) =>
                            setLocalSectionLabels((prev) => ({ ...prev, [key]: e.target.value }))
                          }
                          placeholder={placeholder}
                          className="bg-background border-border font-mono text-xs"
                        />
                      </div>
                    ))}
                  </div>
                  <Button
                    size="sm"
                    className="font-mono text-xs"
                    onClick={() => {
                      setAdminSettings?.({ ...adminSettings, sectionLabels: localSectionLabels })
                      toast.success('Section labels saved')
                    }}
                    disabled={!setAdminSettings}
                  >
                    Save Section Labels
                  </Button>
                </section>

                <Separator />

                {/* Contact Info */}
                <section className="space-y-3">
                  <h3 className="font-mono text-xs font-bold text-primary uppercase tracking-wider">
                    Contact Info
                  </h3>
                  <div className="space-y-2">
                    {CONTACT_INFO_FIELDS.map(({ key, label, placeholder }) => (
                      <div key={key} className="space-y-1">
                        <Label className="font-mono text-[11px] text-muted-foreground">{label}</Label>
                        <Input
                          value={localContactInfo[key] ?? ''}
                          onChange={(e) =>
                            setLocalContactInfo((prev) => ({ ...prev, [key]: e.target.value }))
                          }
                          placeholder={placeholder}
                          className="bg-background border-border font-mono text-xs"
                        />
                      </div>
                    ))}
                  </div>
                  <Button
                    size="sm"
                    className="font-mono text-xs"
                    onClick={() => {
                      setAdminSettings?.({ ...adminSettings, contactInfo: localContactInfo })
                      toast.success('Contact info saved')
                    }}
                    disabled={!setAdminSettings}
                  >
                    Save Contact Info
                  </Button>
                </section>
              </TabsContent>

              {/* ─── APPEARANCE TAB ───────────────────────────── */}
              <TabsContent value="appearance" className="flex-1 overflow-y-auto p-4 space-y-6 mt-0">
                {/* Color groups */}
                {colorGroups.map(({ title, fields }) => (
                  <section key={title} className="space-y-3">
                    <h3 className="font-mono text-xs font-bold text-primary uppercase tracking-wider">
                      {title}
                    </h3>
                    <div className="space-y-3">
                      {fields.map(({ key, label, placeholder }) => (
                        <div key={key} className="space-y-1">
                          <Label className="font-mono text-[11px] text-muted-foreground">{label}</Label>
                          <div className="flex gap-2 items-center">
                            <input
                              type="color"
                              value={isHexColor(theme[key] || '') ? (theme[key] as string) : '#000000'}
                              onChange={(e) => updateTheme(key, e.target.value)}
                              className="w-8 h-8 shrink-0 cursor-pointer border border-border rounded-sm bg-transparent p-0"
                              title="Pick a color"
                              aria-label={`Color picker for ${label}`}
                            />
                            <Input
                              value={theme[key] || ''}
                              onChange={(e) => updateTheme(key, e.target.value)}
                              placeholder={placeholder}
                              className="bg-background border-border font-mono text-xs flex-1"
                            />
                            {theme[key] && (
                              <div
                                className="w-8 h-8 border border-border rounded-sm shrink-0"
                                style={{ backgroundColor: theme[key] as string }}
                                title={theme[key] as string}
                                aria-hidden="true"
                              />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                    <Separator />
                  </section>
                ))}

                {/* Fonts */}
                <section className="space-y-3">
                  <h3 className="font-mono text-xs font-bold text-primary uppercase tracking-wider">
                    Fonts
                  </h3>
                  {fontOptions.map(({ key, label, placeholder, options }) => (
                    <div key={key} className="space-y-1">
                      <Label className="font-mono text-[11px] text-muted-foreground">{label}</Label>
                      <select
                        value={options.includes(theme[key] || '') ? theme[key] ?? '' : ''}
                        onChange={(e) => {
                          if (e.target.value) updateTheme(key, e.target.value)
                        }}
                        className="w-full bg-background text-foreground border border-border rounded-md px-3 py-2 font-mono text-xs"
                        aria-label={label}
                      >
                        <option value="">Custom…</option>
                        {options.map((font) => (
                          <option key={font} value={font} style={{ fontFamily: font }}>
                            {font}
                          </option>
                        ))}
                      </select>
                      <Input
                        value={theme[key] || ''}
                        onChange={(e) => updateTheme(key, e.target.value)}
                        placeholder={placeholder}
                        className="bg-background border-border font-mono text-xs"
                      />
                    </div>
                  ))}
                </section>

                <Separator />

                {/* Other settings */}
                <section className="space-y-3">
                  <h3 className="font-mono text-xs font-bold text-primary uppercase tracking-wider">
                    Other Settings
                  </h3>
                  <div className="space-y-1">
                    <Label className="font-mono text-[11px] text-muted-foreground">Favicon URL</Label>
                    <Input
                      value={adminSettings?.faviconUrl || ''}
                      onChange={(e) =>
                        setAdminSettings?.({ ...adminSettings, faviconUrl: e.target.value })
                      }
                      placeholder="https://example.com/favicon.ico"
                      className="bg-background border-border font-mono text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="font-mono text-[11px] text-muted-foreground">Border Radius</Label>
                    <select
                      value={theme.borderRadius || ''}
                      onChange={(e) => updateTheme('borderRadius', e.target.value)}
                      className="w-full bg-background text-foreground border border-border rounded-md px-3 py-2 font-mono text-xs"
                      aria-label="Border radius"
                    >
                      <option value="">Default (0.125rem)</option>
                      <option value="0rem">Square (0rem)</option>
                      <option value="0.125rem">Minimal (0.125rem)</option>
                      <option value="0.25rem">Small (0.25rem)</option>
                      <option value="0.375rem">Medium (0.375rem)</option>
                      <option value="0.5rem">Large (0.5rem)</option>
                      <option value="0.75rem">XL (0.75rem)</option>
                      <option value="1rem">2XL (1rem)</option>
                    </select>
                  </div>
                </section>

                <Separator />

                {/* Animations */}
                <section className="space-y-3">
                  <h3 className="font-mono text-xs font-bold text-primary uppercase tracking-wider">
                    Animation Effects
                  </h3>
                  <div className="space-y-3">
                    {animItems.map(({ key, label }) => (
                      <div key={key} className="flex items-center justify-between">
                        <Label className="font-mono text-sm">{label}</Label>
                        <Switch
                          checked={anim[key] !== false}
                          onCheckedChange={(checked) => updateAnimation(key, checked)}
                        />
                      </div>
                    ))}
                  </div>

                  <div className="space-y-4 pt-2">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="font-mono text-xs">CRT Overlay Opacity</Label>
                        <span className="font-mono text-xs text-muted-foreground">
                          {Math.round(
                            (typeof anim.crtOverlayOpacity === 'number' ? anim.crtOverlayOpacity : 0.6) * 100,
                          )}%
                        </span>
                      </div>
                      <Slider
                        value={[
                          typeof anim.crtOverlayOpacity === 'number'
                            ? anim.crtOverlayOpacity * 100
                            : 60,
                        ]}
                        min={0}
                        max={100}
                        step={5}
                        onValueChange={([v]) => updateAnimationNumber('crtOverlayOpacity', v / 100)}
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="font-mono text-xs">CRT Vignette Opacity</Label>
                        <span className="font-mono text-xs text-muted-foreground">
                          {Math.round(
                            (typeof anim.crtVignetteOpacity === 'number' ? anim.crtVignetteOpacity : 0.3) * 100,
                          )}%
                        </span>
                      </div>
                      <Slider
                        value={[
                          typeof anim.crtVignetteOpacity === 'number'
                            ? anim.crtVignetteOpacity * 100
                            : 30,
                        ]}
                        min={0}
                        max={100}
                        step={5}
                        onValueChange={([v]) => updateAnimationNumber('crtVignetteOpacity', v / 100)}
                      />
                    </div>
                  </div>
                </section>

                <Separator />

                {/* Glitch Text */}
                <section className="space-y-3">
                  <h3 className="font-mono text-xs font-bold text-primary uppercase tracking-wider">
                    Heading Glitch Text
                  </h3>
                  <div className="flex items-center justify-between">
                    <Label className="font-mono text-sm">Glitch Effect</Label>
                    <Switch
                      checked={adminSettings?.glitchTextSettings?.enabled !== false}
                      onCheckedChange={(checked) =>
                        setAdminSettings?.({
                          ...adminSettings,
                          glitchTextSettings: {
                            ...(adminSettings?.glitchTextSettings || {}),
                            enabled: checked,
                          },
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="font-mono text-xs">Glitch Interval</Label>
                      <span className="font-mono text-xs text-muted-foreground">
                        {adminSettings?.glitchTextSettings?.intervalMs || 8000}ms
                      </span>
                    </div>
                    <Slider
                      value={[adminSettings?.glitchTextSettings?.intervalMs || 8000]}
                      min={1000}
                      max={30000}
                      step={500}
                      onValueChange={([v]) =>
                        setAdminSettings?.({
                          ...adminSettings,
                          glitchTextSettings: {
                            ...(adminSettings?.glitchTextSettings || {}),
                            intervalMs: v,
                          },
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="font-mono text-xs">Glitch Duration</Label>
                      <span className="font-mono text-xs text-muted-foreground">
                        {adminSettings?.glitchTextSettings?.durationMs || 120}ms
                      </span>
                    </div>
                    <Slider
                      value={[adminSettings?.glitchTextSettings?.durationMs || 120]}
                      min={50}
                      max={1000}
                      step={10}
                      onValueChange={([v]) =>
                        setAdminSettings?.({
                          ...adminSettings,
                          glitchTextSettings: {
                            ...(adminSettings?.glitchTextSettings || {}),
                            durationMs: v,
                          },
                        })
                      }
                    />
                  </div>
                </section>

                <Separator />

                {/* Progressive Overlay Modes */}
                <section className="space-y-3">
                  <h3 className="font-mono text-xs font-bold text-primary uppercase tracking-wider">
                    Progressive Overlay Modes
                  </h3>
                  <div className="space-y-3">
                    {progressiveModeItems.map(({ key, label }) => (
                      <div key={key} className="flex items-center justify-between">
                        <Label className="font-mono text-sm">{label}</Label>
                        <Switch
                          checked={progModes[key] !== false}
                          onCheckedChange={(checked) => updateProgressiveMode(key, checked)}
                        />
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground font-mono">
                    When multiple modes are selected, one is chosen randomly each time.
                  </p>
                </section>

                {onOpenConfigEditor && (
                  <Button
                    onClick={() => {
                      onClose()
                      onOpenConfigEditor()
                    }}
                    variant="outline"
                    className="w-full font-mono text-xs"
                  >
                    <Sliders size={14} className="mr-2" />
                    Advanced Config Editor
                  </Button>
                )}
              </TabsContent>

              {/* ─── SECTIONS TAB ─────────────────────────────── */}
              <TabsContent value="sections" className="flex-1 overflow-y-auto p-4 space-y-6 mt-0">
                {/* Visibility */}
                <section className="space-y-3">
                  <h3 className="font-mono text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-2">
                    {Object.values(vis).some((v) => v === false) ? (
                      <EyeSlash size={14} />
                    ) : (
                      <Eye size={14} />
                    )}
                    Section Visibility
                  </h3>
                  <div className="space-y-3">
                    {sectionItems.map(({ key, label }) => (
                      <div key={key} className="flex items-center justify-between">
                        <Label className="font-mono text-sm">{label}</Label>
                        <Switch
                          checked={vis[key] !== false}
                          onCheckedChange={(checked) => updateVisibility(key, checked)}
                        />
                      </div>
                    ))}
                  </div>
                </section>

                <Separator />

                {/* Reorder */}
                <section className="space-y-3">
                  <h3 className="font-mono text-xs font-bold text-primary uppercase tracking-wider">
                    Section Order
                  </h3>
                  <div className="space-y-1">
                    {currentOrder.map((section, index) => (
                      <div
                        key={section}
                        className="flex items-center justify-between bg-background border border-border rounded-md px-3 py-2"
                      >
                        <span className="font-mono text-sm">
                          {sectionDisplayNames[section] ?? section}
                        </span>
                        <div className="flex gap-1">
                          <button
                            onClick={() => moveSectionUp(index)}
                            disabled={index === 0}
                            className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed"
                            aria-label={`Move ${sectionDisplayNames[section] ?? section} up`}
                          >
                            <ArrowUp size={16} />
                          </button>
                          <button
                            onClick={() => moveSectionDown(index)}
                            disabled={index === currentOrder.length - 1}
                            className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed"
                            aria-label={`Move ${sectionDisplayNames[section] ?? section} down`}
                          >
                            <ArrowDown size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <Button
                    onClick={() =>
                      setAdminSettings?.({ ...adminSettings, sectionOrder: DEFAULT_SECTION_ORDER })
                    }
                    variant="outline"
                    size="sm"
                    className="font-mono text-xs gap-2"
                    disabled={!setAdminSettings}
                  >
                    <ArrowCounterClockwise size={13} />
                    Reset to Default Order
                  </Button>
                </section>
              </TabsContent>

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
