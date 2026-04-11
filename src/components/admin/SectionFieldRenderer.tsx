import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let current: any = siteData
  for (const part of parts) {
    if (current === undefined || current === null) return undefined
    current = current[part]
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result: any = { ...current }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let node: any = result
    for (let i = 0; i < parts.length - 1; i++) {
      const key = parts[i]
      node[key] = node[key] ? { ...node[key] } : {}
      node = node[key]
    }
    node[parts[parts.length - 1]] = value
    return result as SiteData
  })
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

  // Hide if current disclosure level is lower than field's required level
  if (!isFieldVisible(effectiveDisclosure, disclosureLevel)) return null

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

  const stringValue = typeof currentValue === 'string' ? currentValue : ''
  const boolValue = typeof currentValue === 'boolean' ? currentValue : false

  if (field.type === 'toggle') {
    return (
      <div className="flex items-center justify-between py-1">
        <Label className="font-mono text-xs text-muted-foreground">{field.label}</Label>
        <Switch
          checked={boolValue}
          onCheckedChange={(checked) => handleChange(checked)}
          disabled={!setAdminSettings && !onUpdateSiteData}
        />
      </div>
    )
  }

  if (field.type === 'textarea') {
    return (
      <div className="space-y-1">
        <Label className="font-mono text-xs text-muted-foreground">{field.label}</Label>
        <Textarea
          value={stringValue}
          onChange={(e) => handleChange(e.target.value)}
          placeholder={field.placeholder}
          className="font-mono text-xs min-h-[80px] resize-y bg-background border-border"
          disabled={!setAdminSettings && !onUpdateSiteData}
        />
      </div>
    )
  }

  // text, url, number, color all use Input
  return (
    <div className="space-y-1">
      <Label className="font-mono text-xs text-muted-foreground">{field.label}</Label>
      <Input
        type={field.type === 'color' ? 'color' : field.type === 'number' ? 'number' : 'text'}
        value={stringValue}
        onChange={(e) => handleChange(e.target.value)}
        placeholder={field.placeholder}
        className="font-mono text-xs h-8 bg-background border-border"
        disabled={!setAdminSettings && !onUpdateSiteData}
      />
    </div>
  )
}
