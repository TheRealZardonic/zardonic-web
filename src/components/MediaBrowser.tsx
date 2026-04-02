import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Folder, File, DownloadSimple, Plus, Trash, PencilSimple, X } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { MediaFile } from '@/lib/types'

interface MediaBrowserProps {
  mediaFiles?: MediaFile[]
  editMode?: boolean
  onUpdate?: (files: MediaFile[]) => void
}

function HudCorners() {
  return (
    <>
      <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-accent" />
      <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-accent" />
      <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-accent" />
      <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-accent" />
    </>
  )
}

function buildFolderTree(files: MediaFile[]) {
  const folders: Record<string, MediaFile[]> = {}
  const rootFiles: MediaFile[] = []
  for (const f of files) {
    if (f.folder) {
      if (!folders[f.folder]) folders[f.folder] = []
      folders[f.folder].push(f)
    } else {
      rootFiles.push(f)
    }
  }
  return { folders, rootFiles }
}

function MediaOverlay({
  files,
  onClose,
}: {
  files: MediaFile[]
  onClose: () => void
}) {
  const [phase, setPhase] = useState<'loading' | 'ready'>('loading')
  const [selectedFile, setSelectedFile] = useState<MediaFile | null>(null)
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())

  useEffect(() => {
    const timer = setTimeout(() => setPhase('ready'), 1500)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  const { folders, rootFiles } = buildFolderTree(files)

  const toggleFolder = useCallback((folder: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev)
      if (next.has(folder)) next.delete(folder)
      else next.add(folder)
      return next
    })
  }, [])

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/90 z-[100] backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="fixed inset-0 z-[101] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Media Browser">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.3 }}
          className="relative w-full max-w-4xl h-[70vh] bg-black border border-primary/30 font-mono overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <HudCorners />

          {/* Header */}
          <div className="flex items-center justify-between border-b border-primary/30 px-4 py-2">
            <span className="text-accent text-sm tracking-wider">
              {'>'} MEDIA_BROWSER v1.0
            </span>
            <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close media browser">
              <X className="w-5 h-5 text-accent" />
            </Button>
          </div>

          <AnimatePresence mode="wait">
            {phase === 'loading' ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center h-[calc(100%-3rem)] gap-4"
                role="status"
                aria-label="Loading files"
              >
                <motion.div
                  className="text-accent text-sm tracking-wider"
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 1.2, repeat: Infinity }}
                >
                  INDEXING FILES...
                </motion.div>
                <div className="w-48 h-1 bg-primary/20 overflow-hidden">
                  <motion.div
                    className="h-full bg-accent"
                    initial={{ width: '0%' }}
                    animate={{ width: '100%' }}
                    transition={{ duration: 1.4, ease: 'linear' }}
                  />
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="ready"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex h-[calc(100%-3rem)]"
              >
                {/* File tree */}
                <nav className="w-1/3 border-r border-primary/30 overflow-y-auto p-3" aria-label="File tree">
                  <div className="text-accent/60 text-xs tracking-wider mb-3">
                    FILE TREE
                  </div>
                  <div role="tree">
                    {Object.keys(folders).map((folder) => (
                      <div key={folder} className="mb-1" role="treeitem" aria-expanded={expandedFolders.has(folder)}>
                        <button
                          className="flex items-center gap-2 w-full text-left px-2 py-1 text-sm text-foreground hover:bg-accent/10 transition-colors"
                          onClick={() => toggleFolder(folder)}
                          aria-label={`${expandedFolders.has(folder) ? 'Collapse' : 'Expand'} folder ${folder}`}
                        >
                          <Folder
                            className="w-4 h-4 text-accent shrink-0"
                            weight={expandedFolders.has(folder) ? 'fill' : 'regular'}
                          />
                          <span className="truncate tracking-wider">{folder}</span>
                        </button>
                        <AnimatePresence>
                          {expandedFolders.has(folder) && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="overflow-hidden pl-4"
                              role="group"
                            >
                              {folders[folder].map((f) => (
                                <button
                                  key={f.id}
                                  className={`flex items-center gap-2 w-full text-left px-2 py-1 text-sm transition-colors ${
                                    selectedFile?.id === f.id
                                      ? 'bg-accent/20 text-accent'
                                      : 'text-foreground hover:bg-accent/10'
                                  }`}
                                  onClick={() => setSelectedFile(f)}
                                  role="treeitem"
                                  aria-selected={selectedFile?.id === f.id}
                                  aria-label={`File: ${f.name}`}
                                >
                                  <File className="w-4 h-4 shrink-0" aria-hidden="true" />
                                  <span className="truncate">{f.name}</span>
                                </button>
                              ))}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    ))}
                    {rootFiles.map((f) => (
                      <button
                        key={f.id}
                        className={`flex items-center gap-2 w-full text-left px-2 py-1 text-sm transition-colors ${
                          selectedFile?.id === f.id
                            ? 'bg-accent/20 text-accent'
                            : 'text-foreground hover:bg-accent/10'
                        }`}
                        onClick={() => setSelectedFile(f)}
                        role="treeitem"
                        aria-selected={selectedFile?.id === f.id}
                        aria-label={`File: ${f.name}`}
                      >
                        <File className="w-4 h-4 shrink-0" aria-hidden="true" />
                        <span className="truncate">{f.name}</span>
                      </button>
                    ))}
                  </div>
                </nav>

                {/* File detail */}
                <div className="flex-1 p-6 overflow-y-auto">
                  {selectedFile ? (
                    <motion.div
                      key={selectedFile.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-4"
                    >
                      <div className="text-accent text-xs tracking-wider">
                        FILE DETAIL
                      </div>
                      <h3 className="text-xl text-foreground tracking-wider">
                        {selectedFile.name}
                      </h3>
                      {selectedFile.folder && (
                        <div className="text-sm text-foreground/60">
                          <span className="text-accent/60">FOLDER:</span>{' '}
                          {selectedFile.folder}
                        </div>
                      )}
                      {selectedFile.type && (
                        <div className="text-sm text-foreground/60">
                          <span className="text-accent/60">TYPE:</span>{' '}
                          {selectedFile.type.toUpperCase()}
                        </div>
                      )}
                      {selectedFile.description && (
                        <p className="text-sm text-foreground/70 leading-relaxed">
                          {selectedFile.description}
                        </p>
                      )}
                      <a
                        href={selectedFile.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        download
                        className="inline-flex items-center gap-2 mt-4 px-4 py-2 border border-accent/50 text-accent text-sm tracking-wider hover:bg-accent/10 transition-colors"
                        aria-label={`Download ${selectedFile.name}`}
                      >
                        <DownloadSimple className="w-4 h-4" aria-hidden="true" />
                        DOWNLOAD
                      </a>
                    </motion.div>
                  ) : (
                    <div className="flex items-center justify-center h-full text-foreground/30 text-sm tracking-wider">
                      SELECT A FILE TO VIEW DETAILS
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </>
  )
}

function EditPanel({
  files,
  onSave,
  onClose,
}: {
  files: MediaFile[]
  onSave: (files: MediaFile[]) => void
  onClose: () => void
}) {
  const [draft, setDraft] = useState<MediaFile[]>(() =>
    files.map((f) => ({ ...f }))
  )

  const addFile = useCallback(() => {
    setDraft((prev) => [
      ...prev,
      {
        id: typeof crypto.randomUUID === 'function'
          ? crypto.randomUUID()
          : Math.random().toString(36).slice(2) + Date.now().toString(36),
        name: '',
        url: '',
        folder: '',
        type: 'download',
        description: '',
      },
    ])
  }, [])

  const removeFile = useCallback((id: string, fileName: string) => {
    const confirmed = window.confirm(`Delete file "${fileName || 'Untitled'}"? This action cannot be undone.`)
    if (!confirmed) return
    setDraft((prev) => prev.filter((f) => f.id !== id))
  }, [])

  const updateField = useCallback(
    (id: string, field: keyof MediaFile, value: string) => {
      setDraft((prev) =>
        prev.map((f) => (f.id === id ? { ...f, [field]: value } : f))
      )
    },
    []
  )

  const handleSave = useCallback(() => {
    const valid = draft.filter((f) => f.name.trim() && f.url.trim())
    onSave(valid)
    onClose()
  }, [draft, onSave, onClose])

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/80 z-[9999] backdrop-blur-sm"
        onClick={onClose}
      />

      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 20 }}
        className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-card border-l border-primary/30 z-[9999] overflow-y-auto p-6 font-mono"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <span className="text-accent text-sm tracking-wider">
            EDIT MEDIA FILES
          </span>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close edit panel">
            <X className="w-5 h-5 text-accent" />
          </Button>
        </div>

        <div className="space-y-4">
          {draft.map((file) => (
            <div
              key={file.id}
              className="border border-primary/20 p-3 space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs text-accent/60 tracking-wider">
                  FILE
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeFile(file.id, file.name)}
                  aria-label={`Delete file ${file.name || 'Untitled'}`}
                >
                  <Trash className="w-4 h-4 text-destructive" />
                </Button>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-foreground/60">Name</Label>
                <Input
                  value={file.name}
                  onChange={(e) =>
                    updateField(file.id, 'name', e.target.value)
                  }
                  className="bg-transparent border-primary/30 font-mono text-sm"
                  placeholder="File name"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-foreground/60">URL</Label>
                <Input
                  value={file.url}
                  onChange={(e) =>
                    updateField(file.id, 'url', e.target.value)
                  }
                  className="bg-transparent border-primary/30 font-mono text-sm"
                  placeholder="https://..."
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-foreground/60">Folder</Label>
                <Input
                  value={file.folder ?? ''}
                  onChange={(e) =>
                    updateField(file.id, 'folder', e.target.value)
                  }
                  className="bg-transparent border-primary/30 font-mono text-sm"
                  placeholder="Optional folder"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-foreground/60">Type</Label>
                <select
                  value={file.type ?? 'download'}
                  onChange={(e) =>
                    updateField(file.id, 'type', e.target.value)
                  }
                  aria-label="File type"
                  className="w-full bg-transparent border border-primary/30 text-foreground font-mono text-sm px-3 py-2"
                >
                  <option value="download">Download</option>
                  <option value="audio">Audio</option>
                  <option value="youtube">YouTube</option>
                </select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-foreground/60">
                  Description
                </Label>
                <Input
                  value={file.description ?? ''}
                  onChange={(e) =>
                    updateField(file.id, 'description', e.target.value)
                  }
                  className="bg-transparent border-primary/30 font-mono text-sm"
                  placeholder="Optional description"
                />
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-2 mt-6">
          <Button
            variant="outline"
            className="flex-1 gap-2 border-primary/30 font-mono tracking-wider text-xs"
            onClick={addFile}
          >
            <Plus className="w-4 h-4" />
            ADD FILE
          </Button>
          <Button
            className="flex-1 gap-2 font-mono tracking-wider text-xs"
            onClick={handleSave}
          >
            SAVE
          </Button>
        </div>
      </motion.div>
    </>
  )
}

export function MediaBrowser({
  mediaFiles = [],
  editMode = false,
  onUpdate,
}: MediaBrowserProps) {
  const [overlayOpen, setOverlayOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)

  const handleOpen = useCallback(() => {
    if (mediaFiles.length > 0) setOverlayOpen(true)
  }, [mediaFiles.length])

  return (
    <section id="media" className="py-24 px-4">
      <div className="max-w-4xl mx-auto">
        <motion.h2
          className="font-mono text-4xl text-center mb-8 tracking-wider"
          style={{
            textShadow:
              '0 0 10px rgba(180, 50, 50, 0.5), 0 0 20px rgba(180, 50, 50, 0.3)',
          }}
        >
          MEDIA
        </motion.h2>

        <motion.div
          className="relative bg-black border border-primary/30 p-6 cursor-pointer hover:border-accent/50 transition-colors"
          whileHover={{ scale: 1.01 }}
          onClick={handleOpen}
        >
          <HudCorners />
          <div className="flex items-center justify-between">
            <div className="font-mono">
              <div className="text-accent text-sm tracking-wider mb-1">
                PRESS KITS · LOGOS · ASSETS
              </div>
              <div className="text-foreground/50 text-xs tracking-wider">
                {mediaFiles.length} FILE{mediaFiles.length !== 1 ? 'S' : ''}{' '}
                AVAILABLE
              </div>
            </div>
            <DownloadSimple className="w-6 h-6 text-accent/60" />
          </div>
        </motion.div>

        {editMode && onUpdate && (
          <div className="flex justify-end mt-3">
            <Button
              variant="outline"
              size="sm"
              className="gap-2 border-primary/30 font-mono tracking-wider text-xs"
              onClick={() => setEditOpen(true)}
            >
              <PencilSimple className="w-4 h-4" />
              EDIT MEDIA
            </Button>
          </div>
        )}
      </div>

      <AnimatePresence>
        {overlayOpen && (
          <MediaOverlay
            files={mediaFiles}
            onClose={() => setOverlayOpen(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {editOpen && onUpdate && (
          <EditPanel
            files={mediaFiles}
            onSave={onUpdate}
            onClose={() => setEditOpen(false)}
          />
        )}
      </AnimatePresence>
    </section>
  )
}
