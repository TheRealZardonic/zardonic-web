import { DESIGN_REGISTRY } from '@/lib/sections-registry'
import type { DisclosureLevel } from '@/lib/sections-registry'
import type { AdminSettings } from '@/lib/types'
import SectionFieldRenderer from '@/components/admin/SectionFieldRenderer'
import { Separator } from '@/components/ui/separator'

interface DesignPanelProps {
  groupId: string
  adminSettings: AdminSettings | undefined
  setAdminSettings: ((s: AdminSettings) => void) | undefined
  disclosureLevel: DisclosureLevel
}

/**
 * Renders a design group from DESIGN_REGISTRY using the generic SectionFieldRenderer.
 * Analogous to SectionPanel but operates on global design settings (design.layout,
 * design.navigation, design.footer) instead of page-section settings.
 */
export default function DesignPanel({
  groupId,
  adminSettings,
  setAdminSettings,
  disclosureLevel,
}: DesignPanelProps) {
  const entry = DESIGN_REGISTRY.find((e) => e.id === groupId)

  if (!entry) {
    return (
      <div className="p-4 font-mono text-xs text-muted-foreground">
        Design group <code>{groupId}</code> not found in registry.
      </div>
    )
  }

  const order: DisclosureLevel[] = ['basic', 'advanced', 'expert']
  const visibleFields = entry.configFields.filter((f) => {
    const level = f.disclosure ?? 'basic'
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
    <div className="space-y-4">
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
            siteData={undefined}
            onUpdateSiteData={undefined}
            disclosureLevel={disclosureLevel}
          />
        ))}
      </div>
    </div>
  )
}
