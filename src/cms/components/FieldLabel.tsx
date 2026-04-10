import { InfoIcon } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

interface FieldLabelProps {
  label: string
  tooltip: string
  htmlFor?: string
}

/**
 * Reusable label + contextual tooltip for CMS editor fields.
 * Use this component on every field label to give admins inline guidance
 * about where and how each setting affects the live site.
 */
export function FieldLabel({ label, tooltip, htmlFor }: FieldLabelProps) {
  return (
    <div className="flex items-center gap-1 mb-1">
      <label
        htmlFor={htmlFor}
        className="text-zinc-400 text-sm cursor-default"
      >
        {label}
      </label>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className="text-zinc-600 hover:text-zinc-400 transition-colors focus:outline-none"
            aria-label={`Help: ${label}`}
          >
            <InfoIcon size={12} />
          </button>
        </TooltipTrigger>
        <TooltipContent
          side="top"
          className="max-w-xs text-xs bg-zinc-900 border border-zinc-700 text-zinc-200"
        >
          {tooltip}
        </TooltipContent>
      </Tooltip>
    </div>
  )
}
