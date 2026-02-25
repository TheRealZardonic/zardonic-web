import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus, Trash, CaretDown, CaretUp } from '@phosphor-icons/react'
import type { TerminalCommand } from '@/lib/types'

interface TerminalEditDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  commands: TerminalCommand[]
  onSave: (commands: TerminalCommand[]) => void
}

const RESERVED = ['help', 'clear', 'exit', 'glitch', 'matrix']

export default function TerminalEditDialog({ open, onOpenChange, commands, onSave }: TerminalEditDialogProps) {
  const [cmds, setCmds] = useState<TerminalCommand[]>(commands)
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null)

  useEffect(() => {
    setCmds(commands)
    setExpandedIdx(null)
  }, [commands])

  const addCommand = () => {
    setCmds([...cmds, { name: '', description: '', output: [''] }])
    setExpandedIdx(cmds.length)
  }

  const removeCommand = (index: number) => {
    setCmds(cmds.filter((_, i) => i !== index))
    if (expandedIdx === index) setExpandedIdx(null)
  }

  const updateField = (index: number, field: 'name' | 'description' | 'fileUrl' | 'fileName', value: string) => {
    setCmds(cmds.map((c, i) => i === index ? { ...c, [field]: value } : c))
  }

  const updateOutputLine = (cmdIdx: number, lineIdx: number, value: string) => {
    setCmds(cmds.map((c, i) => {
      if (i !== cmdIdx) return c
      const output = [...c.output]
      output[lineIdx] = value
      return { ...c, output }
    }))
  }

  const addOutputLine = (cmdIdx: number) => {
    setCmds(cmds.map((c, i) => i === cmdIdx ? { ...c, output: [...c.output, ''] } : c))
  }

  const removeOutputLine = (cmdIdx: number, lineIdx: number) => {
    setCmds(cmds.map((c, i) => {
      if (i !== cmdIdx) return c
      return { ...c, output: c.output.filter((_, li) => li !== lineIdx) }
    }))
  }

  const handleSave = () => {
    const validCmds = cmds.filter(c => c.name.trim() && c.description.trim())
    onSave(validCmds)
    onOpenChange(false)
  }

  const hasNameConflict = (name: string, index: number) => {
    const lower = (name || '').toLowerCase().trim()
    if (RESERVED.includes(lower)) return 'Reserved command name'
    if (cmds.some((c, i) => i !== index && (c.name || '').toLowerCase().trim() === lower)) return 'Duplicate name'
    return null
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Terminal Commands</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-4">
          <p className="text-sm text-muted-foreground">
            Add custom commands for the secret terminal. Built-in commands (help, glitch, matrix, clear, exit) cannot be overridden.
          </p>

          {cmds.map((cmd, idx) => {
            const conflict = hasNameConflict(cmd.name, idx)
            const isExpanded = expandedIdx === idx
            return (
              <div key={idx} className="border border-border rounded-md p-3 space-y-2">
                <div className="flex gap-2 items-center">
                  <Input
                    value={cmd.name}
                    onChange={(e) => updateField(idx, 'name', e.target.value.toLowerCase().replace(/\s/g, ''))}
                    placeholder="command"
                    className="w-28 font-mono text-sm"
                  />
                  <Input
                    value={cmd.description}
                    onChange={(e) => updateField(idx, 'description', e.target.value)}
                    placeholder="Description"
                    className="flex-1 text-sm"
                  />
                  <Button variant="ghost" size="icon" onClick={() => setExpandedIdx(isExpanded ? null : idx)}>
                    {isExpanded ? <CaretUp size={16} /> : <CaretDown size={16} />}
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => removeCommand(idx)}>
                    <Trash size={16} className="text-destructive" />
                  </Button>
                </div>
                {conflict && (
                  <p className="text-xs text-destructive">{conflict}</p>
                )}
                {isExpanded && (
                  <div className="space-y-2 pl-2 border-l-2 border-primary/20 ml-2">
                    <Label className="text-xs text-muted-foreground">Output lines</Label>
                    {cmd.output.map((line, lineIdx) => (
                      <div key={lineIdx} className="flex gap-2 items-center">
                        <span className="text-xs text-muted-foreground font-mono w-4">{lineIdx + 1}</span>
                        <Input
                          value={line}
                          onChange={(e) => updateOutputLine(idx, lineIdx, e.target.value)}
                          placeholder="Output text..."
                          className="flex-1 font-mono text-xs"
                        />
                        {cmd.output.length > 1 && (
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeOutputLine(idx, lineIdx)}>
                            <Trash size={12} />
                          </Button>
                        )}
                      </div>
                    ))}
                    <Button variant="outline" size="sm" onClick={() => addOutputLine(idx)} className="text-xs">
                      <Plus size={12} className="mr-1" /> Add line
                    </Button>
                    <Label className="text-xs text-muted-foreground mt-2">File Download (optional)</Label>
                    <Input
                      value={cmd.fileUrl || ''}
                      onChange={(e) => updateField(idx, 'fileUrl', e.target.value)}
                      placeholder="File URL"
                      className="flex-1 text-xs"
                    />
                    <Input
                      value={cmd.fileName || ''}
                      onChange={(e) => updateField(idx, 'fileName', e.target.value)}
                      placeholder="File Name"
                      className="flex-1 text-xs"
                    />
                  </div>
                )}
              </div>
            )
          })}

          <Button variant="outline" onClick={addCommand} className="w-full">
            <Plus size={16} className="mr-2" /> Add Command
          </Button>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave}>Save Commands</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
