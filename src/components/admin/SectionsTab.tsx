import { Eye, EyeSlash, ArrowUp, ArrowDown, ArrowCounterClockwise } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { TabsContent } from '@/components/ui/tabs'
import { DEFAULT_SECTION_ORDER } from '@/lib/config'
import type { AdminSettings, SectionVisibility } from '@/lib/types'

interface SectionsTabProps {
  adminSettings?: AdminSettings | null
  setAdminSettings?: (s: AdminSettings) => void
  vis: SectionVisibility
  updateVisibility: (key: keyof SectionVisibility, value: boolean) => void
  currentOrder: string[]
  sectionDisplayNames: Record<string, string>
  moveSectionUp: (index: number) => void
  moveSectionDown: (index: number) => void
}

const sectionItems: { key: keyof SectionVisibility; label: string }[] = [
  { key: 'bio', label: 'Biography' },
  { key: 'shell', label: 'Shell (Member)' },
  { key: 'music', label: 'Music Player' },
  { key: 'gigs', label: 'Upcoming Gigs' },
  { key: 'releases', label: 'Releases' },
  { key: 'gallery', label: 'Gallery' },
  { key: 'media', label: 'Media' },
  { key: 'connect', label: 'Connect / Social' },
  { key: 'creditHighlights', label: 'Credit Highlights' },
  { key: 'contact', label: 'Contact Form' },
]

export default function SectionsTab({
  adminSettings,
  setAdminSettings,
  vis,
  updateVisibility,
  currentOrder,
  sectionDisplayNames,
  moveSectionUp,
  moveSectionDown,
}: SectionsTabProps) {
  return (
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
            setAdminSettings?.({ ...(adminSettings ?? {}), sectionOrder: [...DEFAULT_SECTION_ORDER] })
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
  )
}
