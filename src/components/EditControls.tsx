import {
  Pencil,
  X,
  Key,
  Export,
  ArrowSquareIn,
  Sliders,
  Eye,
  EyeSlash,
  Palette,
  GearSix,
  ChartLine,
  ArrowsVertical,
  ArrowUp,
  ArrowDown,
} from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
import { motion, AnimatePresence } from 'framer-motion'
import { useRef, useState, useCallback } from 'react'
import AdminLoginDialog from '@/components/AdminLoginDialog'
import type { AdminSettings, SectionVisibility, ThemeCustomization, AnimationSettings, ProgressiveOverlayModes } from '@/lib/types'
import type { SiteData } from '@/App'
import { toast } from 'sonner'

interface EditControlsProps {
  editMode: boolean
  onToggleEdit: () => void
  hasPassword: boolean
  onChangePassword: (password: string) => Promise<void>
  onSetPassword: (password: string) => Promise<void>
  siteData?: SiteData
  onImportData?: (data: SiteData) => void
  adminSettings?: AdminSettings
  onAdminSettingsChange?: (settings: AdminSettings) => void
  onOpenConfigEditor?: () => void
  onOpenStats?: () => void
}

export default function EditControls({
  editMode,
  onToggleEdit,
  hasPassword,
  onChangePassword,
  onSetPassword,
  siteData,
  onImportData,
  adminSettings,
  onAdminSettingsChange,
  onOpenConfigEditor,
  onOpenStats,
}: EditControlsProps) {
  const [showPasswordDialog, setShowPasswordDialog] = useState(false)
  const [showVisibilityPanel, setShowVisibilityPanel] = useState(false)
  const [showThemePanel, setShowThemePanel] = useState(false)
  const [showAnimationPanel, setShowAnimationPanel] = useState(false)
  const [showProgressiveModesPanel, setShowProgressiveModesPanel] = useState(false)
  const [showReorderPanel, setShowReorderPanel] = useState(false)
  const importInputRef = useRef<HTMLInputElement>(null)

  const defaultSectionOrder = ['bio', 'creditHighlights', 'music', 'gigs', 'releases', 'gallery', 'media', 'connect']

  const sectionDisplayNames: Record<string, string> = {
    bio: 'Biography',
    creditHighlights: 'Credit Highlights',
    music: 'Music Player',
    gigs: 'Upcoming Gigs',
    releases: 'Releases',
    gallery: 'Gallery',
    media: 'Media',
    connect: 'Connect / Social',
  }

  const currentOrder = adminSettings?.sectionOrder ?? defaultSectionOrder

  const moveSectionUp = useCallback(
    (index: number) => {
      if (index <= 0 || !onAdminSettingsChange) return
      const newOrder = [...currentOrder]
      ;[newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]]
      onAdminSettingsChange({ ...adminSettings, sectionOrder: newOrder })
    },
    [currentOrder, adminSettings, onAdminSettingsChange],
  )

  const moveSectionDown = useCallback(
    (index: number) => {
      if (index >= currentOrder.length - 1 || !onAdminSettingsChange) return
      const newOrder = [...currentOrder]
      ;[newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]]
      onAdminSettingsChange({ ...adminSettings, sectionOrder: newOrder })
    },
    [currentOrder, adminSettings, onAdminSettingsChange],
  )

  const handleExport = () => {
    if (!siteData) return
    const exportData = {
      ...siteData,
      _adminSettings: adminSettings || {},
    }
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
        const parsed = JSON.parse(reader.result as string)
        if (!parsed.artistName) {
          toast.error('Invalid site data file')
          return
        }
        // Extract admin settings if present in the export
        const { _adminSettings, ...siteDataOnly } = parsed
        onImportData(siteDataOnly as SiteData)
        if (_adminSettings && onAdminSettingsChange) {
          onAdminSettingsChange(_adminSettings)
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

  const updateVisibility = useCallback(
    (key: keyof SectionVisibility, value: boolean) => {
      if (!onAdminSettingsChange) return
      onAdminSettingsChange({
        ...adminSettings,
        sectionVisibility: {
          ...adminSettings?.sectionVisibility,
          [key]: value,
        },
      })
    },
    [adminSettings, onAdminSettingsChange],
  )

  const updateTheme = useCallback(
    (key: keyof ThemeCustomization, value: string) => {
      if (!onAdminSettingsChange) return
      onAdminSettingsChange({
        ...adminSettings,
        theme: {
          ...adminSettings?.theme,
          [key]: value,
        },
      })
    },
    [adminSettings, onAdminSettingsChange],
  )

  const updateAnimation = useCallback(
    (key: keyof AnimationSettings, value: boolean) => {
      if (!onAdminSettingsChange) return
      onAdminSettingsChange({
        ...adminSettings,
        animations: {
          ...adminSettings?.animations,
          [key]: value,
        },
      })
    },
    [adminSettings, onAdminSettingsChange],
  )

  const updateAnimationNumber = useCallback(
    (key: keyof AnimationSettings, value: number) => {
      if (!onAdminSettingsChange) return
      onAdminSettingsChange({
        ...adminSettings,
        animations: {
          ...adminSettings?.animations,
          [key]: value,
        },
      })
    },
    [adminSettings, onAdminSettingsChange],
  )

  const updateProgressiveMode = useCallback(
    (key: keyof ProgressiveOverlayModes, value: boolean) => {
      if (!onAdminSettingsChange) return
      onAdminSettingsChange({
        ...adminSettings,
        progressiveOverlayModes: {
          ...adminSettings?.progressiveOverlayModes,
          [key]: value,
        },
      })
    },
    [adminSettings, onAdminSettingsChange],
  )

  const vis = adminSettings?.sectionVisibility ?? {}
  const theme = adminSettings?.theme ?? {}
  const anim = adminSettings?.animations ?? {}
  const progModes = adminSettings?.progressiveOverlayModes ?? {}
  const isHexColor = (v: string) => /^#[0-9a-fA-F]{6}$/i.test(v)

  const sectionItems: { key: keyof SectionVisibility; label: string }[] = [
    { key: 'bio', label: 'Biography' },
    { key: 'music', label: 'Music Player' },
    { key: 'gigs', label: 'Upcoming Gigs' },
    { key: 'releases', label: 'Releases' },
    { key: 'gallery', label: 'Gallery' },
    { key: 'connect', label: 'Connect / Social' },
    { key: 'creditHighlights', label: 'Credit Highlights' },
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

  return (
    <>
      <input
        ref={importInputRef}
        type="file"
        accept=".json,application/json"
        className="hidden"
        onChange={handleImportFile}
      />

      {/* Section Visibility Panel */}
      <AnimatePresence>
        {showVisibilityPanel && (
          <motion.div
            className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowVisibilityPanel(false)}
          >
            <motion.div
              className="bg-card border border-border p-6 w-full max-w-md space-y-4 relative"
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold font-mono uppercase">Section Visibility</h3>
                <button onClick={() => setShowVisibilityPanel(false)} className="text-muted-foreground hover:text-foreground">
                  <X size={20} />
                </button>
              </div>
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
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Theme Customization Panel */}
      <AnimatePresence>
        {showThemePanel && (
          <motion.div
            className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowThemePanel(false)}
          >
            <motion.div
              className="bg-card border border-border p-6 w-full max-w-md space-y-4 relative max-h-[80vh] overflow-y-auto"
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold font-mono uppercase">Theme</h3>
                <button onClick={() => setShowThemePanel(false)} className="text-muted-foreground hover:text-foreground">
                  <X size={20} />
                </button>
              </div>
              <div className="space-y-3">
                {[
                  { key: 'primaryColor' as const, label: 'Primary Color', placeholder: 'oklch(0.55 0.25 25)' },
                  { key: 'accentColor' as const, label: 'Accent Color', placeholder: 'oklch(0.6 0.2 200)' },
                  { key: 'backgroundColor' as const, label: 'Background Color', placeholder: 'oklch(0.1 0 0)' },
                  { key: 'foregroundColor' as const, label: 'Foreground Color', placeholder: 'oklch(0.95 0 0)' },
                ].map(({ key, label, placeholder }) => (
                  <div key={key} className="space-y-1">
                    <Label className="font-mono text-xs">{label}</Label>
                    <div className="flex gap-2 items-center">
                      <input
                        type="color"
                        value={isHexColor(theme[key] || '') ? theme[key]! : '#000000'}
                        onChange={(e) => updateTheme(key, e.target.value)}
                        className="w-8 h-8 shrink-0 cursor-pointer border border-border rounded-sm bg-transparent p-0"
                        title="Pick a color"
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
                          style={{ backgroundColor: theme[key] }}
                          title={theme[key]}
                        />
                      )}
                    </div>
                  </div>
                ))}
                {([
                  { key: 'fontHeading' as const, label: 'Heading Font', placeholder: 'Orbitron, sans-serif', options: ['Orbitron', 'Rajdhani', 'Exo 2', 'Audiowide', 'Share Tech', 'Russo One', 'Teko', 'system-ui'] },
                  { key: 'fontBody' as const, label: 'Body Font', placeholder: 'system-ui, sans-serif', options: ['system-ui', 'Inter', 'Roboto', 'Open Sans', 'Lato', 'Poppins', 'Source Sans Pro', 'Share Tech Mono'] },
                  { key: 'fontMono' as const, label: 'Mono Font', placeholder: 'Share Tech Mono, monospace', options: ['Share Tech Mono', 'JetBrains Mono', 'Fira Code', 'Source Code Pro', 'IBM Plex Mono', 'Courier New'] },
                ] as const).map(({ key, label, placeholder, options }) => (
                  <div key={key} className="space-y-1">
                    <Label className="font-mono text-xs">{label}</Label>
                    <select
                      value={(options as readonly string[]).includes(theme[key] || '') ? theme[key] : ''}
                      onChange={(e) => { if (e.target.value) updateTheme(key, e.target.value) }}
                      className="w-full bg-background text-foreground border border-border rounded-md px-3 py-2 font-mono text-xs"
                    >
                      <option value="">Custom...</option>
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
                <div className="space-y-1">
                  <Label className="font-mono text-xs">Favicon URL</Label>
                  <Input
                    value={adminSettings?.faviconUrl || ''}
                    onChange={(e) =>
                      onAdminSettingsChange?.({
                        ...adminSettings,
                        faviconUrl: e.target.value,
                      })
                    }
                    placeholder="https://example.com/favicon.ico"
                    className="bg-background border-border font-mono text-xs"
                  />
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Animation Settings Panel */}
      <AnimatePresence>
        {showAnimationPanel && (
          <motion.div
            className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowAnimationPanel(false)}
          >
            <motion.div
              className="bg-card border border-border p-6 w-full max-w-md space-y-4 relative"
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold font-mono uppercase">Animations</h3>
                <button onClick={() => setShowAnimationPanel(false)} className="text-muted-foreground hover:text-foreground">
                  <X size={20} />
                </button>
              </div>
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
              <div className="space-y-3 pt-2 border-t border-border">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="font-mono text-xs">CRT Overlay Opacity</Label>
                    <span className="font-mono text-xs text-muted-foreground">{Math.round((typeof anim.crtOverlayOpacity === 'number' ? anim.crtOverlayOpacity : 0.6) * 100)}%</span>
                  </div>
                  <Slider
                    value={[typeof anim.crtOverlayOpacity === 'number' ? anim.crtOverlayOpacity * 100 : 60]}
                    min={0}
                    max={100}
                    step={5}
                    onValueChange={([v]) => updateAnimationNumber('crtOverlayOpacity', v / 100)}
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="font-mono text-xs">CRT Vignette Opacity</Label>
                    <span className="font-mono text-xs text-muted-foreground">{Math.round((typeof anim.crtVignetteOpacity === 'number' ? anim.crtVignetteOpacity : 0.3) * 100)}%</span>
                  </div>
                  <Slider
                    value={[typeof anim.crtVignetteOpacity === 'number' ? anim.crtVignetteOpacity * 100 : 30]}
                    min={0}
                    max={100}
                    step={5}
                    onValueChange={([v]) => updateAnimationNumber('crtVignetteOpacity', v / 100)}
                  />
                </div>
              </div>
              {onOpenConfigEditor && (
                <Button
                  onClick={() => {
                    setShowAnimationPanel(false)
                    onOpenConfigEditor()
                  }}
                  variant="outline"
                  className="w-full font-mono text-xs"
                >
                  <Sliders size={14} className="mr-2" />
                  Advanced Config Editor
                </Button>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Progressive Overlay Modes Panel */}
      <AnimatePresence>
        {showProgressiveModesPanel && (
          <motion.div
            className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowProgressiveModesPanel(false)}
          >
            <motion.div
              className="bg-card border border-border p-6 w-full max-w-md space-y-4 relative"
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold font-mono uppercase">Progressive Overlay Modes</h3>
                <button onClick={() => setShowProgressiveModesPanel(false)} className="text-muted-foreground hover:text-foreground">
                  <X size={20} />
                </button>
              </div>
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
                When multiple modes are selected, one will be chosen randomly each time an overlay opens.
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Section Reorder Panel */}
      <AnimatePresence>
        {showReorderPanel && (
          <motion.div
            className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowReorderPanel(false)}
          >
            <motion.div
              className="bg-card border border-border p-6 w-full max-w-md space-y-4 relative max-h-[80vh] overflow-y-auto"
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold font-mono uppercase">Reorder Sections</h3>
                <button onClick={() => setShowReorderPanel(false)} className="text-muted-foreground hover:text-foreground">
                  <X size={20} />
                </button>
              </div>
              <div className="space-y-1">
                {currentOrder.map((section, index) => (
                  <div key={section} className="flex items-center justify-between bg-background border border-border rounded-md px-3 py-2">
                    <span className="font-mono text-sm">{sectionDisplayNames[section] ?? section}</span>
                    <div className="flex gap-1">
                      <button
                        onClick={() => moveSectionUp(index)}
                        disabled={index === 0}
                        className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Move up"
                      >
                        <ArrowUp size={16} />
                      </button>
                      <button
                        onClick={() => moveSectionDown(index)}
                        disabled={index === currentOrder.length - 1}
                        className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Move down"
                      >
                        <ArrowDown size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <Button
                onClick={() => onAdminSettingsChange?.({ ...adminSettings, sectionOrder: defaultSectionOrder })}
                variant="outline"
                className="w-full font-mono text-xs"
              >
                Reset to Default
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
      >
        {editMode && (
          <>
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className="flex gap-2 flex-wrap justify-end"
            >
              <Button
                onClick={handleExport}
                className="bg-secondary hover:bg-secondary/80 active:scale-90 w-10 h-10 md:w-12 md:h-12 rounded-full shadow-lg transition-all touch-manipulation"
                size="icon"
                title="Export data as JSON"
              >
                <Export size={18} weight="bold" />
              </Button>
              <Button
                onClick={() => importInputRef.current?.click()}
                className="bg-secondary hover:bg-secondary/80 active:scale-90 w-10 h-10 md:w-12 md:h-12 rounded-full shadow-lg transition-all touch-manipulation"
                size="icon"
                title="Import data from JSON file"
              >
                <ArrowSquareIn size={18} weight="bold" />
              </Button>
              <Button
                onClick={() => setShowVisibilityPanel(true)}
                className="bg-secondary hover:bg-secondary/80 active:scale-90 w-10 h-10 md:w-12 md:h-12 rounded-full shadow-lg transition-all touch-manipulation"
                size="icon"
                title="Toggle section visibility"
              >
                {Object.values(vis).some((v) => v === false) ? (
                  <EyeSlash size={18} weight="bold" />
                ) : (
                  <Eye size={18} weight="bold" />
                )}
              </Button>
              <Button
                onClick={() => setShowThemePanel(true)}
                className="bg-secondary hover:bg-secondary/80 active:scale-90 w-10 h-10 md:w-12 md:h-12 rounded-full shadow-lg transition-all touch-manipulation"
                size="icon"
                title="Customize theme, colors, fonts"
              >
                <Palette size={18} weight="bold" />
              </Button>
              <Button
                onClick={() => setShowAnimationPanel(true)}
                className="bg-secondary hover:bg-secondary/80 active:scale-90 w-10 h-10 md:w-12 md:h-12 rounded-full shadow-lg transition-all touch-manipulation"
                size="icon"
                title="Animation settings"
              >
                <GearSix size={18} weight="bold" />
              </Button>
              <Button
                onClick={() => setShowProgressiveModesPanel(true)}
                className="bg-secondary hover:bg-secondary/80 active:scale-90 w-10 h-10 md:w-12 md:h-12 rounded-full shadow-lg transition-all touch-manipulation"
                size="icon"
                title="Progressive overlay loading modes"
              >
                <Sliders size={18} weight="bold" />
              </Button>
              <Button
                onClick={() => setShowReorderPanel(true)}
                className="bg-secondary hover:bg-secondary/80 active:scale-90 w-10 h-10 md:w-12 md:h-12 rounded-full shadow-lg transition-all touch-manipulation"
                size="icon"
                title="Reorder sections"
              >
                <ArrowsVertical size={18} weight="bold" />
              </Button>
              {onOpenStats && (
                <Button
                  onClick={onOpenStats}
                  className="bg-secondary hover:bg-secondary/80 active:scale-90 w-10 h-10 md:w-12 md:h-12 rounded-full shadow-lg transition-all touch-manipulation"
                  size="icon"
                  title="View site statistics"
                >
                  <ChartLine size={18} weight="bold" />
                </Button>
              )}
            </motion.div>
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            >
              <Button
                onClick={() => setShowPasswordDialog(true)}
                className="bg-secondary hover:bg-secondary/80 active:scale-90 w-10 h-10 md:w-12 md:h-12 rounded-full shadow-lg transition-all touch-manipulation"
                size="icon"
                title={hasPassword ? 'Change admin password' : 'Set admin password'}
              >
                <Key size={18} weight="bold" />
              </Button>
            </motion.div>
          </>
        )}

        <AnimatePresence mode="wait">
          {editMode ? (
            <motion.div
              key="exit"
              initial={{ scale: 0, rotate: -90 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0, rotate: 90 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            >
              <Button
                onClick={onToggleEdit}
                className="bg-destructive hover:bg-destructive/90 active:scale-90 w-14 h-14 md:w-16 md:h-16 rounded-full shadow-xl transition-all touch-manipulation"
                size="icon"
              >
                <X size={24} weight="bold" />
              </Button>
            </motion.div>
          ) : (
            <motion.div
              key="edit"
              initial={{ scale: 0, rotate: -90 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0, rotate: 90 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            >
              <Button
                onClick={onToggleEdit}
                className="bg-primary hover:bg-accent active:scale-90 w-14 h-14 md:w-16 md:h-16 rounded-full shadow-xl transition-all touch-manipulation"
                size="icon"
              >
                <Pencil size={24} weight="bold" />
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {showPasswordDialog && (
        <AdminLoginDialog
          open={showPasswordDialog}
          onOpenChange={setShowPasswordDialog}
          mode="setup"
          onSetPassword={hasPassword ? onChangePassword : onSetPassword}
        />
      )}
    </>
  )
}
