import { SECTION_REGISTRY } from '@/lib/sections-registry'
import type { DisclosureLevel } from '@/lib/sections-registry'
import type { AdminSettings } from '@/lib/types'
import type { SiteData } from '@/App'
import SectionFieldRenderer from '@/components/admin/SectionFieldRenderer'
import { Separator } from '@/components/ui/separator'

interface SectionPanelProps {
  sectionId: string
  adminSettings: AdminSettings | undefined
  setAdminSettings: ((s: AdminSettings) => void) | undefined
  siteData: SiteData | undefined
  onUpdateSiteData: ((updater: SiteData | ((c: SiteData) => SiteData)) => void) | undefined
  disclosureLevel: DisclosureLevel
}

export default function SectionPanel({
  sectionId,
  adminSettings,
  setAdminSettings,
  siteData,
  onUpdateSiteData,
  disclosureLevel,
}: SectionPanelProps) {
  const entry = SECTION_REGISTRY.find((e) => e.id === sectionId)

  if (!entry) {
    return (
      <div className="p-4 font-mono text-xs text-muted-foreground">
        Section <code>{sectionId}</code> not found in registry.
      </div>
    )
  }

  const visibleFields = entry.configFields.filter((f) => {
    const level = f.disclosure ?? 'basic'
    const order: DisclosureLevel[] = ['basic', 'advanced', 'expert']
    return order.indexOf(level) <= order.indexOf(disclosureLevel)
  })

  if (visibleFields.length === 0) {
    return (
      <div className="p-4 font-mono text-xs text-muted-foreground">
        No configurable fields at the current disclosure level.
      </div>
    )
  }

  return (
    <div className="p-4 space-y-4">
      <h3 className="font-mono text-xs font-bold text-primary uppercase tracking-wider">
        {entry.label}
      </h3>
      <Separator />
      <div className="space-y-3">
        {visibleFields.map((field) => (
          <SectionFieldRenderer
            key={field.path}
            field={field}
            adminSettings={adminSettings}
            setAdminSettings={setAdminSettings}
            siteData={siteData}
            onUpdateSiteData={onUpdateSiteData}
            disclosureLevel={disclosureLevel}
          />
        ))}
      </div>
    </div>
  )
}
