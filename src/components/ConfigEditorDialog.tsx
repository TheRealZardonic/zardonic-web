import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { X, ArrowCounterClockwise } from '@phosphor-icons/react'
import { getConfigValues, CONFIG_META, type ConfigKey } from '@/lib/config'
import { motion, AnimatePresence } from 'framer-motion'

interface ConfigEditorDialogProps {
  open: boolean
  onClose: () => void
  overrides: Record<string, unknown>
  onSave: (overrides: Record<string, unknown>) => void
}

export default function ConfigEditorDialog({ open, onClose, overrides, onSave }: ConfigEditorDialogProps) {
  const defaults = getConfigValues()
  const [draft, setDraft] = useState<Record<string, unknown>>({ ...overrides })
  const [filter, setFilter] = useState('')

  const groups = useMemo(() => {
    const map = new Map<string, ConfigKey[]>()
    for (const [key, meta] of Object.entries(CONFIG_META)) {
      const list = map.get(meta.group) || []
      list.push(key as ConfigKey)
      map.set(meta.group, list)
    }
    return map
  }, [])

  const filteredGroups = useMemo(() => {
    const lc = filter.toLowerCase()
    if (!lc) return groups
    const result = new Map<string, ConfigKey[]>()
    for (const [group, keys] of groups) {
      const filtered = keys.filter(k => {
        const meta = CONFIG_META[k]
        return (
          k.toLowerCase().includes(lc) ||
          meta.label.toLowerCase().includes(lc) ||
          meta.description.toLowerCase().includes(lc) ||
          group.toLowerCase().includes(lc)
        )
      })
      if (filtered.length) result.set(group, filtered)
    }
    return result
  }, [groups, filter])

  const handleChange = (key: ConfigKey, rawValue: string) => {
    const n = Number(rawValue)
    if (!isNaN(n)) {
      setDraft(prev => ({ ...prev, [key]: n }))
    }
  }

  const handleReset = (key: ConfigKey) => {
    setDraft(prev => {
      const next = { ...prev }
      delete next[key]
      return next
    })
  }

  const handleResetAll = () => setDraft({})

  const handleSave = () => {
    const cleaned: Record<string, unknown> = {}
    for (const [key, val] of Object.entries(draft)) {
      if (key in defaults && val !== (defaults as Record<string, unknown>)[key]) {
        cleaned[key] = val
      }
    }
    onSave(cleaned)
    onClose()
  }

  const getValue = (key: ConfigKey): string => {
    if (key in draft) return String(draft[key])
    return String((defaults as Record<string, unknown>)[key])
  }

  const isOverridden = (key: ConfigKey): boolean => {
    return key in draft && draft[key] !== (defaults as Record<string, unknown>)[key]
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[10000] bg-background/95 backdrop-blur-sm flex items-start justify-center p-4 pt-8 overflow-y-auto"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="w-full max-w-3xl bg-card border-2 border-primary/30 relative overflow-hidden"
            initial={{ scale: 0.9, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, y: 20, opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="h-12 bg-primary/10 border-b border-primary/30 flex items-center justify-between px-4">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                <span className="font-mono text-xs text-primary/70 tracking-wider uppercase">CONFIG EDITOR</span>
              </div>
              <button onClick={onClose} className="text-primary/60 hover:text-primary p-1">
                <X size={20} />
              </button>
            </div>

            {/* Filter + actions */}
            <div className="p-4 border-b border-primary/20 flex gap-3 items-center">
              <Input
                placeholder="Filter variables..."
                value={filter}
                onChange={e => setFilter(e.target.value)}
                className="font-mono text-xs flex-1"
              />
              <Button size="sm" variant="outline" onClick={handleResetAll} className="gap-1 text-xs border-primary/30">
                <ArrowCounterClockwise size={14} />
                Reset All
              </Button>
            </div>

            {/* Scrollable body */}
            <div className="max-h-[60vh] overflow-y-auto p-4 space-y-6">
              {Array.from(filteredGroups).map(([group, keys]) => (
                <div key={group}>
                  <h3 className="font-mono text-xs text-primary/60 tracking-wider uppercase mb-3 border-b border-primary/10 pb-1">
                    {'>'} {group}
                  </h3>
                  <div className="space-y-3">
                    {keys.map(key => {
                      const meta = CONFIG_META[key]
                      const overridden = isOverridden(key)
                      return (
                        <div key={key} className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                          <div className="sm:w-2/5">
                            <Label className={`font-mono text-xs ${overridden ? 'text-primary' : 'text-muted-foreground'}`}>
                              {meta.label}
                              {overridden && <span className="text-primary ml-1">*</span>}
                            </Label>
                            <p className="text-xs text-muted-foreground/60 font-mono">{meta.description}</p>
                          </div>
                          <div className="sm:w-2/5">
                            <Input
                              value={getValue(key)}
                              onChange={e => handleChange(key, e.target.value)}
                              className={`font-mono text-xs h-8 ${overridden ? 'border-primary/50' : ''}`}
                              type="number"
                              step="any"
                            />
                          </div>
                          <div className="sm:w-1/5 flex justify-end">
                            {overridden && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleReset(key)}
                                className="text-xs text-primary/60 hover:text-primary h-8 px-2"
                              >
                                <ArrowCounterClockwise size={12} className="mr-1" />
                                Reset
                              </Button>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}

              {filteredGroups.size === 0 && (
                <p className="text-center text-muted-foreground font-mono text-xs py-8">
                  No config variables match &quot;{filter}&quot;
                </p>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-primary/20 flex justify-end gap-3">
              <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
              <Button size="sm" onClick={handleSave}>Save Config</Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
