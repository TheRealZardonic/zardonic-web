import { TextAa } from '@phosphor-icons/react'

interface FontSizePickerProps {
  value?: string
  onChange: (size: string) => void
  label?: string
}

const sizes = [
  { label: 'XS', value: 'text-xs' },
  { label: 'SM', value: 'text-sm' },
  { label: 'BASE', value: 'text-base' },
  { label: 'LG', value: 'text-lg' },
  { label: 'XL', value: 'text-xl' },
  { label: '2XL', value: 'text-2xl' },
]

export default function FontSizePicker({ value, onChange, label }: FontSizePickerProps) {
  const currentValue = sizes.find(s => s.value === value)?.value || 'text-base'

  return (
    <div className="inline-flex items-center gap-1.5 bg-card/80 border border-primary/20 px-2 py-1 rounded-sm">
      <TextAa size={14} className="text-primary/60 flex-shrink-0" />
      {label && <span className="text-[9px] font-mono text-muted-foreground/60 mr-1">{label}</span>}
      <select
        value={currentValue}
        onChange={(e) => onChange(e.target.value)}
        className="bg-transparent text-[10px] font-mono text-foreground/80 border-none outline-none cursor-pointer"
      >
        {sizes.map((s) => (
          <option key={s.value} value={s.value} className="bg-card text-foreground">
            {s.label}
          </option>
        ))}
      </select>
    </div>
  )
}
