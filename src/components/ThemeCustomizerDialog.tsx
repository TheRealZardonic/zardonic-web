import { useState, useEffect, useCallback, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { X, ArrowCounterClockwise, Export, ArrowSquareIn, FloppyDisk, Eye, EyeSlash } from '@phosphor-icons/react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import type { ThemeSettings, SectionVisibility, OverlayEffect } from '@/lib/types'

/* ─── Theme presets ─── */
export interface ThemePreset {
  name: string
  description: string
  theme: ThemeSettings
}

export const THEME_PRESETS: ThemePreset[] = [
  {
    name: 'Neon Red (Default)',
    description: 'Default Neuroklast red cyberpunk theme',
    theme: {
      primary: 'oklch(0.50 0.22 25)',
      accent: 'oklch(0.60 0.24 25)',
      background: 'oklch(0 0 0)',
      card: 'oklch(0.05 0 0)',
      foreground: 'oklch(1 0 0)',
      mutedForeground: 'oklch(0.55 0 0)',
      border: 'oklch(0.15 0 0)',
      secondary: 'oklch(0.10 0 0)',
      fontHeading: "'JetBrains Mono', monospace",
      fontBody: "'Space Grotesk', sans-serif",
      fontMono: "'JetBrains Mono', monospace",
    },
  },
  {
    name: 'Cyber Blue',
    description: 'Cool blue neon – Night City vibes',
    theme: {
      primary: 'oklch(0.55 0.20 250)',
      accent: 'oklch(0.65 0.22 250)',
      background: 'oklch(0.02 0.01 260)',
      card: 'oklch(0.06 0.01 260)',
      foreground: 'oklch(0.95 0.01 250)',
      mutedForeground: 'oklch(0.55 0.05 250)',
      border: 'oklch(0.15 0.03 250)',
      secondary: 'oklch(0.10 0.02 260)',
      fontHeading: "'JetBrains Mono', monospace",
      fontBody: "'Space Grotesk', sans-serif",
      fontMono: "'JetBrains Mono', monospace",
    },
  },
  {
    name: 'Toxic Green',
    description: 'Matrix / hacker green terminal theme',
    theme: {
      primary: 'oklch(0.60 0.22 145)',
      accent: 'oklch(0.70 0.24 145)',
      background: 'oklch(0.01 0 0)',
      card: 'oklch(0.04 0.01 145)',
      foreground: 'oklch(0.90 0.10 145)',
      mutedForeground: 'oklch(0.50 0.08 145)',
      border: 'oklch(0.12 0.04 145)',
      secondary: 'oklch(0.08 0.02 145)',
      fontHeading: "'JetBrains Mono', monospace",
      fontBody: "'JetBrains Mono', monospace",
      fontMono: "'JetBrains Mono', monospace",
    },
  },
  {
    name: 'Violet Chrome',
    description: 'Deep purple & chrome – synthwave aesthetic',
    theme: {
      primary: 'oklch(0.55 0.25 300)',
      accent: 'oklch(0.65 0.27 310)',
      background: 'oklch(0.02 0.02 290)',
      card: 'oklch(0.06 0.03 290)',
      foreground: 'oklch(0.95 0.02 300)',
      mutedForeground: 'oklch(0.55 0.06 300)',
      border: 'oklch(0.15 0.05 300)',
      secondary: 'oklch(0.10 0.04 300)',
      fontHeading: "'JetBrains Mono', monospace",
      fontBody: "'Space Grotesk', sans-serif",
      fontMono: "'JetBrains Mono', monospace",
    },
  },
  {
    name: 'Gold Circuit',
    description: 'Gold & dark – luxury tech aesthetic',
    theme: {
      primary: 'oklch(0.65 0.18 80)',
      accent: 'oklch(0.72 0.20 80)',
      background: 'oklch(0.03 0.01 60)',
      card: 'oklch(0.07 0.02 60)',
      foreground: 'oklch(0.92 0.05 80)',
      mutedForeground: 'oklch(0.55 0.04 60)',
      border: 'oklch(0.18 0.06 80)',
      secondary: 'oklch(0.10 0.03 60)',
      fontHeading: "'JetBrains Mono', monospace",
      fontBody: "'Space Grotesk', sans-serif",
      fontMono: "'JetBrains Mono', monospace",
    },
  },
  {
    name: 'Crimson Punk',
    description: 'Deep crimson & hot pink – aggressive cyberpunk',
    theme: {
      primary: 'oklch(0.55 0.24 10)',
      accent: 'oklch(0.62 0.26 350)',
      background: 'oklch(0.02 0.01 350)',
      card: 'oklch(0.06 0.02 350)',
      foreground: 'oklch(0.95 0.02 10)',
      mutedForeground: 'oklch(0.50 0.06 350)',
      border: 'oklch(0.15 0.04 350)',
      secondary: 'oklch(0.10 0.03 350)',
      fontHeading: "'JetBrains Mono', monospace",
      fontBody: "'Space Grotesk', sans-serif",
      fontMono: "'JetBrains Mono', monospace",
    },
  },
]

const FONT_OPTIONS = [
  { label: 'JetBrains Mono', value: "'JetBrains Mono', monospace", google: false },
  { label: 'Space Grotesk', value: "'Space Grotesk', sans-serif", google: false },
  { label: 'System Mono', value: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace", google: false },
  { label: 'System Sans', value: "ui-sans-serif, system-ui, sans-serif", google: false },
  { label: 'System Serif', value: "ui-serif, Georgia, Cambria, 'Times New Roman', Times, serif", google: false },
  { label: 'Orbitron', value: "'Orbitron', sans-serif", google: true },
  { label: 'Share Tech Mono', value: "'Share Tech Mono', monospace", google: true },
  { label: 'VT323', value: "'VT323', monospace", google: true },
  { label: 'Press Start 2P', value: "'Press Start 2P', monospace", google: true },
  { label: 'Audiowide', value: "'Audiowide', sans-serif", google: true },
  { label: 'Rajdhani', value: "'Rajdhani', sans-serif", google: true },
  { label: 'Chakra Petch', value: "'Chakra Petch', sans-serif", google: true },
  { label: 'Exo 2', value: "'Exo 2', sans-serif", google: true },
  { label: 'Tektur', value: "'Tektur', sans-serif", google: true },
  { label: 'Oxanium', value: "'Oxanium', sans-serif", google: true },
  { label: 'Iceland', value: "'Iceland', monospace", google: true },
  { label: 'Michroma', value: "'Michroma', sans-serif", google: true },
  { label: 'Russo One', value: "'Russo One', sans-serif", google: true },
  { label: 'Bruno Ace', value: "'Bruno Ace', sans-serif", google: true },
  { label: 'Electrolize', value: "'Electrolize', sans-serif", google: true },
]

/** Load Google Fonts by injecting a stylesheet link */
const loadedFonts = new Set<string>()
function loadGoogleFont(fontLabel: string) {
  if (loadedFonts.has(fontLabel)) return
  loadedFonts.add(fontLabel)
  const family = fontLabel.replace(/ /g, '+')
  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href = `https://fonts.googleapis.com/css2?family=${family}:wght@400;500;700&display=swap`
  document.head.appendChild(link)
}

/** Pre-load all Google Fonts for preview */
function loadAllGoogleFonts() {
  FONT_OPTIONS.filter(f => f.google).forEach(f => loadGoogleFont(f.label))
}

/** Default overlay effect */
const DEFAULT_OVERLAY: OverlayEffect = { enabled: false, intensity: 0.5 }

const OVERLAY_LABELS: Record<string, { name: string; description: string }> = {
  dotMatrix: { name: 'Dot Matrix', description: 'Retro dot-grid pattern overlay' },
  scanlines: { name: 'Scanlines', description: 'Horizontal CRT scanline bars' },
  crt: { name: 'CRT Curvature', description: 'Curved screen edge distortion' },
  noise: { name: 'Static Noise', description: 'Subtle random noise grain' },
  vignette: { name: 'Vignette', description: 'Dark edges / spotlight center' },
  chromatic: { name: 'Chromatic Aberration', description: 'RGB color fringe shift' },
  movingScanline: { name: 'Moving Scanline', description: 'CRT-Auffrischungslinie die sich bewegt' },
}

const SECTION_LABELS: Record<keyof SectionVisibility, string> = {
  news: 'News Section',
  biography: 'Biography Section',
  gallery: 'Gallery Section',
  gigs: 'Gigs Section',
  releases: 'Releases Section',
  media: 'Media Section',
  social: 'Social / Connect Section',
  partnersAndFriends: 'Partners & Friends Section',
  hudBackground: 'HUD Background Overlay',
  audioVisualizer: 'Audio Visualizer',
  scanline: 'CRT Scanline Effect',
  systemMonitor: 'System Monitor HUD',
}

interface ThemeCustomizerDialogProps {
  open: boolean
  onClose: () => void
  themeSettings: ThemeSettings | undefined
  onSaveTheme: (theme: ThemeSettings) => void
  sectionVisibility: SectionVisibility | undefined
  onSaveSectionVisibility: (vis: SectionVisibility) => void
}

/** Apply theme CSS variables to <html> element */
export function applyThemeToDOM(theme: ThemeSettings | undefined) {
  const root = document.documentElement
  if (!theme) return

  if (theme.primary) root.style.setProperty('--primary', theme.primary)
  if (theme.accent) root.style.setProperty('--accent', theme.accent)
  if (theme.background) root.style.setProperty('--background', theme.background)
  if (theme.card) root.style.setProperty('--card', theme.card)
  if (theme.foreground) root.style.setProperty('--foreground', theme.foreground)
  if (theme.mutedForeground) root.style.setProperty('--muted-foreground', theme.mutedForeground)
  if (theme.border) root.style.setProperty('--border', theme.border)
  if (theme.secondary) root.style.setProperty('--secondary', theme.secondary)
  if (theme.fontBody) root.style.setProperty('--font-sans', theme.fontBody)
  if (theme.fontMono) root.style.setProperty('--font-mono', theme.fontMono)

  // Also update heading font
  if (theme.fontHeading) {
    root.style.setProperty('--font-heading', theme.fontHeading)
  }

  // Border radius
  // We set both --radius (used by index.css @theme) and --radius-factor
  // (used by theme.css #root rules which have higher CSS specificity).
  // Default: --radius = 0.125rem → --radius-factor = 1, so factor = radius / 0.125
  if (theme.borderRadius !== undefined) {
    root.style.setProperty('--radius', `${theme.borderRadius}rem`)
    root.style.setProperty('--radius-factor', String(theme.borderRadius / 0.125))
  }

  // Font size factor — scales html { font-size } so all rem-based values follow
  root.style.setProperty('--font-size-factor', String(theme.fontSize ?? 1))

  // Overlay effects
  applyOverlayEffectsToDOM(theme)

  // Update ring & destructive to match primary
  if (theme.primary) {
    root.style.setProperty('--ring', theme.primary)
    root.style.setProperty('--destructive', theme.primary)
  }
  if (theme.foreground) {
    root.style.setProperty('--primary-foreground', theme.foreground)
    root.style.setProperty('--secondary-foreground', theme.foreground)
    root.style.setProperty('--accent-foreground', theme.foreground)
    root.style.setProperty('--card-foreground', theme.foreground)
    root.style.setProperty('--popover-foreground', theme.foreground)
    root.style.setProperty('--destructive-foreground', theme.foreground)
  }
  if (theme.background) {
    root.style.setProperty('--popover', theme.background)
  }
  if (theme.mutedForeground) {
    root.style.setProperty('--muted', theme.mutedForeground)
  }

  // Load Google Fonts if selected
  for (const key of ['fontHeading', 'fontBody', 'fontMono'] as const) {
    const val = theme[key]
    if (!val) continue
    const match = FONT_OPTIONS.find(f => f.value === val)
    if (match?.google) loadGoogleFont(match.label)
  }
}

/** Apply overlay effect CSS classes to root element */
function applyOverlayEffectsToDOM(theme: ThemeSettings | undefined) {
  const root = document.documentElement
  const effects = theme?.overlayEffects
  root.style.setProperty('--overlay-dot-matrix', effects?.dotMatrix?.enabled ? String(effects.dotMatrix.intensity) : '0')
  root.style.setProperty('--overlay-scanlines', effects?.scanlines?.enabled ? String(effects.scanlines.intensity) : '0')
  root.style.setProperty('--overlay-crt', effects?.crt?.enabled ? String(effects.crt.intensity) : '0')
  root.style.setProperty('--overlay-noise', effects?.noise?.enabled ? String(effects.noise.intensity) : '0')
  root.style.setProperty('--overlay-vignette', effects?.vignette?.enabled ? String(effects.vignette.intensity) : '0')
  root.style.setProperty('--overlay-chromatic', effects?.chromatic?.enabled ? String(effects.chromatic.intensity) : '0')
  root.style.setProperty('--overlay-moving-scanline', effects?.movingScanline?.enabled ? '1' : '0')
}

/** Reset all custom CSS variables set by theme */
export function resetThemeDOM() {
  const root = document.documentElement
  const props = [
    '--primary', '--accent', '--background', '--card', '--foreground',
    '--muted-foreground', '--border', '--secondary', '--font-sans', '--font-mono',
    '--font-heading', '--ring', '--destructive', '--primary-foreground',
    '--secondary-foreground', '--accent-foreground', '--card-foreground',
    '--popover-foreground', '--destructive-foreground', '--popover', '--muted',
    '--radius', '--radius-factor', '--font-size-factor',
    '--overlay-dot-matrix', '--overlay-scanlines', '--overlay-crt',
    '--overlay-noise', '--overlay-vignette', '--overlay-chromatic',
    '--overlay-moving-scanline',
  ]
  props.forEach(p => root.style.removeProperty(p))
}

function ColorInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-3 py-1.5">
      <Label className="font-mono text-xs text-muted-foreground w-36 flex-shrink-0">{label}</Label>
      <div className="flex items-center gap-2 flex-1">
        <input
          type="color"
          value={oklchToHex(value)}
          onChange={e => onChange(hexToOklch(e.target.value))}
          className="w-8 h-8 rounded cursor-pointer border border-primary/20 bg-transparent"
        />
        <Input
          value={value}
          onChange={e => onChange(e.target.value)}
          className="font-mono text-xs h-8 flex-1"
          placeholder="oklch(0.50 0.22 25)"
        />
      </div>
    </div>
  )
}

/** Simple oklch → hex approximation for the color picker */
function oklchToHex(oklch: string): string {
  try {
    const el = document.createElement('div')
    el.style.color = oklch
    document.body.appendChild(el)
    const computed = getComputedStyle(el).color
    document.body.removeChild(el)
    const match = computed.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/)
    if (match) {
      const [, r, g, b] = match
      return `#${Number(r).toString(16).padStart(2, '0')}${Number(g).toString(16).padStart(2, '0')}${Number(b).toString(16).padStart(2, '0')}`
    }
  } catch { /* fallback */ }
  return '#ff3333'
}

/** Convert hex color to oklch via browser */
function hexToOklch(hex: string): string {
  try {
    const el = document.createElement('div')
    el.style.color = hex
    document.body.appendChild(el)
    const computed = getComputedStyle(el).color
    document.body.removeChild(el)
    const match = computed.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/)
    if (match) {
      const [, rs, gs, bs] = match
      const r = Number(rs) / 255
      const g = Number(gs) / 255
      const b = Number(bs) / 255
      // Simple sRGB → approximate oklch
      const l = 0.2126 * r + 0.7152 * g + 0.0722 * b
      const max = Math.max(r, g, b)
      const min = Math.min(r, g, b)
      const c = max - min
      let h = 0
      if (c > 0) {
        if (max === r) h = ((g - b) / c + 6) % 6 * 60
        else if (max === g) h = ((b - r) / c + 2) * 60
        else h = ((r - g) / c + 4) * 60
      }
      return `oklch(${l.toFixed(2)} ${(c * 0.4).toFixed(2)} ${Math.round(h)})`
    }
  } catch { /* fallback */ }
  return `oklch(0.50 0.22 25)`
}

export default function ThemeCustomizerDialog({
  open,
  onClose,
  themeSettings,
  onSaveTheme,
  sectionVisibility,
  onSaveSectionVisibility,
}: ThemeCustomizerDialogProps) {
  const [draft, setDraft] = useState<ThemeSettings>(themeSettings || {})
  const [visDraft, setVisDraft] = useState<SectionVisibility>(sectionVisibility || {})
  const [activeTab, setActiveTab] = useState<'colors' | 'fonts' | 'presets' | 'visibility' | 'effects'>('presets')
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const prevOpenRef = useRef(false)

  // Sync draft when dialog opens (not on every prop change while open)
  useEffect(() => {
    if (open && !prevOpenRef.current) {
      setDraft(themeSettings || {})
      setVisDraft(sectionVisibility || {})
    }
    prevOpenRef.current = open
  }, [open])

  // Load all Google Fonts when fonts tab is opened
  useEffect(() => {
    if (open && activeTab === 'fonts') loadAllGoogleFonts()
  }, [open, activeTab])

  // Live preview: apply to DOM as user changes colors
  useEffect(() => {
    if (open) applyThemeToDOM(draft)
  }, [draft, open])

  const updateColor = useCallback((key: keyof ThemeSettings, value: string) => {
    setDraft(prev => ({ ...prev, [key]: value }))
  }, [])

  const handlePreset = (preset: ThemePreset) => {
    setDraft({ ...preset.theme, activePreset: preset.name })
  }

  const handleSave = () => {
    onSaveTheme(draft)
    onSaveSectionVisibility(visDraft)
    toast.success('Theme saved')
    onClose()
  }

  const handleReset = () => {
    const defaults = THEME_PRESETS[0].theme
    setDraft({ ...defaults, activePreset: THEME_PRESETS[0].name })
    resetThemeDOM()
    applyThemeToDOM(defaults)
  }

  const handleExportTheme = () => {
    const json = JSON.stringify({ theme: draft, visibility: visDraft }, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `theme-${(draft.activePreset || 'custom').replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    toast.success('Theme exported')
  }

  const handleImportTheme = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result as string)
        if (parsed.theme) {
          setDraft(parsed.theme)
          if (parsed.visibility) setVisDraft(parsed.visibility)
          toast.success('Theme imported')
        } else {
          toast.error('Invalid theme file')
        }
      } catch {
        toast.error('Failed to parse theme file')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const toggleVisibility = (key: keyof SectionVisibility) => {
    setVisDraft(prev => {
      const currentlyVisible = prev[key] !== false
      return { ...prev, [key]: !currentlyVisible }
    })
  }

  const updateOverlayEffect = (key: string, updates: Partial<OverlayEffect>) => {
    setDraft(prev => ({
      ...prev,
      overlayEffects: {
        ...prev.overlayEffects,
        [key]: { ...(prev.overlayEffects?.[key as keyof typeof prev.overlayEffects] || DEFAULT_OVERLAY), ...updates },
      },
    }))
  }

  const tabs = [
    { key: 'presets' as const, label: 'PRESETS' },
    { key: 'colors' as const, label: 'COLORS' },
    { key: 'fonts' as const, label: 'FONTS' },
    { key: 'effects' as const, label: 'EFFECTS' },
    { key: 'visibility' as const, label: 'VISIBILITY' },
  ]

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[10000] bg-background/95 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="w-full max-w-3xl bg-card border-2 border-primary/30 relative overflow-hidden"
            initial={{ scale: 0.9, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, y: 20, opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={e => e.stopPropagation()}
          >
            {/* HUD corners */}
            <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-primary/50" />
            <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-primary/50" />
            <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-primary/50" />
            <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-primary/50" />

            {/* Header */}
            <div className="h-12 bg-primary/10 border-b border-primary/30 flex items-center justify-between px-4">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                <span className="font-mono text-xs text-primary/70 tracking-wider uppercase">THEME CUSTOMIZER</span>
                {draft.activePreset && (
                  <span className="font-mono text-[9px] text-primary bg-primary/15 px-2 py-0.5 rounded">
                    {draft.activePreset}
                  </span>
                )}
              </div>
              <button onClick={onClose} className="text-primary/60 hover:text-primary p-1">
                <X size={20} />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-primary/20">
              {tabs.map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex-1 py-2 font-mono text-xs tracking-wider transition-colors ${
                    activeTab === tab.key
                      ? 'text-primary border-b-2 border-primary bg-primary/5'
                      : 'text-muted-foreground hover:text-primary/70'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Body */}
            <div className="max-h-[60vh] overflow-y-auto p-4">

              {/* PRESETS TAB */}
              {activeTab === 'presets' && (
                <div className="space-y-3">
                  <p className="font-mono text-[10px] text-muted-foreground/60 mb-4">
                    Select a cyberpunk design preset. You can further customize colors and fonts in the other tabs.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {THEME_PRESETS.map(preset => (
                      <button
                        key={preset.name}
                        onClick={() => handlePreset(preset)}
                        className={`border rounded p-3 text-left transition-all hover:border-primary/50 ${
                          draft.activePreset === preset.name ? 'border-primary bg-primary/10' : 'border-primary/15'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <div
                            className="w-4 h-4 rounded-full border border-white/20"
                            style={{ background: preset.theme.primary }}
                          />
                          <div
                            className="w-4 h-4 rounded-full border border-white/20"
                            style={{ background: preset.theme.accent }}
                          />
                          <div
                            className="w-4 h-4 rounded-full border border-white/20"
                            style={{ background: preset.theme.background }}
                          />
                        </div>
                        <div className="font-mono text-xs text-primary/90">{preset.name}</div>
                        <div className="font-mono text-[9px] text-muted-foreground/60">{preset.description}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* COLORS TAB */}
              {activeTab === 'colors' && (
                <div className="space-y-2">
                  <p className="font-mono text-[10px] text-muted-foreground/60 mb-3">
                    Customize individual colors and border radius. Changes preview live.
                  </p>
                  <ColorInput label="Primary" value={draft.primary || 'oklch(0.50 0.22 25)'} onChange={v => updateColor('primary', v)} />
                  <ColorInput label="Accent" value={draft.accent || 'oklch(0.60 0.24 25)'} onChange={v => updateColor('accent', v)} />
                  <ColorInput label="Background" value={draft.background || 'oklch(0 0 0)'} onChange={v => updateColor('background', v)} />
                  <ColorInput label="Card" value={draft.card || 'oklch(0.05 0 0)'} onChange={v => updateColor('card', v)} />
                  <ColorInput label="Foreground" value={draft.foreground || 'oklch(1 0 0)'} onChange={v => updateColor('foreground', v)} />
                  <ColorInput label="Muted Text" value={draft.mutedForeground || 'oklch(0.55 0 0)'} onChange={v => updateColor('mutedForeground', v)} />
                  <ColorInput label="Border" value={draft.border || 'oklch(0.15 0 0)'} onChange={v => updateColor('border', v)} />
                  <ColorInput label="Secondary" value={draft.secondary || 'oklch(0.10 0 0)'} onChange={v => updateColor('secondary', v)} />

                  {/* Border Radius Slider */}
                  <div className="pt-4 border-t border-primary/10">
                    <div className="flex items-center justify-between mb-2">
                      <Label className="font-mono text-xs text-muted-foreground">Border Radius</Label>
                      <span className="font-mono text-[10px] text-primary/70">{(draft.borderRadius ?? 0.125).toFixed(3)}rem</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1.5"
                      step="0.025"
                      value={draft.borderRadius ?? 0.125}
                      onChange={e => setDraft(prev => ({ ...prev, borderRadius: parseFloat(e.target.value) }))}
                      className="w-full h-1.5 appearance-none bg-primary/20 rounded cursor-pointer accent-primary"
                    />
                    <div className="flex justify-between text-[9px] text-muted-foreground/40 font-mono mt-1">
                      <span>SHARP</span>
                      <span>ROUNDED</span>
                    </div>
                    <div className="flex items-center gap-3 mt-2">
                      <div className="w-16 h-10 border border-primary/40 bg-primary/10" style={{ borderRadius: `${(draft.borderRadius ?? 0.125) * 16}px` }} />
                      <div className="w-20 h-8 border border-primary/40 bg-primary/10" style={{ borderRadius: `${(draft.borderRadius ?? 0.125) * 16}px` }} />
                      <span className="font-mono text-[9px] text-muted-foreground/50">Preview</span>
                    </div>
                  </div>
                </div>
              )}

              {/* FONTS TAB */}
              {activeTab === 'fonts' && (
                <div className="space-y-4">
                  <p className="font-mono text-[10px] text-muted-foreground/60 mb-3">
                    Choose from local and Google Fonts. Font previews are shown below each selector.
                  </p>
                  {[
                    { key: 'fontHeading' as const, label: 'Heading Font' },
                    { key: 'fontBody' as const, label: 'Body Font' },
                    { key: 'fontMono' as const, label: 'Mono/Code Font' },
                  ].map(({ key, label }) => (
                    <div key={key} className="space-y-1">
                      <Label className="font-mono text-xs text-muted-foreground">{label}</Label>
                      <select
                        value={draft[key] || FONT_OPTIONS[0].value}
                        onChange={e => {
                          const opt = FONT_OPTIONS.find(f => f.value === e.target.value)
                          if (opt?.google) loadGoogleFont(opt.label)
                          setDraft(prev => ({ ...prev, [key]: e.target.value }))
                        }}
                        className="w-full h-9 rounded border border-primary/20 bg-card px-3 text-xs text-foreground"
                        style={{ fontFamily: draft[key] || FONT_OPTIONS[0].value }}
                      >
                        {FONT_OPTIONS.map(opt => (
                          <option key={opt.value} value={opt.value} style={{ fontFamily: opt.value }}>
                            {opt.label}{opt.google ? ' (Google)' : ''}
                          </option>
                        ))}
                      </select>
                      <div
                        className="border border-primary/10 bg-black/30 p-3 mt-1"
                        style={{ fontFamily: draft[key] || FONT_OPTIONS[0].value }}
                      >
                        <p className="text-sm text-foreground/80">
                          NEUROKLAST — The quick brown fox jumps over the lazy dog
                        </p>
                        <p className="text-xs text-foreground/50 mt-1">
                          0123456789 !@#$%^&amp;*() ABCDEFGHIJKLMNOPQRSTUVWXYZ
                        </p>
                      </div>
                    </div>
                  ))}
                  {/* Font Size Slider */}
                  <div className="pt-4 border-t border-primary/10">
                    <div className="flex items-center justify-between mb-2">
                      <Label className="font-mono text-xs text-muted-foreground">Schriftgröße (Basis)</Label>
                      <span className="font-mono text-[10px] text-primary/70">{Math.round((draft.fontSize ?? 1) * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0.75"
                      max="1.5"
                      step="0.05"
                      value={draft.fontSize ?? 1}
                      onChange={e => setDraft(prev => ({ ...prev, fontSize: parseFloat(e.target.value) }))}
                      className="w-full h-1.5 appearance-none bg-primary/20 rounded cursor-pointer accent-primary"
                      aria-label="Schriftgröße"
                    />
                    <div className="flex justify-between text-[9px] text-muted-foreground/40 font-mono mt-1">
                      <span>KLEIN (75%)</span>
                      <span>NORMAL (100%)</span>
                      <span>GROß (150%)</span>
                    </div>
                  </div>
                </div>
              )}

              {/* EFFECTS TAB */}
              {activeTab === 'effects' && (
                <div className="space-y-3">
                  <p className="font-mono text-[10px] text-muted-foreground/60 mb-3">
                    Enable, disable, and adjust visual overlay effects.
                  </p>
                  {Object.entries(OVERLAY_LABELS).map(([key, { name, description }]) => {
                    const effect = draft.overlayEffects?.[key as keyof typeof draft.overlayEffects] || DEFAULT_OVERLAY
                    return (
                      <div key={key} className="border border-primary/10 p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="font-mono text-xs text-foreground/90">{name}</span>
                            <p className="font-mono text-[9px] text-muted-foreground/50">{description}</p>
                          </div>
                          <button
                            onClick={() => updateOverlayEffect(key, { enabled: !effect.enabled })}
                            className={`flex items-center gap-2 px-3 py-1 rounded text-xs font-mono transition-colors ${
                              effect.enabled ? 'text-primary bg-primary/10' : 'text-muted-foreground/40 bg-muted/20'
                            }`}
                          >
                            {effect.enabled ? <Eye size={14} /> : <EyeSlash size={14} />}
                            {effect.enabled ? 'ON' : 'OFF'}
                          </button>
                        </div>
                        {effect.enabled && (
                          <div className="flex items-center gap-3">
                            <Label className="font-mono text-[10px] text-muted-foreground/60 w-16 flex-shrink-0">Intensity</Label>
                            <input
                              type="range"
                              min="0.05"
                              max="1"
                              step="0.05"
                              value={effect.intensity}
                              onChange={e => updateOverlayEffect(key, { intensity: parseFloat(e.target.value) })}
                              className="flex-1 h-1 appearance-none bg-primary/20 rounded cursor-pointer accent-primary"
                            />
                            <span className="font-mono text-[10px] text-primary/70 w-8 text-right">
                              {Math.round(effect.intensity * 100)}%
                            </span>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}

              {/* VISIBILITY TAB */}
              {activeTab === 'visibility' && (
                <div className="space-y-2">
                  <p className="font-mono text-[10px] text-muted-foreground/60 mb-3">
                    Show or hide individual sections and effects.
                  </p>
                  {(Object.keys(SECTION_LABELS) as (keyof SectionVisibility)[]).map(key => {
                    const visible = visDraft[key] !== false
                    return (
                      <div key={key} className="flex items-center justify-between py-2 border-b border-primary/5">
                        <span className="font-mono text-xs text-muted-foreground">{SECTION_LABELS[key]}</span>
                        <button
                          onClick={() => toggleVisibility(key)}
                          className={`flex items-center gap-2 px-3 py-1 rounded text-xs font-mono transition-colors ${
                            visible ? 'text-primary bg-primary/10' : 'text-muted-foreground/40 bg-muted/20'
                          }`}
                        >
                          {visible ? <Eye size={14} /> : <EyeSlash size={14} />}
                          {visible ? 'VISIBLE' : 'HIDDEN'}
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-primary/20 flex flex-wrap gap-2 justify-between items-center">
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleExportTheme} className="gap-1 text-xs border-primary/30">
                  <Export size={14} /> Export
                </Button>
                <label>
                  <input
                    type="file"
                    accept=".json,application/json"
                    className="hidden"
                    ref={fileInputRef}
                    onChange={handleImportTheme}
                  />
                  <Button variant="outline" size="sm" asChild className="gap-1 text-xs border-primary/30 cursor-pointer">
                    <span><ArrowSquareIn size={14} /> Import</span>
                  </Button>
                </label>
                <Button variant="outline" size="sm" onClick={handleReset} className="gap-1 text-xs border-primary/30">
                  <ArrowCounterClockwise size={14} /> Reset
                </Button>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
                <Button size="sm" onClick={handleSave} className="gap-1">
                  <FloppyDisk size={14} /> Save Theme
                </Button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
