import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { AdminSettings } from '@/lib/types'
import type { SiteData } from '@/App'
import type { SectionConfigField, DisclosureLevel } from '@/lib/sections-registry'
import { isFieldVisible, getAdminValue, setAdminValue } from '@/lib/admin-settings'

interface SectionFieldRendererProps {
  field: SectionConfigField
  adminSettings: AdminSettings | undefined
  setAdminSettings: ((s: AdminSettings) => void) | undefined
  siteData: SiteData | undefined
  onUpdateSiteData: ((updater: SiteData | ((c: SiteData) => SiteData)) => void) | undefined
  disclosureLevel: DisclosureLevel
}

/** Reads a nested value from SiteData using dot-notation path (e.g. 'social.instagram'). */
function getSiteDataValue(siteData: SiteData | undefined, path: string): unknown {
  if (!siteData) return undefined
  // path starts with 'siteData.' — strip that prefix
  const localPath = path.replace(/^siteData\./, '')
  const parts = localPath.split('.')
  let current: Record<string, unknown> = siteData as unknown as Record<string, unknown>
  for (const part of parts) {
    if (current === undefined || current === null) return undefined
    current = current[part] as Record<string, unknown>
  }
  return current
}

/** Sets a nested value in SiteData using dot-notation path. */
function setSiteDataValue(
  siteData: SiteData | undefined,
  path: string,
  value: unknown,
  onUpdateSiteData: ((updater: SiteData | ((c: SiteData) => SiteData)) => void) | undefined,
): void {
  if (!onUpdateSiteData) return
  const localPath = path.replace(/^siteData\./, '')
  const parts = localPath.split('.')

  onUpdateSiteData((current: SiteData) => {
    const result: Record<string, unknown> = { ...current }
    let node: Record<string, unknown> = result
    for (let i = 0; i < parts.length - 1; i++) {
      const key = parts[i]
      node[key] = node[key] ? { ...(node[key] as Record<string, unknown>) } : {}
      node = node[key] as Record<string, unknown>
    }
    node[parts[parts.length - 1]] = value
    return result as unknown as SiteData
  })
}

/** Validates a URL string. Returns true if valid or empty. */
function isValidUrl(value: string): boolean {
  if (!value) return true
  try {
    new URL(value)
    return true
  } catch {
    return false
  }
}

/** Validates a color string (hex, rgb, rgba, oklch, hsl, named etc.). */
function isValidColor(value: string): boolean {
  if (!value) return true
  if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(value)) return true
  if (/^(rgb|rgba|hsl|hsla|oklch|oklab|lch|lab|color)\s*\(/.test(value)) return true
  if (/^[a-zA-Z]+$/.test(value)) return true
  return false
}

/** Image preview with fallback message when the URL loads an image that fails. */
function ImagePreview({ src }: { src: string }) {
  const [loadFailed, setLoadFailed] = useState(false)

  if (loadFailed) {
    return (
      <div className="w-full h-16 flex items-center justify-center rounded border border-border bg-muted/30">
        <span className="font-mono text-[10px] text-muted-foreground">Image could not be loaded</span>
      </div>
    )
  }

  return (
    <div className="relative w-full h-16 overflow-hidden rounded border border-border">
      <img
        src={src}
        alt="Preview"
        className="w-full h-full object-cover"
        onError={() => setLoadFailed(true)}
      />
    </div>
  )
}

/**
 * Inner component — always mounted when the field is visible, so hooks are safe.
 */
function FieldContent({
  field,
  adminSettings,
  setAdminSettings,
  siteData,
  onUpdateSiteData,
}: Omit<SectionFieldRendererProps, 'disclosureLevel'>) {
  const [localError, setLocalError] = useState<string | null>(null)

  const currentValue = field.targetSiteData
    ? getSiteDataValue(siteData, field.path)
    : getAdminValue(adminSettings, field.path)

  const handleChange = (newValue: unknown) => {
    if (field.targetSiteData) {
      setSiteDataValue(siteData, field.path, newValue, onUpdateSiteData)
    } else {
      if (!setAdminSettings) return
      setAdminSettings(setAdminValue(adminSettings, field.path, newValue))
    }
  }

  const handleReset = () => {
    setLocalError(null)
    handleChange(field.defaultValue)
  }

  const stringValue = typeof currentValue === 'string' ? currentValue : ''
  const boolValue = typeof currentValue === 'boolean' ? currentValue : false
  const numValue =
    typeof currentValue === 'number'
      ? currentValue
      : typeof field.defaultValue === 'number'
        ? field.defaultValue
        : (field.min ?? 0)
  const isDisabled = !setAdminSettings && !onUpdateSiteData

  const hasDefault = field.defaultValue !== undefined
  const isDirty = hasDefault && currentValue !== undefined && currentValue !== field.defaultValue

  const descEl = field.description ? (
    <p className="font-mono text-[10px] text-muted-foreground/70 leading-tight">{field.description}</p>
  ) : null

  const resetBtn = isDirty ? (
    <button
      type="button"
      onClick={handleReset}
      className="ml-2 text-[10px] font-mono text-muted-foreground hover:text-primary transition-colors underline underline-offset-2 shrink-0"
      title={`Reset to default: ${String(field.defaultValue)}`}
    >
      Reset
    </button>
  ) : null

  if (field.type === 'toggle') {
    return (
      <div className="space-y-1">
        <div className="flex items-center justify-between py-1">
          <Label className="font-mono text-xs text-muted-foreground">{field.label}</Label>
          <div className="flex items-center gap-2">
            {resetBtn}
            <Switch
              checked={boolValue}
              onCheckedChange={(checked) => handleChange(checked)}
              disabled={isDisabled}
            />
          </div>
        </div>
        {descEl}
      </div>
    )
  }

  if (field.type === 'textarea') {
    return (
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <Label className="font-mono text-xs text-muted-foreground">{field.label}</Label>
          {resetBtn}
        </div>
        {descEl}
        <Textarea
          value={stringValue}
          onChange={(e) => handleChange(e.target.value)}
          placeholder={field.placeholder}
          className="font-mono text-xs min-h-[80px] resize-y bg-background border-border"
          disabled={isDisabled}
        />
      </div>
    )
  }

  if (field.type === 'select') {
    const selectVal = stringValue || (typeof field.defaultValue === 'string' ? field.defaultValue : '')
    return (
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <Label className="font-mono text-xs text-muted-foreground">{field.label}</Label>
          {resetBtn}
        </div>
        {descEl}
        <Select
          value={selectVal}
          onValueChange={(v) => handleChange(v)}
          disabled={isDisabled}
        >
          <SelectTrigger className="font-mono text-xs h-8 bg-background border-border">
            <SelectValue placeholder={field.placeholder ?? 'Select...'} />
          </SelectTrigger>
          <SelectContent>
            {(field.options ?? []).map((opt) => (
              <SelectItem key={opt.value} value={opt.value} className="font-mono text-xs">
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    )
  }

  if (field.type === 'slider') {
    const min = field.min ?? 0
    const max = field.max ?? 1
    const step = field.step ?? 0.01
    const displayValue = numValue.toFixed(step < 0.1 ? 2 : 0)
    return (
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <Label className="font-mono text-xs text-muted-foreground">{field.label}</Label>
          <div className="flex items-center gap-1">
            <span className="font-mono text-xs text-muted-foreground">{displayValue}</span>
            {resetBtn}
          </div>
        </div>
        {descEl}
        <Slider
          value={[numValue]}
          min={min}
          max={max}
          step={step}
          onValueChange={([v]) => handleChange(v)}
          disabled={isDisabled}
        />
      </div>
    )
  }

  if (field.type === 'image') {
    const isInvalidUrl = stringValue ? !isValidUrl(stringValue) : false
    return (
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <Label className="font-mono text-xs text-muted-foreground">{field.label}</Label>
          {resetBtn}
        </div>
        {descEl}
        <Input
          type="text"
          value={stringValue}
          onChange={(e) => handleChange(e.target.value)}
          placeholder={field.placeholder ?? 'https://...'}
          className={`font-mono text-xs h-8 bg-background border-border${isInvalidUrl ? ' border-destructive' : ''}`}
          disabled={isDisabled}
        />
        {isInvalidUrl && (
          <p className="font-mono text-[10px] text-destructive">Invalid URL</p>
        )}
        {stringValue && !isInvalidUrl && (
          <ImagePreview src={stringValue} />
        )}
      </div>
    )
  }

  // text, url, number, color — with inline validation
  const isUrl = field.type === 'url'
  const isColor = field.type === 'color'
  const isNumber = field.type === 'number'

  const handleTextChange = (value: string) => {
    if (isUrl && value && !isValidUrl(value)) {
      setLocalError('Invalid URL')
    } else if (isColor && value && !isValidColor(value)) {
      setLocalError('Invalid color value')
    } else if (isNumber) {
      const num = parseFloat(value)
      if (value !== '' && isNaN(num)) {
        setLocalError('Must be a number')
      } else if (field.min !== undefined && !isNaN(num) && num < field.min) {
        setLocalError(`Min: ${field.min}`)
      } else if (field.max !== undefined && !isNaN(num) && num > field.max) {
        setLocalError(`Max: ${field.max}`)
      } else {
        setLocalError(null)
      }
    } else {
      setLocalError(null)
    }
    if (isNumber) {
      handleChange(value === '' ? undefined : parseFloat(value))
    } else {
      handleChange(value)
    }
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <Label className="font-mono text-xs text-muted-foreground">{field.label}</Label>
        {resetBtn}
      </div>
      {descEl}
      <Input
        type={isColor ? 'color' : isNumber ? 'number' : 'text'}
        value={stringValue}
        onChange={(e) => handleTextChange(e.target.value)}
        placeholder={field.placeholder}
        min={isNumber ? field.min : undefined}
        max={isNumber ? field.max : undefined}
        className={`font-mono text-xs h-8 bg-background border-border${localError ? ' border-destructive' : ''}`}
        disabled={isDisabled}
      />
      {localError && (
        <p className="font-mono text-[10px] text-destructive">{localError}</p>
      )}
    </div>
  )
}

export default function SectionFieldRenderer({
  field,
  adminSettings,
  setAdminSettings,
  siteData,
  onUpdateSiteData,
  disclosureLevel,
}: SectionFieldRendererProps) {
  const effectiveDisclosure = field.disclosure ?? 'basic'

  if (!isFieldVisible(effectiveDisclosure, disclosureLevel)) return null

  return (
    <FieldContent
      field={field}
      adminSettings={adminSettings}
      setAdminSettings={setAdminSettings}
      siteData={siteData}
      onUpdateSiteData={onUpdateSiteData}
    />
  )
}
