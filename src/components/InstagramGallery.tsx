import { useRef, useState, useEffect } from 'react'
import { motion, useInView, AnimatePresence } from 'framer-motion'
import { Images, X, CaretLeft, CaretRight, Plus, PencilSimple, FolderOpen, ArrowsClockwise } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useTypingEffect } from '@/hooks/use-typing-effect'
import { ChromaticText } from '@/components/ChromaticText'
import ProgressiveImage from '@/components/ProgressiveImage'
import { useOverlayTransition } from '@/components/OverlayTransition'
import { loadCachedImage } from '@/lib/image-cache'
import type { GalleryImage, SectionLabels } from '@/lib/types'
import { toast } from 'sonner'

interface InstagramGalleryProps {
  galleryImages?: GalleryImage[]
  editMode?: boolean
  onUpdate?: (images: GalleryImage[]) => void
  /** Google Drive folder URL for bulk photo import */
  driveFolderUrl?: string
  onDriveFolderUrlChange?: (url: string) => void
  sectionLabels?: SectionLabels
  onLabelChange?: (key: keyof SectionLabels, value: string) => void
}

/** Extract a Google Drive folder ID from various URL formats */
function extractDriveFolderId(url: string): string | null {
  // https://drive.google.com/drive/folders/{folderId}
  const m1 = url.match(/drive\.google\.com\/drive\/folders\/([A-Za-z0-9_-]+)/)
  if (m1) return m1[1]
  // https://drive.google.com/open?id={folderId}
  const m2 = url.match(/drive\.google\.com\/open\?id=([A-Za-z0-9_-]+)/)
  if (m2) return m2[1]
  // plain folder ID
  if (/^[A-Za-z0-9_-]{10,}$/.test(url.trim())) return url.trim()
  return null
}

export default function InstagramGallery({ galleryImages = [], editMode, onUpdate, driveFolderUrl, onDriveFolderUrlChange, sectionLabels, onLabelChange }: InstagramGalleryProps) {
  const sectionRef = useRef(null)
  const isInView = useInView(sectionRef, { once: true, amount: 0.2 })
  const [glitchIndex, setGlitchIndex] = useState<number | null>(null)
  const [selectedImage, setSelectedImage] = useState<{ imageUrl: string; caption: string } | null>(null)
  const [mobileIndex, setMobileIndex] = useState(0)
  const [touchStartX, setTouchStartX] = useState(0)
  const [touchEndX, setTouchEndX] = useState(0)
  const [cachedUrls, setCachedUrls] = useState<Record<string, string>>({})
  const [showAddForm, setShowAddForm] = useState(false)
  const [newUrl, setNewUrl] = useState('')
  const [newCaption, setNewCaption] = useState('')
  const [driveUrlInput, setDriveUrlInput] = useState(driveFolderUrl || '')
  const [isDriveLoading, setIsDriveLoading] = useState(false)
  const [showDriveForm, setShowDriveForm] = useState(false)
  const driveAutoLoaded = useRef(false)
  const { trigger: triggerTransition, element: transitionElement } = useOverlayTransition()

  const titleText = sectionLabels?.gallery || 'GALLERY'
  const headingPrefix = sectionLabels?.headingPrefix ?? '>'
  const { displayedText: displayedTitle } = useTypingEffect(
    isInView ? titleText : '',
    50,
    200
  )

  // Load and cache URL-based images
  useEffect(() => {
    if (!galleryImages || galleryImages.length === 0) return
    galleryImages.forEach((img) => {
      if (!cachedUrls[img.url]) {
        loadCachedImage(img.url).then((cached) => {
          setCachedUrls((prev) => ({ ...prev, [img.url]: cached }))
        })
      }
    })
  }, [galleryImages])

  // Auto-load from Drive folder on first render if URL is set
  useEffect(() => {
    if (driveFolderUrl && !driveAutoLoaded.current && galleryImages.length === 0) {
      driveAutoLoaded.current = true
      loadDriveFolder(driveFolderUrl, true)
    }
  }, [driveFolderUrl])

  useEffect(() => {
    const interval = setInterval(() => {
      if (Math.random() > 0.7 && photos.length > 0) {
        const randomIndex = Math.floor(Math.random() * photos.length)
        setGlitchIndex(randomIndex)
        setTimeout(() => setGlitchIndex(null), 300)
      }
    }, 3000)

    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (selectedImage) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [selectedImage])

  // URL-based images from KV store (includes Drive-imported images)
  const urlPhotos = (galleryImages || []).map((img) => ({
    id: img.id,
    imageUrl: cachedUrls[img.url] || img.url,
    caption: img.caption || img.url.split('/').pop()?.split('?')[0] || 'IMG',
    isLocal: false,
    originalUrl: img.url
  }))

  const photos = urlPhotos

  // Close overlay and navigate with keyboard
  useEffect(() => {
    if (!selectedImage) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        triggerTransition()
        setSelectedImage(null)
      }
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault()
        const currentIdx = photos.findIndex(p => p.imageUrl === selectedImage.imageUrl)
        if (currentIdx < photos.length - 1) {
          setSelectedImage(photos[currentIdx + 1])
        }
      }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault()
        const currentIdx = photos.findIndex(p => p.imageUrl === selectedImage.imageUrl)
        if (currentIdx > 0) {
          setSelectedImage(photos[currentIdx - 1])
        }
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [selectedImage, photos, triggerTransition])

  const loadDriveFolder = async (url: string, silent = false, replace = false) => {
    const folderId = extractDriveFolderId(url)
    if (!folderId) {
      if (!silent) toast.error('Invalid Google Drive folder URL. Expected format: https://drive.google.com/drive/folders/...')
      return
    }
    setIsDriveLoading(true)
    try {
      const res = await fetch(`/api/drive-folder?folderId=${encodeURIComponent(folderId)}`)
      if (!res.ok) throw new Error(`API returned ${res.status}`)
      const data = await res.json()
      if (!data.images || data.images.length === 0) {
        if (replace && onUpdate) {
          onUpdate([])
          if (!silent) toast.info('Drive folder is empty – gallery cleared')
        } else if (!silent) {
          toast.info('No images found in Drive folder')
        }
        return
      }
      if (replace && onUpdate) {
        // Replace all: clear gallery and use only fresh Drive images
        onUpdate(data.images as GalleryImage[])
        if (!silent) toast.success(`Gallery synced: ${data.images.length} image(s) from Drive`)
      } else {
        const current = galleryImages || []
        const existingIds = new Set(current.map(i => i.id))
        const newImages = (data.images as GalleryImage[]).filter(i => !existingIds.has(i.id))
        if (newImages.length > 0 && onUpdate) {
          onUpdate([...current, ...newImages])
          if (!silent) toast.success(`Added ${newImages.length} image(s) from Drive`)
        } else if (!silent) {
          toast.info('All Drive images already imported')
        }
      }
    } catch (err) {
      console.error('Drive folder load error:', err)
      if (!silent) toast.error('Failed to load images from Drive folder')
    } finally {
      setIsDriveLoading(false)
    }
  }

  const handleSaveDriveUrl = () => {
    const url = driveUrlInput.trim()
    if (url && onDriveFolderUrlChange) {
      onDriveFolderUrlChange(url)
      loadDriveFolder(url)
    }
    setShowDriveForm(false)
  }

  const handleAddImage = () => {
    if (!newUrl.trim() || !onUpdate) return
    const id = `gallery-url-${Date.now()}`
    const updated = [...(galleryImages || []), { id, url: newUrl.trim(), caption: newCaption.trim() || undefined }]
    onUpdate(updated)
    setNewUrl('')
    setNewCaption('')
    setShowAddForm(false)
  }

  const handleMobileSwipeStart = (e: React.TouchEvent) => {
    setTouchStartX(e.targetTouches[0].clientX)
    setTouchEndX(e.targetTouches[0].clientX)
  }

  const handleMobileSwipeMove = (e: React.TouchEvent) => {
    setTouchEndX(e.targetTouches[0].clientX)
  }

  const handleMobileSwipeEnd = () => {
    const diff = touchStartX - touchEndX
    if (diff > 60 && mobileIndex < photos.length - 1) {
      setMobileIndex(mobileIndex + 1)
    } else if (diff < -60 && mobileIndex > 0) {
      setMobileIndex(mobileIndex - 1)
    }
  }

  return (
    <>
      <section 
        id="gallery" 
        ref={sectionRef}
        className="py-20 px-4 relative"
      >
        <div className="max-w-6xl mx-auto">
           <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
            transition={{ duration: 0.6 }}
            className="mb-12"
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-mono scanline-text dot-matrix-text"
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
                    <>
                      <input
                        type="text"
                        value={sectionLabels?.headingPrefix ?? '>'}
                        onChange={(e) => onLabelChange('headingPrefix', e.target.value)}
                        placeholder=">"
                        className="bg-transparent border border-primary/30 px-2 py-1 text-xs font-mono text-primary w-12 focus:outline-none focus:border-primary"
                        title="Heading prefix"
                      />
                      <input
                        type="text"
                        value={sectionLabels?.gallery || ''}
                        onChange={(e) => onLabelChange('gallery', e.target.value)}
                        placeholder="GALLERY"
                        className="bg-transparent border border-primary/30 px-2 py-1 text-xs font-mono text-primary w-32 focus:outline-none focus:border-primary"
                      />
                    </>
                  )}
                </div>
              )}
            </div>
            <p className="text-muted-foreground font-mono text-sm">
              &gt; Visual identity of NEUROKLAST
            </p>
            {editMode && onUpdate && (
              <div className="mt-4 space-y-3">
                <div className="flex flex-wrap gap-2 justify-center">
                  {!showAddForm && (
                    <Button
                      onClick={() => setShowAddForm(true)}
                      variant="outline"
                      size="sm"
                      className="border-primary/30 hover:bg-primary/10 gap-2"
                    >
                      <Plus size={16} />
                      Add Image URL
                    </Button>
                  )}
                  {!showDriveForm && (
                    <Button
                      onClick={() => { setShowDriveForm(true); setDriveUrlInput(driveFolderUrl || '') }}
                      variant="outline"
                      size="sm"
                      className="border-primary/30 hover:bg-primary/10 gap-2"
                    >
                      <FolderOpen size={16} />
                      Drive Folder
                    </Button>
                  )}
                  {driveFolderUrl && (
                    <Button
                      onClick={() => loadDriveFolder(driveFolderUrl, false, true)}
                      variant="outline"
                      size="sm"
                      disabled={isDriveLoading}
                      className="border-primary/30 hover:bg-primary/10 gap-2"
                    >
                      <ArrowsClockwise size={16} className={isDriveLoading ? 'animate-spin' : ''} />
                      Sync Drive
                    </Button>
                  )}
                </div>

                {showAddForm && (
                  <div className="flex flex-col sm:flex-row gap-2 max-w-lg mx-auto items-end">
                    <div className="flex-1 space-y-1">
                      <Input
                        value={newUrl}
                        onChange={(e) => setNewUrl(e.target.value)}
                        placeholder="https://example.com/image.jpg"
                        className="text-xs"
                      />
                      <Input
                        value={newCaption}
                        onChange={(e) => setNewCaption(e.target.value)}
                        placeholder="Caption (optional)"
                        className="text-xs"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleAddImage} disabled={!newUrl.trim()}>Add</Button>
                      <Button size="sm" variant="outline" onClick={() => { setShowAddForm(false); setNewUrl(''); setNewCaption('') }}>Cancel</Button>
                    </div>
                  </div>
                )}

                {showDriveForm && (
                  <div className="flex flex-col sm:flex-row gap-2 max-w-lg mx-auto items-end">
                    <div className="flex-1">
                      <Input
                        value={driveUrlInput}
                        onChange={(e) => setDriveUrlInput(e.target.value)}
                        placeholder="https://drive.google.com/drive/folders/..."
                        className="text-xs"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleSaveDriveUrl} disabled={!driveUrlInput.trim() || isDriveLoading}>
                        {isDriveLoading ? 'Loading...' : 'Import'}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setShowDriveForm(false)}>Cancel</Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </motion.div>
          {photos.length === 0 && !editMode && (
            <div className="text-center text-muted-foreground py-12">
              <p className="font-mono">&gt; No images found in gallery</p>
              <p className="font-mono text-xs mt-2">&gt; Images can be added via URL or Google Drive folder</p>
            </div>
          )}

          {/* Mobile: single image swipe view */}
          {photos.length > 0 && (
            <div className="md:hidden">
              <div
                className="relative aspect-square overflow-hidden bg-card hud-element hud-corner hud-scanline"
                onTouchStart={handleMobileSwipeStart}
                onTouchMove={handleMobileSwipeMove}
                onTouchEnd={handleMobileSwipeEnd}
              >
                <span className="corner-bl"></span>
                <span className="corner-br"></span>

                <div className="absolute top-2 left-2 z-10 data-readout">
                  IMG_{String(mobileIndex).padStart(3, '0')}
                </div>
                <div className="absolute top-2 right-2 z-10">
                  <div className="w-2 h-2 bg-primary rounded-full animate-pulse" style={{ boxShadow: '0 0 8px var(--color-primary)' }}></div>
                </div>

                <AnimatePresence mode="wait">
                  <motion.div
                    key={mobileIndex}
                    className="relative w-full h-full red-tint-strong cursor-pointer"
                    initial={{ opacity: 0, x: 30 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -30 }}
                    transition={{ duration: 0.25 }}
                    onClick={() => { triggerTransition(); setSelectedImage(photos[mobileIndex]) }}
                  >
                    <ProgressiveImage
                      src={photos[mobileIndex].imageUrl}
                      alt={photos[mobileIndex].caption}
                      className="w-full h-full object-cover"
                      loading="lazy"
                      style={{ filter: 'contrast(1.1) brightness(0.9)' }}
                    />
                  </motion.div>
                </AnimatePresence>

                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none z-10" />

                <div className="absolute bottom-3 left-3 right-3 z-20 flex items-end justify-between">
                  <div>
                    <div className="flex items-center gap-2 text-white hud-text">
                      <Images size={16} weight="fill" className="text-primary" />
                      <span className="text-xs font-mono">{photos[mobileIndex].caption}</span>
                    </div>
                    <div className="mt-1 flex gap-2 text-[9px] text-primary/60">
                      <span>SECTOR: {String.fromCharCode(65 + (mobileIndex % 26))}</span>
                      <span>•</span>
                      <span>STATUS: ACTIVE</span>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono text-primary/50">{mobileIndex + 1}/{photos.length}</span>
                </div>

                {mobileIndex > 0 && (
                  <button
                    className="absolute left-2 top-1/2 -translate-y-1/2 z-20 p-2 bg-black/60 border border-primary/30 text-primary/80 active:bg-primary/20 touch-manipulation"
                    onClick={() => setMobileIndex(mobileIndex - 1)}
                  >
                    <CaretLeft size={20} weight="bold" />
                  </button>
                )}
                {mobileIndex < photos.length - 1 && (
                  <button
                    className="absolute right-2 top-1/2 -translate-y-1/2 z-20 p-2 bg-black/60 border border-primary/30 text-primary/80 active:bg-primary/20 touch-manipulation"
                    onClick={() => setMobileIndex(mobileIndex + 1)}
                  >
                    <CaretRight size={20} weight="bold" />
                  </button>
                )}
              </div>

              {/* Dot indicators */}
              <div className="flex justify-center gap-2 mt-3">
                {photos.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setMobileIndex(index)}
                    className={`h-1 rounded-sm transition-all touch-manipulation ${
                      index === mobileIndex
                        ? 'bg-primary w-6'
                        : 'bg-foreground/20 w-3'
                    }`}
                    aria-label={`Go to image ${index + 1}`}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Desktop: grid layout */}
          <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {photos.map((photo, index) => (
              <motion.div
                key={photo.id}
                className={`relative group overflow-hidden bg-card aspect-square cursor-pointer touch-manipulation hud-element hud-corner hud-scanline ${glitchIndex === index ? 'red-glitch-element' : ''}`}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => { triggerTransition(); setSelectedImage(photo) }}
              >
                <span className="corner-bl"></span>
                <span className="corner-br"></span>
                
                <div className="absolute top-2 left-2 z-10 data-readout">
                  IMG_{String(index).padStart(3, '0')}
                </div>
                
                <div className="absolute top-2 right-2 z-10 flex items-center gap-2">
                  <div className="w-2 h-2 bg-primary rounded-full animate-pulse" style={{ boxShadow: '0 0 8px var(--color-primary)' }}></div>
                </div>
                
                <div className="relative w-full h-full red-tint-strong">
                  <ProgressiveImage
                    src={photo.originalUrl || photo.imageUrl}
                    alt={photo.caption}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 group-active:scale-105"
                    loading="lazy"
                    style={{ filter: 'contrast(1.1) brightness(0.9)' }}
                  />
                </div>
                
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-opacity duration-300 z-10">
                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    <div className="flex items-center gap-2 text-white hud-text">
                      <Images size={20} weight="fill" className="text-primary" />
                      <span className="text-xs font-mono line-clamp-2">{photo.caption}</span>
                    </div>
                    <div className="mt-2 flex gap-2 text-[9px] text-primary/60">
                      <span>SECTOR: {String.fromCharCode(65 + (index % 26))}</span>
                      <span>•</span>
                      <span>STATUS: ACTIVE</span>
                    </div>
                  </div>
                </div>
                
                <div className="absolute inset-0 border border-transparent group-hover:border-primary/50 group-active:border-primary transition-colors duration-300 hud-border-glow pointer-events-none" />
                <div className="absolute inset-0 bg-primary/0 group-active:bg-primary/10 transition-colors duration-150 pointer-events-none" />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <AnimatePresence>
        {selectedImage && (
          <motion.div
            className="fixed inset-0 z-[9999] flex items-center justify-center overflow-y-auto bg-black/95 backdrop-blur-md px-4 py-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.button
              className="absolute top-4 right-4 p-3 bg-primary/20 hover:bg-primary/30 active:bg-primary/40 border border-primary/40 hover:border-primary/60 transition-all z-50 touch-manipulation group"
              onClick={() => { triggerTransition(); setSelectedImage(null) }}
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
            >
              <X size={24} className="text-primary group-hover:text-primary/80" weight="bold" />
            </motion.button>

            <motion.div
              className="relative max-w-7xl max-h-full hud-corner hud-element glitch-overlay-enter"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
            >
              <span className="corner-bl"></span>
              <span className="corner-br"></span>

              <div className="absolute top-2 left-2 z-10 data-readout bg-black/50 px-2 py-1">
                ZOOM_VIEW
              </div>

              <img
                src={selectedImage.imageUrl}
                alt={selectedImage.caption}
                className="max-w-full max-h-[85vh] w-auto h-auto object-contain red-tint"
                style={{ filter: 'contrast(1.1) brightness(0.9)' }}
              />

              <div className="absolute bottom-4 left-4 right-4 bg-black/80 border border-primary/40 p-4 backdrop-blur-sm">
                <div className="flex items-center gap-2 text-white hud-text">
                  <Images size={20} weight="fill" className="text-primary" />
                  <span className="text-sm font-mono">{selectedImage.caption}</span>
                  <span className="ml-auto text-[10px] text-primary/50 font-mono">
                    {photos.findIndex(p => p.imageUrl === selectedImage.imageUrl) + 1}/{photos.length}
                  </span>
                </div>
              </div>
            </motion.div>

            {/* Desktop prev/next arrow buttons */}
            {(() => {
              const currentIdx = photos.findIndex(p => p.imageUrl === selectedImage.imageUrl)
              return (
                <>
                  {currentIdx > 0 && (
                    <button
                      className="hidden md:flex absolute left-4 top-1/2 -translate-y-1/2 z-50 p-3 bg-black/60 border border-primary/30 text-primary/80 hover:bg-primary/20 hover:border-primary/60 transition-all"
                      onClick={() => setSelectedImage(photos[currentIdx - 1])}
                      title="Previous image"
                    >
                      <CaretLeft size={28} weight="bold" />
                    </button>
                  )}
                  {currentIdx < photos.length - 1 && (
                    <button
                      className="hidden md:flex absolute right-4 top-1/2 -translate-y-1/2 z-50 p-3 bg-black/60 border border-primary/30 text-primary/80 hover:bg-primary/20 hover:border-primary/60 transition-all"
                      onClick={() => setSelectedImage(photos[currentIdx + 1])}
                      title="Next image"
                    >
                      <CaretRight size={28} weight="bold" />
                    </button>
                  )}
                </>
              )
            })()}
          </motion.div>
        )}
      </AnimatePresence>
      {transitionElement}
    </>
  )
}
