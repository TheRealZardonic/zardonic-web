import { X, FloppyDisk, Sliders, Warning, MagicWand } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
import { Separator } from '@/components/ui/separator'
import { TabsContent } from '@/components/ui/tabs'
import { toast } from 'sonner'
import { getContrastRatio } from '@/lib/contrast'
import { oklchToHex } from '@/lib/color-utils'
import { COLOR_TO_CSS_VAR, setHighlightColor } from '@/lib/color-highlight'
import type {
  AdminSettings,
  ThemeCustomization,
  AnimationSettings,
  ProgressiveOverlayModes,
  CustomColorPreset,
} from '@/lib/types'

const BUILTIN_PRESETS: { name: string; theme: Partial<ThemeCustomization> }[] = [
  {
    name: 'Neon Red (Default)',
    theme: {
      primaryColor: 'oklch(0.50 0.22 25)',
      accentColor: 'oklch(0.60 0.24 25)',
      backgroundColor: 'oklch(0 0 0)',
      cardColor: 'oklch(0.05 0 0)',
      foregroundColor: 'oklch(1 0 0)',
      mutedForegroundColor: 'oklch(0.55 0 0)',
      borderColor: 'oklch(0.15 0 0)',
      secondaryColor: 'oklch(0.10 0 0)',
    },
  },
  {
    name: 'Cyber Blue',
    theme: {
      primaryColor: 'oklch(0.55 0.20 250)',
      accentColor: 'oklch(0.65 0.22 250)',
      backgroundColor: 'oklch(0.02 0.01 260)',
      cardColor: 'oklch(0.06 0.01 260)',
      foregroundColor: 'oklch(0.95 0.01 250)',
      mutedForegroundColor: 'oklch(0.55 0.05 250)',
      borderColor: 'oklch(0.15 0.03 250)',
      secondaryColor: 'oklch(0.10 0.02 260)',
    },
  },
  {
    name: 'Toxic Green',
    theme: {
      primaryColor: 'oklch(0.60 0.22 145)',
      accentColor: 'oklch(0.70 0.24 145)',
      backgroundColor: 'oklch(0.01 0 0)',
      cardColor: 'oklch(0.04 0.01 145)',
      foregroundColor: 'oklch(0.90 0.10 145)',
      mutedForegroundColor: 'oklch(0.50 0.08 145)',
      borderColor: 'oklch(0.12 0.04 145)',
      secondaryColor: 'oklch(0.08 0.02 145)',
    },
  },
  {
    name: 'Violet Chrome',
    theme: {
      primaryColor: 'oklch(0.55 0.25 300)',
      accentColor: 'oklch(0.65 0.27 310)',
      backgroundColor: 'oklch(0.02 0.02 290)',
      cardColor: 'oklch(0.06 0.03 290)',
      foregroundColor: 'oklch(0.95 0.02 300)',
      mutedForegroundColor: 'oklch(0.55 0.06 300)',
      borderColor: 'oklch(0.15 0.05 300)',
      secondaryColor: 'oklch(0.10 0.04 300)',
    },
  },
  {
    name: 'Gold Circuit',
    theme: {
      primaryColor: 'oklch(0.65 0.18 80)',
      accentColor: 'oklch(0.72 0.20 80)',
      backgroundColor: 'oklch(0.03 0.01 60)',
      cardColor: 'oklch(0.07 0.02 60)',
      foregroundColor: 'oklch(0.92 0.05 80)',
      mutedForegroundColor: 'oklch(0.55 0.04 60)',
      borderColor: 'oklch(0.18 0.06 80)',
      secondaryColor: 'oklch(0.10 0.03 60)',
    },
  },
  {
    name: 'DIGICIDE',
    theme: {
      primaryColor: 'oklch(0.78 0.03 220)',
      accentColor: 'oklch(0.65 0.06 215)',
      backgroundColor: 'oklch(0.015 0.005 240)',
      cardColor: 'oklch(0.045 0.008 230)',
      foregroundColor: 'oklch(0.82 0.03 210)',
      mutedForegroundColor: 'oklch(0.40 0.02 220)',
      borderColor: 'oklch(0.10 0.01 225)',
      secondaryColor: 'oklch(0.07 0.01 230)',
      ringColor: 'oklch(0.78 0.03 220)',
      hoverColor: 'oklch(0.65 0.06 215)',
      destructiveColor: 'oklch(0.45 0.18 20)',
      modalGlowColor: 'oklch(0.60 0.05 220 / 0.25)',
    },
  },
]

interface AppearanceTabProps {
  adminSettings?: AdminSettings | null
  setAdminSettings?: (s: AdminSettings) => void
  theme: ThemeCustomization
  updateTheme: (key: keyof ThemeCustomization, value: string) => void
  applyPreset: (theme: Partial<ThemeCustomization>) => void
  anim: AnimationSettings
  updateAnimation: (key: keyof AnimationSettings, value: boolean) => void
  updateAnimationNumber: (key: keyof AnimationSettings, value: number) => void
  progModes: ProgressiveOverlayModes
  updateProgressiveMode: (key: keyof ProgressiveOverlayModes, value: boolean) => void
  onClose: () => void
  onOpenConfigEditor?: () => void
  newPresetName: string
  setNewPresetName: (v: string) => void
}

const animItems: { key: keyof AnimationSettings; label: string }[] = [
  { key: 'glitchEnabled', label: 'Glitch Effects' },
  { key: 'scanlineEnabled', label: 'Scanline Overlay' },
  { key: 'chromaticEnabled', label: 'Chromatic Aberration' },
  { key: 'crtEnabled', label: 'CRT Effect' },
  { key: 'noiseEnabled', label: 'Noise / Grain' },
  { key: 'circuitBackgroundEnabled', label: 'Circuit Background' },
  { key: 'blinkingCursor', label: 'Blinking Cursor on Headings' },
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
  {
    title: 'Data-Label (// annotation text)',
    fields: [
      { key: 'dataLabelColor', label: 'Color', placeholder: 'var(--accent)' },
      { key: 'dataLabelFontSize', label: 'Font Size', placeholder: '10px' },
      { key: 'dataLabelFontFamily', label: 'Font Family', placeholder: "'Share Tech Mono', monospace" },
    ],
  },
  {
    title: 'Modal Glow',
    fields: [
      { key: 'modalGlowColor', label: 'Modal Backdrop Glow', placeholder: 'oklch(0.5 0.2 25 / 0.3)' },
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


/** Shows a WCAG contrast warning when foreground/background ratio is too low. */
function ContrastBadge({ fg, bg, largeText = false }: { fg: string; bg: string; largeText?: boolean }) {
  if (!fg || !bg) return null
  const ratio = getContrastRatio(fg, bg)
  if (ratio === null) return null
  const threshold = largeText ? 3 : 4.5
  const passed = ratio >= threshold
  const ratioStr = ratio.toFixed(2)
  if (passed) return null
  return (
    <span
      className="inline-flex items-center gap-1 text-[10px] font-mono text-yellow-400 border border-yellow-500/40 bg-yellow-500/10 px-1.5 py-0.5 rounded-sm"
      title={`WCAG contrast ratio: ${ratioStr}:1 (minimum ${threshold}:1 required)`}
    >
      <Warning size={10} weight="fill" />
      {ratioStr}:1 — low contrast
    </span>
  )
}

export default function AppearanceTab({
  adminSettings,
  setAdminSettings,
  theme,
  updateTheme,
  applyPreset,
  anim,
  updateAnimation,
  progModes,
  updateProgressiveMode,
  onClose,
  onOpenConfigEditor,
  newPresetName,
  setNewPresetName,
}: AppearanceTabProps) {
  // Auto-contrast: sets all text foreground colors so they contrast sufficiently
  const handleAutoContrast = () => {
    const bg = theme.backgroundColor || 'oklch(0 0 0)'
    const cardBg = theme.cardColor || 'oklch(0.05 0 0)'

    // Pairs: [foreground key, background value]
    const pairs: [keyof ThemeCustomization, string][] = [
      ['foregroundColor', bg],
      ['cardForegroundColor', cardBg],
      ['popoverForegroundColor', theme.popoverColor || cardBg],
      ['secondaryForegroundColor', theme.secondaryColor || bg],
      ['mutedForegroundColor', theme.mutedColor || bg],
      ['accentForegroundColor', theme.accentColor || bg],
      ['primaryForegroundColor', theme.primaryColor || bg],
      ['destructiveForegroundColor', theme.destructiveColor || bg],
    ]

    const updates: Partial<ThemeCustomization> = {}
    for (const [key, background] of pairs) {
      const current = (theme[key] as string | undefined) || 'oklch(1 0 0)'
      const ratio = getContrastRatio(current, background)
      if (ratio !== null && ratio < 4.5) {
        // Determine if background is light or dark via getContrastRatio with white/black
        const vsWhite = getContrastRatio('oklch(1 0 0)', background) ?? 0
        const vsBlack = getContrastRatio('oklch(0 0 0)', background) ?? 0
        updates[key] = vsWhite >= vsBlack ? 'oklch(1 0 0)' : 'oklch(0.10 0 0)'
      }
    }

    if (Object.keys(updates).length === 0) {
      toast.info('All text colors already have sufficient contrast')
    } else {
      applyPreset(updates)
      toast.success(`Adjusted ${Object.keys(updates).length} color(s) for contrast`)
    }
  }

  return (
    <TabsContent value="appearance" className="flex-1 overflow-y-auto p-4 space-y-6 mt-0">
      {/* Built-in Color Presets */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-mono text-xs font-bold text-primary uppercase tracking-wider">
            Built-in Presets
          </h3>
          <button
            onClick={() => applyPreset(BUILTIN_PRESETS[0].theme)}
            className="font-mono text-[10px] text-muted-foreground hover:text-primary border border-border hover:border-primary px-2 py-1 rounded transition-colors"
          >
            Reset to Default
          </button>
        </div>
        <div className="grid grid-cols-1 gap-1">
          {BUILTIN_PRESETS.map((preset) => (
            <button
              key={preset.name}
              onClick={() => applyPreset(preset.theme)}
              className="text-left px-3 py-2 border border-border rounded font-mono text-xs hover:border-primary hover:text-foreground text-muted-foreground transition-colors"
            >
              {preset.name}
            </button>
          ))}
        </div>
      </section>
      <Separator />
      {/* Color Presets */}
      <section className="space-y-3">
        <h3 className="font-mono text-xs font-bold text-primary uppercase tracking-wider">
          Color Presets
        </h3>
        <div className="flex gap-2">
          <Input
            placeholder="Preset name..."
            value={newPresetName}
            onChange={e => setNewPresetName(e.target.value)}
            className="font-mono text-xs"
          />
          <Button
            variant="outline"
            size="sm"
            className="font-mono text-xs shrink-0"
            onClick={() => {
              if (!newPresetName.trim()) return
              const preset: CustomColorPreset = {
                id: Date.now().toString(),
                name: newPresetName.trim(),
                theme: { ...theme },
              }
              setAdminSettings?.({
                ...(adminSettings ?? {}),
                colorPresets: [...(adminSettings?.colorPresets ?? []), preset],
              })
              setNewPresetName('')
              toast.success('Preset saved')
            }}
          >
            <FloppyDisk size={13} className="mr-1" /> Save
          </Button>
        </div>
        {(adminSettings?.colorPresets ?? []).length > 0 && (
          <div className="space-y-1.5">
            {(adminSettings?.colorPresets ?? []).map(preset => (
              <div key={preset.id} className="flex items-center gap-2">
                <button
                  className="flex-1 text-left px-2 py-1.5 border border-border rounded font-mono text-xs hover:border-primary hover:text-primary transition-colors truncate"
                  onClick={() => applyPreset(preset.theme)}
                >
                  {preset.name}
                </button>
                <button
                  className="text-muted-foreground hover:text-destructive transition-colors p-1"
                  aria-label={`Delete preset ${preset.name}`}
                  onClick={() => setAdminSettings?.({
                    ...(adminSettings ?? {}),
                    colorPresets: (adminSettings?.colorPresets ?? []).filter(p => p.id !== preset.id),
                  })}
                >
                  <X size={13} />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
      <Separator />
      {/* Color groups */}
      {colorGroups.map(({ title, fields }) => (
        <section key={title} className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-mono text-xs font-bold text-primary uppercase tracking-wider">
              {title}
            </h3>
            {title === 'Base Colors' && (
              <button
                onClick={handleAutoContrast}
                className="inline-flex items-center gap-1 font-mono text-[10px] text-muted-foreground hover:text-primary border border-border hover:border-primary px-2 py-1 rounded transition-colors"
                title="Automatically adjust text colors for sufficient contrast"
              >
                <MagicWand size={11} />
                Auto Contrast
              </button>
            )}
          </div>
          <div className="space-y-3">
            {fields.map(({ key, label, placeholder }) => (
              <div
                key={key}
                className="space-y-1"
                onMouseEnter={() => { const cssVar = COLOR_TO_CSS_VAR[key]; if (cssVar) setHighlightColor(cssVar) }}
                onMouseLeave={() => setHighlightColor(null)}
              >
                <Label className="font-mono text-[11px] text-muted-foreground">{label}</Label>
                <div className="flex gap-2 items-center">
                  <input
                    type="color"
                    value={oklchToHex((theme[key] as string) || '#000000')}
                    onChange={(e) => updateTheme(key, e.target.value)}
                    className="w-8 h-8 shrink-0 cursor-pointer border border-border rounded-sm bg-transparent p-0"
                    title="Pick a color"
                    aria-label={`Color picker for ${label}`}
                  />
                  <Input
                    value={(theme[key] as string) || ''}
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
                {/* WCAG contrast warnings for text-on-background pairs */}
                {key === 'foregroundColor' && theme.backgroundColor && (
                  <ContrastBadge fg={theme.foregroundColor || ''} bg={theme.backgroundColor || ''} />
                )}
                {key === 'cardForegroundColor' && theme.cardColor && (
                  <ContrastBadge fg={theme.cardForegroundColor || ''} bg={theme.cardColor || ''} />
                )}
                {key === 'mutedForegroundColor' && theme.backgroundColor && (
                  <ContrastBadge fg={theme.mutedForegroundColor || ''} bg={theme.backgroundColor || ''} largeText />
                )}
                {key === 'primaryForegroundColor' && theme.primaryColor && (
                  <ContrastBadge fg={theme.primaryForegroundColor || ''} bg={theme.primaryColor || ''} />
                )}
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
              setAdminSettings?.({ ...(adminSettings ?? {}), faviconUrl: e.target.value })
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
                ...(adminSettings ?? {}),
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
                ...(adminSettings ?? {}),
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
                ...(adminSettings ?? {}),
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
  )
}
