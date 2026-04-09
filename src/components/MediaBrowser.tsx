import { useState, useCallback, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { DownloadSimple, FolderOpen, File, X, Plus, Trash, PencilSimple, Check, ArrowSquareOut, MusicNote, YoutubeLogo } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import type { MediaFile } from '@/lib/types'
import { useLocale } from '@/contexts/LocaleContext'
import { formatFileCount } from '@/lib/i18n'

// ---------------------------------------------------------------------------
// Google Drive URL helpers
// ---------------------------------------------------------------------------

function isDriveUrl(url: string): boolean {
  try { return new URL(url).hostname === 'drive.google.com' } catch { return false }
}

function toDriveDirectDownload(url: string): string {
  try {
    const p = new URL(url)
    if (p.hostname !== 'drive.google.com') return url
    if (p.pathname === '/uc') return url
    const m = p.pathname.match(/^\/file\/d\/([^/]+)/)
    if (m) return `https://drive.google.com/uc?export=download&id=${m[1]}`
    const id = p.searchParams.get('id')
    if (id) return `https://drive.google.com/uc?export=download&id=${id}`
  } catch { /* fallback */ }
  return url
}

function getDownloadHref(url: string): string {
  return isDriveUrl(url) ? toDriveDirectDownload(url) : url
}

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

interface MediaBrowserProps {
  mediaFiles?: MediaFile[]
  editMode?: boolean
  onUpdate?: (files: MediaFile[]) => void
  /** When true, renders as a fullscreen overlay with close button (used by AppMediaSection) */
  isOverlay?: boolean
  onClose?: () => void
}

// ---------------------------------------------------------------------------
// Corner decorations
// ---------------------------------------------------------------------------

function HudCorner({ pos }: { pos: 'tl' | 'tr' | 'bl' | 'br' }) {
  const classes: Record<string, string> = {
    tl: 'top-0 left-0 border-t-2 border-l-2',
    tr: 'top-0 right-0 border-t-2 border-r-2',
    bl: 'bottom-0 left-0 border-b-2 border-l-2',
    br: 'bottom-0 right-0 border-b-2 border-r-2',
  }
  return (
    <span className={`absolute w-3 h-3 border-accent/60 ${classes[pos]}`} />
  )
}

// ---------------------------------------------------------------------------
// File type icon helper
// ---------------------------------------------------------------------------

function FileTypeIcon({ type }: { type?: string }) {
  if (type === 'audio') return <MusicNote className="w-5 h-5 text-accent/70" />
  if (type === 'youtube') return <YoutubeLogo className="w-5 h-5 text-red-500/70" />
  return <File className="w-5 h-5 text-accent/70" />
}

// ---------------------------------------------------------------------------
// Overlay – shown when a file is clicked
// ---------------------------------------------------------------------------

function MediaOverlay({ file, onClose }: { file: MediaFile; onClose: () => void }) {
  const downloadHref = getDownloadHref(file.url)
  const isYoutube = file.type === 'youtube' || file.url.includes('youtube.com') || file.url.includes('youtu.be')
  const isAudio = file.type === 'audio' || file.url.match(/\.(mp3|ogg|wav|flac)(\?.*)?$/i)

  return (
    <motion.div
      className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="relative w-full max-w-2xl bg-card border border-primary/30 p-6 font-mono"
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 20 }}
        onClick={(e) => e.stopPropagation()}
      >
        <HudCorner pos="tl" /><HudCorner pos="tr" /><HudCorner pos="bl" /><HudCorner pos="br" />

        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="data-label mb-1">// FILE.SELECTED</div>
            <h3 className="text-lg font-bold tracking-wider uppercase">{file.name}</h3>
            {file.description && (
              <p className="text-xs text-foreground/50 mt-1">{file.description}</p>
            )}
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        {isYoutube && (
          <div className="aspect-video mb-4 bg-black">
            <iframe
              src={file.url.replace('watch?v=', 'embed/').replace('youtu.be/', 'www.youtube-nocookie.com/embed/')}
              title={file.name}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; fullscreen; gyroscope; picture-in-picture"
              className="w-full h-full"
            />
          </div>
        )}

        {isAudio && (
          // eslint-disable-next-line jsx-a11y/media-has-caption
          <audio controls src={file.url} className="w-full mb-4" />
        )}

        <div className="flex gap-3 flex-wrap">
          <Button
            asChild
            variant="outline"
            size="sm"
            className="font-mono text-xs gap-2 border-primary/30 hover:border-primary"
          >
            <a href={downloadHref} target="_blank" rel="noopener noreferrer" download>
              <DownloadSimple className="w-4 h-4" />
              DOWNLOAD
            </a>
          </Button>
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="font-mono text-xs gap-2"
          >
            <a href={file.url} target="_blank" rel="noopener noreferrer">
              <ArrowSquareOut className="w-4 h-4" />
              OPEN IN NEW TAB
            </a>
          </Button>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ---------------------------------------------------------------------------
// Edit panel – manage files list
// ---------------------------------------------------------------------------

function EditPanel({
  files,
  onSave,
  onClose,
}: {
  files: MediaFile[]
  onSave: (files: MediaFile[]) => void
  onClose: () => void
}) {
  const [localFiles, setLocalFiles] = useState<MediaFile[]>(files)
  const [editIdx, setEditIdx] = useState<number | null>(null)
  const [draft, setDraft] = useState<MediaFile>({ id: '', name: '', url: '', type: 'download' })
  const inputRef = useRef<HTMLInputElement>(null)

  const genId = () => (typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : Math.random().toString(36).slice(2))

  const startEdit = (idx: number) => {
    setEditIdx(idx)
    setDraft({ ...localFiles[idx] })
  }

  const startAdd = () => {
    const newFile: MediaFile = { id: genId(), name: '', url: '', type: 'download' }
    const next = [...localFiles, newFile]
    setLocalFiles(next)
    setEditIdx(next.length - 1)
    setDraft(newFile)
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  const saveEdit = () => {
    if (editIdx === null) return
    const updated = localFiles.map((f, i) => (i === editIdx ? { ...draft, id: draft.id || genId() } : f))
    setLocalFiles(updated)
    setEditIdx(null)
  }

  const removeFile = (idx: number) => {
    const next = localFiles.filter((_, i) => i !== idx)
    setLocalFiles(next)
    if (editIdx === idx) setEditIdx(null)
  }

  return (
    <motion.div
      className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="relative w-full max-w-2xl bg-card border border-primary/30 flex flex-col max-h-[90dvh]"
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 20 }}
      >
        <HudCorner pos="tl" /><HudCorner pos="tr" /><HudCorner pos="bl" /><HudCorner pos="br" />

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
          <div className="data-label">// MEDIA.MANAGER</div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* File list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2 min-h-0">
          {localFiles.length === 0 && (
            <p className="text-xs font-mono text-foreground/30 text-center py-8">NO FILES — ADD ONE BELOW</p>
          )}
          {localFiles.map((f, idx) => (
            <div key={f.id || idx} className="border border-border/50 bg-background/40">
              {editIdx === idx ? (
                <div className="p-3 space-y-2">
                  <div className="flex gap-2">
                    <input
                      ref={inputRef}
                      value={draft.name}
                      onChange={(e) => setDraft(d => ({ ...d, name: e.target.value }))}
                      placeholder="File name"
                      className="flex-1 bg-transparent border border-primary/30 px-2 py-1 text-xs font-mono focus:outline-none focus:border-primary"
                    />
                    <select
                      value={draft.type ?? 'download'}
                      onChange={(e) => setDraft(d => ({ ...d, type: e.target.value as MediaFile['type'] }))}
                      className="bg-card border border-primary/30 px-2 py-1 text-xs font-mono focus:outline-none"
                    >
                      <option value="download">Download</option>
                      <option value="audio">Audio</option>
                      <option value="youtube">YouTube</option>
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <input
                      value={draft.url}
                      onChange={(e) => setDraft(d => ({ ...d, url: e.target.value }))}
                      placeholder="URL (or Google Drive share link)"
                      className="flex-1 bg-transparent border border-primary/30 px-2 py-1 text-xs font-mono focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div className="flex gap-2">
                    <input
                      value={draft.description ?? ''}
                      onChange={(e) => setDraft(d => ({ ...d, description: e.target.value }))}
                      placeholder="Description (optional)"
                      className="flex-1 bg-transparent border border-primary/30 px-2 py-1 text-xs font-mono focus:outline-none focus:border-primary"
                    />
                    <input
                      value={draft.folder ?? ''}
                      onChange={(e) => setDraft(d => ({ ...d, folder: e.target.value }))}
                      placeholder="Folder (optional)"
                      className="w-28 bg-transparent border border-primary/30 px-2 py-1 text-xs font-mono focus:outline-none focus:border-primary"
                    />
                  </div>
                  {isDriveUrl(draft.url) && (
                    <p className="text-[10px] font-mono text-accent/60">✓ Google Drive URL detected — will download directly</p>
                  )}
                  <div className="flex gap-2">
                    <Button size="sm" variant="default" onClick={saveEdit} className="font-mono text-xs gap-1">
                      <Check className="w-3 h-3" /> SAVE
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditIdx(null)} className="font-mono text-xs">
                      CANCEL
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3 px-3 py-2">
                  <FileTypeIcon type={f.type} />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-mono font-bold truncate">{f.name || '(unnamed)'}</div>
                    <div className="text-[10px] text-foreground/40 font-mono truncate">{f.url || 'no url'}</div>
                    {f.folder && <div className="text-[10px] text-accent/50 font-mono">{f.folder}</div>}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => startEdit(idx)} className="p-1 text-muted-foreground hover:text-foreground" aria-label="Edit file">
                      <PencilSimple className="w-4 h-4" />
                    </button>
                    <button onClick={() => removeFile(idx)} className="p-1 text-muted-foreground hover:text-destructive" aria-label="Remove file">
                      <Trash className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-border shrink-0">
          <Button size="sm" variant="outline" onClick={startAdd} className="font-mono text-xs gap-2 border-primary/30 hover:border-primary">
            <Plus className="w-4 h-4" /> ADD FILE
          </Button>
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" onClick={onClose} className="font-mono text-xs">
              CANCEL
            </Button>
            <Button size="sm" variant="default" onClick={() => { onSave(localFiles); onClose() }} className="font-mono text-xs">
              SAVE ALL
            </Button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ---------------------------------------------------------------------------
// File card in the browser
// ---------------------------------------------------------------------------

function FileCard({ file, onClick }: { file: MediaFile; onClick: () => void }) {
  return (
    <motion.button
      onClick={onClick}
      className="group relative w-full text-left border border-border/40 bg-background/30 hover:border-primary/50 hover:bg-primary/5 transition-all p-4 font-mono"
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
    >
      <HudCorner pos="tl" /><HudCorner pos="br" />
      <div className="flex items-start gap-3">
        <FileTypeIcon type={file.type} />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold tracking-wide uppercase truncate group-hover:text-primary transition-colors">
            {file.name}
          </div>
          {file.description && (
            <div className="text-xs text-foreground/40 truncate mt-0.5">{file.description}</div>
          )}
          {file.folder && (
            <div className="text-[10px] text-accent/50 mt-1">{file.folder}</div>
          )}
        </div>
        <DownloadSimple className="w-4 h-4 text-accent/40 group-hover:text-accent transition-colors shrink-0 mt-0.5" />
      </div>
    </motion.button>
  )
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export function MediaBrowser({ mediaFiles = [], editMode = false, onUpdate, isOverlay = false, onClose }: MediaBrowserProps) {
  const [overlayFile, setOverlayFile] = useState<MediaFile | null>(null)
  const [editOpen, setEditOpen] = useState(false)
  const { t, locale } = useLocale()

  // Auto-open the edit panel when there are no files and we're in edit mode
  // so the admin immediately sees where to add files.
  useEffect(() => {
    if (isOverlay && editMode && onUpdate && mediaFiles.length === 0) {
      setEditOpen(true)
    }
  }, [isOverlay, editMode, onUpdate, mediaFiles.length])

  const handleOpen = useCallback((file: MediaFile) => {
    setOverlayFile(file)
  }, [])

  // Group files by folder
  const folderMap: Record<string, MediaFile[]> = {}
  const rootFiles: MediaFile[] = []
  for (const f of mediaFiles) {
    if (f.folder) {
      if (!folderMap[f.folder]) folderMap[f.folder] = []
      folderMap[f.folder].push(f)
    } else {
      rootFiles.push(f)
    }
  }
  const folders = Object.keys(folderMap)

  // When used as overlay (from AppMediaSection), render as fullscreen modal browser
  if (isOverlay) {
    return (
      <motion.div
        className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className="relative w-full max-w-3xl bg-card border border-primary/30 flex flex-col max-h-[90dvh]"
          initial={{ scale: 0.95, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.95, y: 20 }}
          onClick={(e) => e.stopPropagation()}
        >
          <HudCorner pos="tl" /><HudCorner pos="tr" /><HudCorner pos="bl" /><HudCorner pos="br" />

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
            <div className="data-label">// MEDIA.ARCHIVE</div>
            <div className="flex items-center gap-2">
              {editMode && onUpdate && (
                <Button
                  size="sm"
                  onClick={() => setEditOpen(true)}
                  className="gap-1 font-mono text-xs bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  <PencilSimple className="w-3 h-3" />
                  MANAGE FILES
                </Button>
              )}
              <button
                onClick={onClose}
                className="text-muted-foreground hover:text-foreground p-1"
                aria-label="Close media archive"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* File list */}
          <div className="flex-1 overflow-y-auto p-4 min-h-0">
            {mediaFiles.length === 0 ? (
              <p className="text-xs font-mono text-foreground/30 text-center py-12">
                {editMode ? 'NO FILES — CLICK "MANAGE FILES" TO ADD' : 'NO FILES AVAILABLE'}
              </p>
            ) : (
              <div className="space-y-6">
                {rootFiles.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {rootFiles.map((f) => (
                      <FileCard key={f.id} file={f} onClick={() => handleOpen(f)} />
                    ))}
                  </div>
                )}
                {folders.map((folder) => (
                  <div key={folder}>
                    <div className="flex items-center gap-2 mb-3">
                      <FolderOpen className="w-4 h-4 text-accent/60" />
                      <span className="data-label">// {folder.toUpperCase()}</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pl-4 border-l border-border/30">
                      {folderMap[folder].map((f) => (
                        <FileCard key={f.id} file={f} onClick={() => handleOpen(f)} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>

        <AnimatePresence>
          {overlayFile && (
            <MediaOverlay file={overlayFile} onClose={() => setOverlayFile(null)} />
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
      </motion.div>
    )
  }

  // Inline section (legacy usage)
  return (
    <section id="media" className="py-24 px-4">
      <div className="container mx-auto max-w-4xl">

        {/* Section heading — consistent with other App sections */}
        <motion.div
          initial={{ opacity: 0, x: -30, filter: 'blur(10px)', clipPath: 'polygon(0 0, 0 0, 0 100%, 0 100%)' }}
          whileInView={{ opacity: 1, x: 0, filter: 'blur(0px)', clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 100%)' }}
          viewport={{ once: true }}
          transition={{ duration: 1, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          <div className="flex items-center justify-between mb-12">
            <h2 className="text-4xl md:text-6xl font-bold uppercase tracking-tighter text-foreground font-mono hover-chromatic hover-glitch cyber2077-scan-build" data-text="MEDIA">
              MEDIA
            </h2>
            {editMode && onUpdate && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditOpen(true)}
                className="gap-2 border-primary/30 font-mono tracking-wider text-xs shrink-0"
              >
                <PencilSimple className="w-4 h-4" />
                MANAGE FILES
              </Button>
            )}
          </div>
        </motion.div>

        {/* HUD trigger box */}
        <motion.div
          className="relative border border-primary/30 bg-card/40 p-6 cursor-pointer hover:border-primary/60 hover:bg-primary/5 transition-all group"
          whileHover={{ scale: 1.005 }}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <HudCorner pos="tl" /><HudCorner pos="tr" /><HudCorner pos="bl" /><HudCorner pos="br" />

          <div className="flex items-center justify-between">
            <div className="font-mono">
              <div className="data-label mb-1">{t('media.pressKits')}</div>
              <div className="text-foreground/50 text-sm tracking-wider">
                {mediaFiles.length === 0
                  ? t('media.noFiles')
                  : formatFileCount(mediaFiles.length, locale)
                }
              </div>
            </div>
            <DownloadSimple className="w-6 h-6 text-accent/50 group-hover:text-accent transition-colors" />
          </div>
        </motion.div>

        {/* File grid */}
        {mediaFiles.length > 0 && (
          <motion.div
            className="mt-6 space-y-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            {rootFiles.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {rootFiles.map((f) => (
                  <FileCard key={f.id} file={f} onClick={() => handleOpen(f)} />
                ))}
              </div>
            )}
            {folders.map((folder) => (
              <div key={folder}>
                <div className="flex items-center gap-2 mb-3">
                  <FolderOpen className="w-4 h-4 text-accent/60" />
                  <span className="data-label">// {folder.toUpperCase()}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pl-4 border-l border-border/30">
                  {folderMap[folder].map((f) => (
                    <FileCard key={f.id} file={f} onClick={() => handleOpen(f)} />
                  ))}
                </div>
              </div>
            ))}
          </motion.div>
        )}
      </div>

      <AnimatePresence>
        {overlayFile && (
          <MediaOverlay file={overlayFile} onClose={() => setOverlayFile(null)} />
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
