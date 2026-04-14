import { useState, useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useMediaUpload } from '../hooks/useMediaUpload'
import { type MediaItem } from '../schemas'
import { Loader2, Upload, Trash2, X, Image as ImageIcon } from 'lucide-react'
import { toast } from 'sonner'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'

interface MediaResponse {
  items: MediaItem[]
}

async function fetchMedia(): Promise<MediaResponse> {
  const res = await fetch('/api/cms/media', { credentials: 'include' })
  if (!res.ok) throw new Error(`Failed to fetch media: ${res.status}`)
  return res.json() as Promise<MediaResponse>
}

async function deleteMedia(id: string): Promise<void> {
  const res = await fetch(`/api/cms/media/${id}`, { method: 'DELETE', credentials: 'include' })
  if (!res.ok) throw new Error(`Failed to delete: ${res.status}`)
}

export default function MediaLibrary() {
  const { data, isLoading, error } = useQuery({ queryKey: ['cms-media'], queryFn: fetchMedia, staleTime: 30_000 })
  const { upload, progress, isUploading } = useMediaUpload()
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedItem, setSelectedItem] = useState<MediaItem | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmDeleteItem, setConfirmDeleteItem] = useState<MediaItem | null>(null)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    for (const file of Array.from(files)) {
      await upload(file)
    }
    await queryClient.invalidateQueries({ queryKey: ['cms-media'] })
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleDelete = async (item: MediaItem) => {
    setConfirmDeleteItem(item)
  }

  const confirmDelete = async () => {
    const item = confirmDeleteItem
    setConfirmDeleteItem(null)
    if (!item) return
    setDeletingId(item.id)
    try {
      await deleteMedia(item.id)
      await queryClient.invalidateQueries({ queryKey: ['cms-media'] })
      if (selectedItem?.id === item.id) setSelectedItem(null)
      toast.success(`"${item.fileName}" deleted.`)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Delete failed.'
      toast.error(message)
    } finally {
      setDeletingId(null)
    }
  }

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="animate-spin text-red-500" size={32} />
    </div>
  )

  if (error) return (
    <div className="flex items-center justify-center h-64 text-red-400 text-sm">
      Failed to load media library.
    </div>
  )

  const items = data?.items ?? []

  return (
    <>
    <div className="p-6 h-full flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-zinc-100 text-xl font-semibold">Media Library</h1>
        <div className="flex items-center gap-3">
          {isUploading && (
            <div className="flex items-center gap-2 text-zinc-400 text-sm">
              <Loader2 size={14} className="animate-spin" />
              <span>{progress}%</span>
            </div>
          )}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded disabled:opacity-50 flex items-center gap-2 text-sm"
          >
            <Upload size={14} /> Upload
          </button>
          <input ref={fileInputRef} type="file" multiple accept="image/*,video/*,audio/*" className="hidden" aria-label="Upload media files" onChange={(e) => { void handleFileChange(e) }} />
        </div>
      </div>

      {isUploading && (
        <div className="w-full bg-zinc-800 rounded-full h-1.5">
          <div className="bg-red-500 h-1.5 rounded-full transition-[width]" style={{ width: `${progress}%` }} />
        </div>
      )}

      <div className="flex gap-4 flex-1 min-h-0">
        <div className="flex-1 overflow-y-auto">
          {items.length === 0 ? (
            <div className="bg-[#111] border border-zinc-800 rounded p-12 text-center text-zinc-500 text-sm">
              <ImageIcon size={32} className="mx-auto mb-3 opacity-40" />
              No media files yet. Upload some files to get started.
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
              {items.map(item => (
                <div
                  key={item.id}
                  onClick={() => setSelectedItem(item)}
                  className={`group relative aspect-square bg-[#1a1a1a] border rounded cursor-pointer overflow-hidden transition-colors ${selectedItem?.id === item.id ? 'border-red-500' : 'border-zinc-800 hover:border-zinc-600'}`}
                >
                  {item.thumbnailUrl || item.mimeType.startsWith('image/') ? (
                    <img
                      src={item.thumbnailUrl ?? item.url}
                      alt={item.alt ?? item.fileName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageIcon size={20} className="text-zinc-600" />
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); void handleDelete(item) }}
                    disabled={deletingId === item.id}
                    className="absolute top-1 right-1 bg-black/70 text-red-400 hover:text-red-300 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    {deletingId === item.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                  </button>
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <p className="text-white text-xs truncate">{item.fileName}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {selectedItem && (
          <div className="w-64 flex-shrink-0 bg-[#111] border border-zinc-800 rounded p-4 space-y-3 overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-zinc-300 text-sm font-medium">Details</h3>
              <button type="button" onClick={() => setSelectedItem(null)} className="text-zinc-500 hover:text-zinc-300"><X size={16} /></button>
            </div>
            {selectedItem.mimeType.startsWith('image/') && (
              <img src={selectedItem.url} alt={selectedItem.alt ?? selectedItem.fileName} className="w-full rounded border border-zinc-700" />
            )}
            <div className="space-y-2 text-xs">
              <div>
                <p className="text-zinc-500">File name</p>
                <p className="text-zinc-200 break-all">{selectedItem.fileName}</p>
              </div>
              <div>
                <p className="text-zinc-500">Type</p>
                <p className="text-zinc-200">{selectedItem.mimeType}</p>
              </div>
              <div>
                <p className="text-zinc-500">Size</p>
                <p className="text-zinc-200">{formatSize(selectedItem.size)}</p>
              </div>
              {selectedItem.width && selectedItem.height && (
                <div>
                  <p className="text-zinc-500">Dimensions</p>
                  <p className="text-zinc-200">{selectedItem.width} × {selectedItem.height}</p>
                </div>
              )}
              <div>
                <p className="text-zinc-500">Uploaded</p>
                <p className="text-zinc-200">{new Date(selectedItem.uploadedAt).toLocaleDateString()}</p>
              </div>
              <div>
                <p className="text-zinc-500">URL</p>
                <a href={selectedItem.url} target="_blank" rel="noopener noreferrer" className="text-red-400 hover:text-red-300 break-all">{selectedItem.url}</a>
              </div>
            </div>
            <button
              type="button"
              onClick={() => void handleDelete(selectedItem)}
              disabled={deletingId === selectedItem.id}
              className="w-full bg-red-600/20 hover:bg-red-600/30 text-red-400 px-3 py-2 rounded text-xs flex items-center justify-center gap-2"
            >
              {deletingId === selectedItem.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />} Delete
            </button>
          </div>
        )}
      </div>
    </div>

    <AlertDialog open={!!confirmDeleteItem} onOpenChange={(o) => { if (!o) setConfirmDeleteItem(null) }}>
      <AlertDialogContent data-admin-ui="true">
        <AlertDialogHeader>
          <AlertDialogTitle>Delete file?</AlertDialogTitle>
          <AlertDialogDescription>
            Delete <span className="font-mono">&quot;{confirmDeleteItem?.fileName}&quot;</span>? This cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={() => void confirmDelete()} className="bg-red-600 hover:bg-red-700">
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  )
}
