import { Export, ArrowSquareIn } from '@phosphor-icons/react'
import { TabsContent } from '@/components/ui/tabs'
import type { SiteData } from '@/App'

interface DataTabProps {
  siteData: SiteData | undefined
  onImportData?: (data: SiteData) => void
  onExport: () => void
  onImportClick: () => void
}

export default function DataTab({ siteData, onImportData, onExport, onImportClick }: DataTabProps) {
  return (
    <TabsContent value="data" className="flex-1 overflow-y-auto p-4 space-y-4 mt-0">
      <h3 className="font-mono text-xs font-bold text-primary uppercase tracking-wider">
        Data Management
      </h3>
      <p className="font-mono text-xs text-muted-foreground">
        Export all site data and settings as a JSON file, or import a previously exported backup.
      </p>

      <div className="space-y-3">
        <button
          onClick={onExport}
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
          onClick={onImportClick}
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
  )
}
