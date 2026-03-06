import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Terminal as TerminalIcon, PencilSimple, Plus, Trash, CaretDown, CaretUp } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  OVERLAY_LOADING_TEXT_INTERVAL_MS,
  OVERLAY_GLITCH_PHASE_DELAY_MS,
  OVERLAY_REVEAL_PHASE_DELAY_MS,
} from '@/lib/config'
import type { TerminalCommand } from '@/lib/types'

const TERMINAL_LOADING_TEXTS = [
  '> ACCESSING TERMINAL...',
  '> DECRYPTING DATA...',
  '> IDENTITY VERIFIED',
]

const RESERVED_COMMANDS = ['help', 'clear', 'exit', 'about', 'social']

const TYPING_SPEED_MS = 15

interface TerminalProps {
  isOpen: boolean
  onClose: () => void
  customCommands?: TerminalCommand[]
  editMode?: boolean
  onSaveCommands?: (commands: TerminalCommand[]) => void
}

export function Terminal({ isOpen, onClose, customCommands = [], editMode = false, onSaveCommands }: TerminalProps) {
  const [input, setInput] = useState('')
  const [history, setHistory] = useState<string[]>([
    '> SYSTEM INITIALIZED',
    '> ACCESS GRANTED',
    '> TYPE "HELP" FOR COMMANDS',
  ])
  const [isTyping, setIsTyping] = useState(false)
  const [showEditPanel, setShowEditPanel] = useState(false)
  const [editCommands, setEditCommands] = useState<TerminalCommand[]>([])
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null)
  const [reservedWarning, setReservedWarning] = useState<string | null>(null)
  const typingRef = useRef(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  // 3-phase terminal loading state
  const [phase, setPhase] = useState<'loading' | 'glitch' | 'revealed'>('loading')
  const [loadingText, setLoadingText] = useState(TERMINAL_LOADING_TEXTS[0])

  useEffect(() => {
    if (!isOpen) return
    
    setPhase('loading')
    setLoadingText(TERMINAL_LOADING_TEXTS[0])
    
    let idx = 0
    const txtInterval = setInterval(() => {
      idx += 1
      if (idx <= TERMINAL_LOADING_TEXTS.length - 1) {
        setLoadingText(TERMINAL_LOADING_TEXTS[idx])
      }
    }, OVERLAY_LOADING_TEXT_INTERVAL_MS)

    const glitchTimer = setTimeout(() => {
      clearInterval(txtInterval)
      setPhase('glitch')
    }, OVERLAY_GLITCH_PHASE_DELAY_MS)

    const revealTimer = setTimeout(() => {
      setPhase('revealed')
    }, OVERLAY_REVEAL_PHASE_DELAY_MS)

    return () => {
      clearInterval(txtInterval)
      clearTimeout(glitchTimer)
      clearTimeout(revealTimer)
    }
  }, [isOpen])

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [history, scrollToBottom])

  const typeOutput = useCallback((lines: string[], currentHistory: string[]) => {
    setIsTyping(true)
    typingRef.current = true
    let lineIdx = 0

    const processLine = () => {
      if (!typingRef.current || lineIdx >= lines.length) {
        setIsTyping(false)
        typingRef.current = false
        return
      }

      const fullLine = lines[lineIdx]
      let charIdx = 0

      setHistory((prev) => [...prev, ''])

      const typeChar = () => {
        if (!typingRef.current) {
          setIsTyping(false)
          return
        }
        if (charIdx < fullLine.length) {
          const nextChar = fullLine[charIdx]
          charIdx++
          setHistory((prev) => {
            const updated = [...prev]
            updated[updated.length - 1] = fullLine.slice(0, charIdx)
            return updated
          })
          setTimeout(typeChar, TYPING_SPEED_MS)
        } else {
          lineIdx++
          processLine()
        }
      }

      typeChar()
    }

    setHistory(currentHistory)
    processLine()
  }, [])

  const handleCommand = useCallback((cmd: string) => {
    const command = cmd.toLowerCase().trim()
    const newHistory = [...history, `> ${cmd}`]

    // Check custom commands first
    const customCmd = customCommands.find((c) => c.name.toLowerCase() === command)
    if (customCmd) {
      setInput('')
      typeOutput(customCmd.output, newHistory)
      return
    }

    switch (command) {
      case 'help': {
        const helpLines = [
          'AVAILABLE COMMANDS:',
          'ABOUT - Artist information',
          'SOCIAL - Social media links',
          'CLEAR - Clear terminal',
          'EXIT - Close terminal',
          ...customCommands.map((c) => `${c.name.toUpperCase()} - ${c.description}`),
        ]
        setInput('')
        typeOutput(helpLines, newHistory)
        return
      }
      case 'about': {
        const aboutLines = ['ZARDONIC - METAL & BASS ARTIST', 'GENRE: INDUSTRIAL / DRUM & BASS', 'STATUS: ACTIVE']
        setInput('')
        typeOutput(aboutLines, newHistory)
        return
      }
      case 'social': {
        const socialLines = ['INSTAGRAM | FACEBOOK | SPOTIFY | YOUTUBE']
        setInput('')
        typeOutput(socialLines, newHistory)
        return
      }
      case 'clear':
        setHistory([])
        setInput('')
        return
      case 'exit':
        onClose()
        return
      default: {
        const errorLines = ['COMMAND NOT FOUND: ' + cmd.toUpperCase(), 'TYPE "HELP" FOR COMMANDS']
        setInput('')
        typeOutput(errorLines, newHistory)
        return
      }
    }
  }, [history, customCommands, onClose, typeOutput])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && input && !isTyping) {
      handleCommand(input)
    }
  }

  // --- Edit panel logic ---
  const openEditPanel = () => {
    setEditCommands(customCommands.map((c) => ({ ...c, output: [...c.output] })))
    setExpandedIndex(null)
    setReservedWarning(null)
    setShowEditPanel(true)
  }

  const closeEditPanel = () => {
    setShowEditPanel(false)
    setReservedWarning(null)
  }

  const addCommand = () => {
    setEditCommands((prev) => [...prev, { name: '', description: '', output: [''] }])
    setExpandedIndex(editCommands.length)
  }

  const removeCommand = (idx: number) => {
    setEditCommands((prev) => prev.filter((_, i) => i !== idx))
    if (expandedIndex === idx) setExpandedIndex(null)
    else if (expandedIndex !== null && expandedIndex > idx) setExpandedIndex(expandedIndex - 1)
  }

  const updateCommandField = (idx: number, field: 'name' | 'description', value: string) => {
    if (field === 'name' && RESERVED_COMMANDS.includes(value.toLowerCase().trim())) {
      setReservedWarning(`"${value}" is a reserved command name`)
    } else if (field === 'name') {
      setReservedWarning(null)
    }
    setEditCommands((prev) => prev.map((c, i) => (i === idx ? { ...c, [field]: value } : c)))
  }

  const updateOutputLine = (cmdIdx: number, lineIdx: number, value: string) => {
    setEditCommands((prev) =>
      prev.map((c, i) =>
        i === cmdIdx ? { ...c, output: c.output.map((l, li) => (li === lineIdx ? value : l)) } : c
      )
    )
  }

  const addOutputLine = (cmdIdx: number) => {
    setEditCommands((prev) =>
      prev.map((c, i) => (i === cmdIdx ? { ...c, output: [...c.output, ''] } : c))
    )
  }

  const removeOutputLine = (cmdIdx: number, lineIdx: number) => {
    setEditCommands((prev) =>
      prev.map((c, i) =>
        i === cmdIdx ? { ...c, output: c.output.filter((_, li) => li !== lineIdx) } : c
      )
    )
  }

  const saveCommands = () => {
    const hasReserved = editCommands.some((c) => RESERVED_COMMANDS.includes(c.name.toLowerCase().trim()))
    if (hasReserved) {
      setReservedWarning('Cannot save: one or more commands use a reserved name')
      return
    }
    onSaveCommands?.(editCommands)
    setShowEditPanel(false)
    setReservedWarning(null)
  }

  const canEdit = editMode && !!onSaveCommands

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 bg-black/90 z-[100] backdrop-blur-sm cyberpunk-overlay-bg"
            onClick={onClose}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-[101] flex items-center justify-center p-4 md:p-8 pointer-events-none"
            style={{ perspective: '1000px' }}
          >
            <motion.div
              initial={{ boxShadow: '0 0 0px rgba(180, 50, 50, 0)' }}
              animate={{
                boxShadow: [
                  '0 0 20px rgba(180, 50, 50, 0.3)',
                  '0 0 40px rgba(180, 50, 50, 0.4)',
                  '0 0 20px rgba(180, 50, 50, 0.3)',
                ]
              }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              className="relative w-full max-w-3xl max-h-[80vh] bg-black border border-primary/30 pointer-events-auto overflow-hidden scanline-effect cyber-card"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Cyberpunk corner decorations */}
              <motion.div
                className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-accent"
                initial={{ opacity: 0, x: -10, y: -10 }}
                animate={{ opacity: 1, x: 0, y: 0 }}
                transition={{ delay: 0.15, duration: 0.3 }}
              />
              <motion.div
                className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-accent"
                initial={{ opacity: 0, x: 10, y: -10 }}
                animate={{ opacity: 1, x: 0, y: 0 }}
                transition={{ delay: 0.2, duration: 0.3 }}
              />
              <motion.div
                className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-accent"
                initial={{ opacity: 0, x: -10, y: 10 }}
                animate={{ opacity: 1, x: 0, y: 0 }}
                transition={{ delay: 0.25, duration: 0.3 }}
              />
              <motion.div
                className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-accent"
                initial={{ opacity: 0, x: 10, y: 10 }}
                animate={{ opacity: 1, x: 0, y: 0 }}
                transition={{ delay: 0.3, duration: 0.3 }}
              />

              {/* Top/bottom border scan lines */}
              <motion.div
                className="absolute top-0 left-0 right-0 h-[1px] bg-accent/40"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 0.4, delay: 0.1 }}
                style={{ transformOrigin: 'left' }}
              />
              <motion.div
                className="absolute bottom-0 left-0 right-0 h-[1px] bg-accent/40"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 0.4, delay: 0.15 }}
                style={{ transformOrigin: 'right' }}
              />

              <div className="h-full flex flex-col max-h-[80vh]">
                <div className="flex items-center justify-between p-4 border-b border-accent/30">
                  <div className="flex items-center gap-3">
                    <TerminalIcon className="w-6 h-6 text-accent" weight="fill" />
                    <span className="font-mono text-accent uppercase tracking-wider text-sm">
                      TERMINAL v1.0 // NK-SYS
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <motion.div
                      className="w-2 h-2 rounded-full bg-accent"
                      animate={{ opacity: [1, 0.3, 1] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    />
                    {canEdit && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={openEditPanel}
                        className="hover:bg-accent/10"
                        title="Edit commands"
                      >
                        <PencilSimple className="w-5 h-5 text-accent" />
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" onClick={onClose} className="hover:bg-accent/10">
                      <X className="w-5 h-5 text-accent" />
                    </Button>
                  </div>
                </div>

                {/* 3-phase content loading / edit panel */}
                <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 font-mono text-sm text-accent space-y-2">
                  {showEditPanel ? (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-accent font-mono uppercase tracking-wider text-xs">Edit Custom Commands</span>
                        <Button variant="ghost" size="sm" onClick={addCommand} className="hover:bg-accent/10 gap-1 text-accent">
                          <Plus className="w-4 h-4" /> Add
                        </Button>
                      </div>

                      {reservedWarning && (
                        <div className="text-red-400 text-xs font-mono border border-red-400/30 px-3 py-2 bg-red-400/5">
                          ⚠ {reservedWarning}
                        </div>
                      )}

                      {editCommands.length === 0 && (
                        <div className="text-accent/40 text-xs text-center py-4">No custom commands. Click "Add" to create one.</div>
                      )}

                      {editCommands.map((cmd, idx) => (
                        <div key={idx} className="border border-accent/20 p-3 space-y-2">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 space-y-1">
                              <Label className="text-accent/60 text-[10px] uppercase">Name</Label>
                              <Input
                                value={cmd.name}
                                onChange={(e) => updateCommandField(idx, 'name', e.target.value)}
                                placeholder="command-name"
                                className="bg-black border-accent/30 text-accent font-mono text-xs h-8"
                              />
                            </div>
                            <div className="flex-1 space-y-1">
                              <Label className="text-accent/60 text-[10px] uppercase">Description</Label>
                              <Input
                                value={cmd.description}
                                onChange={(e) => updateCommandField(idx, 'description', e.target.value)}
                                placeholder="What it does"
                                className="bg-black border-accent/30 text-accent font-mono text-xs h-8"
                              />
                            </div>
                            <div className="flex items-end gap-1 pb-0.5">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setExpandedIndex(expandedIndex === idx ? null : idx)}
                                className="hover:bg-accent/10 h-8 w-8"
                                title="Toggle output lines"
                              >
                                {expandedIndex === idx ? (
                                  <CaretUp className="w-4 h-4 text-accent" />
                                ) : (
                                  <CaretDown className="w-4 h-4 text-accent" />
                                )}
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => removeCommand(idx)}
                                className="hover:bg-red-500/10 h-8 w-8"
                                title="Remove command"
                              >
                                <Trash className="w-4 h-4 text-red-400" />
                              </Button>
                            </div>
                          </div>

                          {expandedIndex === idx && (
                            <div className="space-y-2 pl-2 border-l border-accent/10 ml-1">
                              <div className="flex items-center justify-between">
                                <Label className="text-accent/60 text-[10px] uppercase">Output Lines</Label>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => addOutputLine(idx)}
                                  className="hover:bg-accent/10 gap-1 text-accent h-6 text-[10px]"
                                >
                                  <Plus className="w-3 h-3" /> Line
                                </Button>
                              </div>
                              {cmd.output.map((line, li) => (
                                <div key={li} className="flex items-center gap-2">
                                  <Input
                                    value={line}
                                    onChange={(e) => updateOutputLine(idx, li, e.target.value)}
                                    placeholder={`Output line ${li + 1}`}
                                    className="bg-black border-accent/30 text-accent font-mono text-xs h-7 flex-1"
                                  />
                                  {cmd.output.length > 1 && (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => removeOutputLine(idx, li)}
                                      className="hover:bg-red-500/10 h-7 w-7"
                                    >
                                      <Trash className="w-3 h-3 text-red-400" />
                                    </Button>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}

                      <div className="flex items-center gap-2 pt-2 border-t border-accent/20">
                        <Button variant="ghost" size="sm" onClick={saveCommands} className="hover:bg-accent/10 text-accent border border-accent/30">
                          Save
                        </Button>
                        <Button variant="ghost" size="sm" onClick={closeEditPanel} className="hover:bg-accent/10 text-accent/60">
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {phase === 'loading' && (
                        <div className="flex items-center justify-center h-full">
                          <motion.span 
                            className="text-accent font-mono text-base"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                          >
                            {loadingText}
                          </motion.span>
                        </div>
                      )}
                      {phase === 'glitch' && (
                        <div className="flex items-center justify-center h-full">
                          <motion.div
                            className="glitch-effect text-accent font-mono text-base"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: [0, 1, 0, 1, 0, 1] }}
                            transition={{ duration: 0.4 }}
                          >
                            {loadingText}
                          </motion.div>
                        </div>
                      )}
                      {phase === 'revealed' && (
                        <>
                          {history.map((line, index) => (
                            <motion.div
                              key={index}
                              className="whitespace-pre-wrap"
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ duration: 0.15, delay: index * 0.02 }}
                            >
                              {line}
                            </motion.div>
                          ))}
                          <div className="flex items-center gap-2">
                            <span>{'>'}</span>
                            <input
                              type="text"
                              value={input}
                              onChange={(e) => setInput(e.target.value)}
                              onKeyDown={handleKeyDown}
                              className="flex-1 bg-transparent border-none outline-none text-accent font-mono"
                              autoFocus
                              disabled={isTyping}
                              aria-label={isTyping ? 'Terminal input disabled while output is being typed' : 'Terminal command input'}
                              spellCheck={false}
                            />
                            <span className="animate-pulse">_</span>
                          </div>
                        </>
                      )}
                    </>
                  )}
                </div>

                <div className="px-4 py-2 border-t border-accent/20">
                  <div className="flex justify-between font-mono text-[10px] text-accent/40 uppercase tracking-wider">
                    <span>STATUS: CONNECTED</span>
                    <span>ACCESS: GRANTED</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
