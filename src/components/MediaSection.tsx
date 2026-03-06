import { motion, useInView, AnimatePresence } from 'framer-motion'
import { Folder, File, DownloadSimple, Plus, Trash, PencilSimple } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import CyberCloseButton from '@/components/CyberCloseButton'
import { ChromaticText } from '@/components/ChromaticText'
import { useOverlayTransition } from '@/components/OverlayTransition'
import { useTypingEffect } from '@/hooks/use-typing-effect'
import MusicPlayer from '@/components/MusicPlayer'
import YouTubeEmbed, { extractYouTubeId } from '@/components/YouTubeEmbed'
import { useState, useRef, useEffect, useCallback } from 'react'
import type { MediaFile, SectionLabels } from '@/lib/types'
import { downloadFile, type DownloadProgress } from '@/lib/download'
import {
  TITLE_TYPING_SPEED_MS,
  TITLE_TYPING_START_DELAY_MS,
} from '@/lib/config'

interface MediaSectionProps {
  mediaFiles?: MediaFile[]
  editMode?: boolean
  onUpdate?: (files: MediaFile[]) => void
  sectionLabels?: SectionLabels
  onLabelChange?: (key: keyof SectionLabels, value: string) => void
}

/** Get unique folder names from files */
function getFolders(files: MediaFile[]): string[] {
  const folders = new Set<string>()
  files.forEach(f => {
    if (f.folder) folders.add(f.folder)
  })
  return Array.from(folders).sort()
}

/** Get files in a specific folder (or root) */
function getFilesInFolder(files: MediaFile[], folder: string | null): MediaFile[] {
  if (folder === null) return files.filter(f => !f.folder)
  return files.filter(f => f.folder === folder)
}

/** Loading glitch animation for the overlay */
function MediaLoadingScreen() {
  const [loadingText, setLoadingText] = useState('> INITIALIZING FILE SYSTEM...')

  useEffect(() => {
    const texts = [
      '> INITIALIZING FILE SYSTEM...',
      '> DECRYPTING ARCHIVE...',
      '> ACCESS GRANTED'
    ]
    let idx = 0
    const interval = setInterval(() => {
      idx++
      if (idx < texts.length) setLoadingText(texts[idx])
    }, 500)
    return () => clearInterval(interval)
  }, [])

  return (
    <motion.div
      className="flex flex-col items-center gap-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="w-24 h-1 bg-primary/30 overflow-hidden">
        <motion.div
          className="h-full bg-primary"
          animate={{ width: ['0%', '100%'] }}
          transition={{ duration: 1.2, ease: 'easeInOut' }}
        />
      </div>
      <p className="text-primary/70 font-mono text-xs tracking-wider">{loadingText}</p>
    </motion.div>
  )
}

/** Tree view for navigating folders and files */
function FileTreeView({ files, selectedFolder, onSelectFolder, selectedFile, onSelectFile }: {
  files: MediaFile[]
  selectedFolder: string | null
  onSelectFolder: (folder: string | null) => void
  selectedFile: MediaFile | null
  onSelectFile: (file: MediaFile) => void
}) {
  const folders = getFolders(files)
  const rootFiles = getFilesInFolder(files, null)

  return (
    <div className="space-y-1 font-mono text-xs">
      <button
        className={`w-full text-left px-2 py-1.5 flex items-center gap-2 transition-colors ${
          selectedFolder === null ? 'text-primary bg-primary/10' : 'text-foreground/70 hover:text-primary hover:bg-primary/5'
        }`}
        onClick={() => onSelectFolder(null)}
      >
        <Folder size={14} weight="fill" className="text-primary/60 flex-shrink-0" />
        <span className="truncate">/ROOT</span>
      </button>

      {folders.map(folder => (
        <div key={folder}>
          <button
            className={`w-full text-left px-2 py-1.5 pl-4 flex items-center gap-2 transition-colors ${
              selectedFolder === folder ? 'text-primary bg-primary/10' : 'text-foreground/70 hover:text-primary hover:bg-primary/5'
            }`}
            onClick={() => onSelectFolder(folder)}
          >
            <Folder size={14} weight="fill" className="text-primary/60 flex-shrink-0" />
            <span className="truncate">/{folder.toUpperCase()}</span>
          </button>
          {selectedFolder === folder && getFilesInFolder(files, folder).map(file => (
            <button
              key={file.id}
              className={`w-full text-left px-2 py-1 pl-8 flex items-center gap-2 transition-colors ${
                selectedFile?.id === file.id ? 'text-primary bg-primary/10' : 'text-foreground/60 hover:text-primary hover:bg-primary/5'
              }`}
              onClick={() => onSelectFile(file)}
            >
              <File size={12} className="text-primary/40 flex-shrink-0" />
              <span className="truncate">{file.name}</span>
            </button>
          ))}
        </div>
      ))}

      {selectedFolder === null && rootFiles.map(file => (
        <button
          key={file.id}
          className={`w-full text-left px-2 py-1 pl-4 flex items-center gap-2 transition-colors ${
            selectedFile?.id === file.id ? 'text-primary bg-primary/10' : 'text-foreground/60 hover:text-primary hover:bg-primary/5'
          }`}
          onClick={() => onSelectFile(file)}
        >
          <File size={12} className="text-primary/40 flex-shrink-0" />
          <span className="truncate">{file.name}</span>
        </button>
      ))}

      {files.length === 0 && (
        <p className="text-primary/30 text-[10px] px-2 py-4">NO FILES AVAILABLE</p>
      )}
    </div>
  )
}

/** File detail panel shown on the right side */
function FileDetailPanel({ file, allFiles }: { file: MediaFile | null; allFiles: MediaFile[] }) {
  const [dlProgress, setDlProgress] = useState<DownloadProgress>({ state: 'idle', progress: 0 })

  const handleDownload = useCallback(() => {
    if (!file || dlProgress.state === 'downloading') return
    downloadFile(file.url, file.name, setDlProgress)
  }, [file, dlProgress.state])

  // Reset progress when file changes
  useEffect(() => {
    setDlProgress({ state: 'idle', progress: 0 })
  }, [file?.id])

  if (!file) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-6">
        <File size={48} className="text-primary/20 mb-3" />
        <p className="text-primary/40 font-mono text-xs tracking-wider">SELECT A FILE TO VIEW DETAILS</p>
      </div>
    )
  }

  // Detect if it's a YouTube file
  const youtubeId = file.type === 'youtube' ? extractYouTubeId(file.url) : null

  // Collect audio tracks from all files
  const audioTracks = allFiles
    .filter(f => f.type === 'audio')
    .map(f => ({ title: f.name, src: f.url }))

  // Find the currently selected audio track index from audioTracks
  const audioIndex = file.type === 'audio'
    ? audioTracks.findIndex(t => t.src === file.url)
    : -1

  return (
    <motion.div
      key={file.id}
      className="p-4 md:p-6 space-y-4"
      initial={{ opacity: 0, x: 10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.2 }}
    >
      <div className="text-[10px] text-primary/50 tracking-wider mb-2">
        {'>'} FILE DATA // {file.name.toUpperCase()}
      </div>

      {/* YouTube embed */}
      {youtubeId && (
        <YouTubeEmbed videoId={youtubeId} title={file.name} />
      )}

      {/* Audio player */}
      {file.type === 'audio' && audioTracks.length > 0 && audioIndex >= 0 && (
        <MusicPlayer tracks={audioTracks} initialIndex={audioIndex} />
      )}

      <div className="bg-black/50 border border-primary/20 p-4 space-y-3">
        <div className="flex items-center gap-2">
          <File size={16} className="text-primary/60" />
          <span className="font-mono text-sm text-foreground/90">{file.name}</span>
        </div>

        {file.folder && (
          <div className="text-xs font-mono text-foreground/50">
            <span className="text-primary/40">FOLDER:</span> /{file.folder.toUpperCase()}
          </div>
        )}

        {file.description && (
          <div className="border-t border-primary/10 pt-3">
            <p className="text-xs text-foreground/70 leading-relaxed">{file.description}</p>
          </div>
        )}
      </div>

      {!youtubeId && (
        <div className="space-y-2">
          <button
            onClick={handleDownload}
            disabled={dlProgress.state === 'downloading'}
            className="inline-flex items-center gap-2 px-4 py-2 border border-primary/40 bg-primary/10 hover:bg-primary/20 text-primary font-mono text-xs tracking-wider transition-all hover:shadow-[0_0_15px_oklch(0.50_0.22_25/0.3)] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <DownloadSimple size={16} />
            {dlProgress.state === 'downloading' ? 'DOWNLOADING...' : dlProgress.state === 'complete' ? 'DOWNLOADED ✓' : 'DOWNLOAD'}
          </button>

          {/* Download progress bar */}
          {dlProgress.state === 'downloading' && (
            <div className="space-y-1">
              <div className="w-full h-1.5 bg-primary/20 overflow-hidden">
                <motion.div
                  className="h-full bg-primary"
                  initial={{ width: '0%' }}
                  animate={{ width: `${Math.max(dlProgress.progress * 100, 5)}%` }}
                  transition={{ duration: 0.3, ease: 'easeOut' }}
                />
              </div>
              <p className="font-mono text-[9px] text-primary/50 tracking-wider">
                DOWNLOADING... {Math.round(dlProgress.progress * 100)}%
              </p>
            </div>
          )}

          {dlProgress.state === 'complete' && (
            <p className="font-mono text-[9px] text-primary/70 tracking-wider">DOWNLOAD COMPLETE</p>
          )}

          {dlProgress.state === 'error' && (
            <p className="font-mono text-[9px] text-destructive/70 tracking-wider">
              ERROR: {dlProgress.error || 'Download failed'}
            </p>
          )}
        </div>
      )}

      <div className="flex items-center gap-2 text-[9px] text-primary/40 pt-2">
        <div className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-pulse" />
        <span>FILE READY</span>
        <span className="ml-auto">NK-FS v1.0</span>
      </div>
    </motion.div>
  )
}

/** Edit panel for managing media files */
function MediaEditPanel({ files, onUpdate }: { files: MediaFile[]; onUpdate: (files: MediaFile[]) => void }) {
  const [editFiles, setEditFiles] = useState<MediaFile[]>(files)

  const addFile = () => {
    const newFile: MediaFile = {
      id: `media-${Date.now()}`,
      name: 'New File',
      url: '',
    }
    setEditFiles([...editFiles, newFile])
  }

  const updateFile = (index: number, updates: Partial<MediaFile>) => {
    setEditFiles(editFiles.map((f, i) => i === index ? { ...f, ...updates } : f))
  }

  const removeFile = (index: number) => {
    setEditFiles(editFiles.filter((_, i) => i !== index))
  }

  const handleSave = () => {
    onUpdate(editFiles.filter(f => f.name.trim() && f.url.trim()))
  }

  return (
    <div className="p-4 space-y-3 overflow-y-auto max-h-[60vh]">
      <p className="text-sm text-muted-foreground font-mono">
        Manage press kits, logos, and other downloadable media files.
      </p>

      {editFiles.map((file, idx) => (
        <div key={file.id} className="border border-border rounded p-3 space-y-2">
          <div className="flex gap-2 items-center">
            <Input
              value={file.name}
              onChange={(e) => updateFile(idx, { name: e.target.value })}
              placeholder="File Name"
              className="flex-1 text-xs"
            />
            <Button variant="ghost" size="icon" onClick={() => removeFile(idx)}>
              <Trash size={14} className="text-destructive" />
            </Button>
          </div>
          <div>
            <Label className="text-[10px]">Download URL</Label>
            <Input
              value={file.url}
              onChange={(e) => updateFile(idx, { url: e.target.value })}
              placeholder="https://..."
              className="text-xs"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-[10px]">Folder (optional)</Label>
              <Input
                value={file.folder || ''}
                onChange={(e) => updateFile(idx, { folder: e.target.value || undefined })}
                placeholder="e.g. press-kit"
                className="text-xs"
              />
            </div>
            <div>
              <Label className="text-[10px]">Type</Label>
              <select
                value={file.type || ''}
                onChange={(e) => updateFile(idx, { type: (e.target.value || undefined) as MediaFile['type'] })}
                className="flex w-full rounded-sm border border-input bg-transparent px-3 py-1 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring h-8"
              >
                <option value="">Download</option>
                <option value="audio">Audio</option>
                <option value="youtube">YouTube</option>
              </select>
            </div>
          </div>
          <div>
            <Label className="text-[10px]">Description (optional)</Label>
            <Input
              value={file.description || ''}
              onChange={(e) => updateFile(idx, { description: e.target.value || undefined })}
              placeholder="Short description"
              className="text-xs"
            />
          </div>
        </div>
      ))}

      <Button variant="outline" onClick={addFile} className="w-full">
        <Plus size={16} className="mr-2" /> Add File
      </Button>

      <div className="flex justify-end gap-2 pt-2">
        <Button onClick={handleSave}>Save Files</Button>
      </div>
    </div>
  )
}

/** Full-screen overlay for the media file explorer */
function MediaOverlay({ files, editMode, onUpdate, onClose, sectionLabels }: {
  files: MediaFile[]
  editMode?: boolean
  onUpdate?: (files: MediaFile[]) => void
  onClose: () => void
  sectionLabels?: SectionLabels
}) {
  const [phase, setPhase] = useState<'loading' | 'ready'>('loading')
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<MediaFile | null>(null)
  const [isEditing, setIsEditing] = useState(false)

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

  return (
    <motion.div
      className="fixed inset-0 z-[9999] bg-black/95 backdrop-blur-md overflow-y-auto flex items-center justify-center p-4 md:p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="absolute inset-0 hud-scanline opacity-20 pointer-events-none" />

      {phase === 'loading' && <MediaLoadingScreen />}

      {phase === 'ready' && (
        <motion.div
          className="w-full max-w-4xl h-[min(600px,80dvh)] bg-card border border-primary/30 relative overflow-hidden glitch-overlay-enter flex flex-col"
          initial={{ scale: 0.85, y: 30, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.85, y: 30, opacity: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* HUD corner accents */}
          <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-primary/50" />
          <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-primary/50" />
          <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-primary/50" />
          <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-primary/50" />

          {/* Header bar */}
          <div className="h-10 bg-primary/10 border-b border-primary/30 flex items-center justify-between px-4 flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span className="font-mono text-[10px] text-primary/70 tracking-wider uppercase">
                {isEditing ? 'EDIT MEDIA FILES' : 'FILE EXPLORER // MEDIA ARCHIVE'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {editMode && onUpdate && !isEditing && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="text-primary hover:text-accent transition-colors"
                  title="Edit media files"
                >
                  <PencilSimple size={18} />
                </button>
              )}
              <CyberCloseButton
                onClick={() => { if (isEditing) { setIsEditing(false) } else { onClose() } }}
                label={sectionLabels?.closeButtonText || (isEditing ? 'BACK' : 'CLOSE')}
              />
            </div>
          </div>

          {isEditing && onUpdate ? (
            <MediaEditPanel files={files} onUpdate={(updated) => { onUpdate(updated); setIsEditing(false) }} />
          ) : (
            <div className="flex flex-col md:flex-row flex-1 min-h-0">
              {/* Left: Tree view */}
              <div className="md:w-2/5 border-b md:border-b-0 md:border-r border-primary/20 overflow-y-auto p-3 max-h-[200px] md:max-h-none">
                <div className="text-[9px] text-primary/40 tracking-wider mb-2 px-2">DIRECTORY</div>
                <FileTreeView
                  files={files}
                  selectedFolder={selectedFolder}
                  onSelectFolder={setSelectedFolder}
                  selectedFile={selectedFile}
                  onSelectFile={setSelectedFile}
                />
              </div>

              {/* Right: File details */}
              <div className="md:w-3/5 overflow-y-auto flex-1">
                <FileDetailPanel file={selectedFile} allFiles={files} />
              </div>
            </div>
          )}

          {/* Scanline overlay */}
          <div className="absolute inset-0 hud-scanline pointer-events-none opacity-10" />
        </motion.div>
      )}
    </motion.div>
  )
}

export default function MediaSection({ mediaFiles = [], editMode, onUpdate, sectionLabels, onLabelChange }: MediaSectionProps) {
  const sectionRef = useRef(null)
  const isInView = useInView(sectionRef, { once: true, amount: 0.2 })
  const [overlayOpen, setOverlayOpen] = useState(false)
  const { trigger: triggerTransition, element: transitionElement } = useOverlayTransition()
  const titleText = sectionLabels?.media || 'MEDIA'
  const headingPrefix = sectionLabels?.headingPrefix ?? '>'
  const { displayedText: displayedTitle } = useTypingEffect(
    isInView ? titleText : '',
    TITLE_TYPING_SPEED_MS,
    TITLE_TYPING_START_DELAY_MS
  )

  return (
    <section ref={sectionRef} className="py-20 px-4 relative" id="media">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.7 }}
        >
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold font-mono scanline-text dot-matrix-text"
              style={{
                textShadow: '0 0 6px oklch(1 0 0 / 0.5), 0 0 12px oklch(0.50 0.22 25 / 0.3), 0 0 18px oklch(0.50 0.22 25 / 0.2)'
              }}
            >
              <ChromaticText intensity={1.5}>
                {headingPrefix} {displayedTitle}
              </ChromaticText>
              <span className="animate-pulse">_</span>
            </h2>
            {editMode && onUpdate && (
              <div className="flex gap-2 items-center">
                {onLabelChange && (
                  <input
                    type="text"
                    value={sectionLabels?.media || ''}
                    onChange={(e) => onLabelChange('media', e.target.value)}
                    placeholder="MEDIA"
                    className="bg-transparent border border-primary/30 px-2 py-1 text-xs font-mono text-primary w-32 focus:outline-none focus:border-primary"
                  />
                )}
                <Button
                  size="sm"
                  variant="outline"
                  className="border-primary/30 hover:bg-primary/10 gap-1"
                  onClick={() => { triggerTransition(); setOverlayOpen(true) }}
                >
                  <PencilSimple size={16} />
                  <span className="hidden md:inline">Manage</span>
                </Button>
              </div>
            )}
          </div>

          {/* Clickable card to open the media overlay */}
          <motion.button
            className="w-full text-left border border-primary/20 bg-card/50 hover:border-primary/50 p-6 md:p-8 transition-all duration-300 group hud-element hud-corner cursor-pointer"
            onClick={() => { triggerTransition(); setOverlayOpen(true) }}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
          >
            <span className="corner-bl"></span>
            <span className="corner-br"></span>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 border border-primary/30 flex items-center justify-center bg-primary/5 group-hover:bg-primary/10 transition-colors">
                <Folder size={24} weight="fill" className="text-primary/60 group-hover:text-primary transition-colors" />
              </div>
              <div>
                <p className="font-mono text-sm text-foreground/90 group-hover:text-primary transition-colors tracking-wider">
                  OPEN MEDIA ARCHIVE
                </p>
                <p className="font-mono text-[10px] text-foreground/40 mt-1">
                  {mediaFiles.length > 0
                    ? `${mediaFiles.length} FILE${mediaFiles.length !== 1 ? 'S' : ''} AVAILABLE // PRESS KITS · LOGOS · ASSETS`
                    : 'PRESS KITS · LOGOS · ASSETS'}
                </p>
              </div>
              <div className="ml-auto hidden md:flex items-center gap-2 text-[9px] text-primary/40 font-mono">
                <div className="w-1.5 h-1.5 rounded-full bg-primary/40 animate-pulse" />
                CLICK TO ACCESS
              </div>
            </div>
          </motion.button>
        </motion.div>
      </div>

      <AnimatePresence>
        {overlayOpen && (
          <MediaOverlay
            files={mediaFiles}
            editMode={editMode}
            onUpdate={onUpdate}
            onClose={() => { triggerTransition(); setOverlayOpen(false) }}
            sectionLabels={sectionLabels}
          />
        )}
      </AnimatePresence>
      {transitionElement}
    </section>
  )
}
