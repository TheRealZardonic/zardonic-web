import type { AdminSettings, DisclosureLevel } from '@/lib/types'
import DesignPanel from '@/components/admin/DesignPanel'

interface LayoutTabProps {
  adminSettings: AdminSettings | null | undefined
  setAdminSettings: ((s: AdminSettings) => void) | undefined
  disclosureLevel?: DisclosureLevel
}

/**
 * Layout tab in the admin panel.
 * All fields are schema-driven via DESIGN_REGISTRY — no manual JSX per field.
 * To add or change a setting, update the corresponding entry in DESIGN_REGISTRY
 * (src/lib/sections-registry.ts). Do not add manual Input/Slider/Switch JSX here.
 */
export default function LayoutTab({
  adminSettings,
  setAdminSettings,
  disclosureLevel = 'basic',
}: LayoutTabProps) {
  const effectiveSettings = adminSettings ?? undefined

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-6 mt-0">
      <DesignPanel
        groupId="layout"
        adminSettings={effectiveSettings}
        setAdminSettings={setAdminSettings ?? undefined}
        disclosureLevel={disclosureLevel}
      />
      <DesignPanel
        groupId="navigation"
        adminSettings={effectiveSettings}
        setAdminSettings={setAdminSettings ?? undefined}
        disclosureLevel={disclosureLevel}
      />
      <DesignPanel
        groupId="footer"
        adminSettings={effectiveSettings}
        setAdminSettings={setAdminSettings ?? undefined}
        disclosureLevel={disclosureLevel}
      />
    </div>
  )
}
